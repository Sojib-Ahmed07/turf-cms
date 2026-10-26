// src/i18n/format.js
// Locale-aware formatting for money, times and dates. Pure: safe on the server and in the browser.
// Bangla uses Bangla digits (৳১,৮০০, সন্ধ্যা ৬:৩০, সোম, ২৬ অক্টোবর). Works from "YYYY-MM-DD" / "HH:MM" strings,
// so there is no time zone maths and server and browser always print the same text (no hydration mismatch).

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/** "12:30" -> "১২:৩০". Any ASCII digit becomes a Bangla digit. */
export function toBnDigits(value) {
    return String(value ?? "").replace(/[0-9]/g, (d) => BN_DIGITS[d]);
}

const EN = {
    daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

const BN = {
    daysShort: ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি"],
    days: ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"],
    monthsShort: ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"],
    months: ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"],
};

/** Bangla part of the day for an hour 0-23 (how people say the time: "সন্ধ্যা ৬টা"). */
function bnPeriod(h) {
    if (h < 4) return "রাত";
    if (h < 6) return "ভোর";
    if (h < 12) return "সকাল";
    if (h < 15) return "দুপুর";
    if (h < 18) return "বিকেল";
    if (h < 20) return "সন্ধ্যা";
    return "রাত";
}

function parseISO(iso) {
    const [y, m, d] = String(iso).split("-").map(Number);
    return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/**
 * Formatter for one locale:
 *   f.digits("12")       "12" | "১২"
 *   f.num(1800)          "1,800" | "১,৮০০"
 *   f.taka(1800)         "৳1,800" | "৳১,৮০০"
 *   f.time("18:30")      "6:30 pm" | "সন্ধ্যা ৬:৩০"   ("18:00" -> "6 pm" | "সন্ধ্যা ৬টা")
 *   f.date(iso)          "Mon 26 Oct" | "সোম, ২৬ অক্টোবর"
 *   f.dateLong(iso)      "Monday 26 October 2026" | "সোমবার, ২৬ অক্টোবর ২০২৬"
 *   f.dayMonth(iso)      "26 Oct" | "২৬ অক্টোবর"
 *   f.monthYear(iso)     "October 2026" | "অক্টোবর ২০২৬"
 *   f.dayShort(dow)      "Mon" | "সোম"
 */
export function makeFormat(locale = "en") {
    const bn = locale === "bn";
    const L = bn ? BN : EN;
    const digits = (v) => (bn ? toBnDigits(v) : String(v ?? ""));
    const num = (n) => digits((Number(n) || 0).toLocaleString("en-IN"));

    function time(hhmm) {
        if (!hhmm) return "";
        const [h, m] = String(hhmm).split(":").map(Number);
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        const mm = String(m).padStart(2, "0");
        if (bn) return m === 0 ? `${bnPeriod(h)} ${digits(hour12)}টা` : `${bnPeriod(h)} ${digits(`${hour12}:${mm}`)}`;
        const suffix = h >= 12 ? "pm" : "am";
        return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${mm} ${suffix}`;
    }

    function date(iso) {
        if (!iso) return "";
        const { m, d, dow } = parseISO(iso);
        return bn ? `${L.daysShort[dow]}, ${digits(d)} ${L.months[m - 1]}` : `${L.daysShort[dow]} ${d} ${L.monthsShort[m - 1]}`;
    }

    function dateLong(iso) {
        if (!iso) return "";
        const { y, m, d, dow } = parseISO(iso);
        return bn ? `${L.days[dow]}, ${digits(d)} ${L.months[m - 1]} ${digits(y)}` : `${L.days[dow]} ${d} ${L.months[m - 1]} ${y}`;
    }

    function dayMonth(iso) {
        if (!iso) return "";
        const { m, d } = parseISO(iso);
        return bn ? `${digits(d)} ${L.months[m - 1]}` : `${d} ${L.monthsShort[m - 1]}`;
    }

    function monthYear(iso) {
        if (!iso) return "";
        const { y, m } = parseISO(iso);
        return `${L.months[m - 1]} ${digits(y)}`;
    }

    return {
        locale,
        digits,
        num,
        taka: (n) => `৳${num(n)}`,
        time,
        date,
        dateLong,
        dayMonth,
        monthYear,
        dayShort: (dow) => L.daysShort[dow] ?? "",
        monthName: (m) => L.months[m - 1] ?? "",
    };
}