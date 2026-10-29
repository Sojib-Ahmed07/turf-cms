// src/app/admin/terms/page.jsx
import TermsEditor from "@/features/cms/admin/TermsEditor";
import { getTermsAdmin } from "@/features/cms/admin-queries";
import { requireRole } from "@/lib/guards";

export const metadata = { title: "বুকিংয়ের নিয়ম" };

export default async function Page() {
    await requireRole(["admin"]);
    return <TermsEditor initial={await getTermsAdmin()} />;
}