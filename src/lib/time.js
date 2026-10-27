// src/lib/time.js
// Time helpers. Everything is computed in Asia/Dhaka, never in the server's
// own timezone (servers usually run in UTC).
//
// "Sheet" = one ground's list of slots for one date (its default schedule, or a custom one for that date).
// A sheet's day starts at its FIRST slot (e.g. 05:00, 06:00 or 16:00) and runs past midnight:
// a slot that starts earlier than the first slot (e.g. 01:30 on a 06:00 sheet) is played after
// midnight, on the next calendar day, but belongs to that sheet and is stored with its date.
// Pass the sheet's day start (minutes, from dayStartOf(blocks)) to the helpers below.
// DEFAULT_DAY_START (6 am) is only a fallback for a ground with no slots.

export const DEFAULT_DAY_START = 6 * 60;
/** @deprecated use DEFAULT_DAY_START (minutes). */
export const DAY_START_HOUR = 6;

const TZ = "Asia/Dhaka";

const DHAKA_DATE = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});
const DHAKA_TIME = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
});

/** "YYYY-MM-DD" in Asia/Dhaka for a given Date (defaults to now). */
export function dhakaDate(d = new Date()) {
    return DHAKA_DATE.format(d);
}

/** "HH:MM" in Asia/Dhaka for a given Date (defaults to now). */
export function dhakaTime(d = new Date()) {
    // Some runtimes print midnight as "24:00"
    return DHAKA_TIME.format(d).replace(/^24:/, "00:");
}

/** "HH:MM" -> minutes since midnight. */
export function hhmmToMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
}

/** minutes since midnight -> "HH:MM". */
export function minutesToHHMM(minutes) {
    const m = ((minutes % 1440) + 1440) % 1440;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Add days to a "YYYY-MM-DD" string, returns the same format. */
export function addDaysISO(iso, days) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
}

/** Minutes after midnight of a sheet's first slot. blocks: [{ startTime } | { start }] in sheet order. */
export function dayStartOf(blocks, fallback = DEFAULT_DAY_START) {
    const first = Array.isArray(blocks) ? blocks[0] : null;
    const t = first?.startTime ?? first?.start;
    return typeof t === "string" && /^\d{2}:\d{2}$/.test(t) ? hhmmToMinutes(t) : fallback;
}

/** True if a slot starting at hhmm on a sheet that starts at dayStart is played after midnight. */
export function isAfterMidnight(hhmm, dayStart = DEFAULT_DAY_START) {
    return hhmmToMinutes(hhmm) < dayStart;
}

/**
 * Minutes on the sheet's clock: after-midnight times continue past 1440.
 * With dayStart 06:00: "06:00" -> 360, "23:00" -> 1380, "01:30" -> 1530.
 */
export function operatingMinutes(hhmm, dayStart = DEFAULT_DAY_START) {
    const m = hhmmToMinutes(hhmm);
    return m < dayStart ? m + 1440 : m;
}

/** The calendar date a slot is actually played on (next day for after-midnight slots). */
export function playDateOf(isoDate, startHHMM, dayStart = DEFAULT_DAY_START) {
    return isAfterMidnight(startHHMM, dayStart) ? addDaysISO(isoDate, 1) : isoDate;
}

/** True once a slot (sheet date + start time) has started, compared with the real time in Dhaka. */
export function isBlockPast(isoDate, startHHMM, dayStart = DEFAULT_DAY_START, now = new Date()) {
    const starts = `${playDateOf(isoDate, startHHMM, dayStart)} ${startHHMM}`;
    return starts <= `${dhakaDate(now)} ${dhakaTime(now)}`;
}

/** Days since 1970-01-01 for a "YYYY-MM-DD" string. */
function dayNumber(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d) / 86400000;
}

/**
 * A slot's real time span as [start, end) in absolute minutes, so slots on neighbouring sheets
 * (yesterday's after-midnight slots vs today's first slots) can be compared for overlap.
 * A slot whose end time is before its start runs past midnight.
 */
export function slotInterval(isoDate, startHHMM, endHHMM, dayStart = DEFAULT_DAY_START) {
    const start = dayNumber(isoDate) * 1440 + operatingMinutes(startHHMM, dayStart);
    let length = (hhmmToMinutes(endHHMM) - hhmmToMinutes(startHHMM) + 1440) % 1440;
    if (length === 0) length = 1440;
    return [start, start + length];
}

/** True if two [start, end) intervals share any minute. */
export function intervalsOverlap(a, b) {
    return a[0] < b[1] && b[0] < a[1];
}

/** "Now" in the same absolute minutes as slotInterval (Dhaka clock). */
export function nowMinutesAbs(now = new Date()) {
    return dayNumber(dhakaDate(now)) * 1440 + hhmmToMinutes(dhakaTime(now));
}

/** True once a slot has finished (its end is at or before the time in Dhaka). */
export function isBlockEnded(isoDate, startHHMM, endHHMM, dayStart = DEFAULT_DAY_START, now = new Date()) {
    return slotInterval(isoDate, startHHMM, endHHMM, dayStart)[1] <= nowMinutesAbs(now);
}

/**
 * When a sheet's after-midnight part ends (minutes after midnight, 0 if nothing runs past midnight).
 * A 06:00 sheet whose last slot is 01:30-03:00 -> 180.
 */
export function nightEndOf(blocks, dayStart = dayStartOf(blocks)) {
    let end = 0;
    for (const b of Array.isArray(blocks) ? blocks : []) {
        const s = b.startTime ?? b.start;
        const e = b.endTime ?? b.end;
        if (typeof s !== "string" || typeof e !== "string") continue;
        const sm = hhmmToMinutes(s);
        const em = hhmmToMinutes(e);
        // ends after midnight: starts after midnight, or crosses midnight (end before start)
        if (sm < dayStart || em <= sm) end = Math.max(end, em);
    }
    return end;
}

/**
 * The venue day that is running right now. Until `nightEnd` (minutes after midnight, the end of the
 * latest after-midnight slot of any ground) yesterday's sheets are still "today".
 * At 01:00 on 12 Oct with nightEnd 180 -> { date: "2026-10-11", minutes: 1500 }.
 * With nightEnd 0 (no ground runs past midnight) "today" is simply the calendar date.
 */
export function currentOperatingDay(nightEnd = 0, now = new Date()) {
    const date = dhakaDate(now);
    const mins = hhmmToMinutes(dhakaTime(now));
    if (mins < nightEnd) return { date: addDaysISO(date, -1), minutes: mins + 1440 };
    return { date, minutes: mins };
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-11" -> "Sun 11 Oct". Safe on server and client (no locale APIs). */
export function shortDateLabel(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return `${DAYS[dt.getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}