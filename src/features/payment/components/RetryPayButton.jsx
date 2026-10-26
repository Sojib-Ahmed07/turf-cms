// src/features/payment/components/RetryPayButton.jsx
"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import PayDialog from "./PayDialog";
import MethodOffDialog from "./MethodOffDialog";
import { payForBooking } from "@/features/payment/actions";
import { cn } from "@/lib/utils";

/**
 * "Try payment again": opens a fresh payment for the same held booking.
 * methods: [{ id, label, hint, enabled }]; with more than one, the player picks bKash or card/other first.
 * A method the admin switched off shows "X is off right now, pay with Y instead".
 */
export default function RetryPayButton({ bookingId, methods = [], amount = 0, className }) {
    const router = useRouter();
    const [busy, startTransition] = useTransition();
    const [leaving, setLeaving] = useState(false);
    const [error, setError] = useState("");
    const [choosing, setChoosing] = useState(false);
    const closeChooser = useCallback(() => setChoosing(false), []);
    const [offInfo, setOffInfo] = useState(null); // { off, alternatives }
    const closeOff = useCallback(() => setOffInfo(null), []);

    function pay(method) {
        setError("");
        startTransition(async () => {
            const res = await payForBooking(bookingId, method);
            if (res.ok) {
                setLeaving(true);
                window.location.assign(res.data.url);
                return;
            }
            if (res.needsLogin) {
                router.push(`/login?next=${encodeURIComponent("/bookings")}`);
                return;
            }
            if (res.needsVerify) {
                router.push(`/verify-email?next=${encodeURIComponent("/bookings")}`);
                return;
            }
            if (res.methodOff) {
                setChoosing(false);
                setOffInfo({ off: res.off, alternatives: res.available ?? [] });
                return;
            }
            setError(res.error);
        });
    }

    function start() {
        if (methods.length > 1) {
            setError("");
            setChoosing(true);
            return;
        }
        const only = methods[0];
        if (only && !only.enabled) {
            setOffInfo({ off: only, alternatives: [] });
            return;
        }
        pay(only?.id ?? "");
    }

    const working = busy || leaving;

    return (
        <div className={cn("flex flex-col gap-2", className)}>
            <Button size="lg" onClick={start} disabled={working} className="w-full">
                {working && !choosing ? "Opening payment" : "Try payment again"}
            </Button>
            {error && !choosing && <p className="text-[13px] font-medium text-danger">{error}</p>}
            {methods.length > 1 && (
                <PayDialog open={choosing} onClose={closeChooser} methods={methods} amount={amount} busy={working} error={error} onPay={pay} />
            )}
            <MethodOffDialog
                open={Boolean(offInfo)}
                onClose={closeOff}
                off={offInfo?.off ?? null}
                alternatives={offInfo?.alternatives ?? []}
                onUse={(method) => {
                    setOffInfo(null);
                    pay(method);
                }}
                busy={working}
            />
        </div>
    );
}