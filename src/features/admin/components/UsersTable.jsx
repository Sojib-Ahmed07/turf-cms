// src/features/admin/components/UsersTable.jsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Info, Search } from "lucide-react";
import { PageHeader, Table, Th, Td, Toolbar } from "@/components/admin/Kit";
import { useToast } from "@/components/admin/Toast";
import { TextInput, Select } from "@/components/ui/Inputs";
import { setUserRole } from "@/features/admin/actions/users";
import { cn } from "@/lib/utils";
import { BN } from "@/i18n/format";

const ROLES = [
    { value: "admin", label: "অ্যাডমিন" },
    { value: "user", label: "খেলোয়াড়" },
];

/** data: from getUsersAdmin(); q: search from the URL; meId: the signed-in admin */
export default function UsersTable({ data, q = "", meId }) {
    const router = useRouter();
    const [busyId, setBusyId] = useState(null);
    const [, startTransition] = useTransition();
    const { toast, showToast } = useToast();
    const { users, adminCount } = data;

    function changeRole(u, role) {
        if (role === u.role) return;
        setBusyId(u.id);
        startTransition(async () => {
            const res = await setUserRole({ userId: u.id, role });
            setBusyId(null);
            if (!res.ok) return showToast(res.error, "error");
            showToast(`${u.name} এখন ${ROLES.find((r) => r.value === role).label}`);
            router.refresh();
        });
    }

    return (
        <div className="mx-auto max-w-[1080px]">
            <PageHeader
                title="ব্যবহারকারী"
                description="অ্যাডমিন অ্যাডমিন প্যানেলের সবকিছু বদলাতে পারেন এবং গেটে টিকিট চেক করতে পারেন। খেলোয়াড়রা শুধু বুক করতে পারেন।"
            />

            <p className="mb-6 flex items-start gap-2.5 rounded-card bg-white px-5 py-4 text-[14px] text-ink-2 ring-1 ring-line">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
                নতুন অ্যাডমিন যোগ করতে তাকে ওয়েবসাইটে একটি অ্যাকাউন্ট খুলতে বলুন, তারপর এখানে খুঁজে তার ভূমিকা বদলে দিন। পরের বার কোনো পেজ খুললেই পরিবর্তনটি কাজ করবে।
            </p>

            <div className="overflow-hidden rounded-card bg-white ring-1 ring-line">
                <Toolbar>
                    <form action="/admin/users" className="relative sm:w-72">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                        <TextInput name="q" defaultValue={q} placeholder="নাম, ইমেইল বা ফোন" className="pl-10" />
                    </form>
                    <p className="text-[13px] text-ink-3 sm:ml-auto">
                        {BN.digits(users.length)} জন
                        {users.length >= 300 && ", প্রথম ৩০০ জন দেখানো হচ্ছে। খুঁজে তালিকা ছোট করুন।"}
                    </p>
                </Toolbar>
                {users.length === 0 ? (
                    <p className="px-6 py-14 text-center text-[14px] text-ink-3">কাউকে পাওয়া যায়নি।</p>
                ) : (
                    <Table minWidth={640}>
                        <thead>
                            <tr>
                                <Th>নাম</Th>
                                <Th>ফোন</Th>
                                <Th>বুকিং</Th>
                                <Th>যোগ দিয়েছেন</Th>
                                <Th className="w-44">ভূমিকা</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => {
                                const isMe = u.id === meId;
                                const lastAdmin = u.role === "admin" && adminCount <= 1;
                                return (
                                    <tr key={u.id} className={cn("hover:bg-chalk/60", busyId === u.id && "opacity-60")}>
                                        <Td>
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={cn(
                                                        "grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full text-[13px] font-bold",
                                                        u.role === "user" ? "bg-grass text-pitch" : "bg-pitch text-white"
                                                    )}
                                                >
                                                    {u.image ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={u.image} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        (u.name?.[0] ?? "?").toUpperCase()
                                                    )}
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block font-semibold text-ink">
                                                        {u.name}
                                                        {isMe && <span className="ml-1.5 text-[12px] font-medium text-ink-3">(আপনি)</span>}
                                                    </span>
                                                    <span className="block truncate text-[12px] text-ink-3">{u.email}</span>
                                                </span>
                                            </div>
                                        </Td>
                                        <Td className="tnum">{u.phone || <span className="text-ink-4">দেওয়া হয়নি</span>}</Td>
                                        <Td className="tnum">{BN.digits(u.bookings)}</Td>
                                        <Td>{u.joined}</Td>
                                        <Td>
                                            <Select
                                                value={u.role}
                                                onChange={(e) => changeRole(u, e.target.value)}
                                                options={ROLES}
                                                disabled={isMe || lastAdmin || busyId === u.id}
                                                aria-label={`${u.name}-এর ভূমিকা`}
                                                title={isMe ? "নিজের ভূমিকা নিজে বদলানো যায় না" : lastAdmin ? "শেষ অ্যাডমিনের ভূমিকা বদলানো যায় না" : undefined}
                                            />
                                        </Td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                )}
            </div>
            {toast}
        </div>
    );
}