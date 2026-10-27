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

export async function getCouponByCode(code, exec = db) {
    const c = normalizeCode(code);
    if (!c || c.length > 30) return null;
    const [row] = await exec.select().from(coupons).where(eq(coupons.code, c)).limit(1);
    return row ?? null;
}

/** Active (unexpired) holds that carry this coupon, optionally only one player's. */
async function activeHolds(couponId, userId = null, exec = db) {
    const now = new Date();
    const where = [
        eq(bookings.couponId, couponId),
        eq(bookings.status, "held"),
        or(isNull(bookings.holdExpiresAt), gt(bookings.holdExpiresAt, now)),
    ];
    if (userId) where.push(eq(bookings.userId, userId));
    const [r] = await exec.select({ n: count() }).from(bookings).where(and(...where));
    return Number(r?.n ?? 0);
}

/** { usesTotal, usesByUser } including slots currently held with the code. */
export async function couponUses(coupon, userId, exec = db) {
    const holdsAll = await activeHolds(coupon.id, null, exec);
    let usesByUser = null;
    if (userId) {
        const [r] = await exec
            .select({ n: count() })
            .from(couponRedemptions)
            .where(and(eq(couponRedemptions.couponId, coupon.id), eq(couponRedemptions.userId, userId)));
        usesByUser = Number(r?.n ?? 0) + (await activeHolds(coupon.id, userId, exec));
    }
    return { usesTotal: Number(coupon.usedCount ?? 0) + holdsAll, usesByUser };
}

/**
 * Check a code for one slot. `block` is the server-resolved block ({ startTime, price }).
 * Returns { ok, coupon, discount, total } or { ok: false, error }.
 */
/**
 * i18n (optional): { t, f } from getI18n(), so the player sees the reason in their language.
 * exec (optional): a transaction (withLockedTx) so the use count can't change before the hold is saved.
 */
export async function checkCouponForSlot({ code, pitchId, block, date, userId, i18n = null, exec = db }) {
    const coupon = await getCouponByCode(code, exec);
    if (!coupon) return { ok: false, error: i18n ? i18n.t("coupon.invalid") : "That code isn't valid. Check the spelling." };
    const uses = await couponUses(coupon, userId, exec);
    const r = evaluateCoupon(coupon, {
        subtotal: Number(block.price),
        pitchId,
        date,
        startTime: block.startTime,
        dayStart: block.dayStart,
        now: Date.now(),
        ...uses,
        i18n,
    });
    return r.ok ? { ...r, coupon } : r;
}

/**
 * Make a coupon use permanent for a confirmed booking. Safe to call twice, even at the same moment:
 * the unique index on coupon_redemptions.booking_id lets only one insert win, and only the winner
 * bumps usedCount.
 */
export async function redeemCoupon(bookingId, exec = db) {
    const [b] = await exec
        .select({ couponId: bookings.couponId, userId: bookings.userId, discount: bookings.discount })
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);
    if (!b?.couponId) return false;

    const inserted = await exec
        .insert(couponRedemptions)
        .values({
            couponId: b.couponId,
            userId: b.userId,
            bookingId,
            amount: String(b.discount ?? 0),
        })
        .onConflictDoNothing({ target: couponRedemptions.bookingId })
        .returning({ id: couponRedemptions.id });
    if (inserted.length === 0) return false; // already recorded for this booking

    await exec
        .update(coupons)
        .set({ usedCount: sql`${coupons.usedCount} + 1` })
        .where(eq(coupons.id, b.couponId));
    return true;
}