// src/components/site/BookingGuide.jsx
"use client";

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, CircleHelp, Clock3, Info, LandPlot, QrCode, UserCheck, Wallet } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const STEPS = [
    { n: 1, icon: UserCheck },
    { n: 2, icon: LandPlot },
    { n: 3, icon: CalendarDays },
    { n: 4, icon: Clock3 },
    { n: 5, icon: Wallet },
    { n: 6, icon: QrCode },
];

const TIPS = ["tip1", "tip2", "tip3", "tip4"];

/**
 * "How to book" button for the hero, opening a step-by-step guide.
 * The texts are fixed (guide.* in the dictionaries), in English and Bangla.
 * The dialog is portalled to <body>: the hero is its own stacking layer (isolate + overflow-hidden), so a dialog
 * rendered inside it would sit under the search bar that overlaps the hero.
 *   variant / size / className: passed to the button
 */
export default function BookingGuide({ variant = "outline-light", size = "lg", className }) {
    const { t, f } = useI18n();
    const [open, setOpen] = useState(false);
    const close = useCallback(() => setOpen(false), []);

    return (
        <>
            <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
                <CircleHelp className="h-[18px] w-[18px]" />
                {t("hero.howToBook")}
            </Button>

            {open &&
                createPortal(
                    <Dialog
                        open={open}
                        onClose={close}
                        title={t("guide.title")}
                        description={t("guide.intro")}
                        size="lg"
                        footer={
                            <>
                                <Button variant="outline" onClick={close}>
                                    {t("common.close")}
                                </Button>
                                <Button href="/book" onClick={close}>
                                    {t("guide.cta")}
                                </Button>
                            </>
                        }
                    >
                        <ol className="relative space-y-1">
                            {/* touchline, like the How it works section */}
                            <span
                                aria-hidden="true"
                                className="absolute bottom-6 left-[19px] top-6 w-[2px] bg-[repeating-linear-gradient(to_bottom,var(--color-line)_0_8px,transparent_8px_14px)]"
                            />
                            {STEPS.map(({ n, icon: Icon }) => (
                                <li key={n} className="relative flex gap-4 py-3">
                                    <span
                                        className={cn(
                                            "relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full ring-4 ring-white",
                                            n === 6 ? "bg-brand text-brand-ink" : "bg-pitch text-white",
                                        )}
                                    >
                                        <Icon className="h-[18px] w-[18px]" />
                                    </span>
                                    <div className="min-w-0 pt-0.5">
                                        <p className="text-[12px] font-semibold text-brand-deep tnum">
                                            {t("how.step", { n: f.digits(n) })}
                                        </p>
                                        <h3 className="mt-0.5 text-[16px] font-semibold text-ink wide">{t(`guide.s${n}Title`)}</h3>
                                        <p className="mt-1 text-[14px] leading-relaxed text-ink-3">{t(`guide.s${n}Body`)}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>

                        <div className="mt-4 rounded-card bg-chalk p-5 ring-1 ring-line">
                            <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                                <Info className="h-4 w-4 text-brand-deep" />
                                {t("guide.tipsTitle")}
                            </p>
                            <ul className="mt-3 space-y-2">
                                {TIPS.map((k) => (
                                    <li key={k} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-2">
                                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                                        {t(`guide.${k}`)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Dialog>,
                    document.body,
                )}
        </>
    );
}