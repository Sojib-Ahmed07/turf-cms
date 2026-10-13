// src/lib/sslcommerz.js
// Minimal SSLCommerz v4 client (hosted checkout). Server only: it uses the store password.
// Docs: https://developer.sslcommerz.com/doc/v4/
//
// Env: SSLCZ_STORE_ID, SSLCZ_STORE_PASSWORD, SSLCZ_IS_LIVE ("true" for the live gateway).
// SSLCZ_API_BASE is for automated tests only (points at a local mock); leave it unset.
import "server-only";

const SANDBOX = "https://sandbox.sslcommerz.com";
const LIVE = "https://securepay.sslcommerz.com";
const TIMEOUT_MS = 20000;

function config() {
    const storeId = process.env.SSLCZ_STORE_ID ?? "";
    const storePass = process.env.SSLCZ_STORE_PASSWORD ?? "";
    const isLive = process.env.SSLCZ_IS_LIVE === "true";
    const base = process.env.SSLCZ_API_BASE || (isLive ? LIVE : SANDBOX);
    return { storeId, storePass, isLive, base };
}

/** True when the store ID and password are set. Pay buttons stay hidden until then. */
export function isSslczConfigured() {
    const { storeId, storePass } = config();
    return Boolean(storeId && storePass);
}

/** "BKASH-BKash" -> "bKash", "VISA-Dutch Bangla" -> "Visa". For receipts. */
export function prettyMethod(cardType) {
    if (!cardType) return "online payment";
    const head = String(cardType).split("-")[0].toUpperCase();
    const known = {
        BKASH: "bKash",
        NAGAD: "Nagad",
        ROCKET: "Rocket",
        DBBLMOBILEB: "Rocket",
        UPAY: "Upay",
        VISA: "Visa",
        MASTER: "Mastercard",
        MASTERCARD: "Mastercard",
        AMEX: "Amex",
    };
    return known[head] ?? String(cardType).split("-").pop();
}

/**
 * Create a hosted-checkout session.
 * input: { tranId, amount, productName, customer: { name, email, phone }, urls: { success, fail, cancel, ipn }, valueA }
 * returns { ok: true, url, sessionKey } or { ok: false, error }
 */
export async function initSession(input) {
    const { storeId, storePass, base } = config();
    if (!storeId || !storePass) return { ok: false, error: "Online payment isn't set up yet." };

    const body = new URLSearchParams({
        store_id: storeId,
        store_passwd: storePass,
        total_amount: Number(input.amount).toFixed(2),
        currency: "BDT",
        tran_id: input.tranId,
        success_url: input.urls.success,
        fail_url: input.urls.fail,
        cancel_url: input.urls.cancel,
        ipn_url: input.urls.ipn,
        emi_option: "0",
        // Customer (all required by SSLCommerz; we don't collect a postal address for a turf booking)
        cus_name: input.customer.name || "Player",
        cus_email: input.customer.email || "player@example.com",
        cus_phone: input.customer.phone || "01700000000",
        cus_add1: "Dhaka",
        cus_city: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        // Not a physical product
        shipping_method: "NO",
        num_of_item: "1",
        product_name: input.productName,
        product_category: "Sports booking",
        product_profile: "non-physical-goods",
        value_a: input.valueA ?? "",
    });

    try {
        const res = await fetch(`${base}/gwprocess/v4/api.php`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
            cache: "no-store",
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        const data = await res.json().catch(() => null);
        if (data?.status === "SUCCESS" && data.GatewayPageURL) {
            return { ok: true, url: data.GatewayPageURL, sessionKey: data.sessionkey ?? null };
        }
        console.error("[sslcommerz:init]", res.status, data?.failedreason ?? data);
        return { ok: false, error: "The payment page couldn't be opened. Try again in a minute." };
    } catch (err) {
        console.error("[sslcommerz:init]", err?.message ?? err);
        return { ok: false, error: "The payment service didn't respond. Try again in a minute." };
    }
}

/**
 * Order Validation API: the only trustworthy answer on whether a payment went through.
 * Returns the parsed JSON (status: VALID | VALIDATED | INVALID_TRANSACTION ...) or null on network error.
 */
export async function validateOrder(valId) {
    const { storeId, storePass, base } = config();
    const q = new URLSearchParams({ val_id: valId, store_id: storeId, store_passwd: storePass, format: "json" });
    try {
        const res = await fetch(`${base}/validator/api/validationserverAPI.php?${q}`, {
            cache: "no-store",
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        return await res.json();
    } catch (err) {
        console.error("[sslcommerz:validate]", err?.message ?? err);
        return null;
    }
}

/**
 * Transaction Query API by our tran_id. Used when the browser never came back
 * (closed tab, lost connection) and the IPN didn't arrive either.
 * Returns { found: boolean, element: [...] } or null on network error.
 */
export async function queryTransaction(tranId) {
    const { storeId, storePass, base } = config();
    const q = new URLSearchParams({ tran_id: tranId, store_id: storeId, store_passwd: storePass, format: "json" });
    try {
        const res = await fetch(`${base}/validator/api/merchantTransIDvalidationAPI.php?${q}`, {
            cache: "no-store",
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        const data = await res.json();
        const element = Array.isArray(data?.element) ? data.element : [];
        return { found: element.length > 0, element };
    } catch (err) {
        console.error("[sslcommerz:query]", err?.message ?? err);
        return null;
    }
}