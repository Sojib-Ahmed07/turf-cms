// src/app/(site)/bookings/page.jsx
import MyBookingsClient from "@/features/booking/components/MyBookingsClient";
import { myBookings } from "@/lib/sample-data";

export const metadata = { title: "My bookings" };

export default function MyBookingsPage() {
    return <MyBookingsClient bookings={myBookings} userName="Rafi" />;
}
