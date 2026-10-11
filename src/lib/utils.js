// src/lib/utils.js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely: cn("px-2", cond && "px-4") */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/** ৳1,800 */
export function taka(value) {
    const n = Number(value) || 0;
    return `৳${n.toLocaleString("en-IN")}`;
}

/** "18:30" -> "6:30 pm" */
export function time12(hhmm) {
    if (!hhmm) return "";
    const [h, m] = hhmm.split(":").map(Number);
    const suffix = h >= 12 ? "pm" : "am";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}
