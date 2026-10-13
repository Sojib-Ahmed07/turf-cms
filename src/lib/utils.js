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

/**
 * next/image only optimises hosts listed in next.config.mjs (Unsplash, Cloudinary).
 * For any other link the admin pastes, render it unoptimised instead of crashing.
 * Usage: <Image src={url} unoptimized={!canOptimize(url)} ... />
 */
const OPTIMISED_HOSTS = ["images.unsplash.com", "res.cloudinary.com"];
export function canOptimize(src) {
    if (!src || typeof src !== "string") return false;
    if (src.startsWith("/")) return true;
    try {
        return OPTIMISED_HOSTS.includes(new URL(src).hostname);
    } catch {
        return false;
    }
}