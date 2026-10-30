// src/components/ui/PeoplePicker.jsx
"use client";

import { Minus, Plus, Users } from "lucide-react";
import { BN } from "@/i18n/format";
import { cn } from "@/lib/utils";

/**
 * How many people (per-person grounds such as the swimming pool): −  ৩ জন  +
 *   value     current number (1..max)
 *   max       most people allowed (places left in the slot, capped at the per-booking limit)
 *   onChange  (n) => void
 *   note      optional small text under the stepper
 */
export default function PeoplePicker({ value = 1, max = 10, onChange, note, disabled = false, className }) {
    const n = Math.min(Math.max(1, Number(value) || 1), Math.max(1, max));
    const btn =
        "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-ink ring-1 ring-line transition hover:ring-ink-4 disabled:cursor-not-allowed disabled:opacity-40";
    return (
        <div className={className}>
            <div className="inline-flex items-center gap-3 rounded-full bg-chalk p-1.5 ring-1 ring-line">
                <button type="button" className={btn} disabled={disabled || n <= 1} onClick={() => onChange?.(n - 1)} aria-label="একজন কমান">
                    <Minus className="h-4 w-4" />
                </button>
                <span className="flex min-w-[88px] items-center justify-center gap-1.5 text-[16px] font-bold text-ink tnum" aria-live="polite">
                    <Users className="h-4 w-4 text-ink-3" />
                    {BN.digits(n)} জন
                </span>
                <button type="button" className={btn} disabled={disabled || n >= max} onClick={() => onChange?.(n + 1)} aria-label="একজন বাড়ান">
                    <Plus className="h-4 w-4" />
                </button>
            </div>
            {note && <p className={cn("mt-2 text-[12px] text-ink-3")}>{note}</p>}
        </div>
    );
}