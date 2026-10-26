// src/features/payment/components/PayMethodPicker.jsx
"use client";

import { Check, CreditCard, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { bkash: Smartphone, sslcommerz: CreditCard };
// bKash's own pink, only on its small mark so players spot it fast. Everything else uses the site tokens.
const MARK = { bkash: "bg-[#e2136e] text-white", sslcommerz: "bg-pitch text-white" };

/**
 * Choose how to pay. Renders nothing when there is only one method (nothing to choose).
 *   methods   [{ id, label, hint, enabled }] from getPayMethods() on the server
 *   value     selected id
 *   onChange  (id) => void. Also called for a switched-off method (shown as "Off right now"):
 *             the parent opens the "use another method" dialog instead of selecting it.
 *   compact   segmented pills (mobile checkout bar) instead of cards
 */
export default function PayMethodPicker({ methods = [], value, onChange, compact = false, className }) {
    if (methods.length < 2) return null;

    if (compact) {
        return (
            <div role="radiogroup" aria-label="Payment method" className={cn("flex gap-1 rounded-full bg-chalk p-1 ring-1 ring-inset ring-line", className)}>
                {methods.map((m) => {
                    const active = m.id === value;
                    return (
                        <button
                            key={m.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => onChange(m.id)}
                            className={cn(
                                "flex-1 truncate rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                                active ? "bg-white text-ink shadow-sm ring-1 ring-line" : "text-ink-3 hover:text-ink",
                                m.enabled === false && "text-ink-4 line-through decoration-1"
                            )}
                        >
                            {m.id === "sslcommerz" ? "Card / other" : m.label}
                            {m.enabled === false && <span className="sr-only"> (off right now)</span>}
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <fieldset className={cn("space-y-2", className)}>
            <legend className="mb-2 text-[13px] font-medium text-ink-3">Pay with</legend>
            {methods.map((m) => {
                const active = m.id === value;
                const off = m.enabled === false;
                const Icon = ICONS[m.id] ?? CreditCard;
                return (
                    <label
                        key={m.id}
                        className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-ctl px-4 py-3 ring-1 transition-colors",
                            active ? "bg-brand-soft/60 ring-2 ring-brand" : "bg-white ring-line hover:ring-ink-4",
                            off && "bg-chalk"
                        )}
                    >
                        <input type="radio" name="pay-method" value={m.id} checked={active} onChange={() => onChange(m.id)} className="sr-only" />
                        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", MARK[m.id] ?? "bg-ink text-white", off && "opacity-40")}>
                            <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className={cn("flex items-center gap-2 text-[14px] font-semibold", off ? "text-ink-3" : "text-ink")}>
                                {m.label}
                                {off && (
                                    <span className="rounded-full bg-flare-soft px-2 py-0.5 text-[11px] font-semibold text-flare-deep">Off right now</span>
                                )}
                            </span>
                            <span className="block truncate text-[12px] text-ink-3">{m.hint}</span>
                        </span>
                        <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full ring-1", active ? "bg-brand text-white ring-brand" : "ring-line")}>
                            {active && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                    </label>
                );
            })}
        </fieldset>
    );
}