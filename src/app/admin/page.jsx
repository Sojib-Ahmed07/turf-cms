// src/app/admin/page.jsx
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarPlus, ExternalLink, TrendingUp } from "lucide-react";
import { PageHeader, Panel } from "@/components/admin/Kit";
import TonightBoard from "@/components/admin/TonightBoard";
import StatusBadge from "@/components/admin/StatusBadge";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { stats, tonight, recentBookings, coupons } from "@/lib/admin-sample-data";
import { heroSlides } from "@/lib/sample-data";
import { taka } from "@/lib/utils";

export default function AdminOverview() {
    return (
        <div className="mx-auto max-w-[1280px]">
            <PageHeader
                title="Good evening, Said"
                description="Saturday, 11 October. 9 slots are still free tonight."
                actions={
                    <>
                        <Button href="/" variant="outline" target="_blank">
                            <ExternalLink className="h-4 w-4" />
                            View website
                        </Button>
                        <Button variant="ink">
                            <CalendarPlus className="h-4 w-4" />
                            Add walk-in booking
                        </Button>
                    </>
                }
            />

            {/* Numbers */}
            <div className="grid grid-cols-2 overflow-hidden rounded-card bg-line ring-1 ring-line [gap:1px] lg:grid-cols-4">
                <Stat label="Bookings today" value={stats.todayBookings} />
                <Stat label="Revenue today" value={taka(stats.todayRevenue)} />
                <Stat
                    label="Revenue this month"
                    value={taka(stats.monthRevenue)}
                    note={
                        <span className="inline-flex items-center gap-1 text-brand-deep">
                            <TrendingUp className="h-3.5 w-3.5" />
                            {stats.monthChange}% vs September
                        </span>
                    }
                />
                <Stat
                    label="Waiting for payment"
                    value={stats.pendingHolds}
                    note={<span className="text-flare-deep">Released after 15 min</span>}
                    accent
                />
            </div>

            {/* Tonight */}
            <Panel
                className="mt-6"
                title="Tonight"
                description={`${stats.occupancyTonight}% of slots booked across all grounds`}
                actions={
                    <div className="hidden items-center gap-4 text-[12px] text-ink-3 sm:flex">
                        <Key className="bg-pitch">Booked</Key>
                        <Key className="bg-flare">Waiting</Key>
                        <Key className="border-2 border-dashed border-line">Free</Key>
                    </div>
                }
            >
                <TonightBoard rows={tonight} />
            </Panel>

            <div className="mt-6 grid gap-6 xl:grid-cols-12">
                {/* Recent bookings */}
                <Panel
                    className="xl:col-span-8"
                    title="Latest bookings"
                    bodyClassName="p-0"
                    actions={
                        <Link href="/admin/bookings" className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-2 hover:text-ink">
                            All bookings <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    }
                >
                    <ul className="divide-y divide-line">
                        {recentBookings.slice(0, 5).map((b) => (
                            <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-grass text-[14px] font-bold text-pitch">
                                    {b.customer[0]}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[14px] font-semibold text-ink">{b.customer}</p>
                                    <p className="truncate text-[13px] text-ink-3">
                                        {b.pitch}, {b.date}, {b.time}
                                    </p>
                                    <div className="mt-1.5 sm:hidden">
                                        <StatusBadge status={b.status} />
                                    </div>
                                </div>
                                <div className="hidden sm:block">
                                    <StatusBadge status={b.status} />
                                </div>
                                <p className="w-20 text-right text-[14px] font-bold text-ink tnum">{taka(b.amount)}</p>
                                <p className="hidden w-20 text-right text-[12px] text-ink-4 md:block">{b.created}</p>
                            </li>
                        ))}
                    </ul>
                </Panel>

                {/* Live on site */}
                <Panel className="xl:col-span-4" title="Live on the website">
                    <div>
                        <div className="flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-ink-2">Hero slides</p>
                            <Link href="/admin/hero" className="text-[13px] font-semibold text-brand-deep hover:underline">
                                Edit
                            </Link>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                            {heroSlides.map((s) => (
                                <div key={s.id} className="relative aspect-[16/10] overflow-hidden rounded-[10px] bg-pitch">
                                    <Image src={s.imageUrl} alt="" fill sizes="120px" className="object-cover" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 border-t border-line pt-5">
                        <div className="flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-ink-2">Offers</p>
                            <Link href="/admin/banners" className="text-[13px] font-semibold text-brand-deep hover:underline">
                                Edit
                            </Link>
                        </div>
                        <ul className="mt-3 space-y-3">
                            {coupons.slice(0, 3).map((c) => (
                                <li key={c.code} className="flex items-center gap-3">
                                    <span className="rounded-md border border-dashed border-flare bg-flare-soft px-2 py-1 text-[12px] font-bold tracking-wider text-ink tnum">
                                        {c.code}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink-3">
                                        {c.used} used so far
                                    </span>
                                    <Switch size="sm" defaultChecked={c.active} label={`Toggle ${c.code}`} />
                                </li>
                            ))}
                        </ul>
                    </div>
                </Panel>
            </div>
        </div>
    );
}

function Stat({ label, value, note, accent }) {
    return (
        <div className="bg-white p-5 sm:p-6">
            <p className="text-[13px] font-medium text-ink-3">{label}</p>
            <p className={`display mt-2 text-[clamp(26px,2.6vw,36px)] tnum ${accent ? "text-flare-deep" : "text-ink"}`}>{value}</p>
            {note && <p className="mt-1.5 text-[12px] font-semibold">{note}</p>}
        </div>
    );
}

function Key({ className, children }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-[4px] ${className}`} />
            {children}
        </span>
    );
}
