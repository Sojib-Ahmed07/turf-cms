// src/i18n/I18nProvider.jsx
"use client";

import { createContext, useContext, useMemo } from "react";
import { LOCALE } from "./config";
import { makeFormat } from "./format";
import { makeT } from "./translate";

const I18nContext = createContext(null);

/** Wraps the whole app (root layout) and hands the Bangla dictionary to client components. */
export function I18nProvider({ dict, children }) {
    const value = useMemo(() => {
        const f = makeFormat(LOCALE);
        return { locale: LOCALE, t: makeT(dict, null, f.digits), f };
    }, [dict]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** { locale, t, f } in client components. */
export function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx) {
        // Outside the provider (should not happen): keys stay visible instead of crashing.
        const f = makeFormat(LOCALE);
        return { locale: LOCALE, t: (k) => k, f };
    }
    return ctx;
}