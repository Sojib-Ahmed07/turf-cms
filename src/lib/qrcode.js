// src/lib/qrcode.js
// Server-side QR image generation. Wraps the "qrcode" package so the rest of the app never imports it directly.
import "server-only";
import QRCode from "qrcode";

/** PNG data URL for a ticket verify URL. 240x240, quiet margin, medium error correction. */
export async function qrDataUrlForUrl(url) {
    if (!url) return "";
    return QRCode.toDataURL(url, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 240,
        color: { dark: "#0f1f19", light: "#ffffff" },
    });
}