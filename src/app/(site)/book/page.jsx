// src/app/(site)/book/page.jsx
import BookingClient from "@/features/booking/components/BookingClient";
import { pitches, slotBlocks, promoBanners } from "@/lib/sample-data";

export const metadata = { title: "Book a slot" };

export default function BookPage() {
    return (
        <BookingClient
            pitches={pitches}
            blocks={slotBlocks}
            banner={promoBanners.booking_page}
            startDate="2026-10-11"
        />
    );
}
