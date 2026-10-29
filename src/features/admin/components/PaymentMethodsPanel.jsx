// src/features/admin/components/PaymentMethodsPanel.jsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, KeyRound, Smartphone } from "lucide-react";
import { Panel } from "@/components/admin/Kit";
import Switch from "@/components/ui/Switch";
import { setPaymentMethodEnabled } from "@/features/admin/actions/payments";
import { cn } from "@/lib/utils";

const ICONS = { bkash: Smartphone, sslcommerz: CreditCard };
const MARK = { bkash: "bg-[#e2136e] text-white", sslcommerz: "bg-pitch text-white" };
const WHAT = {
    bkash: "সরাসরি bKash দিয়ে পেমেন্ট।",
    sslcommerz: "SSLCommerz-এর মাধ্যমে কার্ড, নগদ, রকেট ও অন্যান্য ওয়ালেট।",
};

/**
 * On/off switch per payment method.
 *   methods    from getPaymentMethodsAdmin(): [{ id, name, label, configured, enabled }]
 *   showToast  from useToast() in the parent
 */
export default function PaymentMethodsPanel({ methods = [], showToast }) {
    const router = useRouter();
    const [pendingId, setPendingId] = useState(null);
    const [, startTransition] = useTransition();
    // Optimistic view of the switches while the save runs
    const [local, setLocal] = useState({});
    const isOn = (m) => (m.id in local ? local[m.id] : m.enabled);
    const liveCount = methods.filter((m) => m.configured && isOn(m)).length;

    function toggle(m, enabled) {
        setPendingId(m.id);
        setLocal((s) => ({ ...s, [m.id]: enabled }));
        startTransition(async () => {
            const res = await setPaymentMethodEnabled({ gateway: m.id, enabled });
            setPendingId(null);
            if (!res.ok) {
                setLocal((s) => ({ ...s, [m.id]: !enabled }));
                showToast?.(res.error, "error");
                return;
            }
            showToast?.(`খেলোয়াড়দের জন্য ${m.name} ${enabled ? "চালু" : "বন্ধ"} করা হয়েছে`);
            setLocal({});
            router.refresh();
        });
    }

    return (
        <Panel
            className="mb-6"
            title="পেমেন্টের মাধ্যম"
            description="কোনো মাধ্যম বন্ধ করলে খেলোয়াড়দের চালু মাধ্যমটি ব্যবহার করতে বলা হয়। যে পেমেন্ট চলছে, সেগুলো ঠিকমতো শেষ হবে।"
        >
            <ul className="divide-y divide-line">
                {methods.map((m) => {
                    const Icon = ICONS[m.id] ?? CreditCard;
                    const on = isOn(m);
                    return (
                        <li key={m.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                            <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", MARK[m.id] ?? "bg-ink text-white", !m.configured && "opacity-40")}>
                                <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
                                    {m.name}
                                    {!m.configured ? (
                                        <span className="rounded-full bg-chalk px-2 py-0.5 text-[11px] font-semibold text-ink-3 ring-1 ring-inset ring-line">
                                            কী সেট করা হয়নি
                                        </span>
                                    ) : on ? (
                                        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-deep">চালু</span>
                                    ) : (
                                        <span className="rounded-full bg-flare-soft px-2 py-0.5 text-[11px] font-semibold text-flare-deep">বন্ধ</span>
                                    )}
                                </p>
                                <p className="mt-0.5 text-[13px] text-ink-3">
                                    {m.configured ? WHAT[m.id] : (
                                        <span className="inline-flex items-center gap-1.5">
                                            <KeyRound className="h-3.5 w-3.5" />
                                            ব্যবহার করতে সার্ভারের সেটিংসে এর কী যোগ করুন। ততক্ষণ খেলোয়াড়রা এটি দেখবেন না।
                                        </span>
                                    )}
                                </p>
                            </div>
                            {m.configured && (
                                <div className={cn(pendingId === m.id && "pointer-events-none opacity-60")}>
                                    <Switch checked={on} onChange={(v) => toggle(m, v)} label={`${m.name} পেমেন্ট`} />
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
            {methods.some((m) => m.configured) && liveCount === 0 && (
                <p className="mt-5 rounded-ctl bg-flare-soft px-4 py-3 text-[13px] font-medium text-flare-deep">
                    সব অনলাইন পেমেন্ট মাধ্যম বন্ধ, তাই খেলোয়াড়রা অনলাইনে বুক করে পেমেন্ট করতে পারবেন না। একটি আবার চালু করুন, অথবা কাউন্টারে বুকিং নিন।
                </p>
            )}
        </Panel>
    );
}