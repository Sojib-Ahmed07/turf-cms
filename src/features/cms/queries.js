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
import { dhakaDate } from "@/lib/time";
import { makeFormat } from "@/i18n/format";

const BN = makeFormat("bn");

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
    menuButtonLabel: "স্লট বুক করুন",
    showMyBookings: true,
    contact: { phone: "", whatsapp: "", email: "", address: "", hours: "", mapUrl: "" },
    socials: [],
    seo: { title: "", description: "", ogImageUrl: null },
    slider: { autoplayMs: 6000, pauseOnHover: true },
    map: null,
};

const DEFAULT_NAV = [
    { label: "হোম", href: "/" },
    { label: "স্লট বুক করুন", href: "/book" },
    { label: "মাঠ", href: "/grounds" },
];

// Old menu links that no longer exist: Contact (replaced by the WhatsApp button) and Offers.
const RETIRED_HREFS = new Set(["/#visit", "/#offers"]);

const DEFAULT_SECTIONS = {
    live_grounds: {
        isVisible: true,
        heading: "আজ খালি মাঠ",
        body: "আজ কোন মাঠে কখন খালি আছে, এখানেই দেখুন। একটি সময়ে চাপ দিলেই বুকিং শুরু।",
    },
    how_it_works: {
        isVisible: true,
        heading: "তিন ধাপে বুকিং",
        steps: [
            { title: "স্লট সিলেক্ট করুন", body: "মাঠ, তারিখ আর খালি সময় সিলেক্ট করুন। দাম আগেই দেখানো থাকে।" },
            { title: "অনলাইনে পেমেন্ট করুন", body: "বিকাশ, কার্ড, নগদ বা রকেট। পেমেন্ট হয়ে গেলেই স্লটটি আপনার।" },
            { title: "মাঠে এসে খেলুন", body: "টিকিট পাবেন \"আমার বুকিং\"-এ। গেটে টিকিটটি দেখালেই হবে।" },
        ],
    },
    visit: {
        isVisible: true,
        heading: "আমাদের ঠিকানা",
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
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

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

    const lat = num(row.mapLat);
    const lng = num(row.mapLng);
    const map =
        lat !== null && lng !== null
            ? {
                lat,
                lng,
                zoom: Math.min(Math.max(Number(row.mapZoom) || 16, 2), 19),
                label: str(row.mapLabel),
                address: str(row.mapAddress),
            }
            : null;

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
            whatsapp: str(contact.whatsapp),
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
        map,
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
            const rows = (await readNav()).filter((r) => !RETIRED_HREFS.has(r.href));
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
        // Display label, e.g. "৩১ অক্টোবর পর্যন্ত" (PromoBanner prints it as is). endsAt is the start of the next
        // day, so the label uses the moment before it (the last day the banner shows).
        endsAt: b.endsAt ? `${BN.dayMonth(dhakaDate(new Date(new Date(b.endsAt).getTime() - 1)))} পর্যন্ত` : null,
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
    heading: "বুকিংয়ের নিয়ম",
    intro: "বুক করার আগে নিয়মগুলো পড়ে নিন। কোনো স্লটের পেমেন্ট করলে ধরে নেওয়া হবে আপনি এই নিয়মগুলো মেনে নিয়েছেন।",
    items: [
        {
            title: "বুকিং ও পেমেন্ট",
            body: "অনলাইনে পেমেন্ট হয়ে গেলেই কেবল বুকিং কনফার্ম হয়। আগে থেকে স্লট ধরে রাখা হয় না: আপনি পেমেন্ট পেজে থাকার সময় অন্য কেউ ওই স্লটের পেমেন্ট করতে পারবেন না (বিকাশে ৫ মিনিট, কার্ড বা অন্য ওয়ালেটে ১০ মিনিট পর্যন্ত)। পেমেন্ট ক্যানসেল করলে, ফেইল হলে বা সময় শেষ হলে স্লটটি আবার সবার জন্য খালি হয়ে যায়।",
        },
        {
            title: "দাম",
            body: "দাম প্রতি স্লটের, টাকায়। ফ্লাডলাইট আর চেঞ্জিং রুমের খরচ দামের মধ্যেই ধরা আছে। পেমেন্টের সময় যে মোট টাকা দেখানো হয়, সেটাই দিতে হবে।",
        },
        {
            title: "প্রোমো কোড",
            body: "একটি বুকিংয়ে একটি কোড ব্যবহার করা যায়। প্রতিটি কোডের নিজস্ব নিয়ম আছে (তারিখ, সময়, মাঠ আর কতবার ব্যবহার করা যাবে)। কোডের বদলে নগদ টাকা দেওয়া হয় না।",
        },
        {
            title: "বুকিং ক্যানসেল বা বদলানো",
            body: "যে স্লটের পেমেন্ট শেষ করেননি, সেটি \"আমার বুকিং\" থেকে ছেড়ে দিতে পারেন। পেমেন্ট হয়ে যাওয়া বুকিং ক্যানসেল করতে বা বদলাতে খেলার অন্তত ২৪ ঘণ্টা আগে কাউন্টারে ফোন করুন।",
        },
        {
            title: "টাকা ফেরত (রিফান্ড)",
            body: "পেমেন্ট করার পর যদি দেখা যায় স্লটটি আগেই বুক হয়ে গেছে, অথবা একই বুকিংয়ের জন্য দুবার পেমেন্ট হয়েছে, পুরো টাকা ফেরত দেওয়া হবে। যেভাবে পেমেন্ট করেছেন সেখানেই টাকা ফেরত যাবে, এতে ১০ কর্মদিবস পর্যন্ত লাগতে পারে।",
        },
        {
            title: "খেলার দিন",
            body: "খেলার ১০ মিনিট আগে চলে আসুন এবং কাউন্টারে টিকিট দেখান (\"আমার বুকিং\", তারপর \"টিকিট দেখুন\")। স্লট ঠিক সময়ে শুরু ও শেষ হয়; দেরি করে এলে সময় বাড়ানো হয় না।",
        },
        {
            title: "মাঠ বন্ধ রাখতে হলে",
            body: "খারাপ আবহাওয়া বা মেরামতের মতো কারণে মাঠ বন্ধ রাখতে হলে আপনাকে অন্য একটি স্লট দেওয়া হবে, অথবা পুরো টাকা ফেরত দেওয়া হবে।",
        },
        {
            title: "মাঠের নিয়ম",
            body: "শুধু টার্ফ শু বা কেডস পরে খেলা যাবে, লোহার স্টাড চলবে না। মাঠে ধূমপান আর কাচের জিনিস নিষেধ। আপনার দলের কারণে কোনো ক্ষতি হলে তার দায় আপনার দলের।",
        },
    ],
};

/** Row -> { heading, intro, items: [{ title, body }], updated: "১৫ অক্টোবর ২০২৬" | null, updatedIso } (also the admin editor). */
export function toTerms(row) {
    const data = obj(row?.data);
    const items = (Array.isArray(data.items) ? data.items : [])
        .filter((i) => i && str(i.title).trim())
        .map((i) => ({ title: str(i.title), body: str(i.body) }));
    const updatedIso = row?.updatedAt ? dhakaDate(new Date(row.updatedAt)) : null;
    return {
        heading: str(data.heading) || DEFAULT_TERMS.heading,
        intro: row ? str(data.intro) : DEFAULT_TERMS.intro,
        items: row ? items : DEFAULT_TERMS.items,
        updated: updatedIso ? BN.dayMonth(updatedIso) + " " + BN.digits(updatedIso.slice(0, 4)) : null,
        updatedIso,
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