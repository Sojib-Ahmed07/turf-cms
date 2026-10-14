// src/app/admin/navigation/page.jsx
import NavigationEditor from "@/features/cms/admin/NavigationEditor";
import { getNavAdmin } from "@/features/cms/admin-queries";
import { requireRole } from "@/lib/guards";

export const metadata = { title: "Navigation" };

export default async function Page() {
    await requireRole(["admin"]);
    return <NavigationEditor initial={await getNavAdmin()} />;
}