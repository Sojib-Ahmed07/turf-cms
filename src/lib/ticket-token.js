// src/lib/ticket-token.js
// Signed ticket tokens for QR codes. Pure: no DB, no network.
// A token is  base64url(bookingId|issuedAt).base64url(hmacSha256(payload))
// - Verifying proves the QR was made by us for that booking id.
// - The booking state (confirmed / cancelled / checked in) is always re-read from the DB.
import crypto from "node:crypto";

const TTL_DAYS = 365;

function secret() {
    const s = process.env.TICKET_SECRET || process.env.BETTER_AUTH_SECRET || "";
    if (!s) throw new Error("TICKET_SECRET (or BETTER_AUTH_SECRET) must be set to sign ticket tokens.");
    return s;
}

function b64url(buf) {
    return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(str) {
    const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
    return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function mac(payload) {
    return crypto.createHmac("sha256", secret()).update(payload).digest();
}

/** Sign a booking id into a ticket token. Stable per booking for a rolling window (same day). */
export function signTicket(bookingId, now = Date.now()) {
    const issuedAt = Math.floor(now / 1000);
    const payload = `${bookingId}|${issuedAt}`;
    return `${b64url(payload)}.${b64url(mac(payload))}`;
}

/**
 * Check a ticket token. Returns { bookingId } or null (bad base64, bad signature, expired).
 * Never throws: a tampered URL should just show "not a valid ticket".
 */
export function verifyTicketToken(token, now = Date.now()) {
    try {
        if (typeof token !== "string" || token.length < 20 || token.length > 500) return null;
        const [p, s] = token.split(".");
        if (!p || !s) return null;
        const payload = fromB64url(p).toString("utf8");
        const given = fromB64url(s);
        const expected = mac(payload);
        if (given.length !== expected.length) return null;
        if (!crypto.timingSafeEqual(given, expected)) return null;
        const [bookingId, issuedStr] = payload.split("|");
        if (!bookingId || !issuedStr) return null;
        const issuedAt = Number(issuedStr);
        if (!Number.isFinite(issuedAt)) return null;
        if (now / 1000 - issuedAt > TTL_DAYS * 86400) return null;
        return { bookingId };
    } catch {
        return null;
    }
}

/** Absolute URL that goes inside the QR. Uses APP_URL; falls back to BETTER_AUTH_URL. */
export function ticketVerifyUrl(bookingId, now = Date.now()) {
    const base = (process.env.APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
    return `${base}/verify/${signTicket(bookingId, now)}`;
}