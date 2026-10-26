// src/components/site/Navbar.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
    Menu,
    X,
    Ticket,
    Phone,
    MapPin,
    User as UserIcon,
    LogOut,
    ChevronDown,
} from "lucide-react";
import Logo from "./Logo";
import LangToggle from "./LangToggle";
import { useI18n } from "@/i18n/I18nProvider";
import { bookButtonLabel, navLabel } from "@/i18n/nav";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "@/lib/auth-client";

/**
 * Fixed layout; logo + labels come from the CMS.
 * `user` (optional) is passed from the server as an SSR fallback to avoid
 * a "Sign in" flash on first paint. Live auth state comes from useSession().
 */
export default function Navbar({ settings, items = [], user: initialUser = null }) {
    const { t, locale } = useI18n();
    const { data: session, isPending } = useSession();
    const user = session?.user ?? (isPending ? initialUser : null);

    const [open, setOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const menuRef = useRef(null);

    const showMyBookings = settings?.showMyBookings !== false;
    const bookLabel = bookButtonLabel(settings?.menuButtonLabel, t);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    // Close menus on route change
    const [lastPath, setLastPath] = useState(pathname);
    if (pathname !== lastPath) {
        setLastPath(pathname);
        setOpen(false);
        setMenuOpen(false);
    }

    // Close dropdown on outside click / Escape
    useEffect(() => {
        if (!menuOpen) return;
        const onClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        const onKey = (e) => {
            if (e.key === "Escape") setMenuOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [menuOpen]);

    const isActive = (href) =>
        href === "/" ? pathname === "/" : pathname.startsWith(href);

    async function handleSignOut() {
        setMenuOpen(false);
        setOpen(false);
        await signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push("/");
                    router.refresh();
                },
            },
        });
    }

    const drawerItems = showMyBookings
        ? [...items, { label: "My bookings", href: "/bookings", id: "my-bookings" }]
        : items;

    return (
        <>
            <header
                className={cn(
                    "sticky top-0 z-40 transition-[background-color,box-shadow] duration-300",
                    scrolled
                        ? "bg-chalk/85 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl"
                        : "bg-chalk"
                )}
            >
                <nav className="mx-auto flex h-[68px] max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
                    <Logo settings={settings} homeLabel={t("common.homeOf", { name: settings?.siteName ?? "TurfZone" })} />

                    <ul className="ml-4 hidden items-center gap-1 lg:flex">
                        {items.map((item) => (
                            <li key={item.id ?? item.href}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "relative rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors",
                                        isActive(item.href)
                                            ? "text-ink"
                                            : "text-ink-3 hover:text-ink"
                                    )}
                                >
                                    {navLabel(item, t, locale)}
                                    {isActive(item.href) && (
                                        <span className="absolute inset-x-3.5 -bottom-[13px] h-[3px] rounded-t-full bg-brand" />
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>

                    <div className="ml-auto flex items-center gap-2">
                        <LangToggle className="hidden md:inline-flex" />
                        {showMyBookings && (
                            <Link
                                href="/bookings"
                                className="hidden items-center gap-2 rounded-full px-3 py-2 text-[14px] font-medium text-ink-2 hover:bg-ink/5 hover:text-ink sm:inline-flex"
                            >
                                <Ticket className="h-4 w-4" />
                                {t("common.myBookings")}
                            </Link>
                        )}

                        {user ? (
                            <div className="relative" ref={menuRef}>
                                <button
                                    type="button"
                                    onClick={() => setMenuOpen((v) => !v)}
                                    aria-haspopup="menu"
                                    aria-expanded={menuOpen}
                                    aria-label={t("common.yourAccount")}
                                    className="flex items-center gap-1.5 rounded-full p-1 pr-2 hover:bg-ink/5"
                                >
                                    <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-grass text-sm font-bold text-pitch ring-2 ring-white">
                                        {user.image ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={user.image}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            user.name?.[0]?.toUpperCase() ?? "U"
                                        )}
                                    </span>
                                    <ChevronDown
                                        className={cn(
                                            "h-4 w-4 text-ink-3 transition-transform",
                                            menuOpen && "rotate-180"
                                        )}
                                    />
                                </button>

                                <AnimatePresence>
                                    {menuOpen && (
                                        <motion.div
                                            role="menu"
                                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                            className="absolute right-0 mt-2 w-60 overflow-hidden rounded-card border border-line bg-paper shadow-xl"
                                        >
                                            <div className="border-b border-line px-4 py-3">
                                                <p className="truncate text-sm font-semibold text-ink">
                                                    {user.name}
                                                </p>
                                                {user.email && (
                                                    <p className="truncate text-xs text-ink-3">
                                                        {user.email}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="p-1.5">
                                                <Link
                                                    href="/profile"
                                                    role="menuitem"
                                                    className="flex items-center gap-2.5 rounded-ctl px-3 py-2 text-sm text-ink hover:bg-grass"
                                                >
                                                    <UserIcon className="h-4 w-4 text-ink-3" />
                                                    {t("common.yourProfile")}
                                                </Link>
                                                {showMyBookings && (
                                                    <Link
                                                        href="/bookings"
                                                        role="menuitem"
                                                        className="flex items-center gap-2.5 rounded-ctl px-3 py-2 text-sm text-ink hover:bg-grass"
                                                    >
                                                        <Ticket className="h-4 w-4 text-ink-3" />
                                                        {t("common.myBookings")}
                                                    </Link>
                                                )}
                                                {(user.role === "admin" ||
                                                    user.role === "editor") && (
                                                        <Link
                                                            href="/admin"
                                                            role="menuitem"
                                                            className="flex items-center gap-2.5 rounded-ctl px-3 py-2 text-sm text-ink hover:bg-grass"
                                                        >
                                                            <MapPin className="h-4 w-4 text-ink-3" />
                                                            {t("common.adminPanel")}
                                                        </Link>
                                                    )}
                                            </div>
                                            <div className="border-t border-line p-1.5">
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    onClick={handleSignOut}
                                                    className="flex w-full items-center gap-2.5 rounded-ctl px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
                                                >
                                                    <LogOut className="h-4 w-4" />
                                                    {t("common.signOut")}
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className="hidden rounded-full px-3 py-2 text-[14px] font-medium text-ink-2 hover:text-ink md:inline-flex"
                            >
                                {t("common.signIn")}
                            </Link>
                        )}

                        <Button href="/book" size="md" className="hidden sm:inline-flex">
                            {bookLabel}
                        </Button>

                        <button
                            type="button"
                            onClick={() => setOpen(true)}
                            aria-label={t("common.openMenu")}
                            className="grid h-10 w-10 place-items-center rounded-full bg-ink text-white lg:hidden"
                        >
                            <Menu className="h-[18px] w-[18px]" />
                        </button>
                    </div>
                </nav>
            </header>

            {/* Mobile drawer */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="fixed inset-0 z-50 flex flex-col bg-pitch text-white lg:hidden"
                        initial={{ clipPath: "circle(0% at calc(100% - 36px) 34px)" }}
                        animate={{ clipPath: "circle(150% at calc(100% - 36px) 34px)" }}
                        exit={{ clipPath: "circle(0% at calc(100% - 36px) 34px)" }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="flex h-[68px] items-center justify-between px-4 sm:px-6">
                            <Logo settings={settings} tone="light" homeLabel={t("common.homeOf", { name: settings?.siteName ?? "TurfZone" })} />
                            <LangToggle tone="light" className="ml-auto mr-3" />
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                aria-label={t("common.closeMenu")}
                                className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink"
                            >
                                <X className="h-[18px] w-[18px]" />
                            </button>
                        </div>

                        {user && (
                            <div className="mx-4 mt-4 flex items-center gap-3 rounded-card border border-white/10 bg-white/5 px-4 py-3 sm:mx-6">
                                <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-grass text-sm font-bold text-pitch">
                                    {user.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={user.image}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        user.name?.[0]?.toUpperCase() ?? "U"
                                    )}
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-white">
                                        {user.name}
                                    </p>
                                    {user.email && (
                                        <p className="truncate text-xs text-white/60">
                                            {user.email}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <ul className="mt-6 flex flex-col px-4 sm:px-6">
                            {drawerItems.map((item, i) => (
                                <motion.li
                                    key={item.id ?? item.href}
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.15 + i * 0.05, duration: 0.4 }}
                                >
                                    <Link
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        className={cn(
                                            "display flex items-center justify-between border-b border-white/10 py-4 text-[34px]",
                                            isActive(item.href)
                                                ? "text-white"
                                                : "text-white/55"
                                        )}
                                    >
                                        {navLabel(item, t, locale)}
                                        {isActive(item.href) && (
                                            <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                                        )}
                                    </Link>
                                </motion.li>
                            ))}
                        </ul>

                        <div className="mt-auto space-y-5 px-4 pb-8 sm:px-6">
                            <div className="space-y-2 text-sm text-white/60">
                                <p className="flex items-center gap-2">
                                    <Phone className="h-4 w-4" /> {settings?.contact?.phone}
                                </p>
                                <p className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" /> {settings?.contact?.address}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {user ? (
                                    <button
                                        type="button"
                                        onClick={handleSignOut}
                                        className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        {t("common.signOut")}
                                    </button>
                                ) : (
                                    <Button href="/login" variant="outline-light" size="lg">
                                        {t("common.signIn")}
                                    </Button>
                                )}
                                <Button href="/book" size="lg">
                                    {bookLabel}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}