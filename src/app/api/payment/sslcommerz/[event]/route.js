// src/app/api/payment/sslcommerz/[event]/route.js
// SSLCommerz posts here (form data):
//   success / fail / cancel  the player's browser, coming back from the payment page
//   ipn                      SSLCommerz's server, in the background (needs a public URL, so not on localhost)
// Whatever arrives, the payment is only trusted after the Validation API says so (service.js).
import { NextResponse } from "next/server";
import { confirmPayment, markPaymentClosed } from "@/features/payment/service";

export const dynamic = "force-dynamic";

const EVENTS = new Set(["success", "fail", "cancel", "ipn"]);

function appUrl(req) {
    return (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, "");
}

/** 303 so the browser follows with a GET. */
function go(req, path) {
    return NextResponse.redirect(`${appUrl(req)}${path}`, 303);
}

async function readForm(req) {
    try {
        const form = await req.formData();
        return Object.fromEntries(form.entries());
    } catch {
        return {};
    }
}

export async function POST(req, { params }) {
    const { event } = await params;
    if (!EVENTS.has(event)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const f = await readForm(req);
    const tranId = typeof f.tran_id === "string" ? f.tran_id.slice(0, 40) : "";
    const valId = typeof f.val_id === "string" ? f.val_id.slice(0, 80) : "";
    const t = encodeURIComponent(tranId);

    try {
        if (event === "ipn") {
            if (f.status === "VALID" || f.status === "VALIDATED") {
                const r = await confirmPayment({ tranId, valId });
                return NextResponse.json({ received: true, outcome: r.outcome });
            }
            if (f.status === "FAILED" || f.status === "CANCELLED" || f.status === "EXPIRED") {
                await markPaymentClosed(tranId, f.status === "CANCELLED" ? "cancelled" : "failed", f);
            }
            return NextResponse.json({ received: true });
        }

        if (event === "success") {
            const r = await confirmPayment({ tranId, valId });
            if (r.outcome === "confirmed" || r.outcome === "pending") return go(req, `/payment/success?tran=${t}`);
            if (r.outcome === "slot_lost" || r.outcome === "duplicate") {
                return go(req, `/payment/failed?tran=${t}&reason=refund`);
            }
            return go(req, `/payment/failed?tran=${t}`);
        }

        if (event === "fail") {
            await markPaymentClosed(tranId, "failed", f);
            return go(req, `/payment/failed?tran=${t}`);
        }

        // cancel
        await markPaymentClosed(tranId, "cancelled", f);
        return go(req, `/payment/cancelled?tran=${t}`);
    } catch (err) {
        console.error(`[sslcommerz:${event}]`, err);
        if (event === "ipn") return NextResponse.json({ error: "Server error" }, { status: 500 }); // SSLCommerz retries
        return go(req, tranId ? `/payment/success?tran=${t}` : "/bookings");
    }
}

/** Someone opened the URL directly: send them to their bookings. */
export async function GET(req) {
    return go(req, "/bookings");
}