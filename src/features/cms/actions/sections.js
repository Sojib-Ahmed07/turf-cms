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
        heading: requiredText(40, "“Grounds open today” heading"),
        body: text(140, "“Grounds open today” text"),
    }),
    how_it_works: z.object({
        isVisible: z.boolean(),
        heading: requiredText(60, "“How it works” heading"),
        steps: z
            .array(z.object({ title: requiredText(24, "Step title"), body: text(120, "Step text") }))
            .min(1, "Keep at least one step.")
            .max(4),
    }),
    visit: z.object({
        isVisible: z.boolean(),
        heading: requiredText(40, "“Find us” heading"),
        body: text(140, "“Find us” text"),
        facilities: z.array(z.string().trim().min(1).max(30, "Facility names can be at most 30 characters.")).max(12, "Up to 12 facilities."),
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
        return { ok: false, error: "Couldn't save the sections. Try again." };
    }
}

const termsSchema = z.object({
    heading: requiredText(60, "Page title"),
    intro: text(300, "Intro"),
    items: z
        .array(z.object({ title: requiredText(80, "Each section title"), body: requiredText(1500, "Each section text") }))
        .min(1, "Keep at least one section.")
        .max(20, "Up to 20 sections."),
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
        return { ok: false, error: "Couldn't save the terms. Try again." };
    }
}