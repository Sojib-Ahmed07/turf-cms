// src/components/auth/AuthForms.jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

export function GoogleButton({ label = "Continue with Google" }) {
    return (
        <button
            type="button"
            className="flex h-12 w-full items-center justify-center gap-3 rounded-full bg-white text-[15px] font-semibold text-ink ring-1 ring-line transition hover:ring-ink-4"
        >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
                <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.8h3.6c2.1-1.9 3.3-4.8 3.3-8.1Z" />
                <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23Z" />
                <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 10l3.7-2.9Z" />
                <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4Z" />
            </svg>
            {label}
        </button>
    );
}

function Divider() {
    return (
        <div className="my-6 flex items-center gap-4 text-[13px] text-ink-4">
            <span className="h-px flex-1 bg-line" />
            or with email
            <span className="h-px flex-1 bg-line" />
        </div>
    );
}

function PasswordInput(props) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <Input icon={Lock} type={show ? "text" : "password"} className="pr-12" {...props} />
            <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:bg-chalk hover:text-ink"
            >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
        </div>
    );
}

export function LoginForm() {
    return (
        <form onSubmit={(e) => e.preventDefault()}>
            <GoogleButton />
            <Divider />
            <div className="space-y-4">
                <Field label="Email" htmlFor="email">
                    <Input id="email" type="email" icon={Mail} placeholder="you@example.com" autoComplete="email" />
                </Field>
                <Field label="Password" htmlFor="password">
                    <PasswordInput id="password" placeholder="Your password" autoComplete="current-password" />
                </Field>
                <div className="flex justify-end">
                    <Link href="/forgot-password" className="text-[13px] font-semibold text-brand-deep hover:underline">
                        Forgot password?
                    </Link>
                </div>
            </div>
            <Button type="submit" size="lg" className="mt-6 h-13 w-full">
                Sign in
            </Button>
        </form>
    );
}

export function RegisterForm() {
    return (
        <form onSubmit={(e) => e.preventDefault()}>
            <GoogleButton label="Sign up with Google" />
            <Divider />
            <div className="space-y-4">
                <Field label="Full name" htmlFor="name">
                    <Input id="name" icon={User} placeholder="Rafi Ahmed" autoComplete="name" />
                </Field>
                <Field label="Mobile number" htmlFor="phone" hint="We text your booking ticket here.">
                    <Input id="phone" type="tel" icon={Phone} placeholder="01XXX-XXXXXX" autoComplete="tel" />
                </Field>
                <Field label="Email" htmlFor="email">
                    <Input id="email" type="email" icon={Mail} placeholder="you@example.com" autoComplete="email" />
                </Field>
                <Field label="Password" htmlFor="password" hint="At least 8 characters.">
                    <PasswordInput id="password" placeholder="Create a password" autoComplete="new-password" />
                </Field>
            </div>
            <Button type="submit" size="lg" className="mt-6 h-13 w-full">
                Create account
            </Button>
            <p className="mt-4 text-center text-[12px] leading-relaxed text-ink-3">
                By creating an account you agree to the{" "}
                <Link href="/terms" className="font-semibold text-ink-2 underline underline-offset-2">
                    booking terms
                </Link>
                .
            </p>
        </form>
    );
}
