// src/app/admin/layout.jsx
import AdminShell from "@/components/admin/AdminShell";
import { adminUser } from "@/lib/admin-sample-data";

export const metadata = { title: "Admin" };

export default function AdminLayout({ children }) {
    // Later: const user = await requireRole(["admin", "editor"]);
    return <AdminShell user={adminUser}>{children}</AdminShell>;
}
