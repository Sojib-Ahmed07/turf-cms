// src/app/(site)/payment/cancelled/page.jsx
import PaymentResult from "@/features/payment/components/PaymentResult";
import { loadPaymentResult } from "@/features/payment/result-page";

export const metadata = { title: "Payment cancelled" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }) {
    const result = await loadPaymentResult("cancelled", searchParams);
    return <PaymentResult {...result} />;
}