// src/features/profile/components/ProfileClient.jsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Check, Lock, LogOut, Mail, Phone, ShieldCheck, Trophy, User as UserIcon } from "lucide-react";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { authClient, signOut, useSession } from "@/lib/auth-client";
import { updateProfile } from "@/features/profile/actions";
import { cn } from "@/lib/utils";

const ROLE_LABEL = { admin: "Admin", editor: "Editor" };

/**
 * props:
 *   user        { name, email, phone, image, role, joined: "October 2026" }
 *   hasPassword signed up with email + password (can change it here)
 *   hasGoogle   has a linked Google account
 *   counts      { upcoming, played }
 */
export default function ProfileClient({ user, hasPassword, hasGoogle, counts }) {
    const router = useRouter();
    const { refetch } = useSession();
    const [details, setDetails] = useState({ name: user.name, phone: user.phone });
    const [saved, setSaved] = useState({ name: user.name, phone: user.phone });
    const [detailsMsg, setDetailsMsg] = useState(null); // { ok, text }
    const [pending, startTransition] = useTransition();
    const [signingOut, setSigningOut] = useState(false);

    const dirty = details.name !== saved.name || details.phone !== saved.phone;
    const set = (k) => (e) => {
        setDetailsMsg(null);
        setDetails((d) => ({ ...d, [k]: e.target.value }));
    };

    function saveDetails(e) {
        e.preventDefault();
        startTransition(async () => {
            const res = await updateProfile(details);
            if (!res.ok) {
                setDetailsMsg({ ok: false, text: res.error });
                return;
            }
            const next = { name: res.data.name, phone: res.data.phone };
            setDetails(next);
            setSaved(next);
            setDetailsMsg({ ok: true, text: "Saved" });
            refetch?.(); // the navbar shows the new name
            router.refresh();
        });
    }

    async function onSignOut() {
        setSigningOut(true);
        await signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push("/");
                    router.refresh();
                },
                onError: () => setSigningOut(false),
            },
        });
    }

    const initial = (saved.name?.trim()?.[0] ?? user.email[0] ?? "?").toUpperCase();

    return (
        <div className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
            <header className="flex items-center gap-5">
                <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-pitch text-[24px] font-bold text-white sm:h-20 sm:w-20 sm:text-[28px]">
                    {user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                        initial
                    )}
                </span>
                <div className="min-w-0">
                    <h1 className="display truncate text-[clamp(32px,5vw,56px)] text-ink">{saved.name || "Your profile"}</h1>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-ink-3">
                        <span>Member since {user.joined}</span>
                        {ROLE_LABEL[user.role] && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-0.5 text-[12px] font-semibold text-white">
                                <ShieldCheck className="h-3 w-3" />
                                {ROLE_LABEL[user.role]}
                            </span>
                        )}
                    </p>
                </div>
            </header>

            <div className="mt-10 grid gap-6 lg:grid-cols-12">
                {/* Details */}
                <section className="rounded-card bg-white p-6 ring-1 ring-line sm:p-8 lg:col-span-7">
                    <h2 className="text-[19px] font-semibold text-ink">Your details</h2>
                    <p className="mt-1 text-[14px] text-ink-3">We use these on your tickets and to reach you about a booking.</p>
                    <form onSubmit={saveDetails} className="mt-6 space-y-4">
                        <Field label="Name" htmlFor="p-name">
                            <Input id="p-name" icon={UserIcon} required maxLength={60} autoComplete="name" value={details.name} onChange={set("name")} />
                        </Field>
                        <Field label="Mobile" htmlFor="p-phone" hint="Bangladeshi number, e.g. 01712345678.">
                            <Input
                                id="p-phone"
                                icon={Phone}
                                inputMode="tel"
                                autoComplete="tel"
                                maxLength={20}
                                value={details.phone}
                                onChange={set("phone")}
                                placeholder="01XXXXXXXXX"
                            />
                        </Field>
                        <Field label="Email" htmlFor="p-email" hint="Your email is your sign-in, so it can't be changed here.">
                            <Input id="p-email" icon={Mail} value={user.email} readOnly disabled className="bg-chalk text-ink-3" />
                        </Field>
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <Button type="submit" disabled={!dirty || pending}>
                                {pending ? "Saving…" : "Save details"}
                            </Button>
                            {dirty && !pending && (
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setDetails(saved);
                                        setDetailsMsg(null);
                                    }}
                                >
                                    Discard
                                </Button>
                            )}
                            {detailsMsg && (
                                <p
                                    role="status"
                                    className={cn(
                                        "inline-flex items-center gap-1.5 text-[14px] font-medium",
                                        detailsMsg.ok ? "text-brand-deep" : "text-danger"
                                    )}
                                >
                                    {detailsMsg.ok && <Check className="h-4 w-4" />}
                                    {detailsMsg.text}
                                </p>
                            )}
                        </div>
                    </form>
                </section>

                {/* Summary + account */}
                <div className="space-y-6 lg:col-span-5">
                    <section className="rounded-card bg-pitch p-6 text-white sm:p-8">
                        <div className="grid grid-cols-2 gap-4">
                            <Stat icon={CalendarCheck} value={counts.upcoming} label={counts.upcoming === 1 ? "Upcoming game" : "Upcoming games"} />
                            <Stat icon={Trophy} value={counts.played} label={counts.played === 1 ? "Game played" : "Games played"} />
                        </div>
                        <div className="mt-6 flex flex-wrap gap-2">
                            <Button href="/bookings" variant="white" size="sm">
                                My bookings
                            </Button>
                            <Button href="/book" variant="outline-light" size="sm">
                                Book a slot
                            </Button>
                            {ROLE_LABEL[user.role] && (
                                <Button href="/admin" variant="outline-light" size="sm">
                                    Admin panel
                                </Button>
                            )}
                        </div>
                    </section>

                    <PasswordCard hasPassword={hasPassword} hasGoogle={hasGoogle} />

                    <Button variant="outline" className="w-full" disabled={signingOut} onClick={onSignOut}>
                        <LogOut className="h-4 w-4" />
                        {signingOut ? "Signing out…" : "Sign out"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function Stat({ icon: Icon, value, label }) {
    return (
        <div>
            <Icon className="h-5 w-5 text-white/50" />
            <p className="display mt-2 text-[40px] leading-none tnum">{value}</p>
            <p className="mt-1 text-[13px] text-white/60">{label}</p>
        </div>
    );
}

const PASSWORD_ERRORS = {
    INVALID_PASSWORD: "Your current password isn't right.",
    PASSWORD_TOO_SHORT: "Use at least 8 characters for the new password.",
    PASSWORD_TOO_LONG: "That password is too long.",
};

function PasswordCard({ hasPassword, hasGoogle }) {
    const [form, setForm] = useState({ current: "", next: "", confirm: "" });
    const [msg, setMsg] = useState(null); // { ok, text }
    const [busy, setBusy] = useState(false);

    if (!hasPassword) {
        return (
            <section className="rounded-card bg-white p-6 ring-1 ring-line sm:p-8">
                <h2 className="text-[19px] font-semibold text-ink">Password</h2>
                <p className="mt-2 text-[14px] text-ink-3">
                    {hasGoogle ? "You sign in with Google, so there's no password to change here." : "Your account has no password."}
                </p>
            </section>
        );
    }

    const set = (k) => (e) => {
        setMsg(null);
        setForm((f) => ({ ...f, [k]: e.target.value }));
    };

    async function submit(e) {
        e.preventDefault();
        if (form.next.length < 8) return setMsg({ ok: false, text: PASSWORD_ERRORS.PASSWORD_TOO_SHORT });
        if (form.next !== form.confirm) return setMsg({ ok: false, text: "The new passwords don't match." });
        setBusy(true);
        const { error } = await authClient.changePassword({
            currentPassword: form.current,
            newPassword: form.next,
            revokeOtherSessions: true,
        });
        setBusy(false);
        if (error) {
            setMsg({ ok: false, text: PASSWORD_ERRORS[error.code] ?? error.message ?? "Couldn't change the password. Try again." });
            return;
        }
        setForm({ current: "", next: "", confirm: "" });
        setMsg({ ok: true, text: "Password changed. Other devices were signed out." });
    }

    return (
        <section className="rounded-card bg-white p-6 ring-1 ring-line sm:p-8">
            <h2 className="text-[19px] font-semibold text-ink">Change password</h2>
            <form onSubmit={submit} className="mt-5 space-y-4">
                <Field label="Current password" htmlFor="pw-current">
                    <Input id="pw-current" type="password" icon={Lock} required autoComplete="current-password" value={form.current} onChange={set("current")} />
                </Field>
                <Field label="New password" htmlFor="pw-new" hint="At least 8 characters.">
                    <Input id="pw-new" type="password" icon={Lock} required autoComplete="new-password" value={form.next} onChange={set("next")} />
                </Field>
                <Field label="Repeat new password" htmlFor="pw-confirm">
                    <Input id="pw-confirm" type="password" icon={Lock} required autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
                </Field>
                {msg && (
                    <p role="status" className={cn("text-[14px] font-medium", msg.ok ? "text-brand-deep" : "text-danger")}>
                        {msg.text}
                    </p>
                )}
                <Button type="submit" variant="ink" disabled={busy || !form.current || !form.next}>
                    {busy ? "Changing…" : "Change password"}
                </Button>
            </form>
        </section>
    );
}