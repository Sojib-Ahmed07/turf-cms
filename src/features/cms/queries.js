// src/features/cms/queries.js
// Read side of the CMS: everything the public site shows that the admin can edit.
//
// Each read is cached with unstable_cache and tagged (src/lib/cache-tags.js).
// Step 5 admin actions call revalidateTag(TAGS.x) after saving, so changes show at once.
// The 5-minute revalidate is only a safety net for edits made outside the admin (db:studio).
//
// Every getter falls back to DEFAULTS if the database can't be reached, so a
// CMS hiccup never takes the booking site down.
import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { coupons, heroSlides, navItems, pageSections, promoBanners, siteSettings } from "@/db/schema";
import { TAGS } from "@/lib/cache-tags";
import { dhakaDate, shortDateLabel } from "@/lib/time";

const REVALIDATE = 300;

/* -------------------------------------------------------------- */
/* Defaults (used when a row or field is missing)                  */
/* -------------------------------------------------------------- */

export const DEFAULT_BRAND = "#18a058";

const DEFAULT_SETTINGS = {
    siteName: "TurfZone",
    tagline: "",
    logoLightUrl: null,
    logoDarkUrl: null,
    faviconUrl: null,
    brandColor: DEFAULT_BRAND,
    menuButtonLabel: "Book a slot",
    showMyBookings: true,
    contact: { phone: "", email: "", address: "", hours: "", mapUrl: "" },
    socials: [],
    seo: { title: "", description: "", ogImageUrl: null },
    slider: { autoplayMs: 6000, pauseOnHover: true },
};

const DEFAULT_NAV = [
    { label: "Home", href: "/" },
    { label: "Book a slot", href: "/book" },
    { label: "Grounds", href: "/#grounds" },
    { label: "Contact", href: "/#visit" },
];

const DEFAULT_SECTIONS = {
    live_grounds: {
        isVisible: true,
        heading: "Grounds open today",
        body: "Live availability for today. Tap a time to jump straight into booking.",
    },
    how_it_works: {
        isVisible: true,
        heading: "Book in three steps",
        steps: [
            { title: "Pick a slot", body: "Choose the ground, the date and a free time. Prices are shown up front." },
            { title: "Pay online", body: "Card, bKash, Nagad or Rocket. Your slot is held for 15 minutes while you pay." },
            { title: "Show up and play", body: "Your ticket lands in My bookings. Show it at the gate." },
        ],
    },
    visit: {
        isVisible: true,
        heading: "Find us",
        body: "",
        facilities: [],
    },
};

/* -------------------------------------------------------------- */
/* Helpers                                                         */
/* -------------------------------------------------------------- */

/** Run a cached read; on any error log it and return the fallback (not cached). */
async function safe(label, fn, fallback) {
    try {
        return await fn();
    } catch (err) {
        console.error(`[cms:${label}]`, err?.message ?? err);
        return fallback;
    }
}

const isHex = (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
const str = (v, d = "") => (typeof v === "string" ? v : d);
const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

/** Readable text colour on top of the brand colour (white, or dark ink for light brands). */
export function brandInk(hex) {
    if (!isHex(hex)) return "#ffffff";
    const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.45 ? "#0f1f19" : "#ffffff";
}

/** Is a scheduled row live right now? (cached rows carry dates as strings) */
function isLive(row, now = Date.now()) {
    if (row.startsAt && new Date(row.startsAt).getTime() > now) return false;
    if (row.endsAt && new Date(row.endsAt).getTime() <= now) return false;
    return true;
}

/* -------------------------------------------------------------- */
/* Site settings                                                   */
/* -------------------------------------------------------------- */

const readSettings = unstable_cache(
    async () => {
        const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
        return row ?? null;
    },
    ["cms-settings"],
    { tags: [TAGS.settings], revalidate: REVALIDATE }
);

/** Row -> settings with every field present (also used by the admin editors). */
export function toSettings(row) {
    if (!row) return DEFAULT_SETTINGS;
    const contact = obj(row.contact);
    const seo = obj(row.seo);
    const slider = obj(row.slider);
    return {
        siteName: str(row.siteName, DEFAULT_SETTINGS.siteName) || DEFAULT_SETTINGS.siteName,
        tagline: str(row.tagline),
        logoLightUrl: row.logoLightUrl || null,
        logoDarkUrl: row.logoDarkUrl || null,
        faviconUrl: row.faviconUrl || null,
        brandColor: isHex(row.brandColor) ? row.brandColor : DEFAULT_BRAND,
        menuButtonLabel: str(row.menuButtonLabel) || DEFAULT_SETTINGS.menuButtonLabel,
        showMyBookings: row.showMyBookings !== false,
        contact: {
            phone: str(contact.phone),
            email: str(contact.email),
            address: str(contact.address),
            hours: str(contact.hours),
            mapUrl: str(contact.mapUrl),
        },
        socials: (Array.isArray(row.socials) ? row.socials : [])
            .filter((s) => s && typeof s.url === "string" && s.url.startsWith("http"))
            .map((s) => ({ platform: str(s.platform, "link"), url: s.url })),
        seo: {
            title: str(seo.title),
            description: str(seo.description),
            ogImageUrl: seo.ogImageUrl || null,
        },
        slider: {
            autoplayMs: Math.min(Math.max(Number(slider.autoplayMs) || 6000, 2500), 20000),
            pauseOnHover: slider.pauseOnHover !== false,
        },
    };
}

/** Normalised site settings; every field is always present. */
export async function getSiteSettings() {
    return safe("settings", async () => toSettings(await readSettings()), DEFAULT_SETTINGS);
}

/* -------------------------------------------------------------- */
/* Navigation                                                      */
/* -------------------------------------------------------------- */

const readNav = unstable_cache(
    async () =>
        db
            .select({ id: navItems.id, label: navItems.label, href: navItems.href })
            .from(navItems)
            .where(eq(navItems.isVisible, true))
            .orderBy(asc(navItems.sortOrder)),
    ["cms-nav"],
    { tags: [TAGS.nav], revalidate: REVALIDATE }
);

/** Visible menu links in order: [{ id, label, href }]. */
export async function getNavItems() {
    return safe(
        "nav",
        async () => {
            const rows = await readNav();
            return rows.length ? rows : DEFAULT_NAV;
        },
        DEFAULT_NAV
    );
}

/* -------------------------------------------------------------- */
/* Hero slides                                                     */
/* -------------------------------------------------------------- */

const readSlides = unstable_cache(
    async () =>
        db
            .select()
            .from(heroSlides)
            .where(eq(heroSlides.isActive, true))
            .orderBy(asc(heroSlides.sortOrder), asc(heroSlides.createdAt)),
    ["cms-hero"],
    { tags: [TAGS.hero], revalidate: REVALIDATE }
);

/** Active slides that are inside their schedule right now. Empty array = hero shows its placeholder. */
export async function getHeroSlides() {
    return safe(
        "hero",
        async () => {
            const rows = await readSlides();
            const now = Date.now();
            return rows.filter((r) => isLive(r, now)).map((r) => ({
                id: r.id,
                imageUrl: r.imageUrl || null,
                mobileImageUrl: r.mobileImageUrl || null,
                alt: r.alt ?? "",
                eyebrow: r.eyebrow || null,
                heading: r.heading,
                subheading: r.subheading || null,
                ctaLabel: r.ctaLabel || null,
                ctaHref: r.ctaHref || null,
                overlay: r.overlay ?? "dark",
            }));
        },
        []
    );
}

/* -------------------------------------------------------------- */
/* Offer banners                                                   */
/* -------------------------------------------------------------- */

const readBanners = unstable_cache(
    async () =>
        db
            .select({
                banner: promoBanners,
                couponCode: coupons.code,
                couponActive: coupons.isActive,
                couponEndsAt: coupons.endsAt,
            })
            .from(promoBanners)
            .leftJoin(coupons, eq(promoBanners.couponId, coupons.id))
            .where(and(eq(promoBanners.isActive, true)))
            .orderBy(asc(promoBanners.sortOrder), asc(promoBanners.createdAt)),
    ["cms-banners"],
    { tags: [TAGS.banners], revalidate: REVALIDATE }
);

function toBanner(r, now) {
    const b = r.banner;
    // Only show a code players can actually use.
    const couponLive =
        r.couponCode && r.couponActive && (!r.couponEndsAt || new Date(r.couponEndsAt).getTime() > now);
    return {
        id: b.id,
        placement: b.placement,
        imageUrl: b.imageUrl || null,
        badge: b.badge || null,
        title: b.title,
        body: b.body || null,
        ctaLabel: b.ctaLabel || null,
        ctaHref: b.ctaHref || null,
        code: couponLive ? r.couponCode : null,
        // Display label, e.g. "Ends 31 Oct" (PromoBanner prints it as is).
        endsAt: b.endsAt ? `Ends ${shortDateLabel(dhakaDate(new Date(b.endsAt))).replace(/^\w+ /, "")}` : null,
    };
}

/**
 * The live banner for each placement (first by sort order):
 * { top_bar, home_after_hero, home_mid, booking_page, popup }, each a banner or null.
 */
export async function getPromoBanners() {
    const empty = { top_bar: null, home_after_hero: null, home_mid: null, booking_page: null, popup: null };
    return safe(
        "banners",
        async () => {
            const rows = await readBanners();
            const now = Date.now();
            const out = { ...empty };
            for (const r of rows) {
                const p = r.banner.placement;
                if (!(p in out) || out[p]) continue;
                if (!isLive(r.banner, now)) continue;
                out[p] = toBanner(r, now);
            }
            return out;
        },
        empty
    );
}

/* -------------------------------------------------------------- */
/* Home page sections                                              */
/* -------------------------------------------------------------- */

const readSections = unstable_cache(
    async () => db.select().from(pageSections),
    ["cms-sections"],
    { tags: [TAGS.sections], revalidate: REVALIDATE }
);

/** Rows -> { live_grounds, how_it_works, visit } merged with defaults (also used by the admin editors). */
export function toSections(rows) {
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    const out = {};
    for (const [key, def] of Object.entries(DEFAULT_SECTIONS)) {
        const row = byKey[key];
        const data = obj(row?.data);
        const merged = { ...def, ...data, isVisible: row ? row.isVisible !== false : def.isVisible };
        merged.heading = str(merged.heading) || def.heading;
        merged.body = str(merged.body);
        if (key === "how_it_works") {
            const steps = Array.isArray(data.steps) ? data.steps.filter((s) => s && s.title) : [];
            merged.steps = steps.length ? steps.map((s) => ({ title: str(s.title), body: str(s.body) })) : def.steps;
        }
        if (key === "visit") {
            merged.facilities = (Array.isArray(data.facilities) ? data.facilities : []).filter(
                (f) => typeof f === "string" && f.trim()
            );
        }
        out[key] = merged;
    }
    return out;
}

/** { live_grounds, how_it_works, visit }, each with isVisible + its content. */
export async function getSections() {
    return safe("sections", async () => toSections(await readSections()), toSections([]));
}

/* -------------------------------------------------------------- */
/* Booking terms (/terms), stored as the page_sections row "terms" */
/* -------------------------------------------------------------- */

/** A starting draft that matches how the booking system works. The venue should review it. */
export const DEFAULT_TERMS = {
    heading: "Booking terms",
    intro: "Please read these before you book. By paying for a slot you agree to them.",
    items: [
        {
            title: "Booking and payment",
            body: "A booking is confirmed only when your online payment goes through. When you press Pay, the slot is held for you for 15 minutes. If the payment isn't finished in that time, the slot is released for other players.",
        },
        {
            title: "Prices",
            body: "Prices are per slot, in Taka, and include floodlights and the changing room. The total shown at checkout is what you pay.",
        },
        {
            title: "Promo codes",
            body: "One code per booking. Each code has its own limits (dates, times, grounds and number of uses) and can't be exchanged for cash.",
        },
        {
            title: "Cancelling or moving a booking",
            body: "You can cancel a booking that is still waiting for payment from My bookings. To cancel or move a paid booking, call us at least 24 hours before your slot.",
        },
        {
            title: "Refunds",
            body: "If you paid but the slot was already taken, or you paid twice for the same booking, we refund the full amount. Refunds go back to the way you paid and can take up to 10 working days to reach you.",
        },
        {
            title: "On the day",
            body: "Arrive 10 minutes early and show your ticket at the desk (My bookings, then Show ticket). Slots start and end on time; a late start doesn't extend your slot.",
        },
        {
            title: "If we have to close",
            body: "If a ground has to close (for example for bad weather or repairs), we'll offer you another slot or a full refund.",
        },
        {
            title: "Ground rules",
            body: "Turf shoes or trainers only, no metal studs. No smoking or glass on the pitch. Your group is responsible for any damage it causes.",
        },
    ],
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Row -> { heading, intro, items: [{ title, body }], updated: "15 October 2026" | null } (also used by the admin editor). */
export function toTerms(row) {
    const data = obj(row?.data);
    const items = (Array.isArray(data.items) ? data.items : [])
        .filter((i) => i && str(i.title).trim())
        .map((i) => ({ title: str(i.title), body: str(i.body) }));
    let updated = null;
    if (row?.updatedAt) {
        const [y, m, d] = dhakaDate(new Date(row.updatedAt)).split("-").map(Number);
        updated = `${d} ${MONTHS[m - 1]} ${y}`;
    }
    return {
        heading: str(data.heading) || DEFAULT_TERMS.heading,
        intro: row ? str(data.intro) : DEFAULT_TERMS.intro,
        items: row ? items : DEFAULT_TERMS.items,
        updated,
    };
}

/** The booking terms page content (defaults until the admin saves it). */
export async function getTerms() {
    return safe(
        "terms",
        async () => toTerms((await readSections()).find((r) => r.key === "terms")),
        toTerms(null)
    );
}

/* -------------------------------------------------------------- */
/* Bundles used by layouts                                         */
/* -------------------------------------------------------------- */

/** Everything the public layout needs: settings, menu, top bar and popup banners. */
export async function getSiteChrome() {
    const [settings, nav, banners] = await Promise.all([getSiteSettings(), getNavItems(), getPromoBanners()]);
    return { settings, nav, banners };
}