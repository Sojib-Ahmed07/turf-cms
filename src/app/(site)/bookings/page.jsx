// src/app/(site)/bookings/page.jsx
import MyBookingsClient from "@/features/booking/components/MyBookingsClient";
import { getMyBookings } from "@/features/booking/queries";
import { getSiteSettings } from "@/features/cms/queries";
import { requireUser } from "@/lib/guards";
import { getPayMethods } from "@/features/payment/methods";

export const metadata = { title: "My bookings" };
export const dynamic = "force-dynamic";

export default async function MyBookingsPage({ searchParams }) {
    const user = await requireUser("/bookings");
    const params = await searchParams;
    const [bookings, settings] = await Promise.all([getMyBookings(user.id), getSiteSettings()]);

    return (
        <MyBookingsClient
            bookings={bookings}
            userName={user.name?.split(" ")[0]}
            highlightCode={typeof params?.held === "string" ? params.held : null}
            payMethods={await getPayMethods()}
            payFailed={params?.pay === "failed"}
            playerName={user.name ?? ""}
            venue={{ name: settings.siteName, address: settings.contact.address }}
        />
    );
}