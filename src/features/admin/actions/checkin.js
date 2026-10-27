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

const DENIED = { ok: false, error: "Only admins can mark a ticket as used." };
const schema = z.object({ bookingId: z.string().uuid() });

export async function markTicketUsed(input) {
    try {
        const admin = await requireAdmin();
        if (!admin) return DENIED;
        const parsed = schema.safeParse(input);
        if (!parsed.success) return { ok: false, error: "Booking not found." };

        // Only on match day: a ticket for another day must not be used up early by mistake.
        const [b] = await db
            .select({ date: bookings.bookingDate })
            .from(bookings)
            .where(eq(bookings.id, parsed.data.bookingId))
            .limit(1);
        if (!b) return { ok: false, error: "Booking not found." };
        const { date: today } = await currentVenueDay();
        if (b.date !== today) {
            return { ok: false, error: `This ticket is for ${shortDateLabel(b.date)}, not today. It can only be used on match day.` };
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
            return { ok: false, error: "This ticket was already used, or it isn't confirmed." };
        }

        revalidatePath("/admin/bookings");
        return { ok: true };
    } catch (err) {
        console.error("[markTicketUsed]", err);
        return { ok: false, error: "Couldn't mark the ticket. Try again." };
    }
}