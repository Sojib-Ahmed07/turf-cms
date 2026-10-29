// src/app/admin/branding/page.jsx
import BrandingForm from "@/features/cms/admin/BrandingForm";
import { getBrandingAdmin } from "@/features/cms/admin-queries";
import { requireRole } from "@/lib/guards";

export const metadata = { title: "লোগো ও রং" };

export default async function Page() {
    await requireRole(["admin"]);
    return <BrandingForm initial={await getBrandingAdmin()} />;
}