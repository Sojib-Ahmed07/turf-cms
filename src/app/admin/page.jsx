// src/app/admin/page.jsx
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarPlus, ExternalLink, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader, Panel } from "@/components/admin/Kit";
import TonightBoard from "@/components/admin/TonightBoard";
import StatusBadge from "@/components/admin/StatusBadge";
import Button from "@/components/ui/Button";
import { getDashboardStats, getLatestBookings, getLiveContentSummary, getTodayBoard } from "@/features/admin/queries";
import { requireRole } from "@/lib/guards";
import { dhakaTime, shortDateLabel } from "@/lib/time";
import { taka } from "@/lib/utils";

export const dynamic = "force-dynamic";

function greeting() {
    const h = Number(dhakaTime().slice(0, 2));
    if (h < 5) return "Good night";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

export default async function AdminOverview() {
    const user = await requireRole(["admin", "editor"]);
    // Editors manage website content only: no revenue, bookings or player details for them.
    const isAdmin = user.role === "admin";
    const [stats, board, latest, live] = await Promise.all([
        isAdmin ? getDashboardStats() : null,
        isAdmin ? getTodayBoard() : null,
        isAdmin ? getLatestBookings(5) : [],
        getLiveContentSummary(),
    ]);

    const firstName = user.name?.split(" ")[0] ?? "";
    const prevMonthName = stats ? monthName(stats.today, -1) : "";

    return (
        <div className="mx-auto max-w-[1280px]">
            <PageHeader
                title={`${greeting()}, ${firstName}`}
                description={
                    isAdmin
                        ? `${shortDateLabel(stats.today)}. ${board.freeCount} slot${board.freeCount === 1 ? " is" : "s are"} still free today.`
                        : "Here's what is live on the website. Use the menu to edit slides, banners, sections and pages."
                }
                actions={
                    <>
                        <Button href="/" variant="outline" target="_blank">
                            <ExternalLink className="h-4 w-4" />
                            View website
                        </Button>
                        {isAdmin && (
                            <Button href="/admin/bookings?walkin=1" variant="ink">
                                <CalendarPlus className="h-4 w-4" />
                                Add walk-in booking
                            </Button>
                        )}
                    </>
                }
            />

            {isAdmin && (
                <>
                    {/* Numbers */}
                    <div className="grid grid-cols-2 overflow-hidden rounded-card bg-line ring-1 ring-line [gap:1px] lg:grid-cols-4">
                        <Stat label="Bookings today" value={stats.todayBookings} />
                        <Stat label="Revenue today" value={taka(stats.todayRevenue)} note={<span className="text-ink-3">Confirmed bookings</span>} />
                        <Stat
                            label="Revenue this month"
                            value={taka(stats.monthRevenue)}
                            note={
                                stats.monthChange === null ? (
                                    <span className="text-ink-3">No bookings last month to compare</span>
                                ) : (
                                    <span className={`inline-flex items-center gap-1 ${stats.monthChange >= 0 ? "text-brand-deep" : "text-danger"}`}>
                                        {stats.monthChange >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                                        {Math.abs(stats.monthChange)}% vs same days in {prevMonthName}
                                    </span>
                                )
                            }
                        />
                        <Stat
                            label="Waiting for payment"
                            value={stats.pendingHolds}
                            note={<span className="text-flare-deep">Released after 15 min</span>}
                            accent={stats.pendingHolds > 0}
                        />
                    </div>

                    {/* Today */}
                    <Panel
                        className="mt-6"
                        title="Today"
                        description={`${board.occupancy}% of today's slots are booked or on hold across all grounds`}
                        actions={
                            <div className="hidden items-center gap-4 text-[12px] text-ink-3 sm:flex">
                                <Key className="bg-pitch">Booked</Key>
                                <Key className="bg-flare">Waiting</Key>
                                <Key className="border-2 border-dashed border-line">Free</Key>
                            </div>
                        }
                    >
                        <TonightBoard rows={board.rows} from={board.from} to={board.to} now={board.now} />
                    </Panel>

                </>
            )}

            <div className="mt-6 grid gap-6 xl:grid-cols-12">
                {/* Latest bookings */}
                {isAdmin && (
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
                        {latest.length === 0 ? (
                            <p className="px-6 py-10 text-center text-[14px] text-ink-3">No bookings yet. They&apos;ll appear here as players book.</p>
                        ) : (
                            <ul className="divide-y divide-line">
                                {latest.map((b) => (
                                    <li key={b.bookingId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4">
                                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-grass text-[14px] font-bold text-pitch">
                                            {b.customer[0]?.toUpperCase()}
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
                        )}
                    </Panel>
                )}

                {/* Live on site */}
                <Panel className={isAdmin ? "xl:col-span-4" : "xl:col-span-12"} title="Live on the website">
                    <div>
                        <div className="flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-ink-2">Hero slides</p>
                            <Link href="/admin/hero" className="text-[13px] font-semibold text-brand-deep hover:underline">
                                Edit
                            </Link>
                        </div>
                        {live.slides.length === 0 ? (
                            <p className="mt-3 rounded-ctl bg-chalk px-4 py-3 text-[13px] text-ink-3">No slides yet. The home page shows a default banner.</p>
                        ) : (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                {live.slides.map((s) => (
                                    <div key={s.id} className="relative aspect-[16/10] overflow-hidden rounded-[10px] bg-pitch">
                                        {s.imageUrl && <Image src={s.imageUrl} alt="" fill sizes="120px" className="object-cover" />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-6 border-t border-line pt-5">
                        <div className="flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-ink-2">Promo codes</p>
                            {isAdmin && (
                                <Link href="/admin/coupons" className="text-[13px] font-semibold text-brand-deep hover:underline">
                                    Edit
                                </Link>
                            )}
                        </div>
                        {live.coupons.length === 0 ? (
                            <p className="mt-3 rounded-ctl bg-chalk px-4 py-3 text-[13px] text-ink-3">No promo codes yet.</p>
                        ) : (
                            <ul className="mt-3 space-y-3">
                                {live.coupons.map((c) => (
                                    <li key={c.code} className="flex items-center gap-3">
                                        <span className="rounded-md border border-dashed border-flare bg-flare-soft px-2 py-1 text-[12px] font-bold tracking-wider text-ink tnum">
                                            {c.code}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-[13px] text-ink-3">{c.usedCount} used so far</span>
                                        <span className={`text-[12px] font-semibold ${c.isActive ? "text-brand-deep" : "text-ink-4"}`}>{c.isActive ? "Active" : "Off"}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </Panel>
            </div>
        </div>
    );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function monthName(iso, offset = 0) {
    const m = Number(iso.slice(5, 7)) - 1 + offset;
    return MONTHS[(m + 12) % 12];
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