// src/app/admin/layout.jsx
import AdminShell from "@/components/admin/AdminShell";
import { requireRole } from "@/lib/guards";
import { countActiveHolds } from "@/features/admin/queries";
import { getSiteSettings } from "@/features/cms/queries";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
    // Real check (proxy.js only looks for the cookie). Players are sent to the home page.
    const user = await requireRole(["admin", "editor"]);
    const [held, settings] = await Promise.all([countActiveHolds(), getSiteSettings()]);
    return (
        <AdminShell user={{ name: user.name, role: user.role }} siteName={settings.siteName} counts={{ held }}>
            {children}
        </AdminShell>
    );
}