// src/lib/cloudinary.js
// Cloudinary without the SDK: signed browser uploads + delete. Server only (uses the API secret).
// Docs: https://cloudinary.com/documentation/authentication_signatures
//
// Env: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET,
//      CLOUDINARY_FOLDER (top folder for this site, e.g. "turfzone").
// CLOUDINARY_API_BASE is for automated tests only (points at a local mock); leave it unset.
import "server-only";
import { createHash } from "node:crypto";

const API = "https://api.cloudinary.com";

function config() {
    return {
        cloud: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "",
        key: process.env.CLOUDINARY_API_KEY ?? "",
        secret: process.env.CLOUDINARY_API_SECRET ?? "",
        root: (process.env.CLOUDINARY_FOLDER || "turfzone").replace(/^\/+|\/+$/g, ""),
        api: (process.env.CLOUDINARY_API_BASE || API).replace(/\/$/, ""),
    };
}

export function isCloudinaryConfigured() {
    const c = config();
    return Boolean(c.cloud && c.key && c.secret);
}

/** Cloudinary signature: sorted "k=v&k=v" of the signed params + API secret, SHA-1 hex. */
function sign(params, secret, algo = "sha1") {
    const str = Object.keys(params)
        .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("&");
    return createHash(algo).update(str + secret).digest("hex");
}

/** Everything the browser needs to upload one file straight to Cloudinary into `<root>/<folder>`. */
export function createUploadSignature(folder) {
    const c = config();
    const timestamp = Math.floor(Date.now() / 1000);
    const fullFolder = `${c.root}/${folder}`;
    const signature = sign({ folder: fullFolder, timestamp }, c.secret);
    return {
        uploadUrl: `${c.api}/v1_1/${c.cloud}/image/upload`,
        apiKey: c.key,
        timestamp,
        folder: fullFolder,
        signature,
    };
}

/**
 * Check that an upload result really came from Cloudinary for our account:
 * its `signature` must equal sha1("public_id=<id>&version=<v>" + secret),
 * and the URL must be on our cloud. (No folder check: accounts in "dynamic folders"
 * mode don't always put the folder in the public_id.)
 */
export function verifyUploadResult(result) {
    const c = config();
    if (!result || typeof result.public_id !== "string" || !result.version || typeof result.signature !== "string") {
        return false;
    }
    // https://cloudinary.com/documentation/response_signatures (SHA-1 by default, SHA-256 on some accounts)
    const params = { public_id: result.public_id, version: result.version };
    if (result.signature !== sign(params, c.secret) && result.signature !== sign(params, c.secret, "sha256")) return false;
    return typeof result.secure_url === "string" && result.secure_url.startsWith(`https://res.cloudinary.com/${c.cloud}/`);
}

/** Delete one image. Returns true if it's gone (including "not found"). */
export async function destroyImage(publicId) {
    const c = config();
    const timestamp = Math.floor(Date.now() / 1000);
    const body = new URLSearchParams({
        public_id: publicId,
        timestamp: String(timestamp),
        api_key: c.key,
        signature: sign({ public_id: publicId, timestamp }, c.secret),
    });
    try {
        const res = await fetch(`${c.api}/v1_1/${c.cloud}/image/destroy`, {
            method: "POST",
            body,
            cache: "no-store",
            signal: AbortSignal.timeout(15000),
        });
        const data = await res.json().catch(() => null);
        if (data?.result === "ok" || data?.result === "not found") return true;
        console.error("[cloudinary:destroy]", res.status, data);
        return false;
    } catch (err) {
        console.error("[cloudinary:destroy]", err?.message ?? err);
        return false;
    }
}