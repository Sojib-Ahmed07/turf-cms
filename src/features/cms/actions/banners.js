// src/features/cms/actions/banners.js
"use server";

import { revalidatePath, updateTag } from "next/cache";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { coupons, promoBanners } from "@/db/schema";
import { PLACEMENTS } from "@/db/schema/cms";
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
    updateTag(TAGS.banners);
    revalidatePath("/admin/banners");
}

// Placements that never show an image (the design has no room for one).
const NO_IMAGE = ["top_bar", "booking_page"];

const bannerSchema = z
    .object({
        id: z.string().uuid().nullish(),
        placement: z.enum(PLACEMENTS),
        image: image,
        badge: text(12, "Badge"),
        title: requiredText(50, "Title"),
        body: text(140, "Text"),
        ctaLabel: text(22, "Button text"),
        ctaHref: link("Button link"),
        couponId: z.string().uuid().or(z.literal("")).nullish(),
        isActive: z.boolean().default(true),
        startDate: isoDate,
        endDate: isoDate,
    })
    .refine((v) => !(v.ctaLabel && !v.ctaHref), { message: "Add a link for the button, or clear the button text." })
    .refine((v) => !(v.startDate && v.endDate && v.endDate < v.startDate), {
        message: "The end date must be on or after the start date.",
    });

/** Create (no id) or update a banner. Returns { ok, data: { id } }. */
export async function saveBanner(input) {
    try {
        if (!(await requireRoles(CONTENT_ROLES))) return DENIED;
        const parsed = bannerSchema.safeParse(input);
        if (!parsed.success) return { ok: false, error: firstIssue(parsed) };
        const v = parsed.data;

        const couponId = v.couponId || null;
        if (couponId) {
            const [c] = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.id, couponId)).limit(1);
            if (!c) return { ok: false, error: "That promo code no longer exists. Pick another." };
        }

        const values = {
            placement: v.placement,
            imageUrl: NO_IMAGE.includes(v.placement) ? null : (v.image?.url ?? null),
            imagePublicId: NO_IMAGE.includes(v.placement) ? null : (v.image?.publicId ?? null),
            badge: v.badge || null,
            title: v.title,
            body: v.body || null,
            ctaLabel: v.ctaLabel || null,
            ctaHref: v.ctaHref || null,
            couponId,
            isActive: v.isActive,
            startsAt: dhakaDayStart(v.startDate),
            endsAt: dhakaDayEnd(v.endDate),
        };

        let id = v.id;
        if (id) {
            const [old] = await db.select({ placement: promoBanners.placement }).from(promoBanners).where(eq(promoBanners.id, id)).limit(1);
            if (!old) return { ok: false, error: "This banner was deleted. Reload the page." };
            const moved = old.placement !== v.placement;
            await db
                .update(promoBanners)
                .set(moved ? { ...values, sortOrder: await nextOrder(v.placement) } : values)
                .where(eq(promoBanners.id, id));
        } else {
            const [row] = await db
                .insert(promoBanners)
                .values({ ...values, sortOrder: await nextOrder(v.placement) })
                .returning({ id: promoBanners.id });
            id = row.id;
        }
        refresh();
        return { ok: true, data: { id } };
    } catch (err) {
        console.error("[saveBanner]", err);
        return { ok: false, error: "Couldn't save the banner. Try again." };
    }
}

async function nextOrder(placement) {
    const [{ next }] = await db
        .select({ next: sql`coalesce(max(${promoBanners.sortOrder}), -1) + 1` })
        .from(promoBanners)
        .where(eq(promoBanners.placement, placement));
    return Number(next);
}

export async function setBannerActive({ id, isActive }) {
    try {
        if (!(await requireRoles(CONTENT_ROLES))) return DENIED;
        if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Banner not found." };
        await db.update(promoBanners).set({ isActive: Boolean(isActive) }).where(eq(promoBanners.id, id));
        refresh();
        return { ok: true };
    } catch (err) {
        console.error("[setBannerActive]", err);
        return { ok: false, error: "Couldn't update the banner." };
    }
}

export async function deleteBanner(id) {
    try {
        if (!(await requireRoles(CONTENT_ROLES))) return DENIED;
        if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Banner not found." };
        await db.delete(promoBanners).where(eq(promoBanners.id, id));
        refresh();
        return { ok: true };
    } catch (err) {
        console.error("[deleteBanner]", err);
        return { ok: false, error: "Couldn't delete the banner." };
    }
}

/** Move a banner up (-1) or down (+1) within its placement. Only the first live one shows. */
export async function moveBanner({ id, direction }) {
    try {
        if (!(await requireRoles(CONTENT_ROLES))) return DENIED;
        if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Banner not found." };
        const [b] = await db.select({ placement: promoBanners.placement }).from(promoBanners).where(eq(promoBanners.id, id)).limit(1);
        if (!b) return { ok: false, error: "Banner not found." };
        const rows = await db
            .select({ id: promoBanners.id })
            .from(promoBanners)
            .where(and(eq(promoBanners.placement, b.placement)))
            .orderBy(asc(promoBanners.sortOrder), asc(promoBanners.createdAt));
        const ids = rows.map((r) => r.id);
        const i = ids.indexOf(id);
        const j = i + (direction < 0 ? -1 : 1);
        if (j < 0 || j >= ids.length) return { ok: true };
        [ids[i], ids[j]] = [ids[j], ids[i]];
        for (const [order, bid] of ids.entries()) {
            await db.update(promoBanners).set({ sortOrder: order }).where(eq(promoBanners.id, bid));
        }
        refresh();
        return { ok: true };
    } catch (err) {
        console.error("[moveBanner]", err);
        return { ok: false, error: "Couldn't change the order." };
    }
}