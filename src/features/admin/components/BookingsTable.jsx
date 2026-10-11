// src/features/admin/components/BookingsTable.jsx
"use client";

import { Download, Ellipsis, Search } from "lucide-react";
import { PageHeader, Table, Th, Td, Toolbar } from "@/components/admin/Kit";
import StatusBadge from "@/components/admin/StatusBadge";
import Button from "@/components/ui/Button";
import { TextInput, Select, Segmented } from "@/components/ui/Inputs";
import { taka } from "@/lib/utils";

export default function BookingsTable({ bookings = [] }) {
    return (
        <div className="mx-auto max-w-[1280px]">
            <PageHeader
                title="Bookings"
                description="Every booking across all grounds. Bookings waiting for payment are released automatically after 15 minutes."
                actions={
                    <Button variant="outline">
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
                }
            />

            <div className="overflow-hidden rounded-card bg-white ring-1 ring-line">
                <Toolbar>
                    <div className="relative sm:w-72">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                        <TextInput placeholder="Name, phone or booking ID" className="pl-10" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:flex">
                        <Select options={["All grounds", "Pitch A", "Pitch B", "Box Cricket"]} className="sm:w-40" />
                        <Select options={["Any status", "Confirmed", "Awaiting payment", "Refund due", "Cancelled", "Played"]} className="sm:w-44" />
                    </div>
                    <Segmented className="sm:ml-auto" options={[{ value: "today", label: "Today" }, { value: "week", label: "This week" }, { value: "all", label: "All" }]} defaultValue="week" />
                </Toolbar>

                <Table>
                    <thead>
                        <tr>
                            <Th>Booking</Th>
                            <Th>Player</Th>
                            <Th>Ground</Th>
                            <Th>When</Th>
                            <Th className="text-right">Amount</Th>
                            <Th>Paid with</Th>
                            <Th>Status</Th>
                            <Th />
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.map((b) => (
                            <tr key={b.id} className={b.status === "refund_due" ? "bg-danger-soft/50" : "hover:bg-chalk/60"}>
                                <Td className="font-semibold text-ink tnum">{b.id}</Td>
                                <Td>
                                    <p className="font-semibold text-ink">{b.customer}</p>
                                    <p className="text-[12px] text-ink-3 tnum">{b.phone}</p>
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
                                    <button type="button" aria-label="More actions" className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-white hover:text-ink">
                                        <Ellipsis className="h-4 w-4" />
                                    </button>
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </Table>

                <div className="flex items-center justify-between px-6 py-4 text-[13px] text-ink-3">
                    <p className="tnum">Showing 1–{bookings.length} of 214</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled>Previous</Button>
                        <Button variant="outline" size="sm">Next</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
