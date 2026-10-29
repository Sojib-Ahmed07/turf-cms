// src/features/admin/actions/coupons.js
"use server";

import { revalidatePath, updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { couponRedemptions, coupons } from "@/db/schema";
import { TAGS } from "@/lib/cache-tags";
import { normalizeCode, isHHMM } from "@/features/coupons/rules";
import { ADMIN_ONLY, DENIED, dhakaDayEnd, dhakaDayStart, firstIssue, isoDate, isUniqueViolation, requireRoles } from "@/features/cms/server-utils";
import { BN } from "@/i18n/format";

function refresh() {
    updateTag(TAGS.banners); // banners only show a code while its coupon is live
    revalidatePath("/admin/coupons");
    revalidatePath("/admin/banners");
}

/** "" or a number -> null or the number. */
const optionalNumber = (label, { min = 0, max = 1_000_000, int = false } = {}) =>
    z
        .union([z.number(), z.string()])
        .optional()
        .transform((v) => (v === "" || v === undefined || v === null ? null : Number(v)))
        .refine((v) => v === null || (Number.isFinite(v) && v >= min && v <= max && (!int || Number.isInteger(v))), {
            message: `${label} ${BN.digits(min)} থেকে ${BN.num(max)}-এর মধ্যে ${int ? "একটি পূর্ণ সংখ্যা" : "একটি সংখ্যা"} হতে হবে।`,
        });

const couponSchema = z
    .object({
        id: z.string().uuid().nullish(),
        code: z
            .string()
            .transform(normalizeCode)
            .refine((v) => /^[A-Z0-9_-]{3,20}$/.test(v), "কোড ৩ থেকে ২০টি ইংরেজি অক্ষর বা সংখ্যা দিয়ে লিখুন, মাঝে ফাঁকা রাখা যাবে না।"),
        type: z.enum(["percent", "fixed"]),
        value: z.coerce.number().positive("কোডে কত ছাড় হবে লিখুন।"),
        maxDiscount: optionalNumber("সর্বোচ্চ ছাড়", { min: 1 }),
        minAmount: optionalNumber("স্লটের সর্বনিম্ন দাম", { min: 1 }),
        usageLimit: optionalNumber("মোট কতবার", { min: 1, int: true }),
        perUserLimit: optionalNumber("প্রতিজন কতবার", { min: 1, max: 100, int: true }),
        pitchIds: z.array(z.string().uuid()).max(50).default([]),
        days: z.array(z.number().int().min(0).max(6)).max(7).default([]),
        from: z.string().default("").refine((v) => v === "" || isHHMM(v), "শুরুর সময় সিলেক্ট করুন।"),
        to: z.string().default("").refine((v) => v === "" || isHHMM(v), "শেষের সময় সিলেক্ট করুন।"),
        startDate: isoDate,
        endDate: isoDate,
        isActive: z.boolean().default(true),
    })
    .refine((v) => v.type !== "percent" || v.value <= 100, { message: "শতকরা ১০০-এর বেশি হতে পারে না।" })
    .refine((v) => !(v.startDate && v.endDate && v.endDate < v.startDate), { message: "শেষ তারিখ শুরুর তারিখের দিন বা পরে হতে হবে।" })
    .refine((v) => !(v.from && v.to && v.from === v.to), { message: "শুরু আর শেষের সময় এক হতে পারে না।" });

/** Create (no id) or update a promo code. Returns { ok, data: { id } }. */
export async function saveCoupon(input) {
    try {
        if (!(await requireRoles(ADMIN_ONLY))) return DENIED;
        const parsed = couponSchema.safeParse(input);
        if (!parsed.success) return { ok: false, error: firstIssue(parsed) };
        const v = parsed.data;

        const days = [...new Set(v.days)].sort();
        const hasWindow = (days.length > 0 && days.length < 7) || v.from || v.to;
        const values = {
            code: v.code,
            type: v.type,
            value: String(v.value),
            maxDiscount: v.type === "percent" && v.maxDiscount != null ? String(v.maxDiscount) : null,
            minAmount: v.minAmount != null ? String(v.minAmount) : null,
            usageLimit: v.usageLimit,
            perUserLimit: v.perUserLimit,
            pitchIds: v.pitchIds.length ? [...new Set(v.pitchIds)] : null,
            timeWindow: hasWindow ? { days: days.length < 7 ? days : [], from: v.from, to: v.to } : null,
            startsAt: dhakaDayStart(v.startDate),
            endsAt: dhakaDayEnd(v.endDate),
            isActive: v.isActive,
        };

        let id = v.id;
        try {
            if (id) {
                const rows = await db.update(coupons).set(values).where(eq(coupons.id, id)).returning({ id: coupons.id });
                if (!rows.length) return { ok: false, error: "কোডটি মুছে ফেলা হয়েছে। পেজটি রিলোড করুন।" };
            } else {
                const [row] = await db.insert(coupons).values(values).returning({ id: coupons.id });
                id = row.id;
            }
        } catch (err) {
            if (isUniqueViolation(err)) return { ok: false, error: `${v.code} কোডটি আগে থেকেই আছে। অন্য একটি দিন।` };
            throw err;
        }
        refresh();
        return { ok: true, data: { id, code: v.code } };
    } catch (err) {
        console.error("[saveCoupon]", err);
        return { ok: false, error: "কোড সেভ হয়নি। আবার চেষ্টা করুন।" };
    }
}

export async function setCouponActive({ id, isActive }) {
    try {
        if (!(await requireRoles(ADMIN_ONLY))) return DENIED;
        if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "কোডটি পাওয়া যায়নি।" };
        await db.update(coupons).set({ isActive: Boolean(isActive) }).where(eq(coupons.id, id));
        refresh();
        return { ok: true };
    } catch (err) {
        console.error("[setCouponActive]", err);
        return { ok: false, error: "কোড আপডেট হয়নি।" };
    }
}

/** Delete a code nobody has used yet. Used codes are kept for the records; switch them off instead. */
export async function deleteCoupon(id) {
    try {
        if (!(await requireRoles(ADMIN_ONLY))) return DENIED;
        if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "কোডটি পাওয়া যায়নি।" };
        const [c] = await db.select({ usedCount: coupons.usedCount }).from(coupons).where(eq(coupons.id, id)).limit(1);
        if (!c) return { ok: false, error: "কোডটি পাওয়া যায়নি।" };
        const [used] = await db.select({ id: couponRedemptions.id }).from(couponRedemptions).where(eq(couponRedemptions.couponId, id)).limit(1);
        if (c.usedCount > 0 || used) {
            return { ok: false, error: "খেলোয়াড়রা এই কোড ব্যবহার করেছেন, তাই হিসাবের জন্য রেখে দেওয়া হয়েছে। মুছে না ফেলে বন্ধ করে দিন।" };
        }
        await db.delete(coupons).where(eq(coupons.id, id));
        refresh();
        return { ok: true };
    } catch (err) {
        console.error("[deleteCoupon]", err);
        return { ok: false, error: "কোড মোছা যায়নি।" };
    }
}