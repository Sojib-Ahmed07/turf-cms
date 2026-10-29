// src/components/site/WhatsAppButton.jsx
"use client";

// Floating "Chat on WhatsApp" button, bottom right of every public page (replaces the old Contact menu link).
// Number: Admin > Footer & SEO > WhatsApp number, or the phone number when that is empty. No number = no button.
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { WHATSAPP_PATH } from "./SocialIcon";
import { cn } from "@/lib/utils";

/** "+880 1700-000000" / "01700000000" -> "8801700000000" (wa.me wants the country code, digits only). */
export function waNumber(raw) {
    const digits = String(raw ?? "").replace(/\D/g, "");
    if (/^01[3-9]\d{8}$/.test(digits)) return `88${digits}`; // Bangladeshi mobile typed without +88
    if (/^00\d{8,}$/.test(digits)) return digits.slice(2);
    return digits.length >= 10 ? digits : "";
}

export default function WhatsAppButton({ number, siteName }) {
    const { t } = useI18n();
    const pathname = usePathname();
    const isHome = pathname === "/";
    // On the home page the hero slide arrows (phones) and the quick search (desktop) sit in the bottom-right corner:
    // show the button once the visitor has scrolled a little.
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        if (!isHome) return;
        const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.35);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [isHome]);

    const wa = waNumber(number);
    if (!wa) return null;

    const href = `https://wa.me/${wa}?text=${encodeURIComponent(t("whatsapp.message", { site: siteName }))}`;
    // The booking page has its own checkout bar along the bottom on phones and tablets.
    const onBooking = pathname?.startsWith("/book") && !pathname.startsWith("/bookings");

    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={t("whatsapp.label")}
            title={t("whatsapp.label")}
            className={cn(
                "group fixed bottom-5 right-4 z-40 items-center gap-2 rounded-full bg-[#25d366] p-3.5 text-white sm:bottom-6 sm:right-6",
                "shadow-[0_12px_30px_-8px_rgb(18_140_70/0.6)] ring-4 ring-white/70 transition-[transform,box-shadow,opacity] duration-200",
                "hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-8px_rgb(18_140_70/0.7)] focus-visible:outline-none focus-visible:ring-[#128c7e]/40",
                onBooking ? "hidden lg:inline-flex" : "inline-flex",
                isHome && !scrolled && "pointer-events-none translate-y-4 opacity-0"
            )}
        >
            <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" fill="currentColor" aria-hidden="true">
                <path d={WHATSAPP_PATH} />
            </svg>
            {/* Label slides out on hover (mouse only) */}
            <span className="hidden max-w-0 overflow-hidden whitespace-nowrap text-[14px] font-semibold transition-[max-width,padding] duration-300 group-hover:max-w-[160px] group-hover:pr-1.5 md:inline">
                {t("whatsapp.short")}
            </span>
        </a>
    );
}