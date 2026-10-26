// src/app/admin/payments/page.jsx
import PaymentsTable from "@/features/admin/components/PaymentsTable";
import { getPaymentsAdmin } from "@/features/admin/commerce-queries";
import { configuredGateways, getPaymentMethodsAdmin } from "@/features/payment/methods";
import { requireRole } from "@/lib/guards";

export const metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

const STATUSES = ["paid", "started", "failed", "refund_due", "refunded", "risky"];

export default async function Page({ searchParams }) {
    await requireRole(["admin"]);
    const params = await searchParams;
    const filters = {
        q: typeof params?.q === "string" ? params.q.slice(0, 60) : "",
        status: STATUSES.includes(params?.status) ? params.status : "",
    };
    const page = Math.max(1, Number.parseInt(params?.page, 10) || 1);
    const [data, methods] = await Promise.all([getPaymentsAdmin({ ...filters, page }), getPaymentMethodsAdmin()]);
    return <PaymentsTable data={data} filters={filters} readyGateways={configuredGateways()} methods={methods} />;
}