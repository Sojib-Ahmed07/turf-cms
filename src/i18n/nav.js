// src/i18n/nav.js
// Menu labels come from the CMS. While the admin keeps a link's default English label, show the built-in
// translation for the visitor's language; a label the admin renamed is shown as typed
// (Step 9d adds a Bangla label field for those). Pure.

const DEFAULTS = {
    "/": { en: "Home", key: "nav.home" },
    "/book": { en: "Book a slot", key: "nav.book" },
    "/grounds": { en: "Grounds", key: "nav.grounds" },
    "/#grounds": { en: "Grounds", key: "nav.grounds" }, // old link, kept until migration 0007 rewrites it
    "/#visit": { en: "Contact", key: "nav.contact" },
    "/bookings": { en: "My bookings", key: "common.myBookings" },
};

/** item: { label, href, labelBn? } -> label in the visitor's language */
export function navLabel(item, t, locale) {
    if (locale === "bn" && item.labelBn) return item.labelBn;
    const d = DEFAULTS[item.href];
    if (d && item.label?.trim() === d.en) return t(d.key);
    return item.label;
}

/** The menu button text ("Book a slot" by default). */
export function bookButtonLabel(label, t) {
    return !label || label.trim() === "Book a slot" ? t("common.bookSlot") : label;
}