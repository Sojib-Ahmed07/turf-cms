// src/app/admin/coupons/page.jsx
import CouponsManager from "@/features/admin/components/CouponsManager";
import { coupons } from "@/lib/admin-sample-data";
import { requireRole } from "@/lib/guards";

export const metadata = { title: "Coupons" };

export default async function Page() {
    await requireRole(["admin"]);
    return <CouponsManager coupons={coupons} />;
}