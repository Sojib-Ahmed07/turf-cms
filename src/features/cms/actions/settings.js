// src/features/cms/actions/settings.js
"use server";

import { revalidatePath, updateTag } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { navItems, siteSettings } from "@/db/schema";
import { TAGS } from "@/lib/cache-tags";
import { ADMIN_ONLY, CONTENT_ROLES, DENIED, firstIssue, hexColor, image, link, requireRoles, requiredText, text } from "../server-utils";

/** Update the single settings row (creates it if the seed never ran). */
async function writeSettings(values, userId) {
    const set = { ...values, updatedAt: new Date(), updatedBy: userId };
    await db
        .insert(siteSettings)
        .values({ id: 1, ...set })
        .onConflictDoUpdate({ target: siteSettings.id, set });
}

async function currentRow() {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
    return row ?? null;
}

/* -------------------------------------------------------------- */
/* Branding (admin only)                                           */
/* -------------------------------------------------------------- */

const brandingSchema = z.object({
    siteName: requiredText(24, "Site name"),
    tagline: text(60, "Tagline"),
    brandColor: hexColor,
    logoLight: image,
    logoDark: image,
    favicon: image,
});

export async function saveBranding(input) {
    try {
        const user = await requireRoles(ADMIN_ONLY);
        if (!user) return DENIED;
        const parsed = brandingSchema.safeParse(input);
        if (!parsed.success) return { ok: false, error: firstIssue(parsed) };
        const v = parsed.data;

        await writeSettings(
            {
                siteName: v.siteName,
                tagline: v.tagline || null,
                brandColor: v.brandColor.toLowerCase(),
                logoLightUrl: v.logoLight?.url ?? null,
                logoLightPublicId: v.logoLight?.publicId ?? null,
                logoDarkUrl: v.logoDark?.url ?? null,
                logoDarkPublicId: v.logoDark?.publicId ?? null,
                faviconUrl: v.favicon?.url ?? null,
                faviconPublicId: v.favicon?.publicId ?? null,
            },
            user.id
        );
        updateTag(TAGS.settings);
        revalidatePath("/admin/branding");
        return { ok: true };
    } catch (err) {
        console.error("[saveBranding]", err);
        return { ok: false, error: "Couldn't save the branding. Try again." };
    }
}

/* -------------------------------------------------------------- */
/* Navigation (admin only)                                         */
/* -------------------------------------------------------------- */

const menuSchema = z.object({
    items: z
        .array(
            z.object({
                id: z.string().uuid(),
                label: requiredText(18, "Menu label"),
                isVisible: z.boolean(),
            })
        )
        .max(12),
    menuButtonLabel: requiredText(16, "Button text"),
    showMyBookings: z.boolean(),
});

/**
 * Rename, hide and reorder the existing menu links (the pages they open are fixed),
 * plus the menu button text and the My bookings link. `items` arrive in display order.
 */
export async function saveMenu(input) {
    try {
        const user = await requireRoles(ADMIN_ONLY);
        if (!user) return DENIED;
        const parsed = menuSchema.safeParse(input);
        if (!parsed.success) return { ok: false, error: firstIssue(parsed) };
        const v = parsed.data;

        const existing = await db.select({ id: navItems.id }).from(navItems).orderBy(asc(navItems.sortOrder));
        const known = new Set(existing.map((r) => r.id));
        if (v.items.some((i) => !known.has(i.id))) {
            return { ok: false, error: "The menu changed in another tab. Reload the page and try again." };
        }
        if (!v.items.some((i) => i.isVisible)) return { ok: false, error: "Keep at least one menu link visible." };

        // neon-http has no interactive transactions; these are independent small updates.
        for (const [i, item] of v.items.entries()) {
            await db
                .update(navItems)
                .set({ label: item.label, isVisible: item.isVisible, sortOrder: i })
                .where(eq(navItems.id, item.id));
        }
        await writeSettings({ menuButtonLabel: v.menuButtonLabel, showMyBookings: v.showMyBookings }, user.id);

        updateTag(TAGS.nav);
        updateTag(TAGS.settings);
        revalidatePath("/admin/navigation");
        return { ok: true };
    } catch (err) {
        console.error("[saveMenu]", err);
        return { ok: false, error: "Couldn't save the menu. Try again." };
    }
}

/* -------------------------------------------------------------- */
/* Footer & SEO (admin or editor)                                  */
/* -------------------------------------------------------------- */

const PLATFORMS = ["facebook", "instagram", "youtube", "tiktok", "whatsapp", "x", "linkedin"];

const footerSeoSchema = z.object({
    contact: z.object({
        phone: text(30, "Phone"),
        email: z
            .string()
            .trim()
            .max(80)
            .default("")
            .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address."),
        address: text(100, "Address"),
        hours: text(60, "Opening hours"),
        mapUrl: link("Google Maps link"),
    }),
    socials: z
        .array(
            z.object({
                platform: z.enum(PLATFORMS),
                url: z
                    .string()
                    .trim()
                    .max(300)
                    .refine((v) => /^https:\/\/[^\s]+$/.test(v), "Social links must start with https://"),
            })
        )
        .max(8),
    seo: z.object({
        title: text(60, "Page title"),
        description: text(160, "Description"),
        ogImage: image,
    }),
});

export async function saveFooterSeo(input) {
    try {
        const user = await requireRoles(CONTENT_ROLES);
        if (!user) return DENIED;
        const parsed = footerSeoSchema.safeParse(input);
        if (!parsed.success) return { ok: false, error: firstIssue(parsed) };
        const v = parsed.data;

        await writeSettings(
            {
                contact: v.contact,
                socials: v.socials,
                seo: {
                    title: v.seo.title,
                    description: v.seo.description,
                    ogImageUrl: v.seo.ogImage?.url ?? null,
                    ogImagePublicId: v.seo.ogImage?.publicId ?? null,
                },
            },
            user.id
        );
        updateTag(TAGS.settings);
        revalidatePath("/admin/footer");
        return { ok: true };
    } catch (err) {
        console.error("[saveFooterSeo]", err);
        return { ok: false, error: "Couldn't save. Try again." };
    }
}

/* -------------------------------------------------------------- */
/* Slider timing (admin or editor, on the Hero slides page)        */
/* -------------------------------------------------------------- */

const sliderSchema = z.object({
    autoplayMs: z.number().int().min(2500).max(20000),
    pauseOnHover: z.boolean(),
});

export async function saveSliderSettings(input) {
    try {
        const user = await requireRoles(CONTENT_ROLES);
        if (!user) return DENIED;
        const parsed = sliderSchema.safeParse(input);
        if (!parsed.success) return { ok: false, error: "Pick a time per slide." };
        const row = await currentRow();
        const slider = { ...(row?.slider ?? {}), ...parsed.data };
        await writeSettings({ slider }, user.id);
        updateTag(TAGS.settings);
        revalidatePath("/admin/hero");
        return { ok: true };
    } catch (err) {
        console.error("[saveSliderSettings]", err);
        return { ok: false, error: "Couldn't save the slider settings." };
    }
}