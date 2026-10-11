// src/components/site/Navbar.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Ticket, Phone, MapPin } from "lucide-react";
import Logo from "./Logo";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Fixed layout; logo + labels come from the CMS.
 * `user` is null when signed out: { name, image } when signed in.
 */
export default function Navbar({ settings, items = [], user = null }) {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => (document.body.style.overflow = "");
    }, [open]);

    const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

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
                    <Logo settings={settings} />

                    <ul className="ml-4 hidden items-center gap-1 lg:flex">
                        {items.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "relative rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors",
                                        isActive(item.href)
                                            ? "text-ink"
                                            : "text-ink-3 hover:text-ink"
                                    )}
                                >
                                    {item.label}
                                    {isActive(item.href) && (
                                        <span className="absolute inset-x-3.5 -bottom-[13px] h-[3px] rounded-t-full bg-brand" />
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>

                    <div className="ml-auto flex items-center gap-2">
                        <Link
                            href="/bookings"
                            className="hidden items-center gap-2 rounded-full px-3 py-2 text-[14px] font-medium text-ink-2 hover:bg-ink/5 hover:text-ink sm:inline-flex"
                        >
                            <Ticket className="h-4 w-4" />
                            My bookings
                        </Link>

                        {user ? (
                            <Link
                                href="/profile"
                                aria-label="Your profile"
                                className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-grass text-sm font-bold text-pitch ring-2 ring-white"
                            >
                                {user.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={user.image} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    user.name?.[0]
                                )}
                            </Link>
                        ) : (
                            <Link
                                href="/login"
                                className="hidden rounded-full px-3 py-2 text-[14px] font-medium text-ink-2 hover:text-ink md:inline-flex"
                            >
                                Sign in
                            </Link>
                        )}

                        <Button href="/book" size="md" className="hidden sm:inline-flex">
                            Book a slot
                        </Button>

                        <button
                            type="button"
                            onClick={() => setOpen(true)}
                            aria-label="Open menu"
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
                            <Logo settings={settings} tone="light" />
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                aria-label="Close menu"
                                className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink"
                            >
                                <X className="h-[18px] w-[18px]" />
                            </button>
                        </div>

                        <ul className="mt-6 flex flex-col px-4 sm:px-6">
                            {[...items, { label: "My bookings", href: "/bookings" }].map((item, i) => (
                                <motion.li
                                    key={item.href}
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.15 + i * 0.05, duration: 0.4 }}
                                >
                                    <Link
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        className={cn(
                                            "display flex items-center justify-between border-b border-white/10 py-4 text-[34px]",
                                            isActive(item.href) ? "text-white" : "text-white/55"
                                        )}
                                    >
                                        {item.label}
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
                                <Button href="/login" variant="outline-light" size="lg">
                                    Sign in
                                </Button>
                                <Button href="/book" size="lg">
                                    Book a slot
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
