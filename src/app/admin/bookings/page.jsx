// src/app/admin/bookings/page.jsx
import { Suspense } from "react";
import BookingsTable from "@/features/admin/components/BookingsTable";
import { getAdminBookings, getAllPitchesAdmin } from "@/features/admin/queries";
import { currentVenueDay } from "@/features/booking/queries";
import { requireRole } from "@/lib/guards";

export const metadata = { title: "বুকিং" };
export const dynamic = "force-dynamic";

const RANGES = ["today", "upcoming", "week", "all"];
const str = (v) => (typeof v === "string" ? v : "");

export default async function AdminBookingsPage({ searchParams }) {
    await requireRole(["admin"]);
    const sp = await searchParams;

    const filters = {
        q: str(sp?.q).slice(0, 80),
        pitchId: str(sp?.pitch),
        status: str(sp?.status),
        range: RANGES.includes(sp?.range) ? sp.range : "upcoming",
        page: Number(sp?.page) || 1,
    };

    const [data, pitches] = await Promise.all([getAdminBookings(filters), getAllPitchesAdmin()]);
    const { date: startDate } = await currentVenueDay();

    return (
        // Suspense: BookingsTable reads the URL with useSearchParams
        <Suspense>
            <BookingsTable
                data={data}
                pitches={pitches.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive }))}
                filters={filters}
                startDate={startDate}
                initialWalkIn={sp?.walkin === "1"}
            />
        </Suspense>
    );
}