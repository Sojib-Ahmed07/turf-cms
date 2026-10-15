// src/app/admin/payments/page.jsx
import PaymentsTable from "@/features/admin/components/PaymentsTable";
import { getPaymentsAdmin } from "@/features/admin/commerce-queries";
import { isSslczConfigured } from "@/lib/sslcommerz";
import { requireRole } from "@/lib/guards";

export const metadata = { title: "Payments" };

const STATUSES = ["paid", "started", "failed", "refund_due", "refunded", "risky"];

export default async function Page({ searchParams }) {
    await requireRole(["admin"]);
    const params = await searchParams;
    const filters = {
        q: typeof params?.q === "string" ? params.q.slice(0, 60) : "",
        status: STATUSES.includes(params?.status) ? params.status : "",
    };
    const page = Math.max(1, Number.parseInt(params?.page, 10) || 1);
    const data = await getPaymentsAdmin({ ...filters, page });
    return <PaymentsTable data={data} filters={filters} gatewayReady={isSslczConfigured()} />;
}