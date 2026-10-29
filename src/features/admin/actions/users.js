// src/features/admin/actions/users.js
"use server";

import { revalidatePath } from "next/cache";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema";
import { ADMIN_ONLY, DENIED, requireRoles } from "@/features/cms/server-utils";

const roleSchema = z.object({
    userId: z.string().min(1).max(100),
    role: z.enum(["admin", "user"]),
});

/**
 * Change someone's role. Takes effect on their next page load.
 * You can't change your own role (so you can't lock yourself out), and the last admin stays an admin.
 */
export async function setUserRole(input) {
    try {
        const me = await requireRoles(ADMIN_ONLY);
        if (!me) return DENIED;
        const parsed = roleSchema.safeParse(input);
        if (!parsed.success) return { ok: false, error: "একটি ভূমিকা সিলেক্ট করুন।" };
        const { userId, role } = parsed.data;
        if (userId === me.id) return { ok: false, error: "নিজের ভূমিকা নিজে বদলানো যায় না। অন্য একজন অ্যাডমিনকে বলুন।" };

        const [target] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId)).limit(1);
        if (!target) return { ok: false, error: "ব্যবহারকারী পাওয়া যায়নি।" };
        if (target.role === role) return { ok: true };

        if (target.role === "admin" && role !== "admin") {
            const [{ n }] = await db.select({ n: count() }).from(user).where(eq(user.role, "admin"));
            if (Number(n) <= 1) return { ok: false, error: "কমপক্ষে একজন অ্যাডমিন থাকতে হবে।" };
        }

        await db.update(user).set({ role, updatedAt: new Date() }).where(eq(user.id, userId));
        revalidatePath("/admin/users");
        return { ok: true };
    } catch (err) {
        console.error("[setUserRole]", err);
        return { ok: false, error: "ভূমিকা বদলানো যায়নি। আবার চেষ্টা করুন।" };
    }
}