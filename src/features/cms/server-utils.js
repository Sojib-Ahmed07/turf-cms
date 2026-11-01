// src/features/cms/server-utils.js
// Shared by the CMS save actions (src/features/cms/actions/*). Server only, not an action file.
import "server-only";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { addDaysISO } from "@/lib/time";
import { BN } from "@/i18n/format";

/** Returns the signed-in user if their role is in `roles`, otherwise null. */
export async function requireRoles(roles) {
    const session = await auth.api.getSession({ headers: await headers() });
    const u = session?.user;
    return u && roles.includes(u.role) ? u : null;
}

export const ADMIN_ONLY = ["admin"];
// Website content is admin only too (the editor role was removed); kept as a name so callers stay readable.
export const CONTENT_ROLES = ["admin"];
export const DENIED = { ok: false, error: "এটি বদলানোর অনুমতি আপনার নেই।" };

/** First Zod issue as a sentence for the form. */
export function firstIssue(parsed, fallback = "ফর্মটি দেখে আবার চেষ্টা করুন।") {
    const i = parsed.error?.issues?.[0];
    return i?.message && !i.message.startsWith("Invalid") && !i.message.startsWith("Too") ? i.message : fallback;
}

/* ---------------- Zod pieces ---------------- */

/** Text field: trimmed, max length, empty string allowed. */
export const text = (max, label = "এই ঘর") =>
    z.string().trim().max(max, `${label} সর্বোচ্চ ${BN.digits(max)} অক্ষরের হতে পারে।`).default("");

/** Required text field. */
export const requiredText = (max, label) =>
    z.string().trim().min(1, `${label} খালি রাখা যাবে না।`).max(max, `${label} সর্বোচ্চ ${BN.digits(max)} অক্ষরের হতে পারে।`);

/** A link on the site ("/book", "/#visit") or an https address. Empty allowed. */
export const link = (label = "লিংক") =>
    z
        .string()
        .trim()
        .max(300)
        .default("")
        .refine((v) => v === "" || /^\/(?![\/\\])/.test(v) || /^https:\/\/[^\s]+$/.test(v) || /^(tel|mailto):[^\s]+$/.test(v), {
            message: `${label} / দিয়ে (এই সাইটের কোনো পেজ) অথবা https:// দিয়ে শুরু হতে হবে।`,
        });

/** Image picked in ImageUploader: { url, publicId? } or null. Only https URLs. */
export const image = z
    .object({
        url: z.string().trim().url().refine((v) => v.startsWith("https://"), "ছবির লিংক https:// দিয়ে শুরু হতে হবে।"),
        publicId: z.string().trim().max(300).nullish(),
    })
    .nullish();

export const hexColor = z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "একটি রং সিলেক্ট করুন, অথবা #RRGGBB আকারে লিখুন।");

/** "YYYY-MM-DD" or empty. */
export const isoDate = z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "সঠিক তারিখ দিন।");

/* ---------------- Schedules (dates are Dhaka calendar days) ---------------- */

/** "2026-10-20" -> the moment that day starts in Dhaka. */
export function dhakaDayStart(iso) {
    return iso ? new Date(`${iso}T00:00:00+06:00`) : null;
}

/** "Hide after 2026-10-31" -> the moment 1 Nov starts in Dhaka. */
export function dhakaDayEnd(iso) {
    return iso ? new Date(`${addDaysISO(iso, 1)}T00:00:00+06:00`) : null;
}

/** Postgres unique violation? */
export function isUniqueViolation(err) {
    const code = err?.code ?? err?.cause?.code;
    return code === "23505" || String(err?.message ?? "").includes("duplicate key");
}