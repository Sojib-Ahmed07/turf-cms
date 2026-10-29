// src/app/admin/hero/page.jsx
import HeroEditor from "@/features/cms/admin/HeroEditor";
import { getHeroAdmin } from "@/features/cms/admin-queries";
import { requireRole } from "@/lib/guards";

export const metadata = { title: "হিরো স্লাইড" };

export default async function HeroAdminPage() {
    await requireRole(["admin"]);
    return <HeroEditor initial={await getHeroAdmin()} />;
}