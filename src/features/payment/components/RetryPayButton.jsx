// src/features/payment/components/RetryPayButton.jsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { payForBooking } from "@/features/payment/actions";
import { cn } from "@/lib/utils";

/** "Try payment again": opens a fresh SSLCommerz session for the same held booking. */
export default function RetryPayButton({ bookingId, className }) {
    const router = useRouter();
    const [busy, startTransition] = useTransition();
    const [error, setError] = useState("");

    function retry() {
        setError("");
        startTransition(async () => {
            const res = await payForBooking(bookingId);
            if (res.ok) {
                window.location.assign(res.data.url);
                return;
            }
            if (res.needsLogin) {
                router.push(`/login?next=${encodeURIComponent("/bookings")}`);
                return;
            }
            setError(res.error);
        });
    }

    return (
        <div className={cn("flex flex-col gap-2", className)}>
            <Button size="lg" onClick={retry} disabled={busy} className="w-full">
                {busy ? "Opening payment" : "Try payment again"}
            </Button>
            {error && <p className="text-[13px] font-medium text-danger">{error}</p>}
        </div>
    );
}