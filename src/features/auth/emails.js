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
    const subject = `${otp} is your ${siteName} verification code`;
    const safeOtp = escapeHtml(otp);

    const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <p style="font-size:14px;color:#555;margin:0 0 16px;">Your verification code</p>
            <p style="font-size:36px;font-weight:700;letter-spacing:8px;color:#0f1f19;margin:0 0 16px;font-variant-numeric:tabular-nums;">${safeOtp}</p>
            <p style="font-size:14px;color:#555;line-height:1.5;margin:0 0 8px;">Enter this code to finish creating your ${siteName} account.</p>
            <p style="font-size:13px;color:#888;line-height:1.5;margin:0;">The code expires in 5 minutes. If you didn't create an account, you can ignore this email.</p>
        </div>
    `;
    const text = `${siteName} verification code: ${otp}\n\nEnter this code to finish creating your account. It expires in 5 minutes.`;

    await sendBrevoEmail({ to: email, subject, html, text });
}
/** Send the forgot-password code. Throws on failure. */
export async function sendPasswordResetEmail({ email, otp }) {
    const siteName = process.env.APP_NAME || "TurfZone";
    const subject = `${otp} is your ${siteName} password reset code`;
    const safeOtp = escapeHtml(otp);
    const safeName = escapeHtml(siteName);

    const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <p style="font-size:14px;color:#555;margin:0 0 16px;">Your password reset code</p>
            <p style="font-size:36px;font-weight:700;letter-spacing:8px;color:#0f1f19;margin:0 0 16px;font-variant-numeric:tabular-nums;">${safeOtp}</p>
            <p style="font-size:14px;color:#555;line-height:1.5;margin:0 0 8px;">Enter this code on the ${safeName} website to choose a new password. You'll be signed out on every device.</p>
            <p style="font-size:13px;color:#888;line-height:1.5;margin:0;">The code expires in 5 minutes. If you didn't ask to reset your password, ignore this email: your password stays the same.</p>
        </div>
    `;
    const text = `${siteName} password reset code: ${otp}\n\nEnter it on the website to choose a new password. It expires in 5 minutes. If you didn't ask for this, ignore this email.`;

    await sendBrevoEmail({ to: email, subject, html, text });
}