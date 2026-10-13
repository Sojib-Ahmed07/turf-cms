// src/app/api/cron/expire-holds/route.js
// Housekeeping, run on a schedule (vercel.json) or by any external cron:
//   1. re-checks payments that never got a callback (player closed the tab after paying)
//   2. marks unpaid holds whose time ran out as expired
// Availability never depends on this job (expired holds are ignored live), so a daily run is enough.
// Call with header:  Authorization: Bearer <CRON_SECRET>   (Vercel Cron sends it automatically)
import { NextResponse } from "next/server";
import { expireStaleHolds } from "@/features/booking/queries";
import { recheckOpenPayments } from "@/features/payment/service";
import { isSslczConfigured } from "@/lib/sslcommerz";

export const dynamic = "force-dynamic";

export async function GET(req) {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const payments = isSslczConfigured() ? await recheckOpenPayments() : { checked: 0, confirmed: 0 };
        const expired = await expireStaleHolds();
        return NextResponse.json({ ok: true, expired, payments });
    } catch (err) {
        console.error("[cron:expire-holds]", err);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}