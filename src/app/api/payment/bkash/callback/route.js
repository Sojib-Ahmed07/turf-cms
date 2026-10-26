// src/app/api/payment/bkash/callback/route.js
// bKash sends the player's browser here (GET) after the bKash page:
//   ?paymentID=TR0011...&status=success | failure | cancel   (plus signature, apiVersion)
// The status in the URL is never trusted for "paid": on success we execute the payment with bKash
// and only a "Completed" answer for the same amount and invoice confirms the booking (service.js).
import { NextResponse } from "next/server";
import { closeBkashPayment, confirmBkashPayment } from "@/features/payment/service";

export const dynamic = "force-dynamic";

function appUrl(req) {
    return (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, "");
}

/** 303 so the browser follows with a GET. */
function go(req, path) {
    return NextResponse.redirect(`${appUrl(req)}${path}`, 303);
}

export async function GET(req) {
    const q = new URL(req.url).searchParams;
    const paymentId = (q.get("paymentID") ?? "").slice(0, 80);
    const status = q.get("status") ?? "";
    if (!paymentId) return go(req, "/bookings");

    try {
        if (status === "success") {
            const r = await confirmBkashPayment(paymentId);
            const t = encodeURIComponent(r.tranId ?? "");
            if (!r.tranId) return go(req, "/bookings");
            if (r.outcome === "confirmed" || r.outcome === "pending") return go(req, `/payment/success?tran=${t}`);
            if (r.outcome === "slot_lost" || r.outcome === "duplicate") return go(req, `/payment/failed?tran=${t}&reason=refund`);
            return go(req, `/payment/failed?tran=${t}`);
        }

        const closed = status === "cancel" ? "cancelled" : "failed";
        const tranId = await closeBkashPayment(paymentId, closed, Object.fromEntries(q.entries()));
        if (!tranId) return go(req, "/bookings");
        return go(req, `/payment/${closed}?tran=${encodeURIComponent(tranId)}`);
    } catch (err) {
        console.error(`[bkash:callback:${status}]`, err);
        return go(req, "/bookings");
    }
}