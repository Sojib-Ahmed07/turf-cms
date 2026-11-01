// src/features/profile/actions.js
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { BD_PHONE_RE, normalizeBdPhone } from "@/lib/phone";
import { getI18n } from "@/i18n/server";

// Messages are dictionary keys (actionErrors.*), translated when returned.
const profileSchema = z.object({
    name: z.string().trim().min(2, "actionErrors.enterName").max(60, "actionErrors.nameTooLong"),
    phone: z
        .string()
        .trim()
        .max(20)
        .refine((v) => v === "" || BD_PHONE_RE.test(v), "actionErrors.phoneHint"),
});

/** Update the signed-in player's name and mobile number. */
export async function updateProfile(input) {
    const { t } = await getI18n();
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) return { ok: false, error: t("actionErrors.signInAgain"), needsLogin: true };

        const parsed = profileSchema.safeParse({
            name: input?.name ?? "",
            phone: normalizeBdPhone(input?.phone ?? ""),
        });
        if (!parsed.success) {
            const key = parsed.error.issues[0]?.message;
            return { ok: false, error: t(key?.startsWith("actionErrors.") ? key : "actionErrors.checkDetails") };
        }

        const { name, phone } = parsed.data;
        await db
            .update(user)
            .set({ name, phone: phone || null, updatedAt: new Date() })
            .where(eq(user.id, session.user.id));
        revalidatePath("/profile");
        return { ok: true, data: { name, phone } };
    } catch (err) {
        console.error("[updateProfile]", err);
        return { ok: false, error: t("actionErrors.saveFailed") };
    }
}