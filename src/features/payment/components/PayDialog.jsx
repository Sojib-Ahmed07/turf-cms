// src/features/payment/components/PayDialog.jsx
"use client";

import { useState } from "react";
import { Lock, PauseCircle } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import PayMethodPicker from "./PayMethodPicker";
import { MethodOffNotice, offCopy } from "./MethodOffDialog";
import { useI18n } from "@/i18n/I18nProvider";

/**
 * "How do you want to pay?" for an already-held booking (My bookings, Try payment again).
 * Used when more than one method is set up. Picking a method the admin switched off swaps the
 * dialog to "X is off right now, pay with Y instead"; with every method off it opens on that message.
 *   open, onClose
 *   methods   [{ id, label, hint, enabled }]
 *   amount    number (taka)
 *   busy      true while the payment page is opening
 *   error     message from payForBooking
 *   onPay     (methodId) => void
 */
export default function PayDialog({ open, onClose, methods = [], amount = 0, busy = false, error = "", onPay }) {
    const { t, f } = useI18n();
    const enabled = methods.filter((m) => m.enabled);
    const [method, setMethod] = useState(enabled[0]?.id ?? "");
    const [offView, setOffView] = useState(null); // the switched-off method the player picked
    // Closed from outside (parent state): start fresh next time. Compared during render, not in an effect.
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (!open && offView) setOffView(null);
    }
    const chosen = enabled.some((m) => m.id === method) ? method : enabled[0]?.id;
    const showOff = Boolean(offView) || enabled.length === 0;

    function close() {
        setOffView(null);
        onClose?.();
    }

    function pick(id) {
        const m = methods.find((x) => x.id === id);
        if (m && !m.enabled) setOffView(m);
        else setMethod(id);
    }

    if (showOff) {
        const copy = offCopy(offView, enabled, t);
        return (
            <Dialog open={open} onClose={busy ? undefined : close} title={copy.title} size="sm">
                <div className="mb-5 flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-flare-soft text-flare-deep">
                        <PauseCircle className="h-5 w-5" />
                    </span>
                    <p className="text-[14px] leading-relaxed text-ink-2">{copy.body}</p>
                </div>
                {error && <p className="mb-4 rounded-ctl bg-danger-soft px-4 py-3 text-[13px] font-medium text-danger">{error}</p>}
                <MethodOffNotice
                    alternatives={enabled}
                    onUse={(id) => {
                        setMethod(id);
                        onPay(id);
                    }}
                    onClose={enabled.length ? () => setOffView(null) : close}
                    closeLabel={enabled.length ? t("common.back") : t("common.close")}
                    busy={busy}
                />
            </Dialog>
        );
    }

    return (
        <Dialog
            open={open}
            onClose={busy ? undefined : close}
            title={t("pay.chooseTitle")}
            description={t("pay.chooseDesc")}
            size="sm"
            footer={
                <>
                    <Button variant="outline" onClick={close} disabled={busy}>
                        {t("common.notNow")}
                    </Button>
                    <Button onClick={() => onPay(chosen)} disabled={busy || !chosen}>
                        <Lock className="h-4 w-4" />
                        {busy ? t("pay.opening") : t("pay.payAmount", { amount: f.taka(amount) })}
                    </Button>
                </>
            }
        >
            <PayMethodPicker methods={methods} value={chosen} onChange={pick} />
            {error && <p className="mt-4 rounded-ctl bg-danger-soft px-4 py-3 text-[13px] font-medium text-danger">{error}</p>}
        </Dialog>
    );
}