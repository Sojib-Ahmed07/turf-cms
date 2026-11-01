// src/features/cms/actions/settings.js
"use server";

import { revalidatePath, updateTag } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { navItems, siteSettings } from "@/db/schema";
import { TAGS } from "@/lib/cache-tags";
import { renameEverywhere } from "../rename";
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

/** Empty string or a number in range; empty -> null. */
const coord = (min, max, label) =>
    z
        .union([z.string(), z.number()])
        .transform((v) => (typeof v === "string" ? v.trim() : String(v)))
        .transform((v) => (v === "" ? null : Number(v)))
        .refine((v) => v === null || (Number.isFinite(v) && v >= min && v <= max), {
            message: `${label} ${min} থেকে ${max}-এর মধ্যে একটি সংখ্যা হতে হবে, অথবা খালি রাখুন।`,
        });

const mapSchema = z.object({
    lat: coord(-90, 90, "ল্যাটিচিউড"),
    lng: coord(-180, 180, "লঞ্জিচিউড"),
    zoom: z
        .union([z.string(), z.number()])
        .transform((v) => (typeof v === "string" ? v.trim() : String(v)))
        .transform((v) => (v === "" ? null : Number(v)))
        .refine((v) => v === null || (Number.isInteger(v) && v >= 2 && v <= 19), {
            message: "জুম ২ থেকে ১৯-এর মধ্যে একটি পূর্ণ সংখ্যা হতে হবে, অথবা খালি রাখুন।",
        }),
    label: text(40, "ম্যাপের লেবেল"),
    address: text(120, "ম্যাপের ঠিকানা"),
});

const brandingSchema = z.object({
    siteName: requiredText(24, "সাইটের নাম"),
    tagline: text(60, "ট্যাগলাইন"),
    brandColor: hexColor,
    logoLight: image,
    logoDark: image,
    favicon: image,
    map: mapSchema,
});

export async function saveBranding(input) {
    try {
        const user = await requireRoles(ADMIN_ONLY);
        if (!user) return DENIED;
        const parsed = brandingSchema.safeParse(input);
        if (!parsed.success) return { ok: false, error: firstIssue(parsed) };
        const v = parsed.data;
        const before = await currentRow();

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
                mapLat: v.map.lat,
                mapLng: v.map.lng,
                mapZoom: v.map.zoom,
                mapLabel: v.map.label || null,
                mapAddress: v.map.address || null,
            },
            user.id
        );
        // The name is part of some texts (Google title, map pin, offers, home sections, terms...): put the new name
        // there too, and replace the starter content's sample name. Runs on every save, so saving once also cleans up
        // texts that still carry an old name. A failure here never undoes the branding save.
        let renamed = 0;
        try {
            renamed = await renameEverywhere(before?.siteName, v.siteName);
        } catch (err) {
            console.error("[saveBranding:rename]", err);
        }
        updateTag(TAGS.settings);
        if (renamed) {
            for (const tag of [TAGS.sections, TAGS.hero, TAGS.banners, TAGS.pitches]) updateTag(tag);
            revalidatePath("/", "layout");
        }
        revalidatePath("/admin/branding");
        const after = renamed ? await currentRow() : null;
        // the form shows these too: hand back the renamed values so it doesn't save the old name again
        return { ok: true, data: { renamed, tagline: after?.tagline ?? null, mapLabel: after?.mapLabel ?? null } };
    } catch (err) {
        console.error("[saveBranding]", err);
        return { ok: false, error: "সেভ হয়নি। আবার চেষ্টা করুন।" };
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
                label: requiredText(18, "মেনুর নাম"),
                isVisible: z.boolean(),
            })
        )
        .max(12),
    menuButtonLabel: requiredText(16, "বাটনের লেখা"),
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
            return { ok: false, error: "অন্য একটি ট্যাবে মেনু বদলানো হয়েছে। পেজটি রিলোড করে আবার চেষ্টা করুন।" };
        }
        if (!v.items.some((i) => i.isVisible)) return { ok: false, error: "মেনুতে অন্তত একটি লিংক চালু রাখুন।" };

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
        return { ok: false, error: "মেনু সেভ হয়নি। আবার চেষ্টা করুন।" };
    }
}

/* -------------------------------------------------------------- */
/* Footer & SEO (admin)                                           */
/* -------------------------------------------------------------- */

const PLATFORMS = ["facebook", "instagram", "youtube", "tiktok", "whatsapp", "x", "linkedin"];

const footerSeoSchema = z.object({
    contact: z.object({
        phone: text(30, "ফোন"),
        // Number for the floating WhatsApp button (empty = the phone number is used).
        whatsapp: z
            .string()
            .trim()
            .max(30)
            .default("")
            .refine(
                (v) => v === "" || (v.replace(/\D/g, "").length >= 10 && /^[+\d\s()-]+$/.test(v)),
                "হোয়াটসঅ্যাপ নম্বরটি দেশের কোডসহ দিন, যেমন +8801700000000।"
            ),
        email: z
            .string()
            .trim()
            .max(80)
            .default("")
            .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "সঠিক ইমেইল ঠিকানা দিন।"),
        address: text(100, "ঠিকানা"),
        hours: text(60, "খোলার সময়"),
        mapUrl: link("Google Maps লিংক"),
    }),
    socials: z
        .array(
            z.object({
                platform: z.enum(PLATFORMS),
                url: z
                    .string()
                    .trim()
                    .max(300)
                    .refine((v) => /^https:\/\/[^\s]+$/.test(v), "সোশ্যাল লিংক https:// দিয়ে শুরু হতে হবে"),
            })
        )
        .max(8),
    seo: z.object({
        title: text(60, "পেজের শিরোনাম"),
        description: text(160, "বিবরণ"),
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
        return { ok: false, error: "সেভ হয়নি। আবার চেষ্টা করুন।" };
    }
}

/* -------------------------------------------------------------- */
/* Slider timing (admin, on the Hero slides page)                  */
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
        if (!parsed.success) return { ok: false, error: "প্রতি স্লাইডের সময় সিলেক্ট করুন।" };
        const row = await currentRow();
        const slider = { ...(row?.slider ?? {}), ...parsed.data };
        await writeSettings({ slider }, user.id);
        updateTag(TAGS.settings);
        revalidatePath("/admin/hero");
        return { ok: true };
    } catch (err) {
        console.error("[saveSliderSettings]", err);
        return { ok: false, error: "স্লাইডারের সেটিং সেভ হয়নি।" };
    }
}