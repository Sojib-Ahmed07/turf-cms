// src/features/cms/admin-queries.js
// Reads for the admin content editors. Not cached (admins must see what they just saved),
// and they include hidden, scheduled and ended rows that the public site skips.
import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { coupons, heroSlides, media, navItems, pageSections, pitches, promoBanners, siteSettings } from "@/db/schema";
import { toSections, toSettings } from "./queries";
import { dhakaDate } from "@/lib/time";

/* -------------------------------------------------------------- */
/* Helpers                                                         */
/* -------------------------------------------------------------- */

/** "hidden" | "scheduled" | "ended" | "active" for rows with isActive + startsAt/endsAt. */
export function scheduleStatus(row, now = Date.now()) {
    if (!row.isActive) return "hidden";
    if (row.startsAt && new Date(row.startsAt).getTime() > now) return "scheduled";
    if (row.endsAt && new Date(row.endsAt).getTime() <= now) return "ended";
    return "active";
}

/** Timestamps -> the date inputs' "YYYY-MM-DD" (Dhaka). endsAt is stored as the next midnight. */
function scheduleDates(row) {
    return {
        startDate: row.startsAt ? dhakaDate(new Date(row.startsAt)) : "",
        endDate: row.endsAt ? dhakaDate(new Date(new Date(row.endsAt).getTime() - 1)) : "",
    };
}

const img = (url, publicId) => (url ? { url, publicId: publicId ?? null } : null);

async function settingsRow() {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
    return row ?? null;
}

/* -------------------------------------------------------------- */
/* Branding, navigation, footer & SEO                              */
/* -------------------------------------------------------------- */

export async function getBrandingAdmin() {
    const row = await settingsRow();
    const s = toSettings(row);
    return {
        siteName: s.siteName,
        tagline: s.tagline,
        brandColor: s.brandColor,
        logoLight: img(row?.logoLightUrl, row?.logoLightPublicId),
        logoDark: img(row?.logoDarkUrl, row?.logoDarkPublicId),
        favicon: img(row?.faviconUrl, row?.faviconPublicId),
        menuButtonLabel: s.menuButtonLabel,
    };
}

export async function getNavAdmin() {
    const [items, row] = await Promise.all([
        db.select().from(navItems).orderBy(asc(navItems.sortOrder), asc(navItems.label)),
        settingsRow(),
    ]);
    const s = toSettings(row);
    return {
        items: items.map((i) => ({ id: i.id, label: i.label, href: i.href, isVisible: i.isVisible })),
        menuButtonLabel: s.menuButtonLabel,
        showMyBookings: s.showMyBookings,
    };
}

export async function getFooterSeoAdmin() {
    const row = await settingsRow();
    const s = toSettings(row);
    const seo = row?.seo && typeof row.seo === "object" ? row.seo : {};
    return {
        siteName: s.siteName,
        siteUrl: (process.env.APP_URL || "").replace(/\/$/, ""),
        contact: s.contact,
        socials: s.socials,
        seo: {
            title: s.seo.title,
            description: s.seo.description,
            ogImage: img(s.seo.ogImageUrl, seo.ogImagePublicId),
        },
    };
}

/* -------------------------------------------------------------- */
/* Hero                                                            */
/* -------------------------------------------------------------- */

export async function getHeroAdmin() {
    const [rows, row] = await Promise.all([
        db.select().from(heroSlides).orderBy(asc(heroSlides.sortOrder), asc(heroSlides.createdAt)),
        settingsRow(),
    ]);
    const now = Date.now();
    return {
        slides: rows.map((r) => ({
            id: r.id,
            image: img(r.imageUrl, r.imagePublicId),
            mobileImage: img(r.mobileImageUrl, r.mobileImagePublicId),
            alt: r.alt ?? "",
            eyebrow: r.eyebrow ?? "",
            heading: r.heading,
            subheading: r.subheading ?? "",
            ctaLabel: r.ctaLabel ?? "",
            ctaHref: r.ctaHref ?? "",
            overlay: r.overlay ?? "dark",
            isActive: r.isActive,
            status: scheduleStatus(r, now),
            ...scheduleDates(r),
        })),
        slider: toSettings(row).slider,
    };
}

/* -------------------------------------------------------------- */
/* Banners                                                         */
/* -------------------------------------------------------------- */

export async function getBannersAdmin() {
    const [rows, codes] = await Promise.all([
        db.select().from(promoBanners).orderBy(asc(promoBanners.sortOrder), asc(promoBanners.createdAt)),
        db
            .select({ id: coupons.id, code: coupons.code, type: coupons.type, value: coupons.value, isActive: coupons.isActive })
            .from(coupons)
            .orderBy(asc(coupons.code)),
    ]);
    const now = Date.now();
    return {
        banners: rows.map((r) => ({
            id: r.id,
            placement: r.placement,
            image: img(r.imageUrl, r.imagePublicId),
            badge: r.badge ?? "",
            title: r.title,
            body: r.body ?? "",
            ctaLabel: r.ctaLabel ?? "",
            ctaHref: r.ctaHref ?? "",
            couponId: r.couponId ?? "",
            isActive: r.isActive,
            status: scheduleStatus(r, now),
            ...scheduleDates(r),
        })),
        coupons: codes.map((c) => ({ ...c, value: Number(c.value) })),
    };
}

/* -------------------------------------------------------------- */
/* Sections                                                        */
/* -------------------------------------------------------------- */

export async function getSectionsAdmin() {
    return toSections(await db.select().from(pageSections));
}

/* -------------------------------------------------------------- */
/* Media                                                           */
/* -------------------------------------------------------------- */

/** url -> ["Logo (light)", "Hero slide: Your game starts..."] for every place an image is used. */
export async function getMediaUsage() {
    const [row, slides, banners, grounds] = await Promise.all([
        settingsRow(),
        db.select({ heading: heroSlides.heading, a: heroSlides.imageUrl, b: heroSlides.mobileImageUrl }).from(heroSlides),
        db.select({ title: promoBanners.title, a: promoBanners.imageUrl }).from(promoBanners),
        db.select({ name: pitches.name, a: pitches.imageUrl }).from(pitches),
    ]);
    const map = new Map();
    const add = (url, label) => {
        if (!url) return;
        if (!map.has(url)) map.set(url, []);
        map.get(url).push(label);
    };
    if (row) {
        add(row.logoLightUrl, "Logo for light backgrounds");
        add(row.logoDarkUrl, "Logo for dark backgrounds");
        add(row.faviconUrl, "Browser tab icon");
        add(row.seo?.ogImageUrl, "Share image");
    }
    for (const s of slides) {
        add(s.a, `Hero slide: ${s.heading}`);
        add(s.b, `Hero slide (mobile): ${s.heading}`);
    }
    for (const b of banners) add(b.a, `Offer banner: ${b.title}`);
    for (const g of grounds) add(g.a, `Ground: ${g.name}`);
    return map;
}

function toMediaItem(r, usage) {
    return {
        id: r.id,
        url: r.url,
        publicId: r.publicId,
        name: r.originalName || r.publicId.split("/").pop(),
        folder: r.folder ?? "misc",
        width: r.width,
        height: r.height,
        bytes: r.bytes,
        format: r.format,
        alt: r.alt ?? "",
        usedIn: usage?.get(r.url) ?? [],
    };
}

/** All uploaded images, newest first, with where each is used. */
export async function getMediaAdmin() {
    const [rows, usage] = await Promise.all([db.select().from(media).orderBy(desc(media.createdAt)), getMediaUsage()]);
    return rows.map((r) => toMediaItem(r, usage));
}

/** Lightweight list for the "From media library" picker. */
export async function getMediaPickerItems(limit = 120) {
    const rows = await db.select().from(media).orderBy(desc(media.createdAt)).limit(limit);
    return rows.map((r) => toMediaItem(r, null));
}