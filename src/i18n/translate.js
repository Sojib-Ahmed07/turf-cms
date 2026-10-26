// src/i18n/translate.js
// t("book.slotsFree", { count: 3 }) lookup with {placeholders}. Pure: safe on the server and in the browser.
//
// Dictionary values are strings, or { one, other } for words that change with a count (English);
// Bangla simply uses `other`. A missing key falls back to the English dictionary, then to the key itself,
// so a forgotten translation never breaks a page.

function lookup(dict, key) {
    let v = dict;
    for (const part of key.split(".")) {
        if (v == null || typeof v !== "object") return undefined;
        v = v[part];
    }
    return v;
}

function pick(value, vars) {
    if (value && typeof value === "object" && ("other" in value || "one" in value)) {
        const n = vars?.count;
        return n === 1 && value.one != null ? value.one : (value.other ?? value.one);
    }
    return value;
}

/**
 * makeT(dict, fallback, digits) -> t(key, vars)
 * `digits` formats numeric placeholders ({count}, {minutes}...) so Bangla shows Bangla digits.
 */
export function makeT(dict, fallback = null, digits = (v) => String(v)) {
    return function t(key, vars) {
        let value = pick(lookup(dict, key), vars);
        if (value === undefined && fallback) value = pick(lookup(fallback, key), vars);
        if (typeof value !== "string") return key;
        if (!vars) return value;
        return value.replace(/\{(\w+)\}/g, (all, name) => {
            if (!(name in vars)) return all;
            const v = vars[name];
            return typeof v === "number" ? digits(v) : String(v ?? "");
        });
    };
}