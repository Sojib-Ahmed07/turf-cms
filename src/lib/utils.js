// src/lib/utils.js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { makeFormat } from "@/i18n/format";

// The site is Bangla only: prices and times print in Bangla everywhere (admin, emails, staff pages too).
const BN = makeFormat("bn");

/** Merge Tailwind classes safely: cn("px-2", cond && "px-4") */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/** 1800 -> "৳১,৮০০" */
export function taka(value) {
    return BN.taka(value);
}

/** "18:30" -> "সন্ধ্যা ৬:৩০", "18:00" -> "সন্ধ্যা ৬টা" */
export function time12(hhmm) {
    return BN.time(hhmm);
}

/** Plain-ASCII versions for places that can't take Bangla (payment gateway product names). */
export function takaAscii(value) {
    return `BDT ${(Number(value) || 0).toLocaleString("en-IN")}`;
}
export function time12Ascii(hhmm) {
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

/**
 * Where to go after sign-in / sign-up / email verification. Only paths on this site are allowed:
 * "/book?pitch=x" stays, but "https://evil.example", "//evil.example" and "/\\evil.example" become "/".
 * Stops a link like /login?next=https://phishing.example from sending a freshly signed-in player away.
 */
export function safeNext(raw, fallback = "/") {
    if (typeof raw !== "string" || raw.length > 500) return fallback;
    if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
    if (/[\u0000-\u001f\\]/.test(raw)) return fallback;
    return raw;
}