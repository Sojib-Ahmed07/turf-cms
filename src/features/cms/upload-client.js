// src/features/cms/upload-client.js
// Browser-side upload: signature from our server -> file straight to Cloudinary -> record in the media library.
"use client";

import { getUploadSignature, saveMedia } from "./actions/media";

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];
export const MAX_UPLOAD_MB = 10;

/** Throws an Error with a message fit to show the admin. */
export function checkFile(file) {
    if (!file) throw new Error("আগে একটি ছবি সিলেক্ট করুন।");
    if (!TYPES.includes(file.type)) throw new Error("JPG, PNG, WebP, GIF, SVG বা ICO ছবি দিন।");
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`ছবিটি ${MAX_UPLOAD_MB} MB-এর বেশি বড়। ছোট করে আবার চেষ্টা করুন।`);
}

function postToCloudinary(sig, file, onProgress) {
    return new Promise((resolve, reject) => {
        const body = new FormData();
        body.append("file", file);
        body.append("api_key", sig.apiKey);
        body.append("timestamp", String(sig.timestamp));
        body.append("folder", sig.folder);
        body.append("signature", sig.signature);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", sig.uploadUrl);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
            let data = null;
            try {
                data = JSON.parse(xhr.responseText);
            } catch { }
            if (xhr.status >= 200 && xhr.status < 300 && data?.public_id) resolve(data);
            else reject(new Error(data?.error?.message ? `Cloudinary: ${data.error.message}` : "ছবি আপলোড হয়নি। আবার চেষ্টা করুন।"));
        };
        xhr.onerror = () => reject(new Error("ছবি আপলোড হয়নি। ইন্টারনেট কানেকশন দেখে আবার চেষ্টা করুন।"));
        xhr.send(body);
    });
}

/**
 * Upload one image into a media folder ("branding" | "hero" | "banners" | "pitches" | "seo" | "misc").
 * Resolves to the media item { id, url, publicId, name, width, height, ... }.
 */
export async function uploadImage(file, folder, onProgress) {
    checkFile(file);
    const sig = await getUploadSignature(folder);
    if (!sig.ok) throw new Error(sig.error);
    onProgress?.(0);
    const result = await postToCloudinary(sig.data, file, onProgress);
    const saved = await saveMedia({ result, folder });
    if (!saved.ok) throw new Error(saved.error);
    return saved.data;
}