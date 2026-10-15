// src/features/booking/calendar.js
// Pure helpers for showing a booking's real calendar date and adding it to Google Calendar.
// Safe on the server and in the browser (works from the "YYYY-MM-DD" string, no time zone maths).
import { addDaysISO, hhmmToMinutes, DAY_START_HOUR } from "@/lib/time";

/** Slots that start before 6 am belong to the previous day's sheet but are played after midnight. */
export const isAfterMidnight = (start) => hhmmToMinutes(start) < DAY_START_HOUR * 60;

/** The calendar day the slot is actually played on. */
export const playDate = (b) => (isAfterMidnight(b.start) ? addDaysISO(b.date, 1) : b.date);

/** Google Calendar "add event" link for { id, pitch, date, start, end }. */
export function calendarUrl(b) {
    const stamp = (time) => {
        const day = isAfterMidnight(time) ? addDaysISO(b.date, 1) : b.date;
        return `${day.replaceAll("-", "")}T${time.replace(":", "")}00`;
    };
    const q = new URLSearchParams({
        action: "TEMPLATE",
        text: `${b.pitch} booking (${b.id})`,
        dates: `${stamp(b.start)}/${stamp(b.end)}`,
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