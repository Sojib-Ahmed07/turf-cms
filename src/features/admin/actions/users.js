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
    role: z.enum(["admin", "editor", "user"]),
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
        if (!parsed.success) return { ok: false, error: "Pick a role." };
        const { userId, role } = parsed.data;
        if (userId === me.id) return { ok: false, error: "You can't change your own role. Ask another admin." };

        const [target] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId)).limit(1);
        if (!target) return { ok: false, error: "User not found." };
        if (target.role === role) return { ok: true };

        if (target.role === "admin" && role !== "admin") {
            const [{ n }] = await db.select({ n: count() }).from(user).where(eq(user.role, "admin"));
            if (Number(n) <= 1) return { ok: false, error: "There must be at least one admin." };
        }

        await db.update(user).set({ role, updatedAt: new Date() }).where(eq(user.id, userId));
        revalidatePath("/admin/users");
        return { ok: true };
    } catch (err) {
        console.error("[setUserRole]", err);
        return { ok: false, error: "Couldn't change the role. Try again." };
    }
}