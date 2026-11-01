// src/features/coupons/rules.js
// Promo code rules. Pure functions (no database), shared by checkout and the admin.
//
// Coupon fields used (from the `coupons` table):
//   type "percent" | "fixed", value, maxDiscount, minAmount, usageLimit, perUserLimit,
//   pitchIds [uuid] (empty = every ground), timeWindow { days: [0-6], from: "HH:MM", to: "HH:MM" },
//   startsAt, endsAt, isActive
// `days` are weekdays of the booking's operating date (0 = Sunday). `from`/`to` compare the slot's
// START time on the operating-day clock, so "21:00 to 03:00" works across midnight. Empty `to` = until closing.
import { hhmmToMinutes, operatingMinutes } from "@/lib/time";
import { BN } from "@/i18n/format";
import { makeT } from "@/i18n/translate";
import bn from "@/i18n/dict/bn";

// The site is Bangla only: labels and errors always come from the Bangla dictionary.
const BN_I18N = { t: makeT(bn, null, BN.digits), f: BN };

export function normalizeCode(code) {
    return String(code ?? "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
}

/** "শুক্র, শনি রাত ৯টা থেকে" / "প্রতিদিন সকাল ৬টা থেকে সকাল ১০টা" / "" when there is no window. */
export function timeWindowLabel(tw, i18n = BN_I18N) {
    if (!tw || (!tw.days?.length && !tw.from && !tw.to)) return "";
    const some = tw.days?.length && tw.days.length < 7;
    const { t, f } = i18n ?? BN_I18N;
    const days = some ? [...tw.days].sort().map((d) => f.dayShort(d)).join(", ") : t("coupon.everyDay");
    if (tw.from && tw.to) return t("coupon.fromTo", { days, from: f.time(tw.from), to: f.time(tw.to) });
    if (tw.from) return t("coupon.fromOnly", { days, from: f.time(tw.from) });
    if (tw.to) return t("coupon.untilOnly", { days, to: f.time(tw.to) });
    return days;
}

/** "২০% ছাড়, সর্বোচ্চ ৳৬০০" / "৳২০০ ছাড়" */
export function discountLabel(c) {
    const v = Number(c.value);
    if (c.type === "percent") {
        return `${BN.digits(v)}% ছাড়${c.maxDiscount ? `, সর্বোচ্চ ${BN.taka(c.maxDiscount)}` : ""}`;
    }
    return `${BN.taka(v)} ছাড়`;
}

function weekday(isoDate) {
    const [y, m, d] = isoDate.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Can this coupon be used for this slot, and how much does it take off?
 * ctx: { subtotal, pitchId, date "YYYY-MM-DD" (sheet date), startTime "HH:MM", dayStart (minutes, sheet's first slot),
 *        now (ms), usesTotal, usesByUser (null when the player isn't signed in yet),
 *        i18n? ({ t, f } from getI18n(); Bangla by default) }
 * Returns { ok: true, discount, total } or { ok: false, error }.
 */
export function evaluateCoupon(c, ctx) {
    const i18n = ctx.i18n ?? BN_I18N;
    // key = coupon.<key> in the Bangla dictionary (the English text is kept as a note for developers)
    const no = (key, _note, vars) => ({ ok: false, error: i18n.t(`coupon.${key}`, vars) });
    if (!c || !c.isActive) return no("invalid", "That code isn't valid. Check the spelling.");

    const now = ctx.now ?? Date.now();
    if (c.startsAt && new Date(c.startsAt).getTime() > now) return no("notYet", "This code isn't active yet.");
    if (c.endsAt && new Date(c.endsAt).getTime() <= now) return no("expired", "This code has expired.");
    if (c.usageLimit != null && (ctx.usesTotal ?? 0) >= c.usageLimit) return no("usedUp", "This code has been fully used.");
    if (c.perUserLimit != null && ctx.usesByUser != null && ctx.usesByUser >= c.perUserLimit) {
        return c.perUserLimit === 1
            ? no("usedOnce", "You've already used this code.")
            : no("usedTimes", `You've used this code ${c.perUserLimit} times already.`, { count: c.perUserLimit });
    }

    const subtotal = Number(ctx.subtotal) || 0;
    if (c.minAmount != null && subtotal < Number(c.minAmount)) {
        const amount = i18n.f.taka(c.minAmount);
        return no("minAmount", `This code works on slots of ${amount} or more.`, { amount });
    }

    const pitchIds = Array.isArray(c.pitchIds) ? c.pitchIds : [];
    if (pitchIds.length && !pitchIds.includes(ctx.pitchId)) return no("wrongGround", "This code doesn't work on this ground.");

    const tw = c.timeWindow && typeof c.timeWindow === "object" ? c.timeWindow : null;
    if (tw) {
        const label = timeWindowLabel(tw, i18n);
        if (Array.isArray(tw.days) && tw.days.length && tw.days.length < 7 && !tw.days.includes(weekday(ctx.date))) {
            return no("onlyWhen", `This code only works ${label}.`, { when: label });
        }
        // Compare on the sheet's clock, so "from 9 pm to 2 am" covers the after-midnight slots too.
        const start = operatingMinutes(ctx.startTime, ctx.dayStart);
        const from = tw.from ? operatingMinutes(tw.from, ctx.dayStart) : 0;
        const to = tw.to ? operatingMinutes(tw.to, ctx.dayStart) : 48 * 60;
        if (start < from || start >= to) return no("onlyWhen", `This code only works ${label}.`, { when: label });
    }

    const value = Number(c.value) || 0;
    let discount = c.type === "percent" ? Math.floor((subtotal * value) / 100) : value;
    if (c.maxDiscount != null) discount = Math.min(discount, Number(c.maxDiscount));
    discount = Math.max(0, Math.min(Math.round(discount), subtotal));
    if (discount === 0) return no("nothingOff", "This code doesn't take anything off this slot.");
    return { ok: true, discount, total: subtotal - discount };
}

/** Validate an "HH:MM" string on the half hour grid used by the admin. */
export function isHHMM(v) {
    return typeof v === "string" && /^\d{2}:\d{2}$/.test(v) && hhmmToMinutes(v) < 24 * 60;
}