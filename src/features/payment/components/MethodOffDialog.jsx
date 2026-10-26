// src/features/payment/components/MethodOffDialog.jsx
"use client";

import { PauseCircle } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";

/** "Pay with bKash" / "Pay by card or other wallet". */
export function payLabel(m) {
    return m.id === "sslcommerz" ? "Pay by card or other wallet" : `Pay with ${m.label}`;
}

/**
 * Title + sentence for "this method is off".
 *   off           { id, label } the player wanted, or null (no particular one)
 *   alternatives  methods that are on: [{ id, label, hint }]
 */
export function offCopy(off, alternatives = []) {
    if (!alternatives.length) {
        return {
            title: off ? `${off.label} is off right now` : "Online payment is paused",
            body: off
                ? `The venue has turned off ${off.label} payments, and no other online payment is on at the moment. Try again a little later, or call the desk to book.`
                : "The venue has turned off online payments for now. Try again a little later, or call the desk to book.",
        };
    }
    const names = alternatives.map((a) => a.label).join(" or ");
    return {
        title: off ? `${off.label} is off right now` : "Choose another way to pay",
        body: `${off ? `The venue has paused ${off.label} payments for now. ` : ""}You can pay with ${names} instead. Your slot stays held while you pay.`,
    };
}

/**
 * The message body + buttons. Used on its own inside PayDialog, and wrapped in a Dialog below.
 *   onUse(id)    pay with that method
 *   onClose      "Not now" / "Back"
 *   closeLabel   text of the close button
 *   deskPhone    optional, shown as a Call button when nothing is on
 */
export function MethodOffNotice({ alternatives = [], onUse, onClose, closeLabel = "Not now", busy = false, deskPhone = "" }) {
    return (
        <div className="space-y-3">
            {alternatives.map((m) => (
                <Button key={m.id} className="w-full" onClick={() => onUse(m.id)} disabled={busy}>
                    {busy ? "Opening payment…" : payLabel(m)}
                </Button>
            ))}
            {!alternatives.length && deskPhone && (
                <Button href={`tel:${deskPhone.replace(/[^\d+]/g, "")}`} variant="ink" className="w-full">
                    Call the desk
                </Button>
            )}
            <Button variant="outline" className="w-full" onClick={onClose} disabled={busy}>
                {closeLabel}
            </Button>
        </div>
    );
}

/**
 * Pops up when the player picks (or pays with) a method the admin switched off.
 *   open, onClose, off, alternatives, onUse(id), busy, deskPhone
 */
export default function MethodOffDialog({ open, onClose, off = null, alternatives = [], onUse, busy = false, deskPhone = "" }) {
    const copy = offCopy(off, alternatives);
    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} title={copy.title} size="sm">
            <div className="mb-5 flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-flare-soft text-flare-deep">
                    <PauseCircle className="h-5 w-5" />
                </span>
                <p className="text-[14px] leading-relaxed text-ink-2">{copy.body}</p>
            </div>
            <MethodOffNotice
                alternatives={alternatives}
                onUse={onUse}
                onClose={onClose}
                closeLabel={alternatives.length ? "Not now" : "Close"}
                busy={busy}
                deskPhone={deskPhone}
            />
        </Dialog>
    );
}