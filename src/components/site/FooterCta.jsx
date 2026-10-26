// src/components/site/FooterCta.jsx
"use client";

import { usePathname } from "next/navigation";
import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n/I18nProvider";

/** Closing call to action inside the footer panel. Home page only. */
export default function FooterCta({ heading, ctaLabel, ctaHref = "/book" }) {
    const { t } = useI18n();
    const pathname = usePathname();
    if (pathname !== "/") return null;

    return (
        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 border-b border-white/10 px-6 py-16 sm:px-10 sm:py-20 lg:flex-row lg:items-end lg:justify-between lg:px-12">
            <h2 className="display max-w-[14ch] text-[clamp(40px,6vw,80px)]">{heading ?? t("footer.ctaHeading")}</h2>
            <Button href={ctaHref} size="lg" className="h-14 px-8 text-base">
                {ctaLabel ?? t("common.bookSlot")}
            </Button>
        </div>
    );
}