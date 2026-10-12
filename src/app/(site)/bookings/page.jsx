// src/app/(site)/bookings/page.jsx
import MyBookingsClient from "@/features/booking/components/MyBookingsClient";
import { getMyBookings } from "@/features/booking/queries";
import { requireUser } from "@/lib/guards";

export const metadata = { title: "My bookings" };
export const dynamic = "force-dynamic";

export default async function MyBookingsPage({ searchParams }) {
    const user = await requireUser("/bookings");
    const params = await searchParams;
    const bookings = await getMyBookings(user.id);

    return (
        <MyBookingsClient
            bookings={bookings}
            userName={user.name?.split(" ")[0]}
            highlightCode={typeof params?.held === "string" ? params.held : null}
            paymentsLive={false}
        />
    );
}