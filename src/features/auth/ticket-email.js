// src/features/auth/ticket-email.js
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, pitches, user as userTable } from "@/db/schema";
import { sendBrevoEmail } from "@/lib/brevo";
import { signTicket } from "@/lib/ticket-token";
import { getSheetDayStarts } from "@/features/booking/queries";
import { getSiteSettings } from "@/features/cms/queries";
import { longDateLabel, playDate, isAfterMidnight } from "@/features/booking/calendar";
import { dhakaDate, shortDateLabel } from "@/lib/time";
import { taka, time12 } from "@/lib/utils";

function escapeHtml(s) {
    return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function appUrl() {
    return (process.env.APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function sendTicketEmail({ email, booking, site }) {
    if (!email || !booking?.bookingId) return { ok: false, error: "কোনো ইমেইল নেই।" };

    const siteName = site?.siteName || "TurfZone";
    const subject = `আপনার ${siteName} বুকিং কনফার্মড — ${booking.code}`;

    const base = appUrl();
    const token = signTicket(booking.bookingId);
    const qrImageUrl = `${base}/api/ticket-qr/${token}`;
    const verifyUrl = `${base}/verify/${token}`;

    const late = isAfterMidnight({ start: booking.start, dayStart: booking.dayStart });
    const dateLabel = longDateLabel(playDate(booking));
    const timeLabel = `${time12(booking.start)} থেকে ${time12(booking.end)}${late ? " (মাঝরাতের পরে)" : ""}`;
    const paid = booking.paidWith
        ? booking.paidWith === "Online"
            ? `অনলাইনে পেমেন্ট হয়েছে, ${taka(booking.total)}`
            : `${booking.paidWith} দিয়ে পেমেন্ট হয়েছে, ${taka(booking.total)}`
        : booking.total > 0
            ? `পেমেন্ট হয়েছে, ${taka(booking.total)}`
            : "কোনো টাকা লাগেনি";

    const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f1f19;">
            <h1 style="font-size:22px;margin:0 0 4px;">বুকিং কনফার্মড</h1>
            <p style="margin:0 0 20px;color:#555;font-size:14px;">${escapeHtml(siteName)}${site?.contact?.address ? `, ${escapeHtml(site.contact.address)}` : ""}${site?.contact?.phone ? `, ${escapeHtml(site.contact.phone)}` : ""}</p>

            <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 20px;">
                <tr><td style="padding:8px 0;color:#555;">বুকিং আইডি</td><td style="padding:8px 0;text-align:right;font-weight:700;">${escapeHtml(booking.code)}</td></tr>
                <tr><td style="padding:8px 0;color:#555;">মাঠ</td><td style="padding:8px 0;text-align:right;font-weight:700;">${escapeHtml(booking.pitch)}</td></tr>
                <tr><td style="padding:8px 0;color:#555;">তারিখ</td><td style="padding:8px 0;text-align:right;font-weight:700;">${escapeHtml(dateLabel)}</td></tr>
                <tr><td style="padding:8px 0;color:#555;">সময়</td><td style="padding:8px 0;text-align:right;font-weight:700;">${escapeHtml(timeLabel)}</td></tr>
                <tr><td style="padding:8px 0;color:#555;">খেলোয়াড়</td><td style="padding:8px 0;text-align:right;font-weight:700;">${escapeHtml(booking.player || "")}</td></tr>
                <tr><td style="padding:8px 0;color:#555;">পেমেন্ট</td><td style="padding:8px 0;text-align:right;font-weight:700;">${escapeHtml(paid)}</td></tr>
            </table>

            <div style="text-align:center;padding:20px 0;border-top:2px dashed #d4d8cf;border-bottom:2px dashed #d4d8cf;margin:0 0 20px;">
                <p style="margin:0 0 8px;font-size:13px;color:#555;">গেটে এই QR কোডটি স্ক্যান করুন</p>
                <img src="${qrImageUrl}" alt="${escapeHtml(booking.code)} টিকিটের QR কোড" width="240" height="240" style="display:block;margin:0 auto;border:0;" />
                <p style="margin:8px 0 0;font-size:11px;color:#888;word-break:break-all;"><a href="${verifyUrl}" style="color:#888;text-decoration:none;">${verifyUrl}</a></p>
            </div>

            <p style="font-size:13px;color:#888;line-height:1.5;margin:0;">বুকিংয়ের তারিখ: ${escapeHtml(shortDateLabel(dhakaDate(new Date(booking.createdAtISO))))}।</p>
        </div>
    `;

    const text = [
        `${siteName} বুকিং কনফার্মড`,
        "",
        `বুকিং আইডি: ${booking.code}`,
        `মাঠ: ${booking.pitch}`,
        `তারিখ: ${dateLabel}`,
        `সময়: ${timeLabel}`,
        `খেলোয়াড়: ${booking.player || ""}`,
        `পেমেন্ট: ${paid}`,
        "",
        "গেটে QR কোডটি দেখান (এই ইমেইলের HTML সংস্করণে আছে)।",
        `টিকিট যাচাই: ${verifyUrl}`,
    ]
        .filter(Boolean)
        .join("\n");

    try {
        await sendBrevoEmail({ to: email, subject, html, text });
        return { ok: true };
    } catch (err) {
        console.error("[ticket-email]", err);
        return { ok: false, error: "রসিদ পাঠানো যায়নি।" };
    }
}

export async function sendBookingReceiptByBookingId(bookingId) {
    try {
        const [row] = await db
            .select({
                id: bookings.id,
                code: bookings.code,
                userId: bookings.userId,
                pitchId: bookings.pitchId,
                bookingDate: bookings.bookingDate,
                startTime: bookings.startTime,
                endTime: bookings.endTime,
                totalPrice: bookings.totalPrice,
                discount: bookings.discount,
                paymentStatus: bookings.paymentStatus,
                customerName: bookings.customerName,
                createdAt: bookings.createdAt,
                pitchName: pitches.name,
            })
            .from(bookings)
            .innerJoin(pitches, eq(bookings.pitchId, pitches.id))
            .where(eq(bookings.id, bookingId))
            .limit(1);
        if (!row?.userId) return { ok: false, error: "বুকিংয়ে কোনো ব্যবহারকারী নেই।" };

        const [userRow] = await db
            .select({ email: userTable.email, name: userTable.name })
            .from(userTable)
            .where(eq(userTable.id, row.userId))
            .limit(1);
        if (!userRow?.email) return { ok: false, error: "কোনো ইমেইল নেই।" };

        const dayStart = (await getSheetDayStarts([{ pitchId: row.pitchId, date: row.bookingDate }])).get(
            `${row.pitchId}|${row.bookingDate}`
        );
        const site = await getSiteSettings().catch(() => ({}));

        return await sendTicketEmail({
            email: userRow.email,
            booking: {
                bookingId: row.id,
                code: row.code,
                pitch: row.pitchName,
                date: row.bookingDate,
                start: row.startTime,
                end: row.endTime,
                dayStart,
                total: Number(row.totalPrice),
                discount: Number(row.discount ?? 0),
                paidWith: row.paymentStatus === "paid" ? "Online" : null,
                player: row.customerName || userRow.name || "",
                createdAtISO: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
            },
            site,
        });
    } catch (err) {
        console.error("[sendBookingReceiptByBookingId]", err);
        return { ok: false, error: "রসিদ পাঠানো যায়নি।" };
    }
}