// src/app/admin/coupons/page.jsx
import CouponsManager from "@/features/admin/components/CouponsManager";
import { getCouponsAdmin } from "@/features/admin/commerce-queries";
import { requireRole } from "@/lib/guards";

export const metadata = { title: "কুপন" };

export default async function Page() {
    await requireRole(["admin"]);
    return <CouponsManager initial={await getCouponsAdmin()} />;
}