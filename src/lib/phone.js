// src/lib/phone.js
// Bangladeshi mobile numbers, shared by sign-up (auth hooks), the profile form and anywhere else that saves a phone.
// Pure: safe on the server and in the browser.

export const BD_PHONE_RE = /^01[3-9]\d{8}$/;
export const BD_PHONE_HINT = "Enter a Bangladeshi mobile number, e.g. 01712345678.";

/** "+8801712345678", "8801712345678", "01712-345678" -> "01712345678"; anything else stays as typed (and fails BD_PHONE_RE). */
export function normalizeBdPhone(raw) {
    const digits = String(raw ?? "").replace(/[\s-]/g, "");
    const m = digits.match(/^(?:\+?88)?(01[3-9]\d{8})$/);
    return m ? m[1] : digits;
}

/** Normalised number, "" for empty, or null when it isn't a valid BD mobile. */
export function cleanBdPhone(raw) {
    const v = normalizeBdPhone(raw);
    if (v === "") return "";
    return BD_PHONE_RE.test(v) ? v : null;
}