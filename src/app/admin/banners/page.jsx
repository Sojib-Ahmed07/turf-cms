// src/app/admin/banners/page.jsx
import BannersEditor from "@/features/cms/admin/BannersEditor";
import { getBannersAdmin } from "@/features/cms/admin-queries";
import { requireRole } from "@/lib/guards";

export const metadata = { title: "অফার ব্যানার" };

export default async function Page() {
    await requireRole(["admin"]);
    return <BannersEditor initial={await getBannersAdmin()} />;
}