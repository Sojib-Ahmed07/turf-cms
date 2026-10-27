// src/features/booking/actions.js
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { waitUntil } from "@vercel/functions";
import { and, count, eq, gt, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { withLockedTx } from "@/db/pool";
import { bookings, payments } from "@/db/schema";
import { isBlockPast, slotInterval } from "@/lib/time";
import { HOLD_MINUTES, blockingBooking, currentVenueDay, expireStaleHolds, getActiveIntervals, getPitchById, resolveBlock } from "./queries";
import { BOOKING_DAYS_AHEAD, isRealDate } from "./calendar";
import { addDaysISO } from "@/lib/time";
import { getI18n } from "@/i18n/server";
import { checkCouponForSlot, redeemCoupon } from "@/features/coupons/service";
import { normalizeCode } from "@/features/coupons/rules";
import { sendBookingReceiptByBookingId } from "@/features/auth/ticket-email";

const MAX_ACTIVE_HOLDS = 2;
// Unpaid holds (released, expired or still waiting) one player may create per hour, so two slots
// can't be blocked forever by reserving, cancelling and reserving again.
const MAX_HOLDS_PER_HOUR = 6;
// A card/wallet (SSLCommerz) payment opened this recently can still be completed, so the hold can't be
// cancelled under it (the player would be charged for a cancelled booking). bKash checks the slot itself.
const OPEN_PAYMENT_MINUTES = 20;

const holdSchema = z.object({
    pitchId: z.string().uuid(),
    blockId: z.string().min(1).max(64),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    couponCode: z.string().trim().max(30).optional().default(""),
    // What the player saw on the board. If the venue changed the schedule meanwhile, the same blockId can
    // point at another time or price, so these must still match (sent by the booking page).
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    price: z.coerce.number().nonnegative().optional(),
});

/** The block the player picked is still the one they saw (same start time and price). */
function sameAsSeen(block, { startTime, price }) {
    if (startTime && block.startTime !== startTime) return false;
    if (price != null && Number(block.price) !== Number(price)) return false;
    return true;
}

class HoldRefused extends Error {
    constructor(result) {
        super("hold refused");
        this.result = result;
    }
}

async function currentUser() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ?? null;
}

function bookingCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(5));
    return "TZ-" + Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/** The date must be a real day inside the booking window the /book page offers (today + 13 days). */
async function outsideWindow(date) {
    if (!isRealDate(date)) return true;
    const { date: today } = await currentVenueDay();
    return date < today || date > addDaysISO(today, BOOKING_DAYS_AHEAD - 1);
}

function isUniqueViolation(err) {
    const code = err?.code ?? err?.cause?.code;
    const msg = String(err?.message ?? "") + String(err?.cause?.message ?? "");
    return code === "23505" || msg.includes("duplicate key");
}

export async function previewCoupon(input) {
    const i18n = await getI18n();
    const { t } = i18n;
    try {
        const parsed = holdSchema.safeParse(input);
        if (!parsed.success || !parsed.data.couponCode) return { ok: false, error: t("errors.typeCode") };
        const { pitchId, blockId, date, couponCode } = parsed.data;
        if (await outsideWindow(date)) return { ok: false, error: t("errors.pickCalendarDate") };
        const user = await currentUser();

        const pitch = await getPitchById(pitchId);
        const block = pitch && (await resolveBlock(pitch, date, blockId));
        if (!block) return { ok: false, error: t("errors.pickSlotFirst") };
        if (!sameAsSeen(block, parsed.data)) return { ok: false, slotChanged: true, error: t("errors.slotChanged") };

        const r = await checkCouponForSlot({ code: couponCode, pitchId, block, date, userId: user?.id ?? null, i18n });
        if (!r.ok) return r;
        return { ok: true, data: { code: r.coupon.code, discount: r.discount, total: r.total } };
    } catch (err) {
        console.error("[previewCoupon]", err);
        return { ok: false, error: t("errors.codeCheckFailed") };
    }
}

export async function createBookingHold(input) {
    const i18n = await getI18n();
    const { t } = i18n;
    try {
        const user = await currentUser();
        if (!user) return { ok: false, needsLogin: true, error: t("errors.signInToBook") };
        if (!user.emailVerified) {
            return {
                ok: false,
                needsVerify: true,
                error: t("errors.verifyToBook"),
            };
        }

        const parsed = holdSchema.safeParse(input);
        if (!parsed.success) return { ok: false, error: t("errors.pickAll") };
        const { pitchId, blockId, date, couponCode } = parsed.data;
        if (await outsideWindow(date)) {
            return { ok: false, error: t("errors.outsideWindow", { days: BOOKING_DAYS_AHEAD }) };
        }

        const pitch = await getPitchById(pitchId);
        if (!pitch) return { ok: false, error: t("errors.groundClosed") };

        const block = await resolveBlock(pitch, date, blockId);
        if (!block) return { ok: false, error: t("errors.slotGone") };
        if (!sameAsSeen(block, parsed.data)) return { ok: false, slotChanged: true, error: t("errors.slotChanged") };

        if (isBlockPast(date, block.startTime, block.dayStart)) {
            return { ok: false, error: t("errors.slotStarted") };
        }

        await expireStaleHolds({ pitchId, date });

        const interval = slotInterval(date, block.startTime, block.endTime, block.dayStart);
        const code = couponCode ? normalizeCode(couponCode) : "";
        // Locks: the ground (overlap check), the player (hold limits) and the code (usage limits).
        // Requests that share one of them run one at a time, so none of these checks can be raced.
        const lockKeys = [`pitch:${pitchId}`, `user:${user.id}`];
        if (code) lockKeys.push(`coupon:${code}`);

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const row = await withLockedTx(lockKeys, async (tx) => {
                    const now = new Date();
                    const [{ n: activeCount }] = await tx
                        .select({ n: count() })
                        .from(bookings)
                        .where(and(eq(bookings.userId, user.id), eq(bookings.status, "held"), gt(bookings.holdExpiresAt, now)));
                    if (Number(activeCount) >= MAX_ACTIVE_HOLDS) {
                        throw new HoldRefused({ ok: false, error: t("errors.tooManyHolds", { count: Number(activeCount) }) });
                    }
                    const [{ n: recent }] = await tx
                        .select({ n: count() })
                        .from(bookings)
                        .where(
                            and(
                                eq(bookings.userId, user.id),
                                eq(bookings.source, "online"),
                                inArray(bookings.status, ["held", "cancelled", "expired"]),
                                eq(bookings.paymentStatus, "unpaid"),
                                gt(bookings.createdAt, new Date(now.getTime() - 60 * 60000))
                            )
                        );
                    if (Number(recent) >= MAX_HOLDS_PER_HOUR) {
                        throw new HoldRefused({ ok: false, error: t("errors.tooManyRecentHolds") });
                    }

                    // Any active booking whose real time overlaps this slot (also from yesterday's or
                    // tomorrow's sheet) blocks it, not only one with the same start time.
                    const active = await getActiveIntervals(pitchId, [date], { exec: tx });
                    if (blockingBooking(active, interval)) throw new HoldRefused({ ok: false, error: t("errors.slotTaken") });

                    let couponId = null;
                    let discount = 0;
                    if (code) {
                        const c = await checkCouponForSlot({ code, pitchId, block, date, userId: user.id, i18n, exec: tx });
                        if (!c.ok) throw new HoldRefused({ ok: false, couponError: true, error: c.error });
                        couponId = c.coupon.id;
                        discount = c.discount;
                    }
                    const total = Math.max(0, Number(block.price) - discount);
                    const free = total === 0;
                    const holdExpiresAt = new Date(now.getTime() + HOLD_MINUTES * 60 * 1000);

                    const [inserted] = await tx
                        .insert(bookings)
                        .values({
                            code: bookingCode(),
                            userId: user.id,
                            customerName: user.name,
                            customerPhone: user.phone ?? null,
                            pitchId,
                            timeBlockId: block.dbId,
                            bookingDate: date,
                            startTime: block.startTime,
                            endTime: block.endTime,
                            subtotal: String(block.price),
                            discount: String(discount),
                            totalPrice: String(total),
                            couponId,
                            status: free ? "confirmed" : "held",
                            paymentStatus: free ? "paid" : "unpaid",
                            source: "online",
                            holdExpiresAt: free ? null : holdExpiresAt,
                        })
                        .returning({ id: bookings.id, code: bookings.code });

                    // Free booking: the code is used now, inside the same lock as the limit check.
                    if (free) await redeemCoupon(inserted.id, tx);
                    return { ...inserted, free, holdExpiresAt: free ? null : holdExpiresAt };
                });

                if (row.free) {
                    waitUntil(
                        sendBookingReceiptByBookingId(row.id).catch((err) =>
                            console.error("[ticket-email:free]", err)
                        )
                    );
                }
                revalidatePath("/bookings");
                return {
                    ok: true,
                    data: { bookingId: row.id, code: row.code, free: row.free, holdExpiresAt: row.holdExpiresAt ? row.holdExpiresAt.toISOString() : null },
                };
            } catch (err) {
                if (err instanceof HoldRefused) return err.result;
                if (!isUniqueViolation(err)) throw err;
                const msg = String(err?.message ?? "") + String(err?.cause?.message ?? "") + String(err?.cause?.constraint ?? "");
                if (!msg.includes("bookings_code_unique")) {
                    return { ok: false, error: t("errors.slotTaken") };
                }
            }
        }
        return { ok: false, error: t("errors.reserveFailed") };
    } catch (err) {
        console.error("[createBookingHold]", err);
        return { ok: false, error: t("errors.reserveFailed") };
    }
}

export async function cancelHeldBooking(bookingId) {
    const { t } = await getI18n();
    try {
        const user = await currentUser();
        if (!user) return { ok: false, needsLogin: true, error: t("errors.signInFirst") };
        if (!z.string().uuid().safeParse(bookingId).success) return { ok: false, error: t("errors.bookingNotFound") };

        // A card/wallet payment still open on SSLCommerz could be completed after the cancel: refuse until
        // it's closed (the cancel callback closes it) or old enough that it can't be paid any more.
        const [open] = await db
            .select({ createdAt: payments.createdAt })
            .from(payments)
            .innerJoin(bookings, eq(payments.bookingId, bookings.id))
            .where(
                and(
                    eq(payments.bookingId, bookingId),
                    eq(bookings.userId, user.id),
                    eq(payments.gateway, "sslcommerz"),
                    eq(payments.status, "initiated"),
                    gt(payments.createdAt, new Date(Date.now() - OPEN_PAYMENT_MINUTES * 60000))
                )
            )
            .limit(1);
        if (open) {
            const minutes = Math.max(1, Math.ceil((open.createdAt.getTime() + OPEN_PAYMENT_MINUTES * 60000 - Date.now()) / 60000));
            return { ok: false, error: t("errors.paymentInProgress", { minutes }) };
        }

        const rows = await db
            .update(bookings)
            .set({ status: "cancelled", cancelledAt: new Date(), cancelReason: "Cancelled by player before payment", updatedAt: new Date() })
            .where(and(eq(bookings.id, bookingId), eq(bookings.userId, user.id), inArray(bookings.status, ["held"])))
            .returning({ id: bookings.id });

        if (rows.length === 0) {
            return { ok: false, error: t("errors.cancelOnlyHeld") };
        }
        revalidatePath("/bookings");
        return { ok: true };
    } catch (err) {
        console.error("[cancelHeldBooking]", err);
        return { ok: false, error: t("errors.cancelFailed") };
    }
}