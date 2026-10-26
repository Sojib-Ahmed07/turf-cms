// src/lib/bkash.js
// Minimal bKash Tokenized Checkout client (API v1.2.0-beta). Server only: it uses the merchant secrets.
// Flow: grant token -> create payment (player goes to bkashURL) -> bKash sends the browser back to our
// callback with ?paymentID=&status= -> execute payment (this is when the money moves) -> query if unsure.
//
// Env: BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME, BKASH_PASSWORD, BKASH_IS_LIVE ("true" = live).
// BKASH_API_BASE is for automated tests only (points at a local mock); leave it unset.
import "server-only";

const SANDBOX = "https://tokenized.sandbox.bka.sh/v1.2.0-beta";
const LIVE = "https://tokenized.pay.bka.sh/v1.2.0-beta";
const TIMEOUT_MS = 30000;

function config() {
    const env = process.env;
    const clean = (v) => String(v ?? "").trim().replace(/^["']|["']$/g, "");
    const isLive = env.BKASH_IS_LIVE === "true";
    return {
        appKey: clean(env.BKASH_APP_KEY),
        appSecret: clean(env.BKASH_APP_SECRET),
        username: clean(env.BKASH_USERNAME),
        password: clean(env.BKASH_PASSWORD),
        isLive,
        base: (env.BKASH_API_BASE || (isLive ? LIVE : SANDBOX)).replace(/\/$/, ""),
    };
}

/** True when all four merchant credentials are set. "Pay with bKash" stays hidden until then. */
export function isBkashConfigured() {
    const c = config();
    return Boolean(c.appKey && c.appSecret && c.username && c.password);
}

/* -------------------------------------------------------------- */
/* Token (cached per server instance; bKash tokens live 1 hour)    */
/* -------------------------------------------------------------- */

const TOKEN = globalThis.__turfBkashToken ?? (globalThis.__turfBkashToken = { idToken: "", expiresAt: 0, base: "" });

async function post(path, body, headers) {
    const { base } = config();
    try {
        const res = await fetch(`${base}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
            body: JSON.stringify(body),
            cache: "no-store",
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        const data = await res.json().catch(() => null);
        return { status: res.status, data };
    } catch (err) {
        console.error(`[bkash:${path.split("/").pop()}]`, err?.message ?? err);
        return null; // network error or timeout: the caller decides (usually "ask again later")
    }
}

async function idToken(force = false) {
    const c = config();
    if (!force && TOKEN.idToken && TOKEN.base === c.base && TOKEN.expiresAt > Date.now() + 60000) return TOKEN.idToken;

    const r = await post(
        "/tokenized/checkout/token/grant",
        { app_key: c.appKey, app_secret: c.appSecret },
        { username: c.username, password: c.password }
    );
    const token = r?.data?.id_token;
    if (!token) {
        console.error("[bkash:grant]", r?.status, r?.data?.statusMessage ?? r?.data?.msg ?? r?.data?.message ?? "no response");
        return null;
    }
    TOKEN.idToken = token;
    TOKEN.base = c.base;
    TOKEN.expiresAt = Date.now() + (Number(r.data.expires_in) || 3600) * 1000;
    return token;
}

const unauthorized = (r) => r && (r.status === 401 || r.status === 403 || /unauthori[sz]ed/i.test(String(r.data?.message ?? "")));

/** Authorised call. Re-grants the token once if bKash rejects it. Returns the JSON body, or null on network error. */
async function call(path, body) {
    const token = await idToken();
    if (!token) return null;
    const { appKey } = config();
    let r = await post(path, body, { Authorization: token, "X-App-Key": appKey });
    if (unauthorized(r)) {
        const fresh = await idToken(true);
        if (!fresh) return null;
        r = await post(path, body, { Authorization: fresh, "X-App-Key": appKey });
    }
    return r ? r.data : null;
}

/* -------------------------------------------------------------- */
/* Payments                                                        */
/* -------------------------------------------------------------- */

/**
 * Create a payment. input: { tranId, amount, payerReference, callbackURL }
 * returns { ok: true, paymentId, url } or { ok: false, error }
 */
export async function createPayment(input) {
    if (!isBkashConfigured()) return { ok: false, error: "bKash payment isn't set up yet." };
    const data = await call("/tokenized/checkout/create", {
        mode: "0011", // checkout without saving the wallet (one-off payment)
        payerReference: String(input.payerReference || input.tranId).slice(0, 50),
        callbackURL: input.callbackURL,
        amount: Number(input.amount).toFixed(2),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: input.tranId,
    });
    if (data?.statusCode === "0000" && data.paymentID && data.bkashURL) {
        return { ok: true, paymentId: data.paymentID, url: data.bkashURL };
    }
    if (!data) return { ok: false, error: "bKash didn't respond. Try again in a minute." };
    console.error("[bkash:create]", data.statusCode, data.statusMessage ?? data.message);
    return { ok: false, error: "The bKash payment page couldn't be opened. Try again in a minute." };
}

/** Execute (capture) an approved payment. Returns the JSON body, or null on network error/timeout. */
export async function executePayment(paymentId) {
    return call("/tokenized/checkout/execute", { paymentID: paymentId });
}

/** Payment status by paymentID. Returns the JSON body, or null on network error. */
export async function queryPayment(paymentId) {
    return call("/tokenized/checkout/payment/status", { paymentID: paymentId });
}