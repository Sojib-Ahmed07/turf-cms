// src/features/admin/components/CouponsManager.jsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Shuffle, Trash2 } from "lucide-react";
import { PageHeader, Panel, Label, Table, Th, Td } from "@/components/admin/Kit";
import StatusBadge from "@/components/admin/StatusBadge";
import { useToast } from "@/components/admin/Toast";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Switch from "@/components/ui/Switch";
import { TextInput, Segmented, Select } from "@/components/ui/Inputs";
import { deleteCoupon, saveCoupon, setCouponActive } from "@/features/admin/actions/coupons";
import { discountLabel, timeWindowLabel } from "@/features/coupons/rules";
import { shortDateLabel } from "@/lib/time";
import { cn, taka, time12 } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Half-hour times on the venue clock, from the earliest opening (dayStart, minutes) round to the next morning. */
function timeOptions(dayStart) {
    const first = Math.floor(dayStart / 30) * 30;
    return Array.from({ length: 48 }, (_, i) => {
        const m = (first + i * 30) % (24 * 60);
        return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    });
}

const EMPTY = {
    id: null,
    code: "",
    type: "percent",
    value: "",
    maxDiscount: "",
    minAmount: "",
    usageLimit: "",
    perUserLimit: "1",
    pitchIds: [],
    days: [],
    from: "",
    to: "",
    startDate: "",
    endDate: "",
    isActive: true,
};
const str = (v) => (v === null || v === undefined ? "" : String(v));
const toDraft = (c) =>
    c
        ? {
            id: c.id,
            code: c.code,
            type: c.type,
            value: str(c.value),
            maxDiscount: str(c.maxDiscount),
            minAmount: str(c.minAmount),
            usageLimit: str(c.usageLimit),
            perUserLimit: str(c.perUserLimit),
            pitchIds: c.pitchIds,
            days: c.days,
            from: c.from,
            to: c.to,
            startDate: c.startDate,
            endDate: c.endDate,
            isActive: c.isActive,
        }
        : EMPTY;

function randomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/** initial: from getCouponsAdmin() -> { coupons, grounds } */
export default function CouponsManager({ initial }) {
    const router = useRouter();
    const { coupons, grounds } = initial;
    const TIMES = useMemo(() => timeOptions(initial.dayStart ?? 360), [initial.dayStart]);
    const [selectedId, setSelectedId] = useState(coupons[0]?.id ?? "new");
    const selected = coupons.find((c) => c.id === selectedId) ?? null;
    const baseline = useMemo(() => toDraft(selected), [selected]);
    const [draft, setDraft] = useState(baseline);
    const [error, setError] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [pending, startTransition] = useTransition();
    const { toast, showToast } = useToast();
    const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

    // After a refresh brings new server data, re-sync the form unless the admin is mid-edit.
    const [lastBaseline, setLastBaseline] = useState(baseline);
    if (baseline !== lastBaseline) {
        setLastBaseline(baseline);
        if (!dirty) setDraft(baseline);
    }

    const set = (patch) => {
        setError("");
        setDraft((d) => ({ ...d, ...patch }));
    };
    const toggleIn = (key, v) => set({ [key]: draft[key].includes(v) ? draft[key].filter((x) => x !== v) : [...draft[key], v] });

    function select(id) {
        if (id === selectedId) return;
        if (dirty && !window.confirm("Discard your unsaved changes to this code?")) return;
        setSelectedId(id);
        setDraft(toDraft(coupons.find((c) => c.id === id) ?? null));
        setError("");
    }

    function save(e) {
        e.preventDefault();
        startTransition(async () => {
            const res = await saveCoupon({ ...draft, days: draft.days.map(Number) });
            if (!res.ok) return setError(res.error);
            setSelectedId(res.data.id);
            setDraft((d) => ({ ...d, id: res.data.id, code: res.data.code }));
            showToast(draft.id ? `${res.data.code} saved` : `${res.data.code} created`);
            router.refresh();
        });
    }

    function toggleActive(c, v) {
        startTransition(async () => {
            const res = await setCouponActive({ id: c.id, isActive: v });
            if (!res.ok) showToast(res.error, "error");
            router.refresh();
        });
    }

    function remove() {
        startTransition(async () => {
            const res = await deleteCoupon(draft.id);
            setConfirmDelete(false);
            if (!res.ok) return showToast(res.error, "error");
            const rest = coupons.filter((c) => c.id !== draft.id);
            setSelectedId(rest[0]?.id ?? "new");
            setDraft(toDraft(rest[0] ?? null));
            showToast("Code deleted");
            router.refresh();
        });
    }

    const preview = draft.value
        ? `${discountLabel({ type: draft.type, value: draft.value, maxDiscount: draft.type === "percent" ? draft.maxDiscount || null : null })}${timeWindowLabel({ days: draft.days, from: draft.from, to: draft.to }) ? `, ${timeWindowLabel({ days: draft.days, from: draft.from, to: draft.to })}` : ""
        }`
        : "Set the discount to see a summary.";

    return (
        <div className="mx-auto max-w-[1280px]">
            <PageHeader
                title="Coupons"
                description="Promo codes players type at checkout. Attach a code to an offer banner to advertise it."
                actions={
                    <Button variant="ink" onClick={() => select("new")}>
                        <Plus className="h-4 w-4" />
                        New code
                    </Button>
                }
            />

            <div className="grid gap-6 xl:grid-cols-12">
                <Panel className="xl:col-span-7" title="All codes" description="A code counts as used once its booking is paid. Codes in a waiting booking are reserved for 15 minutes." bodyClassName="p-0">
                    {coupons.length === 0 ? (
                        <p className="px-6 py-12 text-center text-[14px] text-ink-3">No codes yet. Create your first one on the right.</p>
                    ) : (
                        <Table minWidth={620}>
                            <thead>
                                <tr>
                                    <Th>Code</Th>
                                    <Th>Discount</Th>
                                    <Th>Used</Th>
                                    <Th>Status</Th>
                                    <Th className="text-right">On</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {coupons.map((c) => {
                                    const pct = c.usageLimit ? Math.min(100, Math.round((c.usedCount / c.usageLimit) * 100)) : null;
                                    return (
                                        <tr
                                            key={c.id}
                                            onClick={() => select(c.id)}
                                            className={cn("cursor-pointer", c.id === selectedId ? "bg-chalk" : "hover:bg-chalk/60", !c.isActive && "opacity-60")}
                                        >
                                            <Td>
                                                <span className="rounded-md border border-dashed border-flare bg-flare-soft px-2 py-1 text-[12px] font-bold tracking-wider text-ink tnum">{c.code}</span>
                                                <span className="mt-2 block max-w-[200px] truncate text-[12px] text-ink-3">
                                                    {c.banners.length ? `On: ${c.banners.join(", ")}` : "Not advertised"}
                                                </span>
                                            </Td>
                                            <Td className="font-semibold text-ink">
                                                {c.label}
                                                {c.whenLabel && <span className="block text-[12px] font-normal text-ink-3">{c.whenLabel}</span>}
                                            </Td>
                                            <Td>
                                                <p className="tnum text-ink">
                                                    {c.usedCount}
                                                    {c.usageLimit && <span className="text-ink-3"> / {c.usageLimit}</span>}
                                                </p>
                                                {pct !== null && (
                                                    <span className="mt-1.5 block h-1 w-24 overflow-hidden rounded-full bg-line">
                                                        <span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                                                    </span>
                                                )}
                                                {c.discountGiven > 0 && <span className="mt-1 block text-[12px] text-ink-3">{taka(c.discountGiven)} given</span>}
                                            </Td>
                                            <Td>
                                                <StatusBadge status={c.status} />
                                                <span className="mt-1 block text-[12px] text-ink-3">{c.endDate ? `Until ${shortDateLabel(c.endDate)}` : "No end date"}</span>
                                            </Td>
                                            <Td className="text-right">
                                                <span onClick={(e) => e.stopPropagation()} className="inline-flex">
                                                    <Switch size="sm" checked={c.isActive} onChange={(v) => toggleActive(c, v)} label={`Turn ${c.code} on or off`} />
                                                </span>
                                            </Td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    )}
                </Panel>

                <Panel
                    className="xl:col-span-5"
                    title={draft.id ? `Edit ${baseline.code}` : "New code"}
                    actions={
                        draft.id && (
                            <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setConfirmDelete(true)}>
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                            </Button>
                        )
                    }
                >
                    <form className="space-y-5" onSubmit={save}>
                        <div>
                            <Label htmlFor="c-code">Code</Label>
                            <div className="flex gap-2">
                                <TextInput
                                    id="c-code"
                                    value={draft.code}
                                    onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s/g, "") })}
                                    maxLength={20}
                                    placeholder="e.g. FRIDAY15"
                                    className="flex-1 font-bold uppercase tracking-wider placeholder:font-normal placeholder:normal-case placeholder:tracking-normal"
                                />
                                <Button variant="outline" size="icon" aria-label="Make up a code" onClick={() => set({ code: randomCode() })}>
                                    <Shuffle className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div>
                            <Label>Type</Label>
                            <Segmented
                                value={draft.type}
                                onChange={(v) => set({ type: v })}
                                options={[
                                    { value: "percent", label: "Percentage" },
                                    { value: "fixed", label: "Fixed amount" },
                                ]}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="c-value">{draft.type === "percent" ? "Percent off" : "Taka off"}</Label>
                                <TextInput id="c-value" type="number" min="1" value={draft.value} onChange={(e) => set({ value: e.target.value })} placeholder={draft.type === "percent" ? "15" : "200"} />
                            </div>
                            {draft.type === "percent" ? (
                                <div>
                                    <Label htmlFor="c-max" optional>
                                        Max discount
                                    </Label>
                                    <TextInput id="c-max" type="number" min="1" prefix="৳" value={draft.maxDiscount} onChange={(e) => set({ maxDiscount: e.target.value })} placeholder="No cap" />
                                </div>
                            ) : (
                                <div />
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label htmlFor="c-uses" optional>
                                    Total uses
                                </Label>
                                <TextInput id="c-uses" type="number" min="1" value={draft.usageLimit} onChange={(e) => set({ usageLimit: e.target.value })} placeholder="No limit" />
                            </div>
                            <div>
                                <Label htmlFor="c-per" optional>
                                    Per player
                                </Label>
                                <TextInput id="c-per" type="number" min="1" value={draft.perUserLimit} onChange={(e) => set({ perUserLimit: e.target.value })} placeholder="No limit" />
                            </div>
                            <div>
                                <Label htmlFor="c-min" optional>
                                    Min. price
                                </Label>
                                <TextInput id="c-min" type="number" min="1" value={draft.minAmount} onChange={(e) => set({ minAmount: e.target.value })} placeholder="Any" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="c-start" optional>
                                    Starts
                                </Label>
                                <TextInput id="c-start" type="date" value={draft.startDate} onChange={(e) => set({ startDate: e.target.value })} />
                            </div>
                            <div>
                                <Label htmlFor="c-end" optional>
                                    Ends after
                                </Label>
                                <TextInput id="c-end" type="date" value={draft.endDate} onChange={(e) => set({ endDate: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-3 rounded-ctl bg-chalk p-4">
                            <p className="text-[14px] font-semibold text-ink">
                                Where and when <span className="font-normal text-ink-4">Optional</span>
                            </p>
                            <div>
                                <p className="mb-1.5 text-[12px] font-semibold text-ink-3">Grounds (none picked = every ground)</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {grounds.map((g) => (
                                        <Chip key={g.id} on={draft.pitchIds.includes(g.id)} onClick={() => toggleIn("pitchIds", g.id)}>
                                            {g.name}
                                        </Chip>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="mb-1.5 text-[12px] font-semibold text-ink-3">Days (none picked = every day)</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {DAYS.map((d, i) => (
                                        <Chip key={d} on={draft.days.includes(i)} onClick={() => toggleIn("days", i)}>
                                            {d}
                                        </Chip>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="mb-1.5 text-[12px] font-semibold text-ink-3">Slots starting from</p>
                                    <Select
                                        value={draft.from}
                                        onChange={(e) => set({ from: e.target.value })}
                                        options={[{ value: "", label: "Opening" }, ...TIMES.map((t) => ({ value: t, label: time12(t) }))]}
                                        aria-label="Slots starting from"
                                    />
                                </div>
                                <div>
                                    <p className="mb-1.5 text-[12px] font-semibold text-ink-3">Until</p>
                                    <Select
                                        value={draft.to}
                                        onChange={(e) => set({ to: e.target.value })}
                                        options={[{ value: "", label: "Closing" }, ...TIMES.map((t) => ({ value: t, label: time12(t) }))]}
                                        aria-label="Until"
                                    />
                                </div>
                            </div>
                        </div>

                        <label className="flex items-center justify-between gap-4 rounded-ctl border border-line px-4 py-3">
                            <span>
                                <span className="block text-[14px] font-semibold text-ink">Code is on</span>
                                <span className="block text-[12px] text-ink-3">Switched off codes are refused at checkout and hidden from banners.</span>
                            </span>
                            <Switch checked={draft.isActive} onChange={(v) => set({ isActive: v })} label="Code is on" />
                        </label>

                        <p className="rounded-ctl bg-brand-soft px-4 py-3 text-[13px] font-semibold text-brand-deep">{preview}</p>

                        {error && <p className="rounded-ctl bg-danger-soft px-4 py-3 text-[14px] font-medium text-danger">{error}</p>}

                        <div className="flex justify-end gap-2 border-t border-line pt-5">
                            <Button
                                variant="outline"
                                disabled={pending || !dirty}
                                onClick={() => {
                                    setDraft(baseline);
                                    setError("");
                                }}
                            >
                                Discard
                            </Button>
                            <Button type="submit" disabled={pending || (!dirty && Boolean(draft.id))}>
                                {pending ? "Saving…" : draft.id ? "Save code" : "Create code"}
                            </Button>
                        </div>
                    </form>
                </Panel>
            </div>

            <Dialog
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                size="sm"
                title={`Delete ${baseline.code}?`}
                description="Only codes nobody has used can be deleted. Banners showing it will stop showing a code."
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                            Keep it
                        </Button>
                        <Button variant="ink" className="bg-danger hover:bg-danger" disabled={pending} onClick={remove}>
                            Delete code
                        </Button>
                    </>
                }
            />
            {toast}
        </div>
    );
}

function Chip({ on, onClick, children }) {
    return (
        <button
            type="button"
            aria-pressed={on}
            onClick={onClick}
            className={cn(
                "rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                on ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-line hover:ring-ink-4"
            )}
        >
            {children}
        </button>
    );
}