// src/features/payment/components/MethodOffDialog.jsx
"use client";

import { PauseCircle } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n/I18nProvider";

/** Method name in the visitor's language ("bKash" / "বিকাশ", "Card or other wallet" / ...). */
export function methodLabel(m, t) {
    if (!m) return "";
    const key = `pay.${m.id}.label`;
    const v = t(key);
    return v === key ? m.label : v;
}

/** "Pay with bKash" / "Pay by card or other wallet". */
export function payLabel(m, t) {
    return m.id === "sslcommerz" ? t("pay.payByCard") : t("pay.payWithMethod", { method: methodLabel(m, t) });
}

/**
 * Title + sentence for "this method is off".
 *   off           { id, label } the player wanted, or null (no particular one)
 *   alternatives  methods that are on: [{ id, label, hint }]
 *   t             translator from useI18n()
 */
export function offCopy(off, alternatives = [], t) {
    const method = off ? methodLabel(off, t) : "";
    if (!alternatives.length) {
        return {
            title: off ? t("pay.offTitle", { method }) : t("pay.pausedTitle"),
            body: off ? t("pay.offBodyNone", { method }) : t("pay.pausedBody"),
        };
    }
    const names = alternatives.map((a) => methodLabel(a, t)).join(t("pay.or"));
    return {
        title: off ? t("pay.offTitle", { method }) : t("pay.otherTitle"),
        body: off ? t("pay.offBodyAlt", { method, alternatives: names }) : t("pay.otherBody", { alternatives: names }),
    };
}

/**
 * The message body + buttons. Used on its own inside PayDialog, and wrapped in a Dialog below.
 *   onUse(id)    pay with that method
 *   onClose      "Not now" / "Back"
 *   closeLabel   text of the close button
 *   deskPhone    optional, shown as a Call button when nothing is on
 */
export function MethodOffNotice({ alternatives = [], onUse, onClose, closeLabel, busy = false, deskPhone = "" }) {
    const { t } = useI18n();
    return (
        <div className="space-y-3">
            {alternatives.map((m) => (
                <Button key={m.id} className="w-full" onClick={() => onUse(m.id)} disabled={busy}>
                    {busy ? t("pay.opening") : payLabel(m, t)}
                </Button>
            ))}
            {!alternatives.length && deskPhone && (
                <Button href={`tel:${deskPhone.replace(/[^\d+]/g, "")}`} variant="ink" className="w-full">
                    {t("common.callDesk")}
                </Button>
            )}
            <Button variant="outline" className="w-full" onClick={onClose} disabled={busy}>
                {closeLabel ?? t("common.notNow")}
            </Button>
        </div>
    );
}

/**
 * Pops up when the player picks (or pays with) a method the admin switched off.
 *   open, onClose, off, alternatives, onUse(id), busy, deskPhone
 */
export default function MethodOffDialog({ open, onClose, off = null, alternatives = [], onUse, busy = false, deskPhone = "" }) {
    const { t } = useI18n();
    const copy = offCopy(off, alternatives, t);
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
                closeLabel={alternatives.length ? t("common.notNow") : t("common.close")}
                busy={busy}
                deskPhone={deskPhone}
            />
        </Dialog>
    );
}