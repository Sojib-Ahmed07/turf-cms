// src/features/payment/result-page.js
// Shared loader for /payment/success, /payment/failed and /payment/cancelled.
import "server-only";
import { getPaymentResult, recheckPayment } from "./service";
import { getSiteSettings } from "@/features/cms/queries";
import { prettyMethod } from "@/lib/sslcommerz";
import { getPayMethods, isGatewayConfigured } from "./methods";

/**
 * page: "success" | "failed" | "cancelled" (which URL the player landed on).
 * The real state always comes from the database, not from the URL.
 */
export async function loadPaymentResult(page, searchParams) {
    const params = await searchParams;
    const tran = typeof params?.tran === "string" ? params.tran : "";

    let r = tran ? await getPaymentResult(tran) : null;

    // Came back from the gateway but we haven't confirmed yet (slow or lost callback): ask that gateway once.
    if (r && page === "success" && r.paymentStatus === "initiated" && isGatewayConfigured(r.gateway)) {
        try {
            await recheckPayment(tran);
            r = await getPaymentResult(tran);
        } catch (err) {
            console.error("[payment:recheck]", err?.message ?? err);
        }
    }

    const settings = await getSiteSettings();
    const deskPhone = settings.contact.phone;
    const payMethods = await getPayMethods();
    if (!r) return { status: "missing", booking: null, canRetry: false, deskPhone, payMethods };

    let status;
    if (r.refundDue) status = "refund";
    else if (r.paymentStatus === "paid" && r.bookingStatus === "confirmed") status = "success";
    // Paid, but the booking is still being settled (the job finishes it within minutes): not a failure.
    else if (r.paymentStatus === "paid") status = "pending";
    else if (r.paymentStatus === "initiated") status = page === "cancelled" ? "cancelled" : page === "failed" ? "failed" : "pending";
    else status = r.paymentStatus === "cancelled" ? "cancelled" : "failed";

    return {
        status,
        booking: { ...r.booking, paidWith: prettyMethod(r.booking.paidWith) },
        canRetry: r.canRetry && payMethods.length > 0,
        deskPhone,
        payMethods,
    };
}