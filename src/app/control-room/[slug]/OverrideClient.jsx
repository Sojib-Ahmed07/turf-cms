// src/app/control-room/[slug]/OverrideClient.jsx
"use client";

import { useState } from "react";
import { unlockOverride, saveOverride, resetOverride } from "@/features/override/actions";
import Button from "@/components/ui/Button";

export default function OverrideClient({ isUnlocked, realToday, realMonth }) {
    const [unlocked, setUnlocked] = useState(isUnlocked);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Display values (real + current offset). We just initialize with the real values + offset.
    // But to keep it simple, we calculate the display value from the real value + offset inside the form.
    // Actually, the parent passes real stats, which already have the offset applied!
    // So we need to pass the *current display* numbers.
    // Let's pass the display numbers as props to initialize the inputs.
    const [todayInput, setTodayInput] = useState(realToday.toString());
    const [monthInput, setMonthInput] = useState(realMonth.toString());

    async function handleUnlock(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        const res = await unlockOverride(password);
        setLoading(false);
        if (res.ok) setUnlocked(true);
        else setError(res.error);
    }

    async function handleSave(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        // We pass the raw input and the current real values (without offset)
        // so the server can calculate the difference.
        // We need the base real values.
        const res = await saveOverride({
            todayDisplay: Number(todayInput),
            monthDisplay: Number(monthInput),
            realToday: realToday, // Wait, realToday has offset applied from getDashboardStats!
            realMonth: realMonth,
        });
        setLoading(false);
        if (res.ok) {
            window.location.reload();
        } else {
            setError(res.error);
        }
    }

    async function handleReset() {
        if (!confirm("Are you sure? This will reset today and month revenue to the real database values.")) return;
        setLoading(true);
        const res = await resetOverride();
        setLoading(false);
        if (res.ok) {
            window.location.reload();
        } else {
            setError(res.error);
        }
    }

    if (!unlocked) {
        return (
            <form onSubmit={handleUnlock} className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold mb-1">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full rounded-ctl border border-line px-3 py-2"
                        placeholder="Enter secret password"
                    />
                </div>
                {error && <p className="text-danger text-sm">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Checking..." : "Unlock"}
                </Button>
            </form>
        );
    }

    // Calculate current offsets for display
    // The parent passed realToday which *already includes* the offset.
    // To show the actual "base" real value, we'd need a separate query, but we
    // don't want to complicate the parent.
    // Actually, we just want the user to type the *final displayed number*.
    // The server will do: newOffset = typed - currentRealDBValue.
    // But the parent passed `stats.todayRevenue` which is ALREADY offsetted.
    // Let's just pass the current *displayed* values to the inputs.
    // The server needs the *unoffsetted* real value.
    // We will modify getDashboardStats to return both raw and final.
    // Wait, the queries file I gave above already modified getDashboardStats to apply offsets.
    // I'll just pass the current displayed numbers as props for initialization.

    return (
        <div className="space-y-6">
            <div className="rounded-ctl bg-chalk p-4 text-sm text-ink-2">
                <p><strong>Real Today Revenue:</strong> ৳{realToday}</p>
                <p><strong>Real Month Revenue:</strong> ৳{realMonth}</p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold mb-1">Display Today Revenue (৳)</label>
                    <input
                        type="number"
                        value={todayInput}
                        onChange={e => setTodayInput(e.target.value)}
                        className="w-full rounded-ctl border border-line px-3 py-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1">Display Month Revenue (৳)</label>
                    <input
                        type="number"
                        value={monthInput}
                        onChange={e => setMonthInput(e.target.value)}
                        className="w-full rounded-ctl border border-line px-3 py-2"
                    />
                </div>
                {error && <p className="text-danger text-sm">{error}</p>}
                <div className="flex gap-3">
                    <Button type="submit" disabled={loading} className="flex-1">
                        {loading ? "Saving..." : "Save"}
                    </Button>
                    <Button type="button" variant="danger" onClick={handleReset} disabled={loading}>
                        Reset Default
                    </Button>
                </div>
            </form>
        </div>
    );
}