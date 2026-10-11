// src/app/admin/navigation/page.jsx
import NavigationEditor from "@/features/cms/admin/NavigationEditor";
import { navItems } from "@/lib/sample-data";

export const metadata = { title: "Navigation" };

export default function Page() {
    return <NavigationEditor items={navItems} />;
}
