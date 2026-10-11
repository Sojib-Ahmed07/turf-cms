// src/features/admin/components/PaymentsTable.jsx
"use client";

import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import { PageHeader, Table, Th, Td, Toolbar } from "@/components/admin/Kit";
import StatusBadge from "@/components/admin/StatusBadge";
import Button from "@/components/ui/Button";
import { TextInput, Select } from "@/components/ui/Inputs";
import { cn, taka } from "@/lib/utils";

export default function PaymentsTable({ payments = [] }) {
    const flagged = payments.filter((p) => p.risk === "1");

    return (
        <div className="mx-auto max-w-[1280px]">
            <PageHeader title="Payments" description="Every SSLCommerz transaction. A booking is only confirmed after SSLCommerz validates its payment." />

            {flagged.length > 0 && (
                <div className="mb-6 flex flex-col gap-4 rounded-card bg-flare-soft p-5 ring-1 ring-flare/50 sm:flex-row sm:items-center">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-flare text-ink">
                        <AlertTriangle className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                        <p className="text-[15px] font-semibold text-ink">
                            {flagged.length} payment needs a manual check
                        </p>
                        <p className="text-[13px] text-ink-2">SSLCommerz marked it as risky, so the booking was not confirmed automatically.</p>
                    </div>
                    <Button variant="ink" size="sm">Review payment</Button>
                </div>
            )}

            <div className="overflow-hidden rounded-card bg-white ring-1 ring-line">
                <Toolbar>
                    <div className="relative sm:w-72">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                        <TextInput placeholder="Transaction or booking ID" className="pl-10" />
                    </div>
                    <Select options={["Any status", "Paid", "Started", "Failed", "Refunded"]} className="sm:w-40" />
                </Toolbar>
                <Table>
                    <thead>
                        <tr>
                            <Th>Transaction</Th>
                            <Th>Booking</Th>
                            <Th className="text-right">Amount</Th>
                            <Th>Method</Th>
                            <Th>Bank reference</Th>
                            <Th>Status</Th>
                            <Th>Time</Th>
                            <Th />
                        </tr>
                    </thead>
                    <tbody>
                        {payments.map((p) => (
                            <tr key={p.tranId} className={cn(p.risk === "1" ? "bg-flare-soft/60" : "hover:bg-chalk/60")}>
                                <Td className="font-semibold text-ink tnum">{p.tranId}</Td>
                                <Td className="tnum">{p.bookingId}</Td>
                                <Td className="text-right font-bold text-ink tnum">{taka(p.amount)}</Td>
                                <Td>{p.method}</Td>
                                <Td className="tnum text-ink-3">{p.bankTranId}</Td>
                                <Td>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={p.status} />
                                        {p.risk === "1" && <span className="text-[12px] font-semibold text-flare-deep">Risky</span>}
                                    </div>
                                </Td>
                                <Td className="text-ink-3">{p.at}</Td>
                                <Td className="text-right">
                                    {(p.status === "initiated" || p.risk === "1") && (
                                        <Button variant="outline" size="sm">
                                            <RefreshCw className="h-3.5 w-3.5" />
                                            Re-check
                                        </Button>
                                    )}
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        </div>
    );
}
