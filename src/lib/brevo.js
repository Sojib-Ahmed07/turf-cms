// src/lib/brevo.js
import "server-only";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export async function sendBrevoEmail({ to, subject, html, text }) {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME;

    if (!apiKey || !senderEmail || !senderName) {
        throw new Error("Brevo is not configured (BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME).");
    }

    const body = {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
    };
    if (text) body.textContent = text;

    const res = await fetch(BREVO_ENDPOINT, {
        method: "POST",
        headers: {
            "api-key": apiKey,
            "Content-Type": "application/json",
            accept: "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        let detail = "";
        try {
            const j = await res.json();
            detail = j?.message || j?.error || "";
        } catch {
            /* ignore */
        }
        throw new Error(`Brevo send failed (${res.status})${detail ? `: ${detail}` : ""}`);
    }
}