// src/app/control-room/[slug]/page.jsx
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/guards";
import { isOverrideUnlocked } from "@/features/override/actions";
import { getDashboardStats } from "@/features/admin/queries";
import OverrideClient from "./OverrideClient";

export const dynamic = "force-dynamic";

export default async function ControlRoomPage({ params }) {
    const { slug } = await params;
    const expectedSlug = process.env.ADMIN_OVERRIDE_SLUG;

    if (!expectedSlug || slug !== expectedSlug) {
        notFound(); // 404 if wrong slug
    }

    const session = await getSession();
    if (!session || session.user.role !== "admin") {
        redirect("/login?next=/control-room/" + slug);
    }

    const unlocked = await isOverrideUnlocked();

    // We need the real numbers to calculate the offsets properly.
    const stats = await getDashboardStats();

    return (
        <div className="min-h-screen bg-chalk flex items-center justify-center p-6">
            <div className="w-full max-w-lg rounded-card bg-white p-8 ring-1 ring-line shadow-xl">
                <h1 className="display text-3xl text-ink mb-2">Control Room</h1>
                <p className="text-ink-3 mb-8">Secret admin override panel.</p>
                <OverrideClient
                    isUnlocked={unlocked}
                    realToday={stats.todayRevenue}
                    realMonth={stats.monthRevenue}
                />
            </div>
        </div>
    );
}