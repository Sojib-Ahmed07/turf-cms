// src/components/auth/AuthForms.jsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Field, Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { Mail, Lock, User as UserIcon, Phone, KeyRound } from "lucide-react";
import { signIn, signUp, authClient } from "@/lib/auth-client";
import { safeNext } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nProvider";

/**
 * Better Auth's own messages are English, so show our Bangla text instead. Messages written in Bangla
 * (our sign-up checks in lib/auth.js, e.g. the phone number hint) are shown as they are.
 */
export function authMessage(err, fallback) {
    return err?.message && /[\u0980-\u09FF]/.test(err.message) ? err.message : fallback;
}

function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
            <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
        </svg>
    );
}

export function GoogleButton({ label }) {
    const { t } = useI18n();
    const [busy, setBusy] = useState(false);
    const params = useSearchParams();
    const next = safeNext(params.get("next"));

    async function onClick() {
        setBusy(true);
        await signIn.social({ provider: "google", callbackURL: next });
    }

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={busy}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-ctl border border-line bg-paper text-sm font-semibold text-ink hover:bg-grass disabled:opacity-60"
        >
            <GoogleIcon />
            {busy ? t("auth.redirecting") : label || t("auth.google")}
        </button>
    );
}

export function LoginForm() {
    const { t } = useI18n();
    const router = useRouter();
    const params = useSearchParams();
    const next = safeNext(params.get("next"));
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setError("");
        setBusy(true);
        const { error: err } = await signIn.email({ email, password });
        setBusy(false);
        if (err) {
            setError(authMessage(err, t("auth.signInFailed")));
            return;
        }
        router.push(next);
        router.refresh();
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
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
            <Field
                label={t("auth.password")}
                htmlFor="password"
                hint={
                    <Link
                        href={`/forgot-password?next=${encodeURIComponent(next)}${email ? `&email=${encodeURIComponent(email)}` : ""}`}
                        className="font-semibold text-ink hover:underline"
                    >
                        {t("auth.forgot")}
                    </Link>
                }
            >
                <Input
                    id="password"
                    type="password"
                    icon={Lock}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                />
            </Field>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
                {busy ? t("auth.signingIn") : t("auth.signIn")}
            </Button>
            <div className="relative py-1 text-center text-xs text-ink-3 before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-line">
                <span className="relative bg-chalk px-3">{t("auth.or")}</span>
            </div>
            <GoogleButton />
        </form>
    );
}

export function RegisterForm() {
    const { t } = useI18n();
    const router = useRouter();
    const params = useSearchParams();
    const next = safeNext(params.get("next"));
    const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    function set(k) {
        return (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    }

    async function onSubmit(e) {
        e.preventDefault();
        setError("");
        setBusy(true);
        const { error: err } = await signUp.email({
            name: form.name,
            email: form.email,
            password: form.password,
            phone: form.phone,
        });
        setBusy(false);
        if (err) {
            setError(authMessage(err, t("auth.registerFailed")));
            return;
        }
        // Account created and signed in (autoSignIn). Send the first OTP and
        // go to /verify-email so the player can enter it.
        const sent = await authClient.emailOtp.sendVerificationOtp({
            email: form.email,
            type: "email-verification",
        });
        if (sent.error) {
            // Account exists; they can resend from /verify-email.
            router.push(`/verify-email?email=${encodeURIComponent(form.email)}&next=${encodeURIComponent(next)}`);
            router.refresh();
            return;
        }
        router.push(`/verify-email?email=${encodeURIComponent(form.email)}&next=${encodeURIComponent(next)}`);
        router.refresh();
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <Field label={t("auth.name")} htmlFor="name">
                <Input id="name" icon={UserIcon} required value={form.name} onChange={set("name")} placeholder={t("auth.namePlaceholder")} />
            </Field>
            <Field label={t("auth.mobile")} htmlFor="phone">
                <Input id="phone" icon={Phone} required value={form.phone} onChange={set("phone")} placeholder="01XXXXXXXXX" />
            </Field>
            <Field label={t("auth.email")} htmlFor="email">
                <Input id="email" type="email" icon={Mail} required autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
            </Field>
            <Field label={t("auth.password")} htmlFor="password" hint={t("auth.passwordHint")}>
                <Input id="password" type="password" icon={Lock} required autoComplete="new-password" value={form.password} onChange={set("password")} placeholder="••••••••" />
            </Field>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
                {busy ? t("auth.creating") : t("auth.createAccount")}
            </Button>
            <div className="relative py-1 text-center text-xs text-ink-3 before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-line">
                <span className="relative bg-chalk px-3">{t("auth.or")}</span>
            </div>
            <GoogleButton label={t("auth.googleSignUp")} />
        </form>
    );
}