// src/components/auth/VerifyEmailForm.jsx
"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Field, Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { Mail, KeyRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { safeNext } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nProvider";
import { authMessage } from "./AuthForms";

export function VerifyEmailForm({ initialEmail = "" }) {
    const { t } = useI18n();
    const fromAuth = (err, fallback) => authMessage(err, fallback);
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
            setError(t("auth.noEmail"));
            return;
        }
        setError("");
        setBusy(true);
        const { error: err } = await authClient.emailOtp.verifyEmail({ email, otp });
        setBusy(false);
        if (err) {
            setError(fromAuth(err, t("auth.codeFailed")));
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
            setError(fromAuth(err, t("auth.resendFailed")));
            return;
        }
        setResent(true);
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {email ? (
                <p className="text-sm text-ink-3">
                    {t("auth.sentTo", { email: "\u0000" })
                        .split("\u0000")
                        .map((part, i) => (
                            <span key={i}>
                                {i > 0 && <span className="font-semibold text-ink">{email}</span>}
                                {part}
                            </span>
                        ))}
                </p>
            ) : (
                <Field label={t("auth.email")} htmlFor="email">
                    <Input id="email" type="email" icon={Mail} required value={email} readOnly placeholder="you@example.com" />
                </Field>
            )}

            <Field label={t("auth.code")} htmlFor="otp">
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
            {resent && !error && <p className="text-sm text-brand-deep">{t("auth.resent")}</p>}

            <Button type="submit" className="w-full" disabled={busy || otp.length !== 6}>
                {busy ? t("auth.checking") : t("auth.verify")}
            </Button>

            <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={resend} disabled={busy} className="font-semibold text-ink hover:underline disabled:opacity-60">
                    {t("auth.sendNew")}
                </button>
            </div>
        </form>
    );
}