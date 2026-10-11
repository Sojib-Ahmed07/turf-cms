// src/features/admin/components/UsersTable.jsx
"use client";

import { Search, UserPlus } from "lucide-react";
import { PageHeader, Table, Th, Td, Toolbar } from "@/components/admin/Kit";
import Button from "@/components/ui/Button";
import { TextInput, Select } from "@/components/ui/Inputs";
import { cn } from "@/lib/utils";

const ROLES = [
    { value: "admin", label: "Admin" },
    { value: "editor", label: "Editor" },
    { value: "user", label: "Player" },
];

export default function UsersTable({ users = [] }) {
    return (
        <div className="mx-auto max-w-[1080px]">
            <PageHeader
                title="Users"
                description="Admins can change everything. Editors can change website content but not grounds, prices, payments or users."
                actions={
                    <Button variant="ink">
                        <UserPlus className="h-4 w-4" />
                        Invite staff
                    </Button>
                }
            />
            <div className="overflow-hidden rounded-card bg-white ring-1 ring-line">
                <Toolbar>
                    <div className="relative sm:w-72">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                        <TextInput placeholder="Name or email" className="pl-10" />
                    </div>
                </Toolbar>
                <Table>
                    <thead>
                        <tr>
                            <Th>Name</Th>
                            <Th>Bookings</Th>
                            <Th>Joined</Th>
                            <Th className="w-44">Role</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.email} className="hover:bg-chalk/60">
                                <Td>
                                    <div className="flex items-center gap-3">
                                        <span className={cn("grid h-9 w-9 place-items-center rounded-full text-[13px] font-bold", u.role === "user" ? "bg-grass text-pitch" : "bg-pitch text-white")}>
                                            {u.name[0]}
                                        </span>
                                        <span>
                                            <span className="block font-semibold text-ink">{u.name}</span>
                                            <span className="block text-[12px] text-ink-3">{u.email}</span>
                                        </span>
                                    </div>
                                </Td>
                                <Td className="tnum">{u.bookings}</Td>
                                <Td>{u.joined}</Td>
                                <Td>
                                    <Select options={ROLES} defaultValue={u.role} />
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        </div>
    );
}
