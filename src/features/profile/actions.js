// src/features/profile/actions.js
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { BD_PHONE_HINT, BD_PHONE_RE, normalizeBdPhone } from "@/lib/phone";

const profileSchema = z.object({
    name: z.string().trim().min(2, "Enter your name.").max(60, "Keep your name under 60 characters."),
    phone: z
        .string()
        .trim()
        .max(20)
        .refine((v) => v === "" || BD_PHONE_RE.test(v), BD_PHONE_HINT),
});

/** Update the signed-in player's name and mobile number. */
export async function updateProfile(input) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) return { ok: false, error: "Sign in again to change your details.", needsLogin: true };

        const parsed = profileSchema.safeParse({
            name: input?.name ?? "",
            phone: normalizeBdPhone(input?.phone ?? ""),
        });
        if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };

        const { name, phone } = parsed.data;
        await db
            .update(user)
            .set({ name, phone: phone || null, updatedAt: new Date() })
            .where(eq(user.id, session.user.id));
        revalidatePath("/profile");
        return { ok: true, data: { name, phone } };
    } catch (err) {
        console.error("[updateProfile]", err);
        return { ok: false, error: "Couldn't save your details. Try again." };
    }
}