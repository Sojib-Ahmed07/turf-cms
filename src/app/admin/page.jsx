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
import { BN } from "@/i18n/format";

export const dynamic = "force-dynamic";

function greeting() {
    const h = Number(dhakaTime().slice(0, 2));
    if (h < 5) return "শুভ রাত্রি";
    if (h < 12) return "শুভ সকাল";
    if (h < 17) return "শুভ দুপুর";
    return "শুভ সন্ধ্যা";
}

export default async function AdminOverview() {
    const user = await requireRole(["admin"]);
    // Only admins reach /admin (layout and this page check the role).
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
                        ? `${shortDateLabel(stats.today)}। আজ এখনো ${BN.digits(board.freeCount)}টি স্লট খালি।`
                        : "ওয়েবসাইটে এখন যা চলছে তা নিচে দেখুন। স্লাইড, ব্যানার, অংশ আর পেজ বদলাতে বাঁ পাশের মেনু ব্যবহার করুন।"
                }
                actions={
                    <>
                        <Button href="/" variant="outline" target="_blank">
                            <ExternalLink className="h-4 w-4" />
                            ওয়েবসাইট দেখুন
                        </Button>
                        {isAdmin && (
                            <Button href="/admin/bookings?walkin=1" variant="ink">
                                <CalendarPlus className="h-4 w-4" />
                                কাউন্টারে বুকিং যোগ করুন
                            </Button>
                        )}
                    </>
                }
            />

            {isAdmin && (
                <>
                    {/* Numbers */}
                    <div className="grid grid-cols-2 overflow-hidden rounded-card bg-line ring-1 ring-line [gap:1px] lg:grid-cols-4">
                        <Stat label="আজকের বুকিং" value={BN.digits(stats.todayBookings)} />
                        <Stat label="আজকের আয়" value={taka(stats.todayRevenue)} note={<span className="text-ink-3">কনফার্মড বুকিং থেকে</span>} />
                        <Stat
                            label="এই মাসের আয়"
                            value={taka(stats.monthRevenue)}
                            note={
                                stats.monthChange === null ? (
                                    <span className="text-ink-3">তুলনা করার মতো গত মাসের বুকিং নেই</span>
                                ) : (
                                    <span className={`inline-flex items-center gap-1 ${stats.monthChange >= 0 ? "text-brand-deep" : "text-danger"}`}>
                                        {stats.monthChange >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                                        {prevMonthName}-এর একই দিনগুলোর চেয়ে {BN.digits(Math.abs(stats.monthChange))}% {stats.monthChange >= 0 ? "বেশি" : "কম"}
                                    </span>
                                )
                            }
                        />
                        <Stat
                            label="এখন পেমেন্ট করছেন"
                            value={BN.digits(stats.pendingHolds)}
                            note={<span className="text-flare-deep">পেমেন্ট পেজে আছেন (সর্বোচ্চ ৫ থেকে ১০ মিনিট)</span>}
                            accent={stats.pendingHolds > 0}
                        />
                    </div>

                    {/* Today */}
                    <Panel
                        className="mt-6"
                        title="আজ"
                        description={`সব মাঠ মিলিয়ে আজকের ${BN.digits(board.occupancy)}% স্লট বুক হয়েছে বা পেমেন্ট চলছে`}
                        actions={
                            <div className="hidden items-center gap-4 text-[12px] text-ink-3 sm:flex">
                                <Key className="bg-pitch">বুক হয়েছে</Key>
                                <Key className="bg-flare">পেমেন্ট চলছে</Key>
                                <Key className="border-2 border-dashed border-line">খালি</Key>
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
                        title="সর্বশেষ বুকিং"
                        bodyClassName="p-0"
                        actions={
                            <Link href="/admin/bookings" className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-2 hover:text-ink">
                                সব বুকিং <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                        }
                    >
                        {latest.length === 0 ? (
                            <p className="px-6 py-10 text-center text-[14px] text-ink-3">এখনো কোনো বুকিং নেই। খেলোয়াড়রা বুক করলে এখানে দেখা যাবে।</p>
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
                <Panel className={isAdmin ? "xl:col-span-4" : "xl:col-span-12"} title="ওয়েবসাইটে এখন যা চলছে">
                    <div>
                        <div className="flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-ink-2">হিরো স্লাইড</p>
                            <Link href="/admin/hero" className="text-[13px] font-semibold text-brand-deep hover:underline">
                                বদলান
                            </Link>
                        </div>
                        {live.slides.length === 0 ? (
                            <p className="mt-3 rounded-ctl bg-chalk px-4 py-3 text-[13px] text-ink-3">এখনো কোনো স্লাইড নেই। হোম পেজে সাধারণ একটি ব্যানার দেখাচ্ছে।</p>
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
                            <p className="text-[13px] font-semibold text-ink-2">প্রোমো কোড</p>
                            {isAdmin && (
                                <Link href="/admin/coupons" className="text-[13px] font-semibold text-brand-deep hover:underline">
                                    বদলান
                                </Link>
                            )}
                        </div>
                        {live.coupons.length === 0 ? (
                            <p className="mt-3 rounded-ctl bg-chalk px-4 py-3 text-[13px] text-ink-3">এখনো কোনো প্রোমো কোড নেই।</p>
                        ) : (
                            <ul className="mt-3 space-y-3">
                                {live.coupons.map((c) => (
                                    <li key={c.code} className="flex items-center gap-3">
                                        <span className="rounded-md border border-dashed border-flare bg-flare-soft px-2 py-1 text-[12px] font-bold tracking-wider text-ink tnum">
                                            {c.code}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-[13px] text-ink-3">এ পর্যন্ত {BN.digits(c.usedCount)} বার ব্যবহার হয়েছে</span>
                                        <span className={`text-[12px] font-semibold ${c.isActive ? "text-brand-deep" : "text-ink-4"}`}>{c.isActive ? "চালু" : "বন্ধ"}</span>
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

const MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
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