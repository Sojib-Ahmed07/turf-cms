// src/features/admin/schedule-guard.js
// Stops schedule edits from leaving booked players without their slot.
//
// Bookings store their own date, start and end. Which real time that means depends on the sheet
// (after-midnight slots belong to the previous date), and the slot board matches bookings to the
// sheet's blocks. So a change to a sheet must keep every active, not-yet-finished booking on that
// date at exactly the same real time as one of the new blocks. Otherwise the ground could be sold
// twice for the same time, and the existing booking would vanish from the boards.
import "server-only";
import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bookings, timeBlocks } from "@/db/schema";
import { activeBookingWhere, currentVenueDay, getSheetDayStarts } from "@/features/booking/queries";
import { addDaysISO, dayStartOf, isBlockEnded, shortDateLabel, slotInterval } from "@/lib/time";
import { BN } from "@/i18n/format";
import { time12 } from "@/lib/utils";

const sameSpan = (a, b) => a[0] === b[0] && a[1] === b[1];

function sortBlocks(blocks) {
    return [...(Array.isArray(blocks) ? blocks : [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/** Active bookings of a ground from yesterday's sheet on (older ones have finished), optionally only some dates. */
async function activeBookings(pitchId, dates = null) {
    const { date: today } = await currentVenueDay();
    const where = [eq(bookings.pitchId, pitchId), gte(bookings.bookingDate, addDaysISO(today, -1)), activeBookingWhere()];
    if (dates) where.push(inArray(bookings.bookingDate, dates));
    return db
        .select({
            code: bookings.code,
            bookingDate: bookings.bookingDate,
            startTime: bookings.startTime,
            endTime: bookings.endTime,
            customerName: bookings.customerName,
        })
        .from(bookings)
        .where(and(...where))
        .orderBy(asc(bookings.bookingDate), asc(bookings.startTime));
}

/**
 * newSheets: Map(date -> blocks [{ startTime, endTime, sortOrder }]) = what each date's sheet becomes.
 * Returns the bookings that would lose their slot: [{ code, date, startTime, endTime, customerName }].
 */
async function orphanedBy(pitchId, list, newSheets) {
    if (!list.length) return [];
    const oldStarts = await getSheetDayStarts(list.map((b) => ({ pitchId, date: b.bookingDate })));
    const out = [];
    for (const b of list) {
        const sheet = newSheets.get(b.bookingDate);
        if (!sheet) continue;
        const oldStart = oldStarts.get(`${pitchId}|${b.bookingDate}`);
        if (isBlockEnded(b.bookingDate, b.startTime, b.endTime, oldStart)) continue; // already played
        const span = slotInterval(b.bookingDate, b.startTime, b.endTime, oldStart);
        const newStart = dayStartOf(sheet);
        const kept = sheet.some((n) => sameSpan(slotInterval(b.bookingDate, n.startTime, n.endTime, newStart), span));
        if (!kept) out.push({ code: b.code, date: b.bookingDate, startTime: b.startTime, endTime: b.endTime, customerName: b.customerName });
    }
    return out;
}

/** Conflicts if one date's sheet becomes `blocks` (custom day, reset to default, copy of default). */
export async function conflictsForDate(pitchId, date, blocks) {
    const list = await activeBookings(pitchId, [date]);
    return orphanedBy(pitchId, list, new Map([[date, sortBlocks(blocks)]]));
}

/** Conflicts if the ground's default schedule becomes `blocks` (affects every date without a custom day). */
export async function conflictsForDefault(pitchId, blocks) {
    const list = await activeBookings(pitchId);
    if (!list.length) return [];
    const dates = [...new Set(list.map((b) => b.bookingDate))];
    const custom = await db
        .selectDistinct({ date: timeBlocks.date })
        .from(timeBlocks)
        .where(and(eq(timeBlocks.pitchId, pitchId), inArray(timeBlocks.date, dates), eq(timeBlocks.isActive, true)));
    const customDates = new Set(custom.map((c) => c.date));
    const sheet = sortBlocks(blocks);
    const newSheets = new Map(dates.filter((d) => !customDates.has(d)).map((d) => [d, sheet]));
    return orphanedBy(pitchId, list, newSheets);
}

/** Admin-facing refusal listing the bookings in the way. */
export function conflictError(conflicts) {
    const shown = conflicts.slice(0, 4).map(
        (c) => `${shortDateLabel(c.date)} ${time12(c.startTime)} থেকে ${time12(c.endTime)} (${c.code}${c.customerName ? `, ${c.customerName}` : ""})`
    );
    const more = conflicts.length > 4 ? ` এবং আরও ${BN.digits(conflicts.length - 4)}টি` : "";
    const n = conflicts.length;
    return {
        ok: false,
        conflicts,
        error:
            `এই পরিবর্তনে ${BN.digits(n)}টি বুক হওয়া স্লট সরে যাবে বা মুছে যাবে: ${shown.join("; ")}${more}। ` +
            "নতুন স্লটে ঠিক ওই সময়গুলো রাখুন, অথবা আগে “বুকিং” পেজ থেকে ওই বুকিংগুলো ক্যানসেল করুন বা সরান।",
    };
}