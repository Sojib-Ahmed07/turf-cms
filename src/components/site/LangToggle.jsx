// src/components/site/LangToggle.jsx
"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const OPTIONS = [
    { value: "en", label: "EN", name: "English" },
    { value: "bn", label: "বাংলা", name: "বাংলা" },
];

/**
 * English / Bangla switch. Saves the choice in a cookie and refreshes the page in place.
 * tone="light" for the dark mobile menu.
 */
export default function LangToggle({ tone = "dark", className }) {
    const { locale, setLocale, switching, t } = useI18n();

    return (
        <div
            role="radiogroup"
            aria-label={t("lang.label")}
            className={cn(
                "inline-flex items-center gap-0.5 rounded-full p-0.5 text-[13px] font-semibold",
                tone === "light" ? "bg-white/10 ring-1 ring-inset ring-white/20" : "bg-ink/5 ring-1 ring-inset ring-line",
                switching && "opacity-60",
                className
            )}
        >
            <Languages className={cn("ml-2 mr-1 h-3.5 w-3.5", tone === "light" ? "text-white/60" : "text-ink-3")} aria-hidden="true" />
            {OPTIONS.map((o) => {
                const active = o.value === locale;
                return (
                    <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={o.name}
                        lang={o.value}
                        disabled={switching}
                        onClick={() => !active && setLocale(o.value)}
                        className={cn(
                            "rounded-full px-2.5 py-1 transition-colors",
                            active
                                ? tone === "light"
                                    ? "bg-white text-ink"
                                    : "bg-ink text-white"
                                : tone === "light"
                                    ? "text-white/70 hover:text-white"
                                    : "text-ink-3 hover:text-ink"
                        )}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}