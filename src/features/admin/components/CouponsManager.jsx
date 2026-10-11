// src/features/admin/components/CouponsManager.jsx
"use client";

import { Plus, Shuffle } from "lucide-react";
import { PageHeader, Panel, Label, Table, Th, Td } from "@/components/admin/Kit";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { TextInput, Segmented } from "@/components/ui/Inputs";
import { cn, taka } from "@/lib/utils";

export default function CouponsManager({ coupons = [] }) {
    return (
        <div className="mx-auto max-w-[1280px]">
            <PageHeader title="Coupons" description="Promo codes players type at checkout. Attach a code to an offer banner to advertise it." />

            <div className="grid gap-6 xl:grid-cols-12">
                <Panel className="xl:col-span-8" title="All codes" bodyClassName="p-0">
                    <Table minWidth={620}>
                        <thead>
                            <tr>
                                <Th>Code</Th>
                                <Th>Discount</Th>
                                <Th>Used</Th>
                                <Th>Runs until</Th>
                                <Th className="text-right">Active</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {coupons.map((c) => {
                                const pct = c.limit ? Math.min(100, Math.round((c.used / c.limit) * 100)) : null;
                                return (
                                    <tr key={c.code} className={cn(!c.active && "opacity-60")}>
                                        <Td>
                                            <span className="rounded-md border border-dashed border-flare bg-flare-soft px-2 py-1 text-[12px] font-bold tracking-wider text-ink tnum">{c.code}</span>
                                            <span className="mt-2 block text-[12px] text-ink-3">{c.banner ? `On: ${c.banner}` : "Not advertised"}</span>
                                        </Td>
                                        <Td className="font-semibold text-ink">
                                            {c.type === "percent" ? `${c.value}% off` : `${taka(c.value)} off`}
                                            {c.maxDiscount && <span className="block text-[12px] font-normal text-ink-3">up to {taka(c.maxDiscount)}</span>}
                                        </Td>
                                        <Td>
                                            <p className="tnum text-ink">
                                                {c.used}
                                                {c.limit && <span className="text-ink-3"> / {c.limit}</span>}
                                            </p>
                                            {pct !== null && (
                                                <span className="mt-1.5 block h-1 w-24 overflow-hidden rounded-full bg-line">
                                                    <span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                                                </span>
                                            )}
                                        </Td>
                                        <Td>{c.ends}</Td>
                                        <Td className="text-right">
                                            <Switch size="sm" defaultChecked={c.active} label={`Toggle ${c.code}`} />
                                        </Td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </Panel>

                <Panel className="xl:col-span-4" title="New code">
                    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                        <div>
                            <Label>Code</Label>
                            <div className="flex gap-2">
                                <TextInput placeholder="e.g. FRIDAY15" className="flex-1 font-bold uppercase tracking-wider placeholder:font-normal placeholder:normal-case placeholder:tracking-normal" />
                                <Button variant="outline" size="icon" aria-label="Generate a code">
                                    <Shuffle className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div>
                            <Label>Type</Label>
                            <Segmented options={[{ value: "percent", label: "Percentage" }, { value: "fixed", label: "Fixed amount" }]} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Value</Label>
                                <TextInput type="number" placeholder="15" />
                            </div>
                            <div>
                                <Label optional>Max discount</Label>
                                <TextInput type="number" prefix="৳" placeholder="500" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label optional>Total uses</Label>
                                <TextInput type="number" placeholder="No limit" />
                            </div>
                            <div>
                                <Label>Per player</Label>
                                <TextInput type="number" defaultValue={1} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Starts</Label>
                                <TextInput type="date" />
                            </div>
                            <div>
                                <Label optional>Ends</Label>
                                <TextInput type="date" />
                            </div>
                        </div>
                        <Button type="submit" className="w-full">
                            <Plus className="h-4 w-4" />
                            Create code
                        </Button>
                    </form>
                </Panel>
            </div>
        </div>
    );
}
