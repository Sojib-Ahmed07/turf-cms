// src/features/cms/rename.js
// The site name is written into some admin texts (Google title, map pin, offers, home sections, terms...).
// When the admin renames the site, swap the old name for the new one in all of them, so the whole site
// shows the new name without retyping every text. Also replaces the sample name ("TurfZone" / "টার্ফজোন")
// that the starter content came with. Links, emails, phone numbers and image fields are never touched.
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { heroSlides, pageSections, pitches, promoBanners, siteSettings } from "@/db/schema";

/** Names the starter content used for the site. */
export const SAMPLE_NAMES = ["TurfZone", "টার্ফজোন"];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Pure: replace every old name in `text` with `next`. Names shorter than 3 characters are ignored (too likely
 * to hit ordinary words); a Latin name only matches as a whole word ("Turf" never touches "Turfs").
 */
export function swapName(text, olds, next) {
    if (typeof text !== "string" || !text) return text;
    let out = text;
    for (const old of olds) {
        if (!old || old.length < 3 || old === next) continue;
        const latin = /^[\x20-\x7e]+$/.test(old);
        const re = latin ? new RegExp(`(?<![A-Za-z0-9])${escapeRe(old)}(?![A-Za-z0-9])`, "g") : new RegExp(escapeRe(old), "g");
        out = out.replace(re, next);
    }
    return out;
}

/** Pure: same as swapName for every string inside a JSON value, except keys that hold links/ids/images. */
const SKIP_KEYS = new Set(["href", "url", "imageUrl", "imagePublicId", "publicId", "image", "email", "phone", "whatsapp", "mapUrl", "ctaHref", "code"]);
export function swapNameDeep(value, olds, next) {
    if (typeof value === "string") return swapName(value, olds, next);
    if (Array.isArray(value)) return value.map((v) => swapNameDeep(v, olds, next));
    if (value && typeof value === "object") {
        const out = {};
        for (const [k, v] of Object.entries(value)) out[k] = SKIP_KEYS.has(k) ? v : swapNameDeep(v, olds, next);
        return out;
    }
    return value;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Swap `oldName` (and the sample names) for `newName` in the stored admin texts. Returns how many rows changed.
 * neon-http has no interactive transactions; each row is a small independent update (safe to run again).
 */
export async function renameEverywhere(oldName, newName) {
    const next = String(newName ?? "").trim();
    if (!next) return 0;
    const olds = [...new Set([String(oldName ?? "").trim(), ...SAMPLE_NAMES])].filter((n) => n && n !== next);
    if (!olds.length) return 0;
    let changed = 0;

    // Site settings: tagline, map pin, Google title/description, address/hours
    const [s] = await db
        .select({ id: siteSettings.id, tagline: siteSettings.tagline, mapLabel: siteSettings.mapLabel, seo: siteSettings.seo, contact: siteSettings.contact })
        .from(siteSettings)
        .limit(1);
    if (s) {
        const patch = {
            tagline: swapName(s.tagline, olds, next),
            mapLabel: swapName(s.mapLabel, olds, next),
            seo: swapNameDeep(s.seo ?? {}, olds, next),
            contact: swapNameDeep(s.contact ?? {}, olds, next),
        };
        if (patch.tagline !== s.tagline || patch.mapLabel !== s.mapLabel || !same(patch.seo, s.seo) || !same(patch.contact, s.contact)) {
            await db.update(siteSettings).set(patch).where(eq(siteSettings.id, s.id));
            changed++;
        }
    }

    // Home sections, booking terms, payment switches (no names there, untouched)
    for (const row of await db.select({ key: pageSections.key, data: pageSections.data }).from(pageSections)) {
        const data = swapNameDeep(row.data ?? {}, olds, next);
        if (!same(data, row.data)) {
            await db.update(pageSections).set({ data }).where(eq(pageSections.key, row.key));
            changed++;
        }
    }

    // Hero slides
    for (const r of await db
        .select({ id: heroSlides.id, alt: heroSlides.alt, eyebrow: heroSlides.eyebrow, heading: heroSlides.heading, subheading: heroSlides.subheading, ctaLabel: heroSlides.ctaLabel })
        .from(heroSlides)) {
        const patch = {};
        for (const k of ["alt", "eyebrow", "heading", "subheading", "ctaLabel"]) {
            const v = swapName(r[k], olds, next);
            if (v !== r[k]) patch[k] = v;
        }
        if (Object.keys(patch).length) {
            await db.update(heroSlides).set(patch).where(eq(heroSlides.id, r.id));
            changed++;
        }
    }

    // Offer banners
    for (const r of await db
        .select({ id: promoBanners.id, badge: promoBanners.badge, title: promoBanners.title, body: promoBanners.body, ctaLabel: promoBanners.ctaLabel })
        .from(promoBanners)) {
        const patch = {};
        for (const k of ["badge", "title", "body", "ctaLabel"]) {
            const v = swapName(r[k], olds, next);
            if (v !== r[k]) patch[k] = v;
        }
        if (Object.keys(patch).length) {
            await db.update(promoBanners).set(patch).where(eq(promoBanners.id, r.id));
            changed++;
        }
    }

    // Ground descriptions ("TurfZone-এর প্রধান মাঠ")
    for (const r of await db.select({ id: pitches.id, description: pitches.description }).from(pitches)) {
        const v = swapName(r.description, olds, next);
        if (v !== r.description) {
            await db.update(pitches).set({ description: v }).where(eq(pitches.id, r.id));
            changed++;
        }
    }

    return changed;
}