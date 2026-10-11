// src/lib/time.js
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
    return DHAKA_TIME.format(d);
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
 * A block whose start time is before the venue's close-hour is part of the
 * previous operating day (e.g. a 01:30 slot on a sheet headed "Sat 11 Oct"
 * is really Fri night). Returns the operating day in "YYYY-MM-DD".
 */
export function operatingDay(isoDate, startHHMM, openHour = 6) {
    const startMin = hhmmToMinutes(startHHMM);
    return startMin < openHour * 60 ? addDaysISO(isoDate, -1) : isoDate;
}