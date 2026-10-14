// src/app/admin/users/page.jsx
import UsersTable from "@/features/admin/components/UsersTable";
import { users } from "@/lib/admin-sample-data";
import { requireRole } from "@/lib/guards";

export const metadata = { title: "Users" };

export default async function Page() {
    await requireRole(["admin"]);
    return <UsersTable users={users} />;
}