// src/app/(site)/verify/[token]/page.jsx
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, pitches, user as userTable } from "@/db/schema";
import { verifyTicketToken } from "@/lib/ticket-token";
import { getSession } from "@/lib/guards";
import { getSheetDayStarts } from "@/features/booking/queries";
import { isBlockPast } from "@/lib/time";
import { longDateLabel, playDate, isAfterMidnight } from "@/features/booking/calendar";
import { shortDateLabel } from "@/lib/time";
import VerifyTicket from "@/components/site/VerifyTicket";

export const metadata = { title: "Verify ticket" };
export const dynamic = "force-dynamic";

export default async function VerifyTicketPage({ params }) {
    const { token } = await params;
    const checked = verifyTicketToken(token);

    if (!checked) {
        return (
            <div className="mx-auto max-w-md px-4 pb-16 pt-16">
                <VerifyTicket state="invalid" booking={null} canCheckIn={false} />
            </div>
        );
    }

    const [row] = await db
        .select({
            id: bookings.id,
            code: bookings.code,
            pitchId: bookings.pitchId,
            bookingDate: bookings.bookingDate,
            startTime: bookings.startTime,
            endTime: bookings.endTime,
            totalPrice: bookings.totalPrice,
            discount: bookings.discount,
            status: bookings.status,
            paymentStatus: bookings.paymentStatus,
            source: bookings.source,
            customerName: bookings.customerName,
            checkedInAt: bookings.checkedInAt,
            pitchName: pitches.name,
            userName: userTable.name,
        })
        .from(bookings)
        .innerJoin(pitches, eq(bookings.pitchId, pitches.id))
        .leftJoin(userTable, eq(bookings.userId, userTable.id))
        .where(eq(bookings.id, checked.bookingId))
        .limit(1);

    if (!row) {
        return (
            <div className="mx-auto max-w-md px-4 pb-16 pt-16">
                <VerifyTicket state="not_found" booking={null} canCheckIn={false} />
            </div>
        );
    }

    const dayStart = (await getSheetDayStarts([{ pitchId: row.pitchId, date: row.bookingDate }])).get(
        `${row.pitchId}|${row.bookingDate}`
    );
    const played = isBlockPast(row.bookingDate, row.startTime, dayStart);
    const late = isAfterMidnight({ start: row.startTime, dayStart });

    const booking = {
        id: row.id,
        code: row.code,
        pitch: row.pitchName,
        playDateLabel: longDateLabel(playDate({ date: row.bookingDate, start: row.startTime, dayStart })),
        nightOf: late ? shortDateLabel(row.bookingDate) : null,
        timeLabel: `${row.startTime} to ${row.endTime}`,
        player: row.customerName || row.userName || "Player",
        total: Number(row.totalPrice),
        discount: Number(row.discount ?? 0),
        checkedInAt: row.checkedInAt ? row.checkedInAt.toISOString() : null,
    };

    let state = "valid";
    if (row.status === "cancelled") state = "cancelled";
    else if (row.status === "expired") state = "expired";
    else if (row.status === "held") state = "unpaid";
    else if (row.paymentStatus === "refund_due" || row.paymentStatus === "refunded") state = "refunded";
    else if (played) state = "played";
    else if (row.status !== "confirmed") state = "invalid";

    const session = await getSession();
    const canCheckIn =
        session?.user?.role === "admin" &&
        state === "valid" &&
        !booking.checkedInAt;

    return (
        <div className="mx-auto max-w-md px-4 pb-16 pt-10">
            <VerifyTicket state={state} booking={booking} canCheckIn={canCheckIn} />
        </div>
    );
}