// src/i18n/I18nProvider.jsx
"use client";

import { createContext, useCallback, useContext, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, normalizeLocale } from "./config";
import { makeFormat } from "./format";
import { makeT } from "./translate";

const I18nContext = createContext(null);

/**
 * Wraps the whole app (root layout). The server picks the locale from the cookie and passes
 * that one dictionary, so the first paint is already in the right language (no flash, no mismatch).
 */
export function I18nProvider({ locale, dict, fallback = null, children }) {
    const router = useRouter();
    const [switching, startTransition] = useTransition();

    const setLocale = useCallback(
        (next) => {
            const value = normalizeLocale(next);
            document.cookie = `${LOCALE_COOKIE}=${value}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
            // Server components read the cookie again; client components get the new dictionary from the provider.
            startTransition(() => router.refresh());
        },
        [router]
    );

    const value = useMemo(() => {
        const f = makeFormat(locale);
        return { locale, t: makeT(dict, fallback, f.digits), f, setLocale, switching };
    }, [locale, dict, fallback, setLocale, switching]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** { locale, t, f, setLocale, switching } in client components. */
export function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx) {
        // Outside the provider (should not happen): plain English so nothing crashes.
        const f = makeFormat("en");
        return { locale: "en", t: (k) => k, f, setLocale: () => { }, switching: false };
    }
    return ctx;
}