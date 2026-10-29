// src/features/auth/emails.js
import "server-only";
import { sendBrevoEmail } from "@/lib/brevo";

function escapeHtml(s) {
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

/** Send the registration verification code. Throws on failure. */
export async function sendOtpEmail({ email, otp }) {
    const siteName = process.env.APP_NAME || "TurfZone";
    const subject = `${siteName} যাচাই কোড: ${otp}`;
    const safeOtp = escapeHtml(otp);

    const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <p style="font-size:14px;color:#555;margin:0 0 16px;">আপনার যাচাই কোড</p>
            <p style="font-size:36px;font-weight:700;letter-spacing:8px;color:#0f1f19;margin:0 0 16px;font-variant-numeric:tabular-nums;">${safeOtp}</p>
            <p style="font-size:14px;color:#555;line-height:1.5;margin:0 0 8px;">${siteName}-এ অ্যাকাউন্ট খোলা শেষ করতে এই কোডটি লিখুন।</p>
            <p style="font-size:13px;color:#888;line-height:1.5;margin:0;">কোডটি ৫ মিনিট কাজ করবে। আপনি অ্যাকাউন্ট না খুলে থাকলে এই ইমেইলটি এড়িয়ে যান।</p>
        </div>
    `;
    const text = `${siteName} যাচাই কোড: ${otp}\n\nঅ্যাকাউন্ট খোলা শেষ করতে এই কোডটি লিখুন। কোডটি ৫ মিনিট কাজ করবে।`;

    await sendBrevoEmail({ to: email, subject, html, text });
}
/** Send the forgot-password code. Throws on failure. */
export async function sendPasswordResetEmail({ email, otp }) {
    const siteName = process.env.APP_NAME || "TurfZone";
    const subject = `${siteName} পাসওয়ার্ড রিসেট কোড: ${otp}`;
    const safeOtp = escapeHtml(otp);
    const safeName = escapeHtml(siteName);

    const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <p style="font-size:14px;color:#555;margin:0 0 16px;">আপনার পাসওয়ার্ড রিসেট কোড</p>
            <p style="font-size:36px;font-weight:700;letter-spacing:8px;color:#0f1f19;margin:0 0 16px;font-variant-numeric:tabular-nums;">${safeOtp}</p>
            <p style="font-size:14px;color:#555;line-height:1.5;margin:0 0 8px;">নতুন পাসওয়ার্ড দিতে ${safeName} ওয়েবসাইটে এই কোডটি লিখুন। এরপর সব ডিভাইস থেকে আপনি লগআউট হয়ে যাবেন।</p>
            <p style="font-size:13px;color:#888;line-height:1.5;margin:0;">কোডটি ৫ মিনিট কাজ করবে। আপনি পাসওয়ার্ড রিসেট করতে না চাইলে এই ইমেইলটি এড়িয়ে যান, আপনার পাসওয়ার্ড বদলাবে না।</p>
        </div>
    `;
    const text = `${siteName} পাসওয়ার্ড রিসেট কোড: ${otp}\n\nনতুন পাসওয়ার্ড দিতে ওয়েবসাইটে কোডটি লিখুন। কোডটি ৫ মিনিট কাজ করবে। আপনি এটি না চাইলে ইমেইলটি এড়িয়ে যান।`;

    await sendBrevoEmail({ to: email, subject, html, text });
}