// src/features/admin/components/BookingsTable.jsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarPlus, CheckCircle2, Search, X } from "lucide-react";
import { PageHeader, Table, Th, Td, Toolbar, Label } from "@/components/admin/Kit";
import StatusBadge from "@/components/admin/StatusBadge";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { TextInput, Select } from "@/components/ui/Inputs";
import WalkInDialog from "./WalkInDialog";
import { adminCancelBooking, markPaidAtDesk, markRefunded } from "@/features/admin/actions/bookings";
import { cn, taka } from "@/lib/utils";
import { BN } from "@/i18n/format";

const RANGES = [
    { value: "today", label: "আজ" },
    { value: "upcoming", label: "সামনের" },
    { value: "week", label: "গত ৭ দিন" },
    { value: "all", label: "সব" },
];

const STATUSES = [
    { value: "", label: "যেকোনো অবস্থা" },
    { value: "confirmed", label: "কনফার্মড" },
    { value: "held", label: "পেমেন্ট বাকি" },
    { value: "refund_due", label: "টাকা ফেরত বাকি" },
    { value: "cancelled", label: "ক্যানসেল" },
    { value: "expired", label: "পেমেন্ট হয়নি (ছেড়ে দেওয়া)" },
];

export default function BookingsTable({ data, pitches = [], filters, startDate, initialWalkIn = false }) {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const [, startTransition] = useTransition();
    const [cancelTarget, setCancelTarget] = useState(null);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [flash, setFlash] = useState("");
    const [walkInOpen, setWalkInOpen] = useState(initialWalkIn);

    const { rows, total, page, pageCount } = data;

    function hrefWith(changes) {
        const sp = new URLSearchParams(params.toString());
        for (const [k, v] of Object.entries(changes)) {
            if (v === "" || v == null) sp.delete(k);
            else sp.set(k, String(v));
        }
        if (!("page" in changes)) sp.delete("page");
        const qs = sp.toString();
        return qs ? `${pathname}?${qs}` : pathname;
    }

    function onFilterSubmit(e) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        router.push(hrefWith({ q: fd.get("q")?.toString().trim(), pitch: fd.get("pitch"), status: fd.get("status") }));
    }

    function confirmCancel() {
        if (!cancelTarget) return;
        setBusy(true);
        setError("");
        startTransition(async () => {
            const res = await adminCancelBooking({ bookingId: cancelTarget.bookingId, reason });
            setBusy(false);
            if (!res.ok) {
                setError(res.error);
                return;
            }
            setFlash(
                res.data?.refundDue
                    ? `${cancelTarget.id} ক্যানসেল হয়েছে। অনলাইনে পেমেন্ট হয়েছিল, তাই এখন “টাকা ফেরত বাকি” হিসেবে আছে।`
                    : `${cancelTarget.id} ক্যানসেল হয়েছে। স্লটটি আবার খালি।`
            );
            setCancelTarget(null);
            setReason("");
            router.refresh();
        });
    }

    function refundDone(row) {
        setError("");
        startTransition(async () => {
            const res = await markRefunded(row.bookingId);
            if (!res.ok) setError(res.error);
            else setFlash(`${row.id}-এর টাকা ফেরত দেওয়া হয়েছে বলে চিহ্নিত করা হলো।`);
            router.refresh();
        });
    }

    function paidAtDesk(row) {
        setError("");
        startTransition(async () => {
            const res = await markPaidAtDesk(row.bookingId);
            if (!res.ok) setError(res.error);
            else setFlash(`${row.id} কাউন্টারে পেমেন্ট হয়েছে বলে চিহ্নিত করা হলো।`);
            router.refresh();
        });
    }

    const hasFilters = filters.q || filters.pitchId || filters.status;

    return (
        <div className="mx-auto max-w-[1280px]">
            <PageHeader
                title="বুকিং"
                description="সব মাঠের সব বুকিং। “পেমেন্ট বাকি” মানে খেলোয়াড় এই মুহূর্তে পেমেন্ট পেজে আছেন; পেমেন্ট ক্যানসেল বা ফেইল হলে, অথবা ৫ থেকে ১০ মিনিট পরে স্লটটি ছেড়ে দেওয়া হয়।"
                actions={
                    <Button variant="ink" onClick={() => setWalkInOpen(true)}>
                        <CalendarPlus className="h-4 w-4" />
                        কাউন্টারে বুকিং যোগ করুন
                    </Button>
                }
            />

            {(flash || error) && (
                <div
                    className={cn(
                        "mb-5 flex items-start justify-between gap-4 rounded-ctl px-4 py-3 text-[14px] font-medium",
                        error ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand-deep"
                    )}
                >
                    {error || flash}
                    <button type="button" aria-label="বন্ধ করুন" onClick={() => (setError(""), setFlash(""))}>
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div className="mb-4 flex flex-wrap gap-1 rounded-full bg-ink/5 p-1 sm:inline-flex">
                {RANGES.map((r) => (
                    <Link
                        key={r.value}
                        href={hrefWith({ range: r.value })}
                        className={cn(
                            "rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors",
                            filters.range === r.value ? "bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-ink-3 hover:text-ink"
                        )}
                    >
                        {r.label}
                    </Link>
                ))}
            </div>

            <div className="overflow-hidden rounded-card bg-white ring-1 ring-line">
                <Toolbar>
                    <form onSubmit={onFilterSubmit} className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative sm:w-72">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                            <TextInput name="q" defaultValue={filters.q} placeholder="নাম, ফোন, ইমেইল বা বুকিং কোড" className="pl-10" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:flex">
                            <Select
                                name="pitch"
                                defaultValue={filters.pitchId}
                                options={[{ value: "", label: "সব মাঠ" }, ...pitches.map((p) => ({ value: p.id, label: p.name }))]}
                                className="sm:w-44"
                            />
                            <Select name="status" defaultValue={filters.status} options={STATUSES} className="sm:w-48" />
                        </div>
                        <div className="flex gap-2 sm:ml-auto">
                            <Button type="submit" variant="outline">
                                খুঁজুন
                            </Button>
                            {hasFilters && (
                                <Button href={hrefWith({ q: "", pitch: "", status: "" })} variant="ghost">
                                    মুছুন
                                </Button>
                            )}
                        </div>
                    </form>
                </Toolbar>

                {rows.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <p className="display text-[24px] text-ink">এখানে কোনো বুকিং নেই</p>
                        <p className="mt-2 text-[14px] text-ink-3">
                            {hasFilters ? "এই ফিল্টারে কিছু পাওয়া যায়নি। ফিল্টার মুছে দেখুন।" : "খেলোয়াড়রা স্লট বুক করলে এখানে দেখা যাবে।"}
                        </p>
                    </div>
                ) : (
                    <Table minWidth={900}>
                        <thead>
                            <tr>
                                <Th>বুকিং</Th>
                                <Th>খেলোয়াড়</Th>
                                <Th>মাঠ</Th>
                                <Th>কখন</Th>
                                <Th className="text-right">টাকা</Th>
                                <Th>পেমেন্ট</Th>
                                <Th>অবস্থা</Th>
                                <Th className="text-right">কাজ</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((b) => (
                                <tr key={b.bookingId} className={b.status === "refund_due" ? "bg-danger-soft/40" : "hover:bg-chalk/60"}>
                                    <Td>
                                        <p className="font-semibold text-ink tnum">{b.id}</p>
                                        <p className="text-[12px] text-ink-4">{b.created}</p>
                                    </Td>
                                    <Td>
                                        <p className="font-semibold text-ink">{b.customer}</p>
                                        <p className="text-[12px] text-ink-3 tnum">{b.phone || b.email}</p>
                                    </Td>
                                    <Td>
                                        {b.pitch}
                                        {b.people ? <span className="block text-[12px] text-ink-3 tnum">{BN.digits(b.people)} জন</span> : null}
                                    </Td>
                                    <Td>
                                        <p className="text-ink">{b.date}</p>
                                        <p className="text-[12px] text-ink-3">{b.time}</p>
                                    </Td>
                                    <Td className="text-right font-bold text-ink tnum">{taka(b.amount)}</Td>
                                    <Td>{b.method ?? <span className="text-ink-4">পেমেন্ট হয়নি</span>}</Td>
                                    <Td>
                                        <StatusBadge status={b.status} />
                                        {b.checkedIn && (
                                            <p className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-deep">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                গেটে ঢুকেছে
                                            </p>
                                        )}
                                    </Td>
                                    <Td className="text-right">
                                        {b.source === "walk_in" && !b.paid && ["confirmed", "completed"].includes(b.status) && (
                                            <Button variant="outline" size="sm" onClick={() => paidAtDesk(b)}>
                                                পেমেন্ট হয়েছে
                                            </Button>
                                        )}
                                        {(b.status === "confirmed" || b.status === "held") && (
                                            <Button variant="ghost" size="sm" onClick={() => setCancelTarget(b)}>
                                                ক্যানসেল
                                            </Button>
                                        )}
                                        {b.status === "refund_due" && (
                                            <Button variant="outline" size="sm" onClick={() => refundDone(b)}>
                                                টাকা ফেরত দেওয়া হয়েছে
                                            </Button>
                                        )}
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}

                <div className="flex items-center justify-between px-6 py-4 text-[13px] text-ink-3">
                    <p className="tnum">
                        {total === 0 ? "কোনো বুকিং নেই" : `পেজ ${BN.digits(page)} / ${BN.digits(pageCount)}, মোট ${BN.digits(total)}টি বুকিং`}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" href={page > 1 ? hrefWith({ page: page - 1 }) : undefined} disabled={page <= 1}>
                            আগের
                        </Button>
                        <Button variant="outline" size="sm" href={page < pageCount ? hrefWith({ page: page + 1 }) : undefined} disabled={page >= pageCount}>
                            পরের
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog
                open={Boolean(cancelTarget)}
                onClose={() => !busy && setCancelTarget(null)}
                title={`${cancelTarget?.id ?? "বুকিং"} ক্যানসেল করবেন?`}
                description={cancelTarget ? `${cancelTarget.customer}, ${cancelTarget.pitch}, ${cancelTarget.date}, ${cancelTarget.time}` : ""}
                size="sm"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={busy}>
                            বুকিং রাখুন
                        </Button>
                        <Button variant="ink" onClick={confirmCancel} disabled={busy}>
                            {busy ? "ক্যানসেল হচ্ছে…" : "বুকিং ক্যানসেল করুন"}
                        </Button>
                    </>
                }
            >
                <p className="text-[14px] text-ink-2">স্লটটি অন্যদের জন্য খালি হয়ে যাবে। পেমেন্ট হয়ে থাকলে “টাকা ফেরত বাকি” হিসেবে দেখাবে।</p>
                <div className="mt-4">
                    <Label optional>কারণ</Label>
                    <TextInput value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="বৃষ্টি, মাঠ মেরামত…" />
                </div>
            </Dialog>

            <WalkInDialog
                open={walkInOpen}
                onClose={() => setWalkInOpen(false)}
                pitches={pitches.filter((p) => p.isActive)}
                startDate={startDate}
                onCreated={(code) => {
                    setFlash(`কাউন্টারের বুকিং ${code} তৈরি হয়েছে।`);
                    router.refresh();
                }}
            />
        </div>
    );
}