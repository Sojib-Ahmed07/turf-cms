// src/app/admin/hero/page.jsx
import HeroEditor from "@/features/cms/admin/HeroEditor";
import { heroSlides } from "@/lib/sample-data";

export const metadata = { title: "Hero slides" };

export default function HeroAdminPage() {
    return <HeroEditor slides={heroSlides} />;
}
