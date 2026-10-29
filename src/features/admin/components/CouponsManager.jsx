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
import { BN } from "@/i18n/format";

const DAYS = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];
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
        if (dirty && !window.confirm("এই কোডে করা পরিবর্তনগুলো সেভ হয়নি। বাদ দেবেন?")) return;
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
            showToast(draft.id ? `${res.data.code} সেভ হয়েছে` : `${res.data.code} তৈরি হয়েছে`);
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
            showToast("কোড মুছে ফেলা হয়েছে");
            router.refresh();
        });
    }

    const preview = draft.value
        ? `${discountLabel({ type: draft.type, value: draft.value, maxDiscount: draft.type === "percent" ? draft.maxDiscount || null : null })}${timeWindowLabel({ days: draft.days, from: draft.from, to: draft.to }) ? `, ${timeWindowLabel({ days: draft.days, from: draft.from, to: draft.to })}` : ""
        }`
        : "সারসংক্ষেপ দেখতে ছাড়ের পরিমাণ লিখুন।";

    return (
        <div className="mx-auto max-w-[1280px]">
            <PageHeader
                title="কুপন"
                description="পেমেন্টের সময় খেলোয়াড়রা যে প্রোমো কোড লেখেন। প্রচারের জন্য কোডটি কোনো অফার ব্যানারে যোগ করুন।"
                actions={
                    <Button variant="ink" onClick={() => select("new")}>
                        <Plus className="h-4 w-4" />
                        নতুন কোড
                    </Button>
                }
            />

            <div className="grid gap-6 xl:grid-cols-12">
                <Panel className="xl:col-span-7" title="সব কোড" description="বুকিংয়ের পেমেন্ট হলে তবেই কোড ব্যবহার হয়েছে ধরা হয়। কেউ কোড দিয়ে পেমেন্ট পেজে থাকলে সেই ব্যবহারটি তার জন্য আলাদা রাখা হয়।" bodyClassName="p-0">
                    {coupons.length === 0 ? (
                        <p className="px-6 py-12 text-center text-[14px] text-ink-3">এখনো কোনো কোড নেই। ডান পাশ থেকে প্রথম কোডটি তৈরি করুন।</p>
                    ) : (
                        <Table minWidth={620}>
                            <thead>
                                <tr>
                                    <Th>কোড</Th>
                                    <Th>ছাড়</Th>
                                    <Th>ব্যবহার</Th>
                                    <Th>অবস্থা</Th>
                                    <Th className="text-right">চালু</Th>
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
                                                    {c.banners.length ? `ব্যানারে: ${c.banners.join(", ")}` : "কোনো ব্যানারে নেই"}
                                                </span>
                                            </Td>
                                            <Td className="font-semibold text-ink">
                                                {c.label}
                                                {c.whenLabel && <span className="block text-[12px] font-normal text-ink-3">{c.whenLabel}</span>}
                                            </Td>
                                            <Td>
                                                <p className="tnum text-ink">
                                                    {BN.digits(c.usedCount)}
                                                    {c.usageLimit && <span className="text-ink-3"> / {BN.digits(c.usageLimit)}</span>}
                                                </p>
                                                {pct !== null && (
                                                    <span className="mt-1.5 block h-1 w-24 overflow-hidden rounded-full bg-line">
                                                        <span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                                                    </span>
                                                )}
                                                {c.discountGiven > 0 && <span className="mt-1 block text-[12px] text-ink-3">{taka(c.discountGiven)} ছাড় দেওয়া হয়েছে</span>}
                                            </Td>
                                            <Td>
                                                <StatusBadge status={c.status} />
                                                <span className="mt-1 block text-[12px] text-ink-3">{c.endDate ? `${shortDateLabel(c.endDate)} পর্যন্ত` : "শেষ তারিখ নেই"}</span>
                                            </Td>
                                            <Td className="text-right">
                                                <span onClick={(e) => e.stopPropagation()} className="inline-flex">
                                                    <Switch size="sm" checked={c.isActive} onChange={(v) => toggleActive(c, v)} label={`${c.code} চালু বা বন্ধ করুন`} />
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
                    title={draft.id ? `${baseline.code} এডিট করুন` : "নতুন কোড"}
                    actions={
                        draft.id && (
                            <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setConfirmDelete(true)}>
                                <Trash2 className="h-3.5 w-3.5" />
                                মুছে ফেলুন
                            </Button>
                        )
                    }
                >
                    <form className="space-y-5" onSubmit={save}>
                        <div>
                            <Label htmlFor="c-code">কোড</Label>
                            <div className="flex gap-2">
                                <TextInput
                                    id="c-code"
                                    value={draft.code}
                                    onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s/g, "") })}
                                    maxLength={20}
                                    placeholder="যেমন FRIDAY15"
                                    className="flex-1 font-bold uppercase tracking-wider placeholder:font-normal placeholder:normal-case placeholder:tracking-normal"
                                />
                                <Button variant="outline" size="icon" aria-label="নিজে থেকে একটি কোড বানান" onClick={() => set({ code: randomCode() })}>
                                    <Shuffle className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div>
                            <Label>ধরন</Label>
                            <Segmented
                                value={draft.type}
                                onChange={(v) => set({ type: v })}
                                options={[
                                    { value: "percent", label: "শতকরা" },
                                    { value: "fixed", label: "নির্দিষ্ট টাকা" },
                                ]}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="c-value">{draft.type === "percent" ? "কত শতাংশ ছাড়" : "কত টাকা ছাড়"}</Label>
                                <TextInput id="c-value" type="number" min="1" value={draft.value} onChange={(e) => set({ value: e.target.value })} placeholder={draft.type === "percent" ? "15" : "200"} />
                            </div>
                            {draft.type === "percent" ? (
                                <div>
                                    <Label htmlFor="c-max" optional>
                                        সর্বোচ্চ ছাড়
                                    </Label>
                                    <TextInput id="c-max" type="number" min="1" prefix="৳" value={draft.maxDiscount} onChange={(e) => set({ maxDiscount: e.target.value })} placeholder="সীমা নেই" />
                                </div>
                            ) : (
                                <div />
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label htmlFor="c-uses" optional>
                                    মোট কতবার
                                </Label>
                                <TextInput id="c-uses" type="number" min="1" value={draft.usageLimit} onChange={(e) => set({ usageLimit: e.target.value })} placeholder="সীমা নেই" />
                            </div>
                            <div>
                                <Label htmlFor="c-per" optional>
                                    প্রতিজন কতবার
                                </Label>
                                <TextInput id="c-per" type="number" min="1" value={draft.perUserLimit} onChange={(e) => set({ perUserLimit: e.target.value })} placeholder="সীমা নেই" />
                            </div>
                            <div>
                                <Label htmlFor="c-min" optional>
                                    স্লটের সর্বনিম্ন দাম
                                </Label>
                                <TextInput id="c-min" type="number" min="1" value={draft.minAmount} onChange={(e) => set({ minAmount: e.target.value })} placeholder="যেকোনো" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="c-start" optional>
                                    শুরুর তারিখ
                                </Label>
                                <TextInput id="c-start" type="date" value={draft.startDate} onChange={(e) => set({ startDate: e.target.value })} />
                            </div>
                            <div>
                                <Label htmlFor="c-end" optional>
                                    শেষ তারিখ
                                </Label>
                                <TextInput id="c-end" type="date" value={draft.endDate} onChange={(e) => set({ endDate: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-3 rounded-ctl bg-chalk p-4">
                            <p className="text-[14px] font-semibold text-ink">
                                কোথায় ও কখন <span className="font-normal text-ink-4">ঐচ্ছিক</span>
                            </p>
                            <div>
                                <p className="mb-1.5 text-[12px] font-semibold text-ink-3">মাঠ (কিছু সিলেক্ট না করলে সব মাঠ)</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {grounds.map((g) => (
                                        <Chip key={g.id} on={draft.pitchIds.includes(g.id)} onClick={() => toggleIn("pitchIds", g.id)}>
                                            {g.name}
                                        </Chip>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="mb-1.5 text-[12px] font-semibold text-ink-3">দিন (কিছু সিলেক্ট না করলে প্রতিদিন)</p>
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
                                    <p className="mb-1.5 text-[12px] font-semibold text-ink-3">যে সময় থেকে শুরু হওয়া স্লট</p>
                                    <Select
                                        value={draft.from}
                                        onChange={(e) => set({ from: e.target.value })}
                                        options={[{ value: "", label: "খোলার সময়" }, ...TIMES.map((t) => ({ value: t, label: time12(t) }))]}
                                        aria-label="যে সময় থেকে শুরু হওয়া স্লট"
                                    />
                                </div>
                                <div>
                                    <p className="mb-1.5 text-[12px] font-semibold text-ink-3">যে সময় পর্যন্ত</p>
                                    <Select
                                        value={draft.to}
                                        onChange={(e) => set({ to: e.target.value })}
                                        options={[{ value: "", label: "বন্ধের সময়" }, ...TIMES.map((t) => ({ value: t, label: time12(t) }))]}
                                        aria-label="যে সময় পর্যন্ত"
                                    />
                                </div>
                            </div>
                        </div>

                        <label className="flex items-center justify-between gap-4 rounded-ctl border border-line px-4 py-3">
                            <span>
                                <span className="block text-[14px] font-semibold text-ink">কোড চালু আছে</span>
                                <span className="block text-[12px] text-ink-3">বন্ধ কোড পেমেন্টের সময় কাজ করে না এবং ব্যানারেও দেখায় না।</span>
                            </span>
                            <Switch checked={draft.isActive} onChange={(v) => set({ isActive: v })} label="কোড চালু আছে" />
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
                                বাদ দিন
                            </Button>
                            <Button type="submit" disabled={pending || (!dirty && Boolean(draft.id))}>
                                {pending ? "সেভ হচ্ছে…" : draft.id ? "কোড সেভ করুন" : "কোড তৈরি করুন"}
                            </Button>
                        </div>
                    </form>
                </Panel>
            </div>

            <Dialog
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                size="sm"
                title={`${baseline.code} মুছে ফেলবেন?`}
                description="শুধু যে কোড কেউ ব্যবহার করেনি, সেটিই মোছা যায়। যে ব্যানারে কোডটি আছে, সেখানে আর কোনো কোড দেখাবে না।"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                            রেখে দিন
                        </Button>
                        <Button variant="ink" className="bg-danger hover:bg-danger" disabled={pending} onClick={remove}>
                            কোড মুছে ফেলুন
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