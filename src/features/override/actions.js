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
    if (!session || session.user.role !== "admin") return { ok: false, error: "Unauthorized" };

    const expected = process.env.ADMIN_OVERRIDE_PASSWORD;
    if (!expected) return { ok: false, error: "Override is not configured." };

    if (!comparePassword(password, expected)) {
        return { ok: false, error: "Wrong password." };
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

export async function saveOverride({ todayDisplay, monthDisplay, realToday, realMonth }) {
    const session = await getSession();
    if (!session || session.user.role !== "admin") return { ok: false, error: "Unauthorized" };

    if (!(await isOverrideUnlocked())) return { ok: false, error: "Session expired." };

    const todayNum = Number(todayDisplay);
    const monthNum = Number(monthDisplay);
    if (isNaN(todayNum) || isNaN(monthNum)) return { ok: false, error: "Numbers only." };

    // Store the difference. If real is 1000, and they type 1500, we store +500.
    const offsetToday = todayNum - realToday;
    const offsetMonth = monthNum - realMonth;

    try {
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
        return { ok: false, error: "Could not save." };
    }
}

export async function resetOverride() {
    const session = await getSession();
    if (!session || session.user.role !== "admin") return { ok: false, error: "Unauthorized" };
    if (!(await isOverrideUnlocked())) return { ok: false, error: "Session expired." };

    try {
        await db.update(siteSettings)
            .set({ overrideRevenueToday: 0, overrideRevenueMonth: 0 })
            .where(eq(siteSettings.id, 1));

        updateTag(TAGS.settings);
        revalidatePath("/admin");
        return { ok: true };
    } catch (err) {
        console.error("[resetOverride]", err);
        return { ok: false, error: "Could not reset." };
    }
}