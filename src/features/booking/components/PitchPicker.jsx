// src/features/booking/components/PitchPicker.jsx
"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import PitchLines from "@/components/site/PitchLines";
import { useI18n } from "@/i18n/I18nProvider";
import { canOptimize, cn } from "@/lib/utils";

export default function PitchPicker({ pitches = [], value, onChange }) {
    const { t, f } = useI18n();
    return (
        <div role="radiogroup" aria-label={t("pitch.label")} className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
            {pitches.map((p) => {
                const active = p.id === value;
                return (
                    <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange?.(p.id)}
                        className={cn(
                            "group relative flex w-[240px] shrink-0 snap-start items-center gap-3 rounded-card bg-white p-2.5 pr-4 text-left transition-shadow sm:w-auto",
                            active ? "ring-2 ring-pitch" : "ring-1 ring-line hover:ring-ink-4"
                        )}
                    >
                        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[14px] bg-pitch">
                            {p.imageUrl ? (
                                <Image src={p.imageUrl} alt="" fill sizes="64px" unoptimized={!canOptimize(p.imageUrl)} className="object-cover" />
                            ) : (
                                <PitchLines variant="half" className="absolute inset-0 h-full w-full text-white/25" />
                            )}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="display block truncate text-[19px] text-ink">{p.name}</span>
                            <span className="mt-0.5 block truncate text-[13px] text-ink-3">{p.format}</span>
                            <span className="mt-1 block text-[13px] font-semibold text-ink-2 tnum">{t("pitch.fromPrice", { price: f.taka(p.hourlyRate) })}</span>
                        </span>
                        <span
                            className={cn(
                                "absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full transition",
                                active ? "bg-pitch text-white" : "ring-1 ring-line"
                            )}
                        >
                            {active && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}