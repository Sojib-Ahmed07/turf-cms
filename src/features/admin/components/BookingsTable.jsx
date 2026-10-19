// src/features/admin/components/BookingsTable.jsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarPlus, Search, X } from "lucide-react";
import { PageHeader, Table, Th, Td, Toolbar, Label } from "@/components/admin/Kit";
import StatusBadge from "@/components/admin/StatusBadge";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { TextInput, Select } from "@/components/ui/Inputs";
import WalkInDialog from "./WalkInDialog";
import { adminCancelBooking, markRefunded } from "@/features/admin/actions/bookings";
import { cn, taka } from "@/lib/utils";

const RANGES = [
    { value: "today", label: "Today" },
    { value: "upcoming", label: "Upcoming" },
    { value: "week", label: "Last 7 days" },
    { value: "all", label: "All" },
];

const STATUSES = [
    { value: "", label: "Any status" },
    { value: "confirmed", label: "Confirmed" },
    { value: "held", label: "Awaiting payment" },
    { value: "refund_due", label: "Refund due" },
    { value: "cancelled", label: "Cancelled" },
    { value: "expired", label: "Expired" },
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
                    ? `${cancelTarget.id} cancelled. It was paid online, so it's now marked “Refund due”.`
                    : `${cancelTarget.id} cancelled. The slot is free again.`
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
            else setFlash(`Refund for ${row.id} marked as done.`);
            router.refresh();
        });
    }

    const hasFilters = filters.q || filters.pitchId || filters.status;

    return (
        <div className="mx-auto max-w-[1280px]">
            <PageHeader
                title="Bookings"
                description="Every booking across all grounds. Bookings waiting for payment are released automatically after 15 minutes."
                actions={
                    <Button variant="ink" onClick={() => setWalkInOpen(true)}>
                        <CalendarPlus className="h-4 w-4" />
                        Add walk-in booking
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
                    <button type="button" aria-label="Dismiss" onClick={() => (setError(""), setFlash(""))}>
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
                            <TextInput name="q" defaultValue={filters.q} placeholder="Name, phone, email or booking ID" className="pl-10" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:flex">
                            <Select
                                name="pitch"
                                defaultValue={filters.pitchId}
                                options={[{ value: "", label: "All grounds" }, ...pitches.map((p) => ({ value: p.id, label: p.name }))]}
                                className="sm:w-44"
                            />
                            <Select name="status" defaultValue={filters.status} options={STATUSES} className="sm:w-48" />
                        </div>
                        <div className="flex gap-2 sm:ml-auto">
                            <Button type="submit" variant="outline">
                                Apply
                            </Button>
                            {hasFilters && (
                                <Button href={hrefWith({ q: "", pitch: "", status: "" })} variant="ghost">
                                    Clear
                                </Button>
                            )}
                        </div>
                    </form>
                </Toolbar>

                {rows.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <p className="display text-[24px] text-ink">No bookings here</p>
                        <p className="mt-2 text-[14px] text-ink-3">
                            {hasFilters ? "Nothing matches these filters. Try clearing them." : "Bookings will show up here as players reserve slots."}
                        </p>
                    </div>
                ) : (
                    <Table minWidth={900}>
                        <thead>
                            <tr>
                                <Th>Booking</Th>
                                <Th>Player</Th>
                                <Th>Ground</Th>
                                <Th>When</Th>
                                <Th className="text-right">Amount</Th>
                                <Th>Payment</Th>
                                <Th>Status</Th>
                                <Th className="text-right">Actions</Th>
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
                                    <Td>{b.pitch}</Td>
                                    <Td>
                                        <p className="text-ink">{b.date}</p>
                                        <p className="text-[12px] text-ink-3">{b.time}</p>
                                    </Td>
                                    <Td className="text-right font-bold text-ink tnum">{taka(b.amount)}</Td>
                                    <Td>{b.method ?? <span className="text-ink-4">Not paid</span>}</Td>
                                    <Td>
                                        <StatusBadge status={b.status} />
                                    </Td>
                                    <Td className="text-right">
                                        {(b.status === "confirmed" || b.status === "held") && (
                                            <Button variant="ghost" size="sm" onClick={() => setCancelTarget(b)}>
                                                Cancel
                                            </Button>
                                        )}
                                        {b.status === "refund_due" && (
                                            <Button variant="outline" size="sm" onClick={() => refundDone(b)}>
                                                Mark refunded
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
                        {total === 0 ? "0 bookings" : `Page ${page} of ${pageCount}, ${total} booking${total === 1 ? "" : "s"}`}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" href={page > 1 ? hrefWith({ page: page - 1 }) : undefined} disabled={page <= 1}>
                            Previous
                        </Button>
                        <Button variant="outline" size="sm" href={page < pageCount ? hrefWith({ page: page + 1 }) : undefined} disabled={page >= pageCount}>
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog
                open={Boolean(cancelTarget)}
                onClose={() => !busy && setCancelTarget(null)}
                title={`Cancel ${cancelTarget?.id ?? "booking"}?`}
                description={cancelTarget ? `${cancelTarget.customer}, ${cancelTarget.pitch}, ${cancelTarget.date}, ${cancelTarget.time}` : ""}
                size="sm"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={busy}>
                            Keep booking
                        </Button>
                        <Button variant="ink" onClick={confirmCancel} disabled={busy}>
                            {busy ? "Cancelling…" : "Cancel booking"}
                        </Button>
                    </>
                }
            >
                <p className="text-[14px] text-ink-2">The slot becomes free for other players. Paid bookings are marked “Refund due”.</p>
                <div className="mt-4">
                    <Label optional>Reason</Label>
                    <TextInput value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Rain, ground maintenance…" />
                </div>
            </Dialog>

            <WalkInDialog
                open={walkInOpen}
                onClose={() => setWalkInOpen(false)}
                pitches={pitches.filter((p) => p.isActive)}
                startDate={startDate}
                onCreated={(code) => {
                    setFlash(`Walk-in booking ${code} created.`);
                    router.refresh();
                }}
            />
        </div>
    );
}