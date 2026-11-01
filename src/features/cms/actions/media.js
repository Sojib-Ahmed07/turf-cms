// src/features/cms/actions/media.js
"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { media } from "@/db/schema";
import { createUploadSignature, destroyImage, isCloudinaryConfigured, verifyUploadResult } from "@/lib/cloudinary";
import { getMediaPickerItems, getMediaUsage } from "../admin-queries";
import { CONTENT_ROLES, DENIED, requireRoles } from "../server-utils";

/** Folders inside CLOUDINARY_FOLDER (default "turfzone"). The media library filters by these. */
const FOLDERS = ["branding", "hero", "banners", "pitches", "seo", "misc"];
const NOT_SET_UP = { ok: false, error: "ছবি আপলোড এখনো চালু হয়নি। .env.local ফাইলে Cloudinary-র কী (key) দিন।" };

/**
 * Step 1 of an upload: a short-lived signature so the browser can send the file
 * straight to Cloudinary (the file never passes through our server).
 */
export async function getUploadSignature(folder) {
    try {
        if (!(await requireRoles(CONTENT_ROLES))) return DENIED;
        if (!isCloudinaryConfigured()) return NOT_SET_UP;
        const f = FOLDERS.includes(folder) ? folder : "misc";
        return { ok: true, data: createUploadSignature(f) };
    } catch (err) {
        console.error("[getUploadSignature]", err);
        return { ok: false, error: "আপলোড শুরু করা যায়নি। আবার চেষ্টা করুন।" };
    }
}

const resultSchema = z.object({
    public_id: z.string().min(1).max(300),
    version: z.union([z.number(), z.string()]),
    signature: z.string().min(1).max(100),
    secure_url: z.string().url(),
    width: z.number().int().nonnegative().optional(),
    height: z.number().int().nonnegative().optional(),
    bytes: z.number().int().nonnegative().optional(),
    format: z.string().max(20).optional(),
    original_filename: z.string().max(200).optional(),
});

/**
 * Step 2: record the upload in the media library. The result is only accepted if
 * Cloudinary's own signature on it checks out, so nobody can register a fake URL.
 * Returns { ok, data: { id, url, publicId, name, ... } }.
 */
export async function saveMedia({ result, folder }) {
    try {
        const user = await requireRoles(CONTENT_ROLES);
        if (!user) return DENIED;
        const parsed = resultSchema.safeParse(result);
        if (!parsed.success || !verifyUploadResult(parsed.data)) {
            return { ok: false, error: "আপলোড যাচাই করা যায়নি। আবার চেষ্টা করুন।" };
        }
        const r = parsed.data;
        const values = {
            publicId: r.public_id,
            url: r.secure_url,
            width: r.width ?? null,
            height: r.height ?? null,
            bytes: r.bytes ?? null,
            format: r.format ?? null,
            originalName: r.original_filename ? `${r.original_filename}${r.format ? `.${r.format}` : ""}` : null,
            folder: FOLDERS.includes(folder) ? folder : "misc",
            uploadedBy: user.id,
        };
        const [row] = await db
            .insert(media)
            .values(values)
            .onConflictDoUpdate({ target: media.publicId, set: { url: values.url, width: values.width, height: values.height, bytes: values.bytes } })
            .returning();
        revalidatePath("/admin/media");
        return {
            ok: true,
            data: {
                id: row.id,
                url: row.url,
                publicId: row.publicId,
                name: row.originalName || row.publicId.split("/").pop(),
                folder: row.folder,
                width: row.width,
                height: row.height,
                bytes: row.bytes,
                format: row.format,
                alt: row.alt ?? "",
                usedIn: [],
            },
        };
    } catch (err) {
        console.error("[saveMedia]", err);
        return { ok: false, error: "ছবি আপলোড হয়েছে, কিন্তু সেভ হয়নি। আবার চেষ্টা করুন।" };
    }
}

/** Images for the "From media library" picker. */
export async function listMediaForPicker() {
    try {
        if (!(await requireRoles(CONTENT_ROLES))) return DENIED;
        return { ok: true, data: await getMediaPickerItems() };
    } catch (err) {
        console.error("[listMediaForPicker]", err);
        return { ok: false, error: "ছবির লাইব্রেরি লোড হয়নি।" };
    }
}

export async function updateMediaAlt({ id, alt }) {
    try {
        if (!(await requireRoles(CONTENT_ROLES))) return DENIED;
        if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "ছবিটি পাওয়া যায়নি।" };
        const clean = String(alt ?? "").trim().slice(0, 160);
        await db.update(media).set({ alt: clean || null }).where(eq(media.id, id));
        revalidatePath("/admin/media");
        return { ok: true };
    } catch (err) {
        console.error("[updateMediaAlt]", err);
        return { ok: false, error: "বর্ণনা সেভ হয়নি।" };
    }
}

/** Delete from Cloudinary and the library. Refuses while the image is still used somewhere. */
export async function deleteMedia(id) {
    try {
        if (!(await requireRoles(CONTENT_ROLES))) return DENIED;
        if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "ছবিটি পাওয়া যায়নি।" };
        const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
        if (!row) return { ok: false, error: "ছবিটি পাওয়া যায়নি।" };

        const usedIn = (await getMediaUsage()).get(row.url) ?? [];
        if (usedIn.length) {
            return { ok: false, error: `ছবিটি এখনো ব্যবহার হচ্ছে: ${usedIn.join(", ")}। আগে সেখান থেকে বদলান।` };
        }

        if (isCloudinaryConfigured()) {
            const gone = await destroyImage(row.publicId);
            if (!gone) return { ok: false, error: "Cloudinary ছবিটি মোছেনি। এক মিনিট পরে আবার চেষ্টা করুন।" };
        }
        await db.delete(media).where(eq(media.id, id));
        revalidatePath("/admin/media");
        return { ok: true };
    } catch (err) {
        console.error("[deleteMedia]", err);
        return { ok: false, error: "ছবি মোছা যায়নি। আবার চেষ্টা করুন।" };
    }
}