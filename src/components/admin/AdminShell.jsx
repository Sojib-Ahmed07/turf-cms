// src/components/admin/AdminShell.jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
    LayoutGrid,
    Palette,
    Navigation,
    GalleryHorizontal,
    Megaphone,
    Rows3,
    PanelBottom,
    ScrollText,
    Images,
    CalendarRange,
    Wallet,
    TicketPercent,
    Users,
    LandPlot,
    ExternalLink,
    Menu,
    X,
    LogOut,
} from "lucide-react";
import { Mark } from "@/components/site/Logo";
import { cn } from "@/lib/utils";

export const ADMIN_NAV = [
    { group: null, items: [{ label: "Overview", href: "/admin", icon: LayoutGrid, exact: true }] },
    {
        group: "Website",
        items: [
            { adminOnly: true, label: "Branding", href: "/admin/branding", icon: Palette },
            { adminOnly: true, label: "Navigation", href: "/admin/navigation", icon: Navigation },
            { label: "Hero slides", href: "/admin/hero", icon: GalleryHorizontal },
            { label: "Offer banners", href: "/admin/banners", icon: Megaphone },
            { label: "Home sections", href: "/admin/sections", icon: Rows3 },
            { label: "Footer & SEO", href: "/admin/footer", icon: PanelBottom },
            { label: "Booking terms", href: "/admin/terms", icon: ScrollText },
            { label: "Media", href: "/admin/media", icon: Images },
        ],
    },
    {
        group: "Bookings",
        items: [
            { adminOnly: true, label: "Grounds & slots", href: "/admin/pitches", icon: LandPlot },
            { adminOnly: true, label: "Bookings", href: "/admin/bookings", icon: CalendarRange, countKey: "held" },
            { adminOnly: true, label: "Payments", href: "/admin/payments", icon: Wallet },
            { adminOnly: true, label: "Coupons", href: "/admin/coupons", icon: TicketPercent },
        ],
    },
    { group: "Team", items: [{ adminOnly: true, label: "Users", href: "/admin/users", icon: Users }] },
];

export default function AdminShell({ user, siteName = "TurfZone", counts = {}, children }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="min-h-svh bg-chalk lg:grid lg:grid-cols-[272px_1fr]">
            {/* Desktop sidebar */}
            <aside className="sticky top-0 hidden h-svh p-3 pr-0 lg:block">
                <Sidebar user={user} siteName={siteName} counts={counts} />
            </aside>

            {/* Mobile top bar */}
            <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-chalk/90 px-4 backdrop-blur-xl lg:hidden">
                <Link href="/admin" className="flex items-center gap-2.5">
                    <Mark className="h-8 w-8" />
                    <span className="display text-[18px] text-ink">{siteName}</span>
                    <span className="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white">Admin</span>
                </Link>
                <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-full bg-ink text-white">
                    <Menu className="h-[18px] w-[18px]" />
                </button>
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
                        <motion.div
                            className="h-full w-[290px] p-2"
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Sidebar user={user} siteName={siteName} counts={counts} onNavigate={() => setOpen(false)} onClose={() => setOpen(false)} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="min-w-0 px-4 pb-20 pt-6 sm:px-8 lg:px-10 lg:pt-10">{children}</main>
        </div>
    );
}

function Sidebar({ user, siteName, counts = {}, onNavigate, onClose }) {
    const pathname = usePathname();
    const isActive = (item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

    return (
        <div className="flex h-full flex-col rounded-[22px] bg-pitch text-white">
            <div className="flex items-center justify-between px-5 pb-4 pt-5">
                <Link href="/admin" className="flex items-center gap-2.5" onClick={onNavigate}>
                    <Mark className="h-9 w-9" />
                    <span>
                        <span className="display block text-[19px] leading-none">{siteName}</span>
                        <span className="mt-1 block text-[12px] text-white/50">Admin panel</span>
                    </span>
                </Link>
                {onClose && (
                    <button type="button" onClick={onClose} aria-label="Close menu" className="grid h-8 w-8 place-items-center rounded-full bg-white/10">
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            <nav className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4">
                {ADMIN_NAV.map((section) => ({
                    ...section,
                    // Editors only see website content pages
                    items: section.items.filter((item) => !item.adminOnly || user?.role === "admin"),
                }))
                    .filter((section) => section.items.length > 0)
                    .map((section, gi) => (
                        <div key={gi} className="mt-4 first:mt-1">
                            {section.group && <p className="px-3 pb-1.5 text-[12px] font-medium text-white/40">{section.group}</p>}
                            <ul className="space-y-0.5">
                                {section.items.map((item) => {
                                    const active = isActive(item);
                                    const count = item.countKey ? counts[item.countKey] : 0;
                                    const Icon = item.icon;
                                    return (
                                        <li key={item.href}>
                                            <Link
                                                href={item.href}
                                                onClick={onNavigate}
                                                className={cn(
                                                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors",
                                                    active ? "bg-white text-ink" : "text-white/70 hover:bg-white/8 hover:text-white"
                                                )}
                                            >
                                                <Icon className={cn("h-[18px] w-[18px]", active ? "text-brand-deep" : "text-white/50 group-hover:text-white/80")} />
                                                {item.label}
                                                {count ? (
                                                    <span
                                                        title={`${count} waiting for payment`}
                                                        className={cn("ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold tnum", active ? "bg-flare text-ink" : "bg-flare/90 text-ink")}
                                                    >
                                                        {count}
                                                    </span>
                                                ) : null}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
            </nav>

            <div className="space-y-2 border-t border-white/10 p-3">
                <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-white/70 hover:bg-white/8 hover:text-white">
                    <ExternalLink className="h-[18px] w-[18px] text-white/50" />
                    View website
                </Link>
                <div className="flex items-center gap-3 rounded-xl bg-white/6 p-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-flare text-[14px] font-bold text-ink">{user?.name?.[0] ?? "A"}</span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold">{user?.name}</span>
                        <span className="block text-[12px] capitalize text-white/50">{user?.role}</span>
                    </span>
                    <button type="button" aria-label="Sign out" className="grid h-8 w-8 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white">
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}