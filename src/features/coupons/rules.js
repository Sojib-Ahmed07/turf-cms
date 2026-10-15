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

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function normalizeCode(code) {
    return String(code ?? "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
}

function to12(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    const suffix = h >= 12 ? "pm" : "am";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "Fri, Sat from 9 pm" / "every day 6 am to 10 am" / "" when there is no window. */
export function timeWindowLabel(tw) {
    if (!tw || (!tw.days?.length && !tw.from && !tw.to)) return "";
    const days = tw.days?.length && tw.days.length < 7 ? [...tw.days].sort().map((d) => DAY_NAMES[d]).join(", ") : "every day";
    if (tw.from && tw.to) return `${days} ${to12(tw.from)} to ${to12(tw.to)}`;
    if (tw.from) return `${days} from ${to12(tw.from)}`;
    if (tw.to) return `${days} until ${to12(tw.to)}`;
    return days;
}

/** "20% off, up to ৳600" / "৳200 off" */
export function discountLabel(c) {
    const v = Number(c.value);
    if (c.type === "percent") {
        return `${v}% off${c.maxDiscount ? `, up to ৳${Number(c.maxDiscount).toLocaleString("en-IN")}` : ""}`;
    }
    return `৳${v.toLocaleString("en-IN")} off`;
}

function weekday(isoDate) {
    const [y, m, d] = isoDate.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Can this coupon be used for this slot, and how much does it take off?
 * ctx: { subtotal, pitchId, date "YYYY-MM-DD" (sheet date), startTime "HH:MM", dayStart (minutes, sheet's first slot),
 *        now (ms), usesTotal, usesByUser (null when the player isn't signed in yet) }
 * Returns { ok: true, discount, total } or { ok: false, error }.
 */
export function evaluateCoupon(c, ctx) {
    const no = (error) => ({ ok: false, error });
    if (!c || !c.isActive) return no("That code isn't valid. Check the spelling.");

    const now = ctx.now ?? Date.now();
    if (c.startsAt && new Date(c.startsAt).getTime() > now) return no("This code isn't active yet.");
    if (c.endsAt && new Date(c.endsAt).getTime() <= now) return no("This code has expired.");
    if (c.usageLimit != null && (ctx.usesTotal ?? 0) >= c.usageLimit) return no("This code has been fully used.");
    if (c.perUserLimit != null && ctx.usesByUser != null && ctx.usesByUser >= c.perUserLimit) {
        return no(c.perUserLimit === 1 ? "You've already used this code." : `You've used this code ${c.perUserLimit} times already.`);
    }

    const subtotal = Number(ctx.subtotal) || 0;
    if (c.minAmount != null && subtotal < Number(c.minAmount)) {
        return no(`This code works on slots of ৳${Number(c.minAmount).toLocaleString("en-IN")} or more.`);
    }

    const pitchIds = Array.isArray(c.pitchIds) ? c.pitchIds : [];
    if (pitchIds.length && !pitchIds.includes(ctx.pitchId)) return no("This code doesn't work on this ground.");

    const tw = c.timeWindow && typeof c.timeWindow === "object" ? c.timeWindow : null;
    if (tw) {
        const label = timeWindowLabel(tw);
        if (Array.isArray(tw.days) && tw.days.length && tw.days.length < 7 && !tw.days.includes(weekday(ctx.date))) {
            return no(`This code only works ${label}.`);
        }
        // Compare on the sheet's clock, so "from 9 pm to 2 am" covers the after-midnight slots too.
        const start = operatingMinutes(ctx.startTime, ctx.dayStart);
        const from = tw.from ? operatingMinutes(tw.from, ctx.dayStart) : 0;
        const to = tw.to ? operatingMinutes(tw.to, ctx.dayStart) : 48 * 60;
        if (start < from || start >= to) return no(`This code only works ${label}.`);
    }

    const value = Number(c.value) || 0;
    let discount = c.type === "percent" ? Math.floor((subtotal * value) / 100) : value;
    if (c.maxDiscount != null) discount = Math.min(discount, Number(c.maxDiscount));
    discount = Math.max(0, Math.min(Math.round(discount), subtotal));
    if (discount === 0) return no("This code doesn't take anything off this slot.");
    return { ok: true, discount, total: subtotal - discount };
}

/** Validate an "HH:MM" string on the half hour grid used by the admin. */
export function isHHMM(v) {
    return typeof v === "string" && /^\d{2}:\d{2}$/.test(v) && hhmmToMinutes(v) < 24 * 60;
}