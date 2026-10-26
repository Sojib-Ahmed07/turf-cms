// src/i18n/config.js
// Site languages. Pure: safe on the server and in the browser.
// The choice lives in a cookie (no /bn URLs), so every page keeps its address in both languages.

export const LOCALES = ["en", "bn"];
export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "lang";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** "bn" | "en" from any value (cookie, form field); unknown values become the default. */
export function normalizeLocale(value) {
    return LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}