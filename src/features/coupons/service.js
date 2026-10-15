// src/features/coupons/service.js
// Coupons at checkout (server only).
//   checkCouponForSlot  used by the "Apply" box and again, authoritatively, when the slot is held
//   redeemCoupon        called once when a booking with a coupon is confirmed (paid, or free)
//
// A use counts as soon as a player HOLDS a slot with the code (so two players can't both take the
// last use), and becomes permanent (coupon_redemptions + usedCount) when the booking is confirmed.
import "server-only";
import { and, count, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, couponRedemptions, coupons } from "@/db/schema";
import { evaluateCoupon, normalizeCode } from "./rules";

export async function getCouponByCode(code) {
    const c = normalizeCode(code);
    if (!c || c.length > 30) return null;
    const [row] = await db.select().from(coupons).where(eq(coupons.code, c)).limit(1);
    return row ?? null;
}

/** Active (unexpired) holds that carry this coupon, optionally only one player's. */
async function activeHolds(couponId, userId = null) {
    const now = new Date();
    const where = [
        eq(bookings.couponId, couponId),
        eq(bookings.status, "held"),
        or(isNull(bookings.holdExpiresAt), gt(bookings.holdExpiresAt, now)),
    ];
    if (userId) where.push(eq(bookings.userId, userId));
    const [r] = await db.select({ n: count() }).from(bookings).where(and(...where));
    return Number(r?.n ?? 0);
}

/** { usesTotal, usesByUser } including slots currently held with the code. */
export async function couponUses(coupon, userId) {
    const holdsAll = await activeHolds(coupon.id);
    let usesByUser = null;
    if (userId) {
        const [r] = await db
            .select({ n: count() })
            .from(couponRedemptions)
            .where(and(eq(couponRedemptions.couponId, coupon.id), eq(couponRedemptions.userId, userId)));
        usesByUser = Number(r?.n ?? 0) + (await activeHolds(coupon.id, userId));
    }
    return { usesTotal: Number(coupon.usedCount ?? 0) + holdsAll, usesByUser };
}

/**
 * Check a code for one slot. `block` is the server-resolved block ({ startTime, price }).
 * Returns { ok, coupon, discount, total } or { ok: false, error }.
 */
export async function checkCouponForSlot({ code, pitchId, block, date, userId }) {
    const coupon = await getCouponByCode(code);
    if (!coupon) return { ok: false, error: "That code isn't valid. Check the spelling." };
    const uses = await couponUses(coupon, userId);
    const r = evaluateCoupon(coupon, {
        subtotal: Number(block.price),
        pitchId,
        date,
        startTime: block.startTime,
        dayStart: block.dayStart,
        now: Date.now(),
        ...uses,
    });
    return r.ok ? { ...r, coupon } : r;
}

/**
 * Make a coupon use permanent for a confirmed booking. Safe to call twice:
 * it only records once per booking.
 */
export async function redeemCoupon(bookingId) {
    const [b] = await db
        .select({ couponId: bookings.couponId, userId: bookings.userId, discount: bookings.discount })
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);
    if (!b?.couponId) return false;

    const [done] = await db
        .select({ id: couponRedemptions.id })
        .from(couponRedemptions)
        .where(eq(couponRedemptions.bookingId, bookingId))
        .limit(1);
    if (done) return false;

    await db.insert(couponRedemptions).values({
        couponId: b.couponId,
        userId: b.userId,
        bookingId,
        amount: String(b.discount ?? 0),
    });
    await db
        .update(coupons)
        .set({ usedCount: sql`${coupons.usedCount} + 1` })
        .where(eq(coupons.id, b.couponId));
    return true;
}