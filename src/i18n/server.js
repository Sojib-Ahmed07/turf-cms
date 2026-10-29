// src/i18n/server.js
// Bangla texts on the server: pages, layouts, server components and server actions.
//   const { t, f } = await getI18n();
//   t("book.title")  f.taka(1800)  f.time("18:30")
import "server-only";
import { LOCALE } from "./config";
import { makeFormat } from "./format";
import { makeT } from "./translate";
import bn from "./dict/bn";

const f = makeFormat(LOCALE);
const t = makeT(bn, null, f.digits);

/** Always "bn" (kept so callers don't need to change). */
export async function getLocale() {
    return LOCALE;
}

/** The dictionary sent to the browser (I18nProvider). */
export function getDictionary() {
    return bn;
}

/** { locale, t, f }. Async so existing `await getI18n()` calls keep working. */
export async function getI18n() {
    return { locale: LOCALE, t, f };
}

/** Same as getI18n(), without await (for plain functions like emails and query helpers). */
export function i18nSync() {
    return { locale: LOCALE, t, f };
}