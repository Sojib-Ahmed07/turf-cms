// src/app/admin/footer/page.jsx
import FooterSeoForm from "@/features/cms/admin/FooterSeoForm";
import { getFooterSeoAdmin } from "@/features/cms/admin-queries";
import { requireRole } from "@/lib/guards";

export const metadata = { title: "যোগাযোগ, ফুটার ও SEO" };

export default async function Page() {
    await requireRole(["admin"]);
    return <FooterSeoForm initial={await getFooterSeoAdmin()} />;
}