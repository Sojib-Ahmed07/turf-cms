// src/app/(site)/profile/page.jsx
import { eq } from "drizzle-orm";
import ProfileClient from "@/features/profile/components/ProfileClient";
import { db } from "@/db";
import { account } from "@/db/schema";
import { getMyBookings } from "@/features/booking/queries";
import { requireUser } from "@/lib/guards";
import { dhakaDate } from "@/lib/time";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
    const { t } = await getI18n();
    return { title: t("common.yourProfile") };
}
export const dynamic = "force-dynamic";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default async function ProfilePage() {
    const user = await requireUser("/profile");
    const [accounts, bookings] = await Promise.all([
        db.select({ providerId: account.providerId }).from(account).where(eq(account.userId, user.id)),
        getMyBookings(user.id),
    ]);

    const [y, m] = dhakaDate(new Date(user.createdAt)).split("-").map(Number);

    return (
        <ProfileClient
            user={{
                name: user.name ?? "",
                email: user.email,
                phone: user.phone ?? "",
                image: user.image ?? null,
                role: user.role ?? "user",
                joined: `${MONTHS[m - 1]} ${y}`,
                joinedIso: `${y}-${String(m).padStart(2, "0")}-01`,
            }}
            hasPassword={accounts.some((a) => a.providerId === "credential")}
            hasGoogle={accounts.some((a) => a.providerId === "google")}
            counts={{
                upcoming: bookings.filter((b) => b.status === "confirmed").length,
                played: bookings.filter((b) => b.status === "completed").length,
            }}
        />
    );
}