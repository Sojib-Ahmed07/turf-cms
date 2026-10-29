// src/components/auth/ForgotPasswordForm.jsx
"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Field, Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { KeyRound, Lock, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { safeNext } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nProvider";
import { authMessage } from "./AuthForms";

/**
 * Two steps: email -> code + new password (Better Auth emailOTP "forget-password").
 * The request step always says "sent" (even for unknown emails), so it can't be used to find accounts.
 */
export function ForgotPasswordForm({ initialEmail = "" }) {
    const { t } = useI18n();
    const fromAuth = (err, fallback) => authMessage(err, fallback);
    const router = useRouter();
    const params = useSearchParams();
    const next = safeNext(params.get("next"));
    const [step, setStep] = useState("email");
    const [email, setEmail] = useState(initialEmail);
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    async function sendCode(e) {
        e?.preventDefault();
        setError("");
        setNote("");
        setBusy(true);
        const { error: err } = await authClient.emailOtp.requestPasswordReset({ email: email.trim() });
        setBusy(false);
        if (err) {
            setError(fromAuth(err, t("auth.sendFailed")));
            return;
        }
        setStep("reset");
        setNote(t("auth.codeSent", { email: email.trim() }));
    }

    async function reset(e) {
        e.preventDefault();
        setError("");
        setBusy(true);
        const { error: err } = await authClient.emailOtp.resetPassword({ email: email.trim(), otp, password });
        if (err) {
            setBusy(false);
            setError(fromAuth(err, t("auth.resetFailed")));
            return;
        }
        // Every session was signed out by the reset; sign in with the new password straight away.
        const { error: signInErr } = await authClient.signIn.email({ email: email.trim(), password });
        setBusy(false);
        if (signInErr) {
            router.push(`/login?next=${encodeURIComponent(next)}`);
            return;
        }
        router.push(next);
        router.refresh();
    }

    if (step === "email") {
        return (
            <form onSubmit={sendCode} className="space-y-4">
                <Field label={t("auth.email")} htmlFor="email">
                    <Input
                        id="email"
                        type="email"
                        icon={Mail}
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                    />
                </Field>
                {error && <p className="text-sm text-danger">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy || !email.trim()}>
                    {busy ? t("auth.sending") : t("auth.emailCode")}
                </Button>
            </form>
        );
    }

    return (
        <form onSubmit={reset} className="space-y-4">
            {note && <p className="text-sm text-ink-3">{note}</p>}
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
            <Field label={t("auth.newPassword")} htmlFor="password" hint={t("auth.passwordHint")}>
                <Input
                    id="password"
                    type="password"
                    icon={Lock}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                />
            </Field>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || otp.length !== 6 || password.length < 8}>
                {busy ? t("auth.saving") : t("auth.resetAndSignIn")}
            </Button>
            <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={sendCode} disabled={busy} className="font-semibold text-ink hover:underline disabled:opacity-60">
                    {t("auth.sendNew")}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setStep("email");
                        setOtp("");
                        setError("");
                        setNote("");
                    }}
                    className="text-ink-3 hover:underline"
                >
                    {t("auth.otherEmail")}
                </button>
            </div>
        </form>
    );
}