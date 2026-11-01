// src/features/cms/actions/sections.js
"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { pageSections } from "@/db/schema";
import { TAGS } from "@/lib/cache-tags";
import { CONTENT_ROLES, DENIED, firstIssue, requireRoles, requiredText, text } from "../server-utils";

const sectionsSchema = z.object({
    live_grounds: z.object({
        isVisible: z.boolean(),
        heading: requiredText(40, "“আজ খালি মাঠ” অংশের শিরোনাম"),
        body: text(140, "“আজ খালি মাঠ” অংশের লেখা"),
    }),
    how_it_works: z.object({
        isVisible: z.boolean(),
        heading: requiredText(60, "“কীভাবে বুক করবেন” অংশের শিরোনাম"),
        steps: z
            .array(z.object({ title: requiredText(24, "ধাপের শিরোনাম"), body: text(120, "ধাপের লেখা") }))
            .min(1, "অন্তত একটি ধাপ রাখুন।")
            .max(4),
    }),
    visit: z.object({
        isVisible: z.boolean(),
        heading: requiredText(40, "“ঠিকানা” অংশের শিরোনাম"),
        body: text(140, "“ঠিকানা” অংশের লেখা"),
        facilities: z.array(z.string().trim().min(1).max(30, "সুবিধার নাম সর্বোচ্চ ৩০ অক্ষরের হতে পারে।")).max(12, "সর্বোচ্চ ১২টি সুবিধা দেওয়া যায়।"),
    }),
});

/** Save all three home sections at once. */
export async function saveSections(input) {
    try {
        if (!(await requireRoles(CONTENT_ROLES))) return DENIED;
        const parsed = sectionsSchema.safeParse(input);
        if (!parsed.success) return { ok: false, error: firstIssue(parsed) };

        for (const [key, value] of Object.entries(parsed.data)) {
            const { isVisible, ...data } = value;
            if (key === "visit") data.facilities = [...new Set(data.facilities)];
            await db
                .insert(pageSections)
                .values({ key, isVisible, data, updatedAt: new Date() })
                .onConflictDoUpdate({ target: pageSections.key, set: { isVisible, data, updatedAt: new Date() } });
        }
        updateTag(TAGS.sections);
        revalidatePath("/admin/sections");
        return { ok: true };
    } catch (err) {
        console.error("[saveSections]", err);
        return { ok: false, error: "সেভ হয়নি। আবার চেষ্টা করুন।" };
    }
}

const termsSchema = z.object({
    heading: requiredText(60, "পেজের শিরোনাম"),
    intro: text(300, "শুরুর লেখা"),
    items: z
        .array(z.object({ title: requiredText(80, "প্রতিটি অংশের শিরোনাম"), body: requiredText(1500, "প্রতিটি অংশের লেখা") }))
        .min(1, "অন্তত একটি অংশ রাখুন।")
        .max(20, "সর্বোচ্চ ২০টি অংশ দেওয়া যায়।"),
});

/** Save the booking terms page (/terms). */
export async function saveTerms(input) {
    try {
        if (!(await requireRoles(CONTENT_ROLES))) return DENIED;
        const parsed = termsSchema.safeParse(input);
        if (!parsed.success) return { ok: false, error: firstIssue(parsed) };

        const data = parsed.data;
        await db
            .insert(pageSections)
            .values({ key: "terms", isVisible: true, data, updatedAt: new Date() })
            .onConflictDoUpdate({ target: pageSections.key, set: { isVisible: true, data, updatedAt: new Date() } });
        updateTag(TAGS.sections);
        revalidatePath("/admin/terms");
        return { ok: true };
    } catch (err) {
        console.error("[saveTerms]", err);
        return { ok: false, error: "নিয়মগুলো সেভ হয়নি। আবার চেষ্টা করুন।" };
    }
}