// src/features/override/actions.js
"use server";

import { cookies } from "next/headers";
import { updateTag, revalidatePath } from "next/cache";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { TAGS } from "@/lib/cache-tags";
import { getSession } from "@/lib/guards";
import crypto from "node:crypto";
import { getDashboardStats } from "@/features/admin/queries";

const COOKIE_NAME = "tz_override_auth";

function comparePassword(input, expected) {
    if (!input || !expected) return false;
    const a = Buffer.from(input);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

export async function unlockOverride(password) {
    const session = await getSession();
    if (!session || session.user.role !== "admin") return { ok: false, error: "শুধু অ্যাডমিন এটি ব্যবহার করতে পারেন।" };

    const expected = process.env.ADMIN_OVERRIDE_PASSWORD;
    if (!expected) return { ok: false, error: "কন্ট্রোল রুম সেট আপ করা নেই।" };

    if (!comparePassword(password, expected)) {
        return { ok: false, error: "পাসওয়ার্ড ভুল।" };
    }

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 2, // 2 hours
        path: "/",
    });

    return { ok: true };
}

export async function isOverrideUnlocked() {
    const cookieStore = await cookies();
    const val = cookieStore.get(COOKIE_NAME);
    return val?.value === "true";
}

export async function saveOverride({ todayDisplay, monthDisplay }) {
    const session = await getSession();
    if (!session || session.user.role !== "admin") return { ok: false, error: "শুধু অ্যাডমিন এটি ব্যবহার করতে পারেন।" };

    if (!(await isOverrideUnlocked())) return { ok: false, error: "সময় শেষ হয়ে গেছে। পেজটি রিলোড করে আবার পাসওয়ার্ড দিন।" };

    const todayNum = Number(todayDisplay);
    const monthNum = Number(monthDisplay);
    const ok = (n) => Number.isInteger(n) && n >= 0 && n <= 1_000_000_000;
    if (!ok(todayNum) || !ok(monthNum)) return { ok: false, error: "০ বা তার বেশি পূর্ণ সংখ্যা লিখুন।" };

    try {
        // Store the difference from the real paid revenue (read here, never trusted from the browser).
        // Real 1000 and the admin types 1500: store +500.
        const { rawTodayRevenue, rawMonthRevenue } = await getDashboardStats();
        const offsetToday = todayNum - rawTodayRevenue;
        const offsetMonth = monthNum - rawMonthRevenue;

        await db.update(siteSettings)
            .set({
                overrideRevenueToday: offsetToday,
                overrideRevenueMonth: offsetMonth
            })
            .where(eq(siteSettings.id, 1));

        updateTag(TAGS.settings);
        revalidatePath("/admin");
        return { ok: true };
    } catch (err) {
        console.error("[saveOverride]", err);
        return { ok: false, error: "সেভ হয়নি। আবার চেষ্টা করুন।" };
    }
}

export async function resetOverride() {
    const session = await getSession();
    if (!session || session.user.role !== "admin") return { ok: false, error: "শুধু অ্যাডমিন এটি ব্যবহার করতে পারেন।" };
    if (!(await isOverrideUnlocked())) return { ok: false, error: "সময় শেষ হয়ে গেছে। পেজটি রিলোড করে আবার পাসওয়ার্ড দিন।" };

    try {
        await db.update(siteSettings)
            .set({ overrideRevenueToday: 0, overrideRevenueMonth: 0 })
            .where(eq(siteSettings.id, 1));

        updateTag(TAGS.settings);
        revalidatePath("/admin");
        return { ok: true };
    } catch (err) {
        console.error("[resetOverride]", err);
        return { ok: false, error: "আগের মতো করা যায়নি। আবার চেষ্টা করুন।" };
    }
}