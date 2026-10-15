// src/features/booking/queries.js
// Server-side reads for the booking flow. Same logic as the prototype
// (src/app/actions/booking.js), adapted to the new schema and hold system.
import "server-only";
import { and, asc, desc, eq, gt, inArray, lte, or, isNull } from "drizzle-orm";
import { db } from "@/db";
import { bookings, pitches, timeBlocks } from "@/db/schema";
import { partsOf } from "./parts";
import { addDaysISO, currentOperatingDay, dayStartOf, dhakaDate, isAfterMidnight, isBlockPast, minutesToHHMM, nightEndOf, operatingMinutes } from "@/lib/time";
import { time12 } from "@/lib/utils";

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

/** A pitch row's default schedule in sheet order ({ startTime, endTime, price, sortOrder }). */
export function defaultSheet(p) {
    return (Array.isArray(p?.defaultBlocks) ? p.defaultBlocks : [])
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((b) => ({ startTime: String(b.startTime), endTime: String(b.endTime) }));
}

/* -------------------------------------------------------------- */
/* Venue clock                                                     */
/* -------------------------------------------------------------- */

/**
 * The venue day running right now: { date, minutes }.
 * Yesterday stays "today" while any open ground's sheet for yesterday still has
 * after-midnight slots running (e.g. until 3 am for a ground that closes at 3 am).
 * A ground that opens at 5 am and closes at 10 pm doesn't hold "today" back at all.
 */
export async function currentVenueDay(now = new Date()) {
    const yesterday = addDaysISO(dhakaDate(now), -1);
    const [rows, overrides] = await Promise.all([
        db.select({ id: pitches.id, defaultBlocks: pitches.defaultBlocks }).from(pitches).where(eq(pitches.isActive, true)),
        db
            .select({ pitchId: timeBlocks.pitchId, startTime: timeBlocks.startTime, endTime: timeBlocks.endTime })
            .from(timeBlocks)
            .where(and(eq(timeBlocks.date, yesterday), eq(timeBlocks.isActive, true)))
            .orderBy(asc(timeBlocks.pitchId), asc(timeBlocks.sortOrder)),
    ]);
    const byPitch = groupBy(overrides, (o) => o.pitchId);
    let nightEnd = 0;
    for (const p of rows) nightEnd = Math.max(nightEnd, nightEndOf(byPitch.get(p.id) ?? defaultSheet(p)));
    return currentOperatingDay(nightEnd, now);
}

/**
 * "Every day, 5 am to 10 pm" from the open grounds' default schedules (earliest first slot to latest end).
 * Shown in the footer and "Find us" when the admin leaves Opening hours empty in Footer & SEO.
 */
export async function getVenueHoursLabel() {
    const rows = await db.select({ defaultBlocks: pitches.defaultBlocks }).from(pitches).where(eq(pitches.isActive, true));
    let open = null;
    let close = null;
    for (const p of rows) {
        const sheet = defaultSheet(p);
        if (!sheet.length) continue;
        const start = dayStartOf(sheet);
        for (const b of sheet) {
            const at = operatingMinutes(b.startTime, start);
            let until = operatingMinutes(b.endTime, start);
            if (until <= at) until += 1440;
            if (open === null || at < open) open = at;
            if (close === null || until > close) close = until;
        }
    }
    if (open === null) return "";
    return `Every day, ${time12(minutesToHHMM(open))} to ${time12(minutesToHHMM(close))}`;
}

/** Site settings with contact.hours filled from the grounds when the admin left Opening hours empty. */
export async function withVenueHours(settings) {
    if (settings?.contact?.hours) return settings;
    const hours = await getVenueHoursLabel().catch(() => "");
    return hours ? { ...settings, contact: { ...settings.contact, hours } } : settings;
}

/**
 * Day start (minutes after midnight of the first slot) of each sheet a booking belongs to.
 * items: [{ pitchId, date }] -> Map("pitchId|date" -> minutes). Custom schedules for a date win.
 */
export async function getSheetDayStarts(items) {
    const map = new Map();
    if (!items.length) return map;
    const ids = [...new Set(items.map((i) => i.pitchId))];
    const dates = [...new Set(items.map((i) => i.date))];
    const [rows, overrides] = await Promise.all([
        db.select({ id: pitches.id, defaultBlocks: pitches.defaultBlocks }).from(pitches).where(inArray(pitches.id, ids)),
        db
            .select({ pitchId: timeBlocks.pitchId, date: timeBlocks.date, startTime: timeBlocks.startTime })
            .from(timeBlocks)
            .where(and(inArray(timeBlocks.pitchId, ids), inArray(timeBlocks.date, dates), eq(timeBlocks.isActive, true)))
            .orderBy(asc(timeBlocks.sortOrder)),
    ]);
    const defaults = new Map(rows.map((p) => [p.id, dayStartOf(defaultSheet(p))]));
    const firstOverride = new Map();
    for (const o of overrides) {
        const key = `${o.pitchId}|${o.date}`;
        if (!firstOverride.has(key)) firstOverride.set(key, dayStartOf([o]));
    }
    for (const i of items) {
        const key = `${i.pitchId}|${i.date}`;
        map.set(key, firstOverride.get(key) ?? defaults.get(i.pitchId) ?? dayStartOf([]));
    }
    return map;
}

function groupBy(list, keyFn) {
    const m = new Map();
    for (const x of list) {
        const k = keyFn(x);
        if (!m.has(k)) m.set(k, []);
        m.get(k).push(x);
    }
    return m;
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
        dayStart: dayStartOf(blocks), // the sheet's first slot: decides after-midnight and "already started"
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
 * [{ id, start, end, price, state: "free" | "booked" | "held" | "past", mine, late }]
 * late = played after midnight (the next calendar day), e.g. 01:30 on a sheet that starts at 06:00.
 */
export async function getSlotBoard(pitchId, date, viewerId = null) {
    const pitch = await getPitchById(pitchId);
    if (!pitch) return null;

    const [blocks, taken] = await Promise.all([getTimeBlocksForPitch(pitch, date), getTakenSlots(pitchId, date)]);
    const dayStart = dayStartOf(blocks);

    return blocks.map((b) => {
        const t = taken.get(b.startTime);
        let state = "free";
        if (t?.status === "confirmed") state = "booked";
        else if (t?.status === "held") state = "held";
        else if (isBlockPast(date, b.startTime, dayStart)) state = "past";
        return {
            id: b.id,
            start: b.startTime,
            end: b.endTime,
            price: b.price,
            state,
            mine: Boolean(t && viewerId && t.userId === viewerId),
            late: isAfterMidnight(b.startTime, dayStart),
        };
    });
}

/**
 * Home page "Grounds open today": every active ground with the start times
 * still free on today's operating day (not started, not booked, not on hold).
 * Returns { date, pitches: [...toPitchView, freeToday: ["19:30", ...], parts: ["morning", ...]], freeCount }.
 */
export async function getGroundsToday() {
    const { date } = await currentVenueDay();
    const rows = await db
        .select()
        .from(pitches)
        .where(eq(pitches.isActive, true))
        .orderBy(asc(pitches.sortOrder), asc(pitches.name));

    const list = await Promise.all(
        rows.map(async (p) => {
            const [blocks, taken] = await Promise.all([getTimeBlocksForPitch(p, date), getTakenSlots(p.id, date)]);
            const dayStart = dayStartOf(blocks);
            const freeToday = blocks
                .filter((b) => b.price > 0 && !taken.has(b.startTime) && !isBlockPast(date, b.startTime, dayStart))
                .map((b) => b.startTime);
            // parts of the day this ground normally has slots in (home page search shows only these)
            const sheet = defaultSheet(p);
            const sheetStart = dayStartOf(sheet);
            const parts = partsOf(sheet.map((b) => ({ start: b.startTime, late: isAfterMidnight(b.startTime, sheetStart) })));
            return { ...toPitchView(p), freeToday, parts };
        })
    );

    return { date, pitches: list, freeCount: list.reduce((n, p) => n + p.freeToday.length, 0) };
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
            pitchId: bookings.pitchId,
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
    const dayStarts = await getSheetDayStarts(rows.map((r) => ({ pitchId: r.pitchId, date: r.bookingDate })));

    return rows.map((r) => {
        const dayStart = dayStarts.get(`${r.pitchId}|${r.bookingDate}`);
        let status = r.status;
        // A hold whose time ran out counts as expired even before the cleanup runs.
        if (status === "held" && r.holdExpiresAt && r.holdExpiresAt.getTime() <= now) status = "expired";
        // A confirmed booking whose start time has passed is shown as played.
        if (status === "confirmed" && isBlockPast(r.bookingDate, r.startTime, dayStart)) status = "completed";

        return {
            id: r.code,
            bookingId: r.id,
            pitch: r.pitchName,
            format: r.pitchFormat ?? "",
            date: r.bookingDate,
            start: r.startTime,
            end: r.endTime,
            dayStart, // sheet's first slot, for after-midnight dates on the ticket and calendar
            total: Number(r.totalPrice),
            discount: Number(r.discount ?? 0),
            status,
            paidWith: r.paymentStatus === "paid" ? "Online" : null,
            refundDue: r.paymentStatus === "refund_due",
            refunded: r.paymentStatus === "refunded",
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