// src/components/auth/VerifyEmailForm.jsx
"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Field, Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { Mail, KeyRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { safeNext } from "@/lib/utils";

export function VerifyEmailForm({ initialEmail = "" }) {
    const router = useRouter();
    const params = useSearchParams();
    const next = safeNext(params.get("next"));
    const [email] = useState(initialEmail || params.get("email") || "");
    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [resent, setResent] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        if (!email) {
            setError("We don't know your email. Go back and register again.");
            return;
        }
        setError("");
        setBusy(true);
        const { error: err } = await authClient.emailOtp.verifyEmail({ email, otp });
        setBusy(false);
        if (err) {
            setError(err.message || "That code didn't work. Check it and try again.");
            return;
        }
        router.push(next);
        router.refresh();
    }

    async function resend() {
        if (!email) return;
        setError("");
        setBusy(true);
        const { error: err } = await authClient.emailOtp.sendVerificationOtp({
            email,
            type: "email-verification",
        });
        setBusy(false);
        if (err) {
            setError(err.message || "We couldn't send a new code. Try again in a moment.");
            return;
        }
        setResent(true);
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {email ? (
                <p className="text-sm text-ink-3">
                    Sent to <span className="font-semibold text-ink">{email}</span>
                </p>
            ) : (
                <Field label="Email" htmlFor="email">
                    <Input id="email" type="email" icon={Mail} required value={email} readOnly placeholder="you@example.com" />
                </Field>
            )}

            <Field label="6-digit code" htmlFor="otp">
                <Input
                    id="otp"
                    icon={KeyRound}
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                />
            </Field>

            {error && <p className="text-sm text-danger">{error}</p>}
            {resent && !error && <p className="text-sm text-brand-deep">A new code is on its way. Check your inbox.</p>}

            <Button type="submit" className="w-full" disabled={busy || otp.length !== 6}>
                {busy ? "Checking…" : "Verify email"}
            </Button>

            <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={resend} disabled={busy} className="font-semibold text-ink hover:underline disabled:opacity-60">
                    Send a new code
                </button>
            </div>
        </form>
    );
}