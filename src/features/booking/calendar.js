// src/features/booking/calendar.js
// Pure helpers for showing a booking's real calendar date and adding it to Google Calendar.
// Safe on the server and in the browser (works from the "YYYY-MM-DD" string, no time zone maths).
import { addDaysISO, DEFAULT_DAY_START, hhmmToMinutes, isAfterMidnight as afterMidnight } from "@/lib/time";

/** How many venue days players can book ahead, today included (the /book date strip and the server check). */
export const BOOKING_DAYS_AHEAD = 30; // one month: today + 29 days

/** A real calendar day "YYYY-MM-DD" (rejects 2026-02-31). */
export const isRealDate = (iso) => typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso) && addDaysISO(iso, 0) === iso;

// Bookings carry `dayStart` (minutes after midnight of their sheet's first slot). A slot that starts
// before it, e.g. 01:30 on a sheet that opens at 06:00, is played after midnight on the next calendar day.
const startOf = (b) => (typeof b.dayStart === "number" ? b.dayStart : DEFAULT_DAY_START);

/** True if the booking { start, dayStart } is played after midnight. */
export const isAfterMidnight = (b) => afterMidnight(b.start, startOf(b));

/** The calendar day the slot is actually played on. */
export const playDate = (b) => (isAfterMidnight(b) ? addDaysISO(b.date, 1) : b.date);

/** Google Calendar "add event" link for { id, pitch, date, start, end, dayStart }. */
export function calendarUrl(b) {
    const startDay = playDate(b);
    const stamp = (time, isEnd) => {
        // the end is on the next day when the slot crosses midnight (e.g. 23:00 to 00:30)
        const crosses = isEnd && hhmmToMinutes(time) <= hhmmToMinutes(b.start);
        const day = crosses ? addDaysISO(startDay, 1) : startDay;
        return `${day.replaceAll("-", "")}T${time.replace(":", "")}00`;
    };
    const q = new URLSearchParams({
        action: "TEMPLATE",
        text: `${b.pitch} booking (${b.id})`,
        dates: `${stamp(b.start, false)}/${stamp(b.end, true)}`,
        ctz: "Asia/Dhaka",
        details: `Booking ${b.id}. Show your ticket at the desk.`,
    });
    return `https://calendar.google.com/calendar/render?${q}`;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-10-16" -> "Friday 16 October 2026" (no locale APIs, so server and browser agree). */
export function longDateLabel(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return `${DAYS[dow]} ${d} ${MONTHS[m - 1]} ${y}`;
}