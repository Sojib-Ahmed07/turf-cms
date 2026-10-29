// src/features/admin/actions/checkin.js
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { currentVenueDay } from "@/features/booking/queries";
import { shortDateLabel } from "@/lib/time";

async function requireAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    const u = session?.user;
    if (!u || u.role !== "admin") return null;
    return u;
}

const DENIED = { ok: false, error: "শুধু অ্যাডমিন টিকিট ব্যবহৃত হিসেবে চিহ্নিত করতে পারেন।" };
const schema = z.object({ bookingId: z.string().uuid() });

export async function markTicketUsed(input) {
    try {
        const admin = await requireAdmin();
        if (!admin) return DENIED;
        const parsed = schema.safeParse(input);
        if (!parsed.success) return { ok: false, error: "বুকিংটি পাওয়া যায়নি।" };

        // Only on match day: a ticket for another day must not be used up early by mistake.
        const [b] = await db
            .select({ date: bookings.bookingDate })
            .from(bookings)
            .where(eq(bookings.id, parsed.data.bookingId))
            .limit(1);
        if (!b) return { ok: false, error: "বুকিংটি পাওয়া যায়নি।" };
        const { date: today } = await currentVenueDay();
        if (b.date !== today) {
            return { ok: false, error: `এই টিকিট ${shortDateLabel(b.date)} তারিখের, আজকের নয়। শুধু খেলার দিনেই এটি ব্যবহার করা যাবে।` };
        }

        const rows = await db
            .update(bookings)
            .set({ checkedInAt: new Date(), checkedInBy: admin.id, updatedAt: new Date() })
            .where(
                and(
                    eq(bookings.id, parsed.data.bookingId),
                    eq(bookings.status, "confirmed"),
                    isNull(bookings.checkedInAt)
                )
            )
            .returning({ id: bookings.id });

        if (rows.length === 0) {
            return { ok: false, error: "এই টিকিট আগেই ব্যবহার হয়েছে, অথবা বুকিংটি কনফার্মড নয়।" };
        }

        revalidatePath("/admin/bookings");
        return { ok: true };
    } catch (err) {
        console.error("[markTicketUsed]", err);
        return { ok: false, error: "টিকিট চিহ্নিত করা যায়নি। আবার চেষ্টা করুন।" };
    }
}