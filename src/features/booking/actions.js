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
import { bookings } from "@/db/schema";
import { isBlockPast, slotInterval } from "@/lib/time";
import { PRE_PAYMENT_LOCK_MINUTES, blockingBooking, currentVenueDay, expireStaleHolds, getActiveIntervals, getPitchById, resolveBlock } from "./queries";
import { BOOKING_DAYS_AHEAD, isRealDate } from "./calendar";
import { addDaysISO } from "@/lib/time";
import { getI18n } from "@/i18n/server";
import { checkCouponForSlot, redeemCoupon } from "@/features/coupons/service";
import { normalizeCode } from "@/features/coupons/rules";
import { sendBookingReceiptByBookingId } from "@/features/auth/ticket-email";
import { startPayment } from "@/features/payment/service";
import { GATEWAYS, getPayMethods } from "@/features/payment/methods";

// There are no reservations. A slot is only locked while its player is on the payment page
// (see PAYMENT_LOCK_MINUTES in queries.js), and is released the moment the payment fails or is cancelled.
// Payment attempts one player may start per hour without paying, so nobody can keep a slot blocked by
// opening the payment page and walking away again and again.
const MAX_UNPAID_ATTEMPTS_PER_HOUR = 5;

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

class Refused extends Error {
    constructor(result) {
        super("refused");
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

/** The date must be a real day inside the booking window the /book page offers (today + BOOKING_DAYS_AHEAD - 1). */
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

/**
 * Book a slot: one step, straight to the payment page.
 *   free (100% code)  -> confirmed at once:            { ok: true, data: { free: true, code, bookingId } }
 *   otherwise         -> slot locked, gateway opened:  { ok: true, data: { url, code, bookingId } }
 * Refusals: { ok: false, error, needsLogin?, needsVerify?, couponError?, slotChanged?, methodOff?, off?, available? }.
 * Nothing is locked unless the payment page really opens: if the gateway fails to open, the slot is released.
 * input: { pitchId, blockId, date, couponCode?, startTime, price, method? }
 */
export async function bookAndPay(input) {
    const i18n = await getI18n();
    const { t } = i18n;
    try {
        const user = await currentUser();
        if (!user) return { ok: false, needsLogin: true, error: t("errors.signInToBook") };
        if (!user.emailVerified) return { ok: false, needsVerify: true, error: t("errors.verifyToBook") };

        const parsed = holdSchema.extend({ method: z.string().max(20).optional().default("") }).safeParse(input);
        if (!parsed.success) return { ok: false, error: t("errors.pickAll") };
        const { pitchId, blockId, date, couponCode, method } = parsed.data;
        if (await outsideWindow(date)) {
            return { ok: false, error: t("errors.outsideWindow", { days: BOOKING_DAYS_AHEAD }) };
        }

        const pitch = await getPitchById(pitchId);
        if (!pitch) return { ok: false, error: t("errors.groundClosed") };

        const block = await resolveBlock(pitch, date, blockId);
        if (!block) return { ok: false, error: t("errors.slotGone") };
        if (!sameAsSeen(block, parsed.data)) return { ok: false, slotChanged: true, error: t("errors.slotChanged") };
        if (isBlockPast(date, block.startTime, block.dayStart)) return { ok: false, error: t("errors.slotStarted") };

        // Pick the payment method before touching the slot, so a switched-off or missing method never locks it.
        // (A 100% code needs no method; that is decided inside the lock below, where the price is final.)
        const methods = await getPayMethods();
        const available = methods.filter((m) => m.enabled);
        if (method && !GATEWAYS.includes(method)) return { ok: false, error: t("errors.pickMethod") };
        const wanted = method ? methods.find((m) => m.id === method) : available[0];
        const payRefusal = !methods.length
            ? { ok: false, error: t("errors.paymentNotSetUp") }
            : !wanted || !wanted.enabled
                ? {
                    ok: false,
                    methodOff: true,
                    off: wanted ? { id: wanted.id, label: t(`pay.${wanted.id}.label`) } : null,
                    available,
                    error: wanted ? t("errors.methodOff", { method: t(`pay.${wanted.id}.label`) }) : t("errors.paymentsOff"),
                }
                : null;

        await expireStaleHolds({ pitchId, date });

        const interval = slotInterval(date, block.startTime, block.endTime, block.dayStart);
        const code = couponCode ? normalizeCode(couponCode) : "";
        // Locks: the ground (overlap check), the player (attempt limit) and the code (usage limits).
        const lockKeys = [`pitch:${pitchId}`, `user:${user.id}`];
        if (code) lockKeys.push(`coupon:${code}`);

        let row = null;
        for (let attempt = 0; attempt < 3 && !row; attempt++) {
            try {
                row = await withLockedTx(lockKeys, async (tx) => {
                    const now = new Date();
                    // One payment at a time per player: starting a new one releases their previous lock
                    // (e.g. they pressed Back on the bKash page instead of Cancel).
                    await tx
                        .update(bookings)
                        .set({ status: "expired", holdExpiresAt: null, cancelReason: "Released: player started another payment", updatedAt: now })
                        .where(and(eq(bookings.userId, user.id), eq(bookings.status, "held")));

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
                    if (Number(recent) >= MAX_UNPAID_ATTEMPTS_PER_HOUR) {
                        throw new Refused({ ok: false, error: t("errors.tooManyRecentHolds") });
                    }

                    // Any active booking (paid, or someone else on the payment page right now) whose real time
                    // overlaps this slot blocks it, including yesterday's/tomorrow's after-midnight slots.
                    const active = await getActiveIntervals(pitchId, [date], { exec: tx });
                    if (blockingBooking(active, interval)) throw new Refused({ ok: false, error: t("errors.slotTaken") });

                    let couponId = null;
                    let discount = 0;
                    if (code) {
                        const c = await checkCouponForSlot({ code, pitchId, block, date, userId: user.id, i18n, exec: tx });
                        if (!c.ok) throw new Refused({ ok: false, couponError: true, error: c.error });
                        couponId = c.coupon.id;
                        discount = c.discount;
                    }
                    const total = Math.max(0, Number(block.price) - discount);
                    const free = total === 0;
                    if (!free && payRefusal) throw new Refused(payRefusal);

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
                            // Just long enough to reach the gateway; startPayment replaces it with the gateway's lock.
                            holdExpiresAt: free ? null : new Date(now.getTime() + PRE_PAYMENT_LOCK_MINUTES * 60000),
                        })
                        .returning({ id: bookings.id, code: bookings.code });

                    if (free) await redeemCoupon(inserted.id, tx);
                    return { ...inserted, free };
                });
            } catch (err) {
                if (err instanceof Refused) return err.result;
                if (!isUniqueViolation(err)) throw err;
                const msg = String(err?.message ?? "") + String(err?.cause?.message ?? "") + String(err?.cause?.constraint ?? "");
                if (!msg.includes("bookings_code_unique")) return { ok: false, error: t("errors.slotTaken") };
            }
        }
        if (!row) return { ok: false, error: t("errors.reserveFailed") };

        revalidatePath("/bookings");
        if (row.free) {
            waitUntil(sendBookingReceiptByBookingId(row.id).catch((err) => console.error("[ticket-email:free]", err)));
            return { ok: true, data: { free: true, code: row.code, bookingId: row.id } };
        }

        const pay = await startPayment(row.id, user, wanted.id, i18n);
        if (!pay.ok) {
            // The payment page didn't open: don't keep the slot from anyone.
            await releaseLock(row.id, "Released: the payment page didn't open");
            return { ok: false, error: pay.error };
        }
        return { ok: true, data: { url: pay.data.url, code: row.code, bookingId: row.id } };
    } catch (err) {
        console.error("[bookAndPay]", err);
        return { ok: false, error: t("errors.reserveFailed") };
    }
}

/** Free a locked slot (status expired = released unpaid; a late payment can still revive it if nobody took it). */
async function releaseLock(bookingId, reason) {
    await db
        .update(bookings)
        .set({ status: "expired", holdExpiresAt: null, cancelReason: reason, updatedAt: new Date() })
        .where(and(eq(bookings.id, bookingId), eq(bookings.status, "held")));
}

/**
 * The player leaves a payment they didn't finish ("Release slot" in My bookings): the slot is free for
 * everyone at once. If the gateway still completes that payment later, the booking is revived when the
 * slot is still free, otherwise it becomes a refund (bKash never takes the money in that case).
 */
export async function cancelHeldBooking(bookingId) {
    const { t } = await getI18n();
    try {
        const user = await currentUser();
        if (!user) return { ok: false, needsLogin: true, error: t("errors.signInFirst") };
        if (!z.string().uuid().safeParse(bookingId).success) return { ok: false, error: t("errors.bookingNotFound") };

        const rows = await db
            .update(bookings)
            .set({ status: "expired", holdExpiresAt: null, cancelReason: "Released by the player before paying", updatedAt: new Date() })
            .where(and(eq(bookings.id, bookingId), eq(bookings.userId, user.id), eq(bookings.status, "held")))
            .returning({ id: bookings.id });

        if (rows.length === 0) return { ok: false, error: t("errors.cancelOnlyHeld") };
        revalidatePath("/bookings");
        return { ok: true };
    } catch (err) {
        console.error("[cancelHeldBooking]", err);
        return { ok: false, error: t("errors.cancelFailed") };
    }
}