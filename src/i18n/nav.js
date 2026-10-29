// src/i18n/nav.js
// Menu labels come from the CMS and are shown as the admin typed them. Pure.

/** item: { label, href } -> label to show. */
export function navLabel(item) {
    return item.label;
}

/** The menu button text ("স্লট বুক করুন" when empty). */
export function bookButtonLabel(label, t) {
    return label?.trim() || t("common.bookSlot");
}