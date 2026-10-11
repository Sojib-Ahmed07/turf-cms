// src/app/admin/sections/page.jsx
import SectionsEditor from "@/features/cms/admin/SectionsEditor";
import { sections } from "@/lib/sample-data";

export const metadata = { title: "Home sections" };

export default function Page() {
    return <SectionsEditor sections={sections} />;
}
