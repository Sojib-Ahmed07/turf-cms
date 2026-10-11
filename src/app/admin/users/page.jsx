// src/app/admin/users/page.jsx
import UsersTable from "@/features/admin/components/UsersTable";
import { users } from "@/lib/admin-sample-data";

export const metadata = { title: "Users" };

export default function Page() {
    return <UsersTable users={users} />;
}
