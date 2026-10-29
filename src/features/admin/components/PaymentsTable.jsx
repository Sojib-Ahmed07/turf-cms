// src/features/admin/components/PaymentsTable.jsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { PageHeader, Table, Th, Td, Toolbar } from "@/components/admin/Kit";
import StatusBadge from "@/components/admin/StatusBadge";
import { useToast } from "@/components/admin/Toast";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { TextInput } from "@/components/ui/Inputs";
import { adminRecheckPayment, markPaymentRefunded, markRiskChecked } from "@/features/admin/actions/payments";
import PaymentMethodsPanel from "./PaymentMethodsPanel";
import { cn, taka } from "@/lib/utils";
import { BN } from "@/i18n/format";

const TABS = [
    { key: "", label: "সব" },
    { key: "paid", label: "পেমেন্ট হয়েছে" },
    { key: "started", label: "শুরু হয়েছে" },
    { key: "failed", label: "ব্যর্থ বা ক্যানসেল" },
    { key: "refund_due", label: "টাকা ফেরত বাকি" },
    { key: "refunded", label: "টাকা ফেরত দেওয়া হয়েছে" },
    { key: "risky", label: "ঝুঁকিপূর্ণ" },
];

function href({ q, status, page }) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    if (page > 1) p.set("page", String(page));
    const s = p.toString();
    return `/admin/payments${s ? `?${s}` : ""}`;
}

/**
 * data: from getPaymentsAdmin(); filters: { q, status } from the URL;
 * readyGateways: gateways with keys set, e.g. ["bkash", "sslcommerz"];
 * methods: from getPaymentMethodsAdmin(), for the on/off switches
 */
export default function PaymentsTable({ data, filters, readyGateways = [], methods = [] }) {
    const router = useRouter();
    const [busyId, setBusyId] = useState(null);
    const [refund, setRefund] = useState(null);
    const [pending, startTransition] = useTransition();
    const { toast, showToast } = useToast();
    const { rows, total, page, pageCount, counts } = data;

    function recheck(p) {
        setBusyId(p.id);
        startTransition(async () => {
            const res = await adminRecheckPayment(p.tranId);
            setBusyId(null);
            if (!res.ok) return showToast(res.error, "error");
            showToast(res.data.message, res.data.outcome === "confirmed" ? "success" : "error");
            router.refresh();
        });
    }

    function clearRisk(p) {
        setBusyId(p.id);
        startTransition(async () => {
            const res = await markRiskChecked(p.id);
            setBusyId(null);
            if (!res.ok) return showToast(res.error, "error");
            showToast(`${p.bookingCode} যাচাই করা হয়েছে`);
            router.refresh();
        });
    }

    function confirmRefund() {
        const p = refund;
        startTransition(async () => {
            const res = await markPaymentRefunded(p.id);
            setRefund(null);
            if (!res.ok) return showToast(res.error, "error");
            showToast(`${p.bookingCode}-এর টাকা ফেরত লিখে রাখা হয়েছে`);
            router.refresh();
        });
    }

    return (
        <div className="mx-auto max-w-[1280px]">
            <PageHeader title="পেমেন্ট" description="bKash ও SSLCommerz-এর সব লেনদেন। গেটওয়ে নিজে পেমেন্ট নিশ্চিত করলে তবেই বুকিং কনফার্মড হয়।" />

            <PaymentMethodsPanel methods={methods} showToast={showToast} />

            {(counts.refundDue > 0 || counts.risky > 0) && (
                <div className="mb-6 grid gap-3 md:grid-cols-2">
                    {counts.refundDue > 0 && (
                        <Alert
                            title={`${BN.digits(counts.refundDue)}টি টাকা ফেরত পাঠানো বাকি`}
                            body="SSLCommerz মার্চেন্ট প্যানেল থেকে (বা bKash বা নগদ টাকায়) টাকা ফেরত দিন, তারপর এখানে টাকা ফেরত দেওয়া হয়েছে চিহ্ন দিন।"
                            href={href({ status: "refund_due" })}
                            cta="টাকা ফেরত দেখুন"
                        />
                    )}
                    {counts.risky > 0 && (
                        <Alert
                            title={`${BN.digits(counts.risky)}টি ঝুঁকিপূর্ণ পেমেন্ট`}
                            body="SSLCommerz এগুলোকে বেশি ঝুঁকিপূর্ণ বলেছে। বুকিং কনফার্মড, তবে মার্চেন্ট প্যানেলে প্রতিটি যাচাই করে “যাচাই করেছি” চাপ না দেওয়া পর্যন্ত গেটে টিকিট চেক করার সময় অ্যাডমিনকে সতর্ক করা হবে।"
                            href={href({ status: "risky" })}
                            cta="ঝুঁকিপূর্ণগুলো দেখুন"
                        />
                    )}
                </div>
            )}

            <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                {TABS.map((t) => (
                    <Link
                        key={t.key}
                        href={href({ q: filters.q, status: t.key })}
                        className={cn(
                            "shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold transition-colors",
                            filters.status === t.key ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-line hover:ring-ink-4"
                        )}
                    >
                        {t.label}
                        {t.key === "refund_due" && counts.refundDue > 0 && <span className="ml-1.5 rounded-full bg-danger px-1.5 text-[11px] text-white tnum">{BN.digits(counts.refundDue)}</span>}
                    </Link>
                ))}
            </div>

            <div className="overflow-hidden rounded-card bg-white ring-1 ring-line">
                <Toolbar>
                    <form action="/admin/payments" className="relative sm:w-80">
                        {filters.status && <input type="hidden" name="status" value={filters.status} />}
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                        <TextInput name="q" defaultValue={filters.q} placeholder="লেনদেন, বুকিং, খেলোয়াড় বা ব্যাংক রেফারেন্স" className="pl-10" />
                    </form>
                    <p className="text-[13px] text-ink-3 sm:ml-auto">
                        {BN.digits(total)}টি পেমেন্ট
                    </p>
                </Toolbar>

                {rows.length === 0 ? (
                    <p className="px-6 py-14 text-center text-[14px] text-ink-3">কোনো পেমেন্ট মেলেনি।</p>
                ) : (
                    <Table minWidth={980}>
                        <thead>
                            <tr>
                                <Th>লেনদেন</Th>
                                <Th>বুকিং</Th>
                                <Th className="text-right">পরিমাণ</Th>
                                <Th>মাধ্যম</Th>
                                <Th>অবস্থা</Th>
                                <Th>সময়</Th>
                                <Th />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((p) => (
                                <tr key={p.id} className={cn(p.risky ? "bg-flare-soft/60" : "hover:bg-chalk/60")}>
                                    <Td>
                                        <span className="block font-semibold text-ink tnum">{p.tranId}</span>
                                        <span className="block text-[12px] text-ink-3">{p.gatewayLabel}</span>
                                        {p.bankTranId && (
                                            <span className="block text-[12px] text-ink-3 tnum">
                                                {p.gateway === "bkash" ? "bKash TrxID" : "ব্যাংক রেফারেন্স"} {p.bankTranId}
                                            </span>
                                        )}
                                    </Td>
                                    <Td>
                                        <Link href={`/admin/bookings?range=all&q=${encodeURIComponent(p.bookingCode)}`} className="font-semibold text-ink hover:underline tnum">
                                            {p.bookingCode}
                                        </Link>
                                        <span className="block text-[12px] text-ink-3">{p.customer || "কাউন্টারের বুকিং"}</span>
                                        <span className="block max-w-[220px] truncate text-[12px] text-ink-3">{p.slot}</span>
                                    </Td>
                                    <Td className="text-right font-bold text-ink tnum">{taka(p.amount)}</Td>
                                    <Td>{p.method || <span className="text-ink-4">পেমেন্ট হয়নি</span>}</Td>
                                    <Td>
                                        <div className="flex items-center gap-2">
                                            <StatusBadge status={p.status === "paid" ? "paid" : p.status} />
                                            {p.risky && (
                                                <span title={p.riskTitle} className="text-[12px] font-semibold text-flare-deep">
                                                    ঝুঁকিপূর্ণ
                                                </span>
                                            )}
                                        </div>
                                    </Td>
                                    <Td className="text-ink-3">{p.at}</Td>
                                    <Td className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {p.risky && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={pending}
                                                    onClick={() => clearRisk(p)}
                                                    title="SSLCommerz মার্চেন্ট প্যানেলে দেখে নিশ্চিত হয়েছেন যে পেমেন্টটি আসল"
                                                >
                                                    <ShieldCheck className="h-3.5 w-3.5" />
                                                    যাচাই করেছি
                                                </Button>
                                            )}
                                            {p.status === "refund_due" && (
                                                <Button variant="outline" size="sm" disabled={pending} onClick={() => setRefund(p)}>
                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                    টাকা ফেরত দেওয়া হয়েছে
                                                </Button>
                                            )}
                                            {readyGateways.includes(p.gateway) && ["initiated", "failed", "cancelled"].includes(p.status) && (
                                                <Button variant="outline" size="sm" disabled={pending} onClick={() => recheck(p)}>
                                                    <RefreshCw className={cn("h-3.5 w-3.5", busyId === p.id && "animate-spin")} />
                                                    {busyId === p.id ? "যাচাই হচ্ছে…" : `${p.gatewayLabel}-এ যাচাই করুন`}
                                                </Button>
                                            )}
                                        </div>
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}

                {pageCount > 1 && (
                    <div className="flex items-center justify-between border-t border-line px-6 py-3 text-[13px] text-ink-3">
                        <span>
                            পৃষ্ঠা {BN.digits(page)} / {BN.digits(pageCount)}
                        </span>
                        <span className="flex gap-2">
                            {page > 1 && (
                                <Button href={href({ ...filters, page: page - 1 })} variant="outline" size="sm">
                                    <ChevronLeft className="h-3.5 w-3.5" /> নতুনগুলো
                                </Button>
                            )}
                            {page < pageCount && (
                                <Button href={href({ ...filters, page: page + 1 })} variant="outline" size="sm">
                                    পুরনোগুলো <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </span>
                    </div>
                )}
            </div>

            <Dialog
                open={Boolean(refund)}
                onClose={() => setRefund(null)}
                size="sm"
                title={refund ? `${refund.bookingCode}-এর ${taka(refund.amount)} ফেরত দিয়েছেন?` : ""}
                description="এখানে শুধু টাকা ফেরতের তথ্য লিখে রাখা হয়। আগে SSLCommerz মার্চেন্ট প্যানেল থেকে বা bKash বা নগদ টাকায় টাকা পাঠিয়ে দিন।"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setRefund(null)}>
                            এখনো না
                        </Button>
                        <Button variant="ink" disabled={pending} onClick={confirmRefund}>
                            টাকা ফেরত পাঠিয়েছি
                        </Button>
                    </>
                }
            />
            {toast}
        </div>
    );
}

function Alert({ title, body, href: to, cta }) {
    return (
        <div className="flex flex-col gap-3 rounded-card bg-flare-soft p-5 ring-1 ring-flare/50 sm:flex-row sm:items-center">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-flare text-ink">
                <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="flex-1">
                <p className="text-[15px] font-semibold text-ink">{title}</p>
                <p className="text-[13px] text-ink-2">{body}</p>
            </div>
            <Button href={to} variant="ink" size="sm">
                {cta}
            </Button>
        </div>
    );
}