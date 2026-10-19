// src/features/booking/actions.js
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, gt, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { isBlockPast } from "@/lib/time";
import { HOLD_MINUTES, expireStaleHolds, getPitchById, resolveBlock } from "./queries";
import { checkCouponForSlot, redeemCoupon } from "@/features/coupons/service";

const MAX_ACTIVE_HOLDS = 2; // stops one player from blocking the whole evening

const holdSchema = z.object({
    pitchId: z.string().uuid(),
    blockId: z.string().min(1).max(64),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    couponCode: z.string().trim().max(30).optional().default(""),
});

async function currentUser() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ?? null;
}

/** "TZ-8F2K1": short code shown on tickets. No 0/O/1/I to avoid confusion. */
function bookingCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(5));
    return "TZ-" + Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function isUniqueViolation(err) {
    const code = err?.code ?? err?.cause?.code;
    const msg = String(err?.message ?? "") + String(err?.cause?.message ?? "");
    return code === "23505" || msg.includes("duplicate key");
}

/**
 * "Apply" in the checkout card: what would this code take off this slot?
 * Works signed out too (the per-player limit is checked again when the slot is held).
 * Returns { ok, data: { code, discount, total } } or { ok: false, error }.
 */
export async function previewCoupon(input) {
    try {
        const parsed = holdSchema.safeParse(input);
        if (!parsed.success || !parsed.data.couponCode) return { ok: false, error: "Type a promo code first." };
        const { pitchId, blockId, date, couponCode } = parsed.data;
        const user = await currentUser();

        const pitch = await getPitchById(pitchId);
        const block = pitch && (await resolveBlock(pitch, date, blockId));
        if (!block) return { ok: false, error: "Pick a time slot first." };

        const r = await checkCouponForSlot({ code: couponCode, pitchId, block, date, userId: user?.id ?? null });
        if (!r.ok) return r;
        return { ok: true, data: { code: r.coupon.code, discount: r.discount, total: r.total } };
    } catch (err) {
        console.error("[previewCoupon]", err);
        return { ok: false, error: "Couldn't check the code. Try again." };
    }
}

/**
 * Step 1 of checkout: reserve the slot for HOLD_MINUTES, with an optional promo code.
 * Returns { ok, data: { bookingId, code, free? } } or { ok: false, error, needsLogin?, needsVerify? }.
 * A code that makes the slot free confirms the booking straight away (nothing to pay).
 * Only verified players can hold a slot: unverified accounts get needsVerify: true.
 */
export async function createBookingHold(input) {
    try {
        const user = await currentUser();
        if (!user) return { ok: false, needsLogin: true, error: "Sign in to book a slot." };
        if (!user.emailVerified) {
            return {
                ok: false,
                needsVerify: true,
                error: "Verify your email before booking. Check your inbox for the code.",
            };
        }

        const parsed = holdSchema.safeParse(input);
        if (!parsed.success) return { ok: false, error: "Pick a ground, date and time first." };
        const { pitchId, blockId, date, couponCode } = parsed.data;

        const pitch = await getPitchById(pitchId);
        if (!pitch) return { ok: false, error: "This ground isn't taking bookings right now." };

        const block = await resolveBlock(pitch, date, blockId);
        if (!block) return { ok: false, error: "That time slot no longer exists. Pick another time." };

        if (isBlockPast(date, block.startTime, block.dayStart)) {
            return { ok: false, error: "That slot has already started. Pick a later time." };
        }

        // Free up slots whose holds ran out, so the unique index doesn't block them.
        await expireStaleHolds({ pitchId, date });

        // Limit concurrent holds per player.
        const now = new Date();
        const active = await db
            .select({ id: bookings.id })
            .from(bookings)
            .where(and(eq(bookings.userId, user.id), eq(bookings.status, "held"), gt(bookings.holdExpiresAt, now)));
        if (active.length >= MAX_ACTIVE_HOLDS) {
            return {
                ok: false,
                error: `You already have ${active.length} slots waiting for payment. Pay for or cancel one first.`,
            };
        }

        // Promo code: always re-checked here, whatever the browser showed.
        let couponId = null;
        let discount = 0;
        if (couponCode) {
            const c = await checkCouponForSlot({ code: couponCode, pitchId, block, date, userId: user.id });
            if (!c.ok) return { ok: false, couponError: true, error: c.error };
            couponId = c.coupon.id;
            discount = c.discount;
        }
        const total = Math.max(0, Number(block.price) - discount);
        const free = total === 0;

        const holdExpiresAt = new Date(now.getTime() + HOLD_MINUTES * 60 * 1000);

        // Retry only if the random booking code collides (very rare).
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const [row] = await db
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

                if (free) await redeemCoupon(row.id);
                revalidatePath("/bookings");
                return {
                    ok: true,
                    data: { bookingId: row.id, code: row.code, free, holdExpiresAt: free ? null : holdExpiresAt.toISOString() },
                };
            } catch (err) {
                if (!isUniqueViolation(err)) throw err;
                const msg = String(err?.message ?? "") + String(err?.cause?.message ?? "") + String(err?.cause?.constraint ?? "");
                // Booking-code collision: loop and try a new code. Anything else means the slot is taken.
                if (!msg.includes("bookings_code_unique")) {
                    return { ok: false, error: "Someone just booked this slot. Pick another time." };
                }
            }
        }
        return { ok: false, error: "Couldn't reserve the slot. Try again." };
    } catch (err) {
        console.error("[createBookingHold]", err);
        return { ok: false, error: "Couldn't reserve the slot. Try again." };
    }
}

/** Player cancels a booking that is still waiting for payment. */
export async function cancelHeldBooking(bookingId) {
    try {
        const user = await currentUser();
        if (!user) return { ok: false, needsLogin: true, error: "Sign in first." };
        if (!z.string().uuid().safeParse(bookingId).success) return { ok: false, error: "Booking not found." };

        const rows = await db
            .update(bookings)
            .set({ status: "cancelled", cancelledAt: new Date(), cancelReason: "Cancelled by player before payment", updatedAt: new Date() })
            .where(and(eq(bookings.id, bookingId), eq(bookings.userId, user.id), inArray(bookings.status, ["held"])))
            .returning({ id: bookings.id });

        if (rows.length === 0) {
            return { ok: false, error: "Only bookings waiting for payment can be cancelled here. For paid bookings, call the desk." };
        }
        revalidatePath("/bookings");
        return { ok: true };
    } catch (err) {
        console.error("[cancelHeldBooking]", err);
        return { ok: false, error: "Couldn't cancel the booking. Try again." };
    }
}