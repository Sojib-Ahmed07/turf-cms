// src/app/admin/sections/page.jsx
import SectionsEditor from "@/features/cms/admin/SectionsEditor";
import { getSectionsAdmin } from "@/features/cms/admin-queries";
import { requireRole } from "@/lib/guards";

export const metadata = { title: "Home sections" };

export default async function Page() {
    await requireRole(["admin"]);
    return <SectionsEditor initial={await getSectionsAdmin()} />;
}