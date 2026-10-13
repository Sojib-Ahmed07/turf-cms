// src/lib/time.js
// Time helpers. Everything is computed in Asia/Dhaka, never in the server's
// own timezone (servers usually run in UTC).
//
// "Operating day": the booking day starts at DAY_START_HOUR (6 am) for every
// ground, whatever its opening hours, and runs past midnight (close 3 am).
// A 01:30 slot on the sheet for Sat 11 Oct is played in the early hours of
// Sun 12 Oct, but it belongs to Saturday's sheet and is stored with
// bookingDate = "2026-10-11" (same rule as the prototype: start < 6:00 = after midnight).
// Don't pass a ground's openHour here: a ground opening at 4 pm must not shift "today".

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

/**
 * Minutes since the START of the operating day.
 * With openHour 6: "06:00" -> 360, "23:00" -> 1380, "01:30" -> 1530 (after midnight).
 */
export function operatingMinutes(hhmm, openHour = DAY_START_HOUR) {
    const m = hhmmToMinutes(hhmm);
    return m < openHour * 60 ? m + 1440 : m;
}

/**
 * The operating day that is running right now, and how far into it we are.
 * At 01:00 on 12 Oct (Dhaka) this returns { date: "2026-10-11", minutes: 1500 }.
 */
export function currentOperatingDay(openHour = DAY_START_HOUR, now = new Date()) {
    const date = dhakaDate(now);
    const time = dhakaTime(now);
    const mins = hhmmToMinutes(time);
    if (mins < openHour * 60) {
        return { date: addDaysISO(date, -1), minutes: mins + 1440 };
    }
    return { date, minutes: mins };
}

/** True if a block on sheet `isoDate` starting at `startHHMM` has already started. */
export function isBlockPast(isoDate, startHHMM, openHour = DAY_START_HOUR, now = new Date()) {
    const today = currentOperatingDay(openHour, now);
    if (isoDate < today.date) return true;
    if (isoDate > today.date) return false;
    return operatingMinutes(startHHMM, openHour) <= today.minutes;
}

/** Kept for older imports: the operating day a calendar date + start time belongs to. */
export function operatingDay(isoDate, startHHMM, openHour = DAY_START_HOUR) {
    const startMin = hhmmToMinutes(startHHMM);
    return startMin < openHour * 60 ? addDaysISO(isoDate, -1) : isoDate;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-11" -> "Sun 11 Oct". Safe on server and client (no locale APIs). */
export function shortDateLabel(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return `${DAYS[dt.getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}