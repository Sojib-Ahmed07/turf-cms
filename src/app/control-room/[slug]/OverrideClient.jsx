// src/app/control-room/[slug]/OverrideClient.jsx
"use client";

import { useState } from "react";
import { unlockOverride, saveOverride, resetOverride } from "@/features/override/actions";
import Button from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Inputs";
import { taka } from "@/lib/utils";

/**
 * realToday / realMonth: paid revenue from the database (no offsets).
 * shownToday / shownMonth: what /admin shows now (real + saved offsets); the boxes start with these.
 */
export default function OverrideClient({ isUnlocked, realToday, realMonth, shownToday, shownMonth }) {
    const [unlocked, setUnlocked] = useState(isUnlocked);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [todayInput, setTodayInput] = useState(String(shownToday));
    const [monthInput, setMonthInput] = useState(String(shownMonth));

    async function run(fn) {
        setLoading(true);
        setError("");
        try {
            const res = await fn();
            if (!res.ok) setError(res.error);
            return res;
        } catch {
            setError("কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।");
            return { ok: false };
        } finally {
            setLoading(false);
        }
    }

    async function handleUnlock(e) {
        e.preventDefault();
        const res = await run(() => unlockOverride(password));
        if (res.ok) setUnlocked(true);
    }

    async function handleSave(e) {
        e.preventDefault();
        const res = await run(() => saveOverride({ todayDisplay: Number(todayInput), monthDisplay: Number(monthInput) }));
        if (res.ok) window.location.reload();
    }

    async function handleReset() {
        const res = await run(() => resetOverride());
        if (res.ok) window.location.reload();
    }

    if (!unlocked) {
        return (
            <form onSubmit={handleUnlock} className="space-y-4">
                <div>
                    <label htmlFor="ov-pass" className="mb-1.5 block text-[13px] font-semibold text-ink">
                        পাসওয়ার্ড
                    </label>
                    <TextInput
                        id="ov-pass"
                        type="password"
                        autoComplete="off"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="গোপন পাসওয়ার্ড লিখুন"
                    />
                </div>
                {error && <p className="text-[13px] font-medium text-danger">{error}</p>}
                <Button type="submit" disabled={loading || !password} className="w-full">
                    {loading ? "যাচাই হচ্ছে…" : "খুলুন"}
                </Button>
            </form>
        );
    }

    return (
        <div className="space-y-6">
            <div className="space-y-1 rounded-ctl bg-chalk p-4 text-[14px] text-ink-2">
                <p>
                    আজকের আসল আয়: <strong className="text-ink tnum">{taka(realToday)}</strong>
                </p>
                <p>
                    এই মাসের আসল আয়: <strong className="text-ink tnum">{taka(realMonth)}</strong>
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label htmlFor="ov-today" className="mb-1.5 block text-[13px] font-semibold text-ink">
                        ড্যাশবোর্ডে আজকের আয় দেখাবে
                    </label>
                    <TextInput id="ov-today" type="number" min="0" step="1" prefix="৳" value={todayInput} onChange={(e) => setTodayInput(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="ov-month" className="mb-1.5 block text-[13px] font-semibold text-ink">
                        ড্যাশবোর্ডে এই মাসের আয় দেখাবে
                    </label>
                    <TextInput id="ov-month" type="number" min="0" step="1" prefix="৳" value={monthInput} onChange={(e) => setMonthInput(e.target.value)} />
                </div>
                {error && <p className="text-[13px] font-medium text-danger">{error}</p>}

                {confirmReset ? (
                    <div className="rounded-ctl bg-danger-soft p-4">
                        <p className="text-[13px] font-medium text-danger">দুটো সংখ্যাই আবার আসল আয়ে ফিরে যাবে। নিশ্চিত?</p>
                        <div className="mt-3 flex gap-2">
                            <Button type="button" variant="ink" size="sm" onClick={handleReset} disabled={loading}>
                                {loading ? "হচ্ছে…" : "হ্যাঁ, আগের মতো করুন"}
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmReset(false)} disabled={loading}>
                                না
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button type="submit" disabled={loading} className="flex-1">
                            {loading ? "সেভ হচ্ছে…" : "সেভ করুন"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setConfirmReset(true)} disabled={loading}>
                            আসল আয়ে ফিরুন
                        </Button>
                    </div>
                )}
            </form>
        </div>
    );
}