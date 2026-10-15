// src/app/admin/users/page.jsx
import UsersTable from "@/features/admin/components/UsersTable";
import { getUsersAdmin } from "@/features/admin/commerce-queries";
import { requireRole } from "@/lib/guards";

export const metadata = { title: "Users" };

export default async function Page({ searchParams }) {
    const me = await requireRole(["admin"]);
    const params = await searchParams;
    const q = typeof params?.q === "string" ? params.q.slice(0, 60) : "";
    return <UsersTable data={await getUsersAdmin({ q })} q={q} meId={me.id} />;
}