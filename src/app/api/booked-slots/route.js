// src/app/api/booked-slots/route.js
// GET /api/booked-slots?pitchId=<uuid>&date=YYYY-MM-DD
// Live slot states for the booking page. Never cached.
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getSlotBoard } from "@/features/booking/queries";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const pitchId = searchParams.get("pitchId") ?? "";
    const date = searchParams.get("date") ?? "";

    if (!UUID_RE.test(pitchId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: "মাঠ ও তারিখ দরকার" }, { status: 400 });
    }

    try {
        const session = await auth.api.getSession({ headers: await headers() });
        const blocks = await getSlotBoard(pitchId, date, session?.user?.id ?? null);
        if (!blocks) return NextResponse.json({ error: "মাঠটি পাওয়া যায়নি" }, { status: 404 });
        return NextResponse.json({ blocks }, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
        console.error("[booked-slots]", err);
        return NextResponse.json({ error: "স্লট লোড হয়নি" }, { status: 500 });
    }
}