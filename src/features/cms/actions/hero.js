// src/features/cms/actions/hero.js
"use server";

import { revalidatePath, updateTag } from "next/cache";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { heroSlides } from "@/db/schema";
import { TAGS } from "@/lib/cache-tags";
import {
    CONTENT_ROLES,
    DENIED,
    dhakaDayEnd,
    dhakaDayStart,
    firstIssue,
    image,
    isoDate,
    link,
    requireRoles,
    requiredText,
    text,
} from "../server-utils";

function refresh() {
    updateTag(TAGS.hero);
    revalidatePath("/admin/hero");
}

const slideSchema = z
    .object({
        id: z.string().uuid().nullish(),
        image: image,
        mobileImage: image,
        alt: text(120, "ছবির বর্ণনা"),
        eyebrow: text(24, "ছোট লেবেল"),
        heading: requiredText(60, "শিরোনাম"),
        subheading: text(160, "শিরোনামের নিচের লেখা"),
        ctaLabel: text(20, "বাটনের লেখা"),
        ctaHref: link("বাটনের লিংক"),
        overlay: z.enum(["dark", "light", "none"]).default("dark"),
        isActive: z.boolean().default(true),
        startDate: isoDate,
        endDate: isoDate,
    })
    .refine((v) => !(v.ctaLabel && !v.ctaHref), { message: "বাটনের জন্য একটি লিংক দিন, অথবা বাটনের লেখা মুছে দিন।" })
    .refine((v) => !(v.startDate && v.endDate && v.endDate < v.startDate), {
        message: "“কবে পর্যন্ত দেখাবে” তারিখটি “কবে থেকে দেখাবে” তারিখের দিন বা পরে হতে হবে।",
    });

/** Create (no id) or update a slide. Returns { ok, data: { id } }. */
export async function saveHeroSlide(input) {
    try {
        if (!(await requireRoles(CONTENT_ROLES))) return DENIED;
        const parsed = slideSchema.safeParse(input);
        if (!parsed.success) return { ok: false, error: firstIssue(parsed) };
        const v = parsed.data;

        const values = {
            imageUrl: v.image?.url ?? null,
            imagePublicId: v.image?.publicId ?? null,
            mobileImageUrl: v.mobileImage?.url ?? null,
            mobileImagePublicId: v.mobileImage?.publicId ?? null,
            alt: v.alt || null,
            eyebrow: v.eyebrow || null,
            heading: v.heading,
            subheading: v.subheading || null,
            ctaLabel: v.ctaLabel || null,
            ctaHref: v.ctaHref || null,
            overlay: v.overlay,
            isActive: v.isActive,
            startsAt: dhakaDayStart(v.startDate),
            endsAt: dhakaDayEnd(v.endDate),
        };

        let id = v.id;
        if (id) {
            const rows = await db.update(heroSlides).set(values).where(eq(heroSlides.id, id)).returning({ id: heroSlides.id });
            if (!rows.length) return { ok: false, error: "স্লাইডটি মুছে ফেলা হয়েছে। পেজটি রিলোড করুন।" };
        } else {
            const [{ next }] = await db
                .select({ next: sql`coalesce(max(${heroSlides.sortOrder}), -1) + 1` })
                .from(heroSlides);
            const [row] = await db
                .insert(heroSlides)
                .values({ ...values, sortOrder: Number(next) })
                .returning({ id: heroSlides.id });
            id = row.id;
        }
        refresh();
        return { ok: true, data: { id } };
    } catch (err) {
        console.error("[saveHeroSlide]", err);
        return { ok: false, error: "স্লাইড সেভ হয়নি। আবার চেষ্টা করুন।" };
    }
}

export async function setHeroSlideActive({ id, isActive }) {
    try {
        if (!(await requireRoles(CONTENT_ROLES))) return DENIED;
        if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "স্লাইডটি পাওয়া যায়নি।" };
        await db.update(heroSlides).set({ isActive: Boolean(isActive) }).where(eq(heroSlides.id, id));
        refresh();
        return { ok: true };
    } catch (err) {
        console.error("[setHeroSlideActive]", err);
        return { ok: false, error: "স্লাইড আপডেট হয়নি।" };
    }
}

export async function deleteHeroSlide(id) {
    try {
        if (!(await requireRoles(CONTENT_ROLES))) return DENIED;
        if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "স্লাইডটি পাওয়া যায়নি।" };
        await db.delete(heroSlides).where(eq(heroSlides.id, id));
        refresh();
        return { ok: true };
    } catch (err) {
        console.error("[deleteHeroSlide]", err);
        return { ok: false, error: "স্লাইড মোছা যায়নি।" };
    }
}

/** Move a slide one place up (-1) or down (+1). Renumbers the order 0..n-1. */
export async function moveHeroSlide({ id, direction }) {
    try {
        if (!(await requireRoles(CONTENT_ROLES))) return DENIED;
        const rows = await db
            .select({ id: heroSlides.id })
            .from(heroSlides)
            .orderBy(asc(heroSlides.sortOrder), asc(heroSlides.createdAt));
        const ids = rows.map((r) => r.id);
        const i = ids.indexOf(id);
        const j = i + (direction < 0 ? -1 : 1);
        if (i < 0 || j < 0 || j >= ids.length) return { ok: true };
        [ids[i], ids[j]] = [ids[j], ids[i]];
        for (const [order, sid] of ids.entries()) {
            await db.update(heroSlides).set({ sortOrder: order }).where(eq(heroSlides.id, sid));
        }
        refresh();
        return { ok: true };
    } catch (err) {
        console.error("[moveHeroSlide]", err);
        return { ok: false, error: "ক্রম বদলানো যায়নি।" };
    }
}