// src/app/(site)/book/page.jsx
import BookingClient from "@/features/booking/components/BookingClient";
import { getPitches } from "@/features/booking/queries";
import { getPromoBanners, getSiteSettings } from "@/features/cms/queries";
import { getSession } from "@/lib/guards";
import { isSslczConfigured } from "@/lib/sslcommerz";
import { currentOperatingDay } from "@/lib/time";

export const metadata = { title: "Book a slot" };
export const dynamic = "force-dynamic";

const param = (v, re) => (typeof v === "string" && re.test(v) ? v : null);

export default async function BookPage({ searchParams }) {
    const params = await searchParams;
    const [pitches, session, banners, settings] = await Promise.all([
        getPitches(),
        getSession(),
        getPromoBanners(),
        getSiteSettings(),
    ]);

    // "Today" is the venue's operating day in Asia/Dhaka (after midnight still counts as the previous day until 6 am).
    const { date: startDate } = currentOperatingDay();

    return (
        <BookingClient
            pitches={pitches}
            startDate={startDate}
            initialPitchId={typeof params?.pitch === "string" ? params.pitch : null}
            initialDate={param(params?.date, /^\d{4}-\d{2}-\d{2}$/)}
            initialTime={param(params?.t, /^\d{2}:\d{2}$/)}
            initialPart={param(params?.part, /^(morning|day|evening|late)$/)}
            banner={banners.booking_page}
            venue={settings.contact.address}
            isSignedIn={Boolean(session?.user)}
            paymentsLive={isSslczConfigured()}
        />
    );
}