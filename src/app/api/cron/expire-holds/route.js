// src/app/api/cron/expire-holds/route.js
// Housekeeping, run on a schedule (vercel.json) or by any external cron:
//   1. re-checks payments that never got a callback (player closed the tab after paying)
//   2. marks unpaid holds whose time ran out as expired
// Availability never depends on this job (expired holds are ignored live), so a daily run is enough.
// Call with header:  Authorization: Bearer <CRON_SECRET>   (Vercel Cron sends it automatically)
import { NextResponse } from "next/server";
import { expireStaleHolds } from "@/features/booking/queries";
import { recheckOpenPayments, repairUnsettledPayments } from "@/features/payment/service";
import { configuredGateways } from "@/features/payment/methods";

export const dynamic = "force-dynamic";

export async function GET(req) {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Rechecks run even when the admin switched a method off: payments already started must still finish.
        const payments = configuredGateways().length ? await recheckOpenPayments() : { checked: 0, confirmed: 0 };
        // Paid payments whose booking never got confirmed (crash between the two writes): finish them
        // before expiring holds, so a paid hold isn't released.
        const repaired = await repairUnsettledPayments();
        const expired = await expireStaleHolds();
        return NextResponse.json({ ok: true, expired, payments: { ...payments, repaired } });
    } catch (err) {
        console.error("[cron:expire-holds]", err);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}