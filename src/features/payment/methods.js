// src/features/payment/methods.js
// Which payment methods the player can use.
//   configured = the gateway's keys are set in the env (otherwise the method is hidden everywhere)
//   enabled    = the admin's on/off switch in Admin, Payments (stored in page_sections row "payments")
// A configured method that the admin switched off is still listed (marked off), so the player gets a
// clear "this one is off, use the other" message instead of the option silently vanishing.
// Payments already in progress always finish (callbacks, rechecks and cron ignore the switch).
// Order = order on screen; the first enabled one is preselected.
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pageSections } from "@/db/schema";
import { isBkashConfigured } from "@/lib/bkash";
import { isSslczConfigured } from "@/lib/sslcommerz";

export const GATEWAYS = ["bkash", "sslcommerz"];
export const SWITCHES_KEY = "payments";

const INFO = {
    bkash: { label: "bKash", hint: "Pay from your bKash account" },
    sslcommerz: { label: "Card or other wallet", hint: "Visa, Mastercard, Nagad, Rocket and more (SSLCommerz)" },
};

const NAMES = { bkash: "bKash", sslcommerz: "SSLCommerz" };

export function gatewayName(gateway) {
    return NAMES[gateway] ?? "the payment gateway";
}

/** Keys set in the env. Sync; used by rechecks and cron, which must work even when a method is switched off. */
export function isGatewayConfigured(gateway) {
    if (gateway === "bkash") return isBkashConfigured();
    if (gateway === "sslcommerz") return isSslczConfigured();
    return false;
}

export function configuredGateways() {
    return GATEWAYS.filter(isGatewayConfigured);
}

/** Admin switches: { bkash: true, sslcommerz: true }. Missing row or key = on. Never cached, never throws. */
export async function getPaymentSwitches() {
    const out = Object.fromEntries(GATEWAYS.map((g) => [g, true]));
    try {
        const [row] = await db
            .select({ data: pageSections.data })
            .from(pageSections)
            .where(eq(pageSections.key, SWITCHES_KEY))
            .limit(1);
        const data = row?.data && typeof row.data === "object" ? row.data : {};
        for (const g of GATEWAYS) if (data[g] === false) out[g] = false;
    } catch (err) {
        console.error("[payments:switches]", err?.message ?? err);
    }
    return out;
}

/**
 * Plain objects for client components: [{ id, label, hint, enabled }], configured methods only.
 * Empty = online payment isn't set up. All enabled:false = the admin paused online payment.
 */
export async function getPayMethods() {
    const switches = await getPaymentSwitches();
    return configuredGateways().map((id) => ({ id, ...INFO[id], enabled: switches[id] !== false }));
}

/** For Admin, Payments: every gateway with its keys state and switch. */
export async function getPaymentMethodsAdmin() {
    const switches = await getPaymentSwitches();
    return GATEWAYS.map((id) => ({
        id,
        name: NAMES[id],
        label: INFO[id].label,
        configured: isGatewayConfigured(id),
        enabled: switches[id] !== false,
    }));
}