// src/app/api/ticket-qr/[token]/route.js
import { NextResponse } from "next/server";
import { verifyTicketToken } from "@/lib/ticket-token";
import { qrDataUrlForUrl } from "@/lib/qrcode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
    const { token } = await params;
    const checked = verifyTicketToken(token);
    if (!checked) {
        return new NextResponse("Not a valid ticket", { status: 404 });
    }
    const base = (process.env.APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
    const url = `${base}/verify/${token}`;
    const dataUrl = await qrDataUrlForUrl(url);
    const b64 = dataUrl.split(",")[1] || "";
    const png = Buffer.from(b64, "base64");

    return new NextResponse(png, {
        headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=31536000, immutable",
        },
    });
}