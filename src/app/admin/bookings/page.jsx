// src/app/admin/bookings/page.jsx
import BookingsTable from "@/features/admin/components/BookingsTable";
import { recentBookings } from "@/lib/admin-sample-data";

export const metadata = { title: "Bookings" };

export default function Page() {
    return <BookingsTable bookings={recentBookings} />;
}
