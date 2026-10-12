// src/features/booking/queries.js
// Server-side reads for the booking flow. Same logic as the prototype
// (src/app/actions/booking.js), adapted to the new schema and hold system.
import "server-only";
import { and, asc, desc, eq, gt, lte, or, isNull } from "drizzle-orm";
import { db } from "@/db";
import { bookings, pitches, timeBlocks } from "@/db/schema";
import { isBlockPast } from "@/lib/time";

export const HOLD_MINUTES = 15;

/* -------------------------------------------------------------- */
/* Pitches                                                         */
/* -------------------------------------------------------------- */

/** Active pitches in the shape the UI components expect. */
export async function getPitches() {
    const rows = await db
        .select()
        .from(pitches)
        .where(eq(pitches.isActive, true))
        .orderBy(asc(pitches.sortOrder), asc(pitches.name));

    return rows.map(toPitchView);
}

export async function getPitchById(pitchId) {
    const [row] = await db
        .select()
        .from(pitches)
        .where(and(eq(pitches.id, pitchId), eq(pitches.isActive, true)))
        .limit(1);
    return row ?? null;
}

export function toPitchView(p) {
    return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description ?? "",
        sport: p.sport,
        format: p.format ?? "",
        size: p.size ?? "",
        surface: p.surface ?? "",
        hourlyRate: Number(p.hourlyRate),
        openHour: p.openHour,
        closeHour: p.closeHour,
        imageUrl: p.imageUrl ?? null,
    };
}

/* -------------------------------------------------------------- */
/* Time blocks for a date (override or default)                    */
/* -------------------------------------------------------------- */

/**
 * Block list for a pitch on a date.
 * Per-date overrides in time_blocks win; otherwise pitches.defaultBlocks.
 * Default blocks get ids "default-<index>" (resolved again on the server when booking).
 */
export async function getTimeBlocksForPitch(pitch, date) {
    const overrides = await db
        .select()
        .from(timeBlocks)
        .where(and(eq(timeBlocks.pitchId, pitch.id), eq(timeBlocks.date, date), eq(timeBlocks.isActive, true)))
        .orderBy(asc(timeBlocks.sortOrder));

    if (overrides.length > 0) {
        return overrides.map((b) => ({
            id: b.id,
            startTime: b.startTime,
            endTime: b.endTime,
            price: Number(b.price),
            sortOrder: b.sortOrder,
        }));
    }

    const list = Array.isArray(pitch.defaultBlocks) ? pitch.defaultBlocks : [];
    return list
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((b, i) => ({
            id: `default-${i}`,
            startTime: String(b.startTime),
            endTime: String(b.endTime),
            price: Number(b.price),
            sortOrder: i,
        }));
}

/**
 * Resolve the block a player is trying to book. Never trust times or prices
 * from the browser: always look them up again here.
 */
export async function resolveBlock(pitch, date, blockId) {
    const blocks = await getTimeBlocksForPitch(pitch, date);
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return null;
    if (!(block.price > 0)) return null;
    return {
        ...block,
        dbId: blockId.startsWith("default-") ? null : blockId,
    };
}

/* -------------------------------------------------------------- */
/* Availability                                                    */
/* -------------------------------------------------------------- */

/**
 * Bookings that currently occupy a slot: confirmed, or held and not yet expired.
 * Returns Map(startTime -> { status, userId }).
 */
export async function getTakenSlots(pitchId, date) {
    const now = new Date();
    const rows = await db
        .select({
            startTime: bookings.startTime,
            status: bookings.status,
            userId: bookings.userId,
        })
        .from(bookings)
        .where(
            and(
                eq(bookings.pitchId, pitchId),
                eq(bookings.bookingDate, date),
                or(
                    eq(bookings.status, "confirmed"),
                    and(eq(bookings.status, "held"), or(isNull(bookings.holdExpiresAt), gt(bookings.holdExpiresAt, now)))
                )
            )
        );

    const map = new Map();
    for (const r of rows) map.set(r.startTime, { status: r.status, userId: r.userId });
    return map;
}

/**
 * Everything the slot board needs for one pitch + date:
 * [{ id, start, end, price, state: "free" | "booked" | "held" | "past", mine }]
 */
export async function getSlotBoard(pitchId, date, viewerId = null) {
    const pitch = await getPitchById(pitchId);
    if (!pitch) return null;

    const [blocks, taken] = await Promise.all([getTimeBlocksForPitch(pitch, date), getTakenSlots(pitchId, date)]);

    return blocks.map((b) => {
        const t = taken.get(b.startTime);
        let state = "free";
        if (t?.status === "confirmed") state = "booked";
        else if (t?.status === "held") state = "held";
        else if (isBlockPast(date, b.startTime, pitch.openHour)) state = "past";
        return {
            id: b.id,
            start: b.startTime,
            end: b.endTime,
            price: b.price,
            state,
            mine: Boolean(t && viewerId && t.userId === viewerId),
        };
    });
}

/**
 * Mark held bookings whose 15 minutes ran out as expired.
 * Called lazily before creating a hold (and later by the cron job).
 */
export async function expireStaleHolds({ pitchId, date } = {}) {
    const now = new Date();
    const where = [eq(bookings.status, "held"), lte(bookings.holdExpiresAt, now)];
    if (pitchId) where.push(eq(bookings.pitchId, pitchId));
    if (date) where.push(eq(bookings.bookingDate, date));

    const rows = await db
        .update(bookings)
        .set({ status: "expired", updatedAt: now })
        .where(and(...where))
        .returning({ id: bookings.id });
    return rows.length;
}

/* -------------------------------------------------------------- */
/* My bookings                                                     */
/* -------------------------------------------------------------- */

/** Bookings for one user, in the shape BookingTicket expects. */
export async function getMyBookings(userId) {
    const rows = await db
        .select({
            id: bookings.id,
            code: bookings.code,
            bookingDate: bookings.bookingDate,
            startTime: bookings.startTime,
            endTime: bookings.endTime,
            totalPrice: bookings.totalPrice,
            discount: bookings.discount,
            status: bookings.status,
            paymentStatus: bookings.paymentStatus,
            holdExpiresAt: bookings.holdExpiresAt,
            createdAt: bookings.createdAt,
            pitchName: pitches.name,
            pitchFormat: pitches.format,
            openHour: pitches.openHour,
        })
        .from(bookings)
        .innerJoin(pitches, eq(bookings.pitchId, pitches.id))
        .where(eq(bookings.userId, userId))
        .orderBy(desc(bookings.bookingDate), desc(bookings.startTime));

    const now = Date.now();

    return rows.map((r) => {
        let status = r.status;
        // A hold whose time ran out counts as expired even before the cleanup runs.
        if (status === "held" && r.holdExpiresAt && r.holdExpiresAt.getTime() <= now) status = "expired";
        // A confirmed booking whose start time has passed is shown as played.
        if (status === "confirmed" && isBlockPast(r.bookingDate, r.startTime, r.openHour)) status = "completed";

        return {
            id: r.code,
            bookingId: r.id,
            pitch: r.pitchName,
            format: r.pitchFormat ?? "",
            date: r.bookingDate,
            start: r.startTime,
            end: r.endTime,
            total: Number(r.totalPrice),
            discount: Number(r.discount ?? 0),
            status,
            paidWith: r.paymentStatus === "paid" ? "Online" : null,
            holdMinutesLeft:
                status === "held" && r.holdExpiresAt
                    ? Math.max(1, Math.ceil((r.holdExpiresAt.getTime() - now) / 60000))
                    : null,
        };
    });
}

/** One booking owned by a user (for payment pages). */
export async function getBookingForUser(bookingId, userId) {
    const [row] = await db
        .select({
            id: bookings.id,
            code: bookings.code,
            userId: bookings.userId,
            pitchId: bookings.pitchId,
            bookingDate: bookings.bookingDate,
            startTime: bookings.startTime,
            endTime: bookings.endTime,
            totalPrice: bookings.totalPrice,
            status: bookings.status,
            paymentStatus: bookings.paymentStatus,
            holdExpiresAt: bookings.holdExpiresAt,
            pitchName: pitches.name,
        })
        .from(bookings)
        .innerJoin(pitches, eq(bookings.pitchId, pitches.id))
        .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)))
        .limit(1);
    return row ?? null;
}