// src/app/(site)/payment/failed/page.jsx
import PaymentResult from "@/features/payment/components/PaymentResult";
import { loadPaymentResult } from "@/features/payment/result-page";

export const metadata = { title: "Payment failed" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }) {
    const result = await loadPaymentResult("failed", searchParams);
    return <PaymentResult {...result} />;
}