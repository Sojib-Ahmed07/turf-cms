// src/i18n/server.js
// Language on the server: pages, layouts, server components and server actions.
//   const { locale, t, f } = await getI18n();
//   t("book.title")  f.taka(1800)  f.time("18:30")
import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeLocale } from "./config";
import { makeFormat } from "./format";
import { makeT } from "./translate";
import en from "./dict/en";
import bn from "./dict/bn";

const DICTS = { en, bn };

/** "en" | "bn" from the visitor's cookie. Never throws (outside a request it's the default). */
export async function getLocale() {
    try {
        const store = await cookies();
        return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
    } catch {
        return normalizeLocale();
    }
}

/** Dictionary for a locale (the client provider gets only the one it needs). */
export function getDictionary(locale) {
    return DICTS[normalizeLocale(locale)];
}

/** { locale, t, f } for the current request. */
export async function getI18n() {
    const locale = await getLocale();
    const f = makeFormat(locale);
    const t = makeT(DICTS[locale], locale === "en" ? null : en, f.digits);
    return { locale, t, f };
}