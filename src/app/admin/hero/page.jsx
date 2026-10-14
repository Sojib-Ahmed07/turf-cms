// src/app/admin/hero/page.jsx
import HeroEditor from "@/features/cms/admin/HeroEditor";
import { getHeroAdmin } from "@/features/cms/admin-queries";
import { requireRole } from "@/lib/guards";

export const metadata = { title: "Hero slides" };

export default async function HeroAdminPage() {
    await requireRole(["admin", "editor"]);
    return <HeroEditor initial={await getHeroAdmin()} />;
}