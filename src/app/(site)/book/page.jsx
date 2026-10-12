// src/app/(site)/book/page.jsx
import BookingClient from "@/features/booking/components/BookingClient";
import { getPitches } from "@/features/booking/queries";
import { getSession } from "@/lib/guards";
import { currentOperatingDay } from "@/lib/time";
import { promoBanners } from "@/lib/sample-data"; // banner comes from the CMS in a later step

export const metadata = { title: "Book a slot" };
export const dynamic = "force-dynamic";

export default async function BookPage({ searchParams }) {
    const params = await searchParams;
    const [pitches, session] = await Promise.all([getPitches(), getSession()]);

    // "Today" is the venue's operating day in Asia/Dhaka (after midnight still counts as the previous day until 6 am).
    const { date: startDate } = currentOperatingDay(pitches[0]?.openHour ?? 6);

    return (
        <BookingClient
            pitches={pitches}
            startDate={startDate}
            initialPitchId={typeof params?.pitch === "string" ? params.pitch : null}
            initialDate={typeof params?.date === "string" ? params.date : null}
            banner={promoBanners.booking_page}
            isSignedIn={Boolean(session?.user)}
        />
    );
}