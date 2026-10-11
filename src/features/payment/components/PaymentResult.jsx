// src/features/payment/components/PaymentResult.jsx
import { Check, CalendarPlus, Hourglass, RotateCcw, X, Minus } from "lucide-react";
import Button from "@/components/ui/Button";
import PitchLines from "@/components/site/PitchLines";
import { cn, taka, time12 } from "@/lib/utils";

const COPY = {
    success: {
        icon: Check,
        ring: "bg-brand text-white",
        title: "You're booked",
        body: "Your ticket is in My bookings. Show it at the gate on match day.",
    },
    failed: {
        icon: X,
        ring: "bg-danger text-white",
        title: "Payment didn't go through",
        body: "Your bank or wallet declined the payment. No money was taken.",
    },
    cancelled: {
        icon: Minus,
        ring: "bg-ink-3 text-white",
        title: "Payment cancelled",
        body: "You left the payment page, so the slot has been released for other players.",
    },
};

/** status: "success" | "failed" | "cancelled" */
export default function PaymentResult({ status = "success", booking }) {
    const c = COPY[status];
    const Icon = c.icon;

    return (
        <div className="mx-auto max-w-xl px-4 pb-24 pt-10 sm:pt-16">
            <div className="overflow-hidden rounded-frame bg-white ring-1 ring-line">
                {/* Head */}
                <div className={cn("relative overflow-hidden px-8 pb-10 pt-12 text-center", status === "success" ? "bg-pitch text-white" : "bg-chalk")}>
                    {status === "success" && <PitchLines className="absolute inset-0 h-full w-full text-white/10" />}
                    <span className={cn("relative mx-auto grid h-16 w-16 place-items-center rounded-full ring-8", c.ring, status === "success" ? "ring-white/10" : "ring-white")}>
                        <Icon className="h-7 w-7" strokeWidth={3} />
                    </span>
                    <h1 className={cn("display relative mt-6 text-[clamp(34px,6vw,46px)]", status !== "success" && "text-ink")}>{c.title}</h1>
                    <p className={cn("relative mx-auto mt-3 max-w-[38ch] text-[15px] leading-relaxed", status === "success" ? "text-white/70" : "text-ink-3")}>{c.body}</p>
                </div>

                {/* Perforation */}
                <div aria-hidden="true" className="relative h-0">
                    <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-chalk ring-1 ring-line" />
                    <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-chalk ring-1 ring-line" />
                    <span className="absolute inset-x-6 top-0 border-t-2 border-dashed border-line" />
                </div>

                {/* Details */}
                <div className="p-8">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
                        <Item label="Ground" value={booking.pitch} />
                        <Item label="Date" value={formatDate(booking.date)} />
                        <Item label="Time" value={`${time12(booking.start)} to ${time12(booking.end)}`} />
                        <Item label="Booking ID" value={booking.id} />
                        {status === "success" && (
                            <>
                                <Item label="Paid" value={`${taka(booking.total)} with ${booking.paidWith}`} />
                                <Item label="Transaction" value={booking.trxId} />
                            </>
                        )}
                    </dl>

                    {status === "failed" && (
                        <p className="mt-6 flex items-center gap-2 rounded-ctl bg-flare-soft px-4 py-3 text-[14px] font-medium text-flare-deep">
                            <Hourglass className="h-4 w-4 shrink-0" />
                            We're still holding this slot for {booking.holdMinutesLeft} minutes.
                        </p>
                    )}

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        {status === "success" && (
                            <>
                                <Button href="/bookings" variant="ink" size="lg" className="flex-1">
                                    View my bookings
                                </Button>
                                <Button variant="outline" size="lg" className="flex-1">
                                    <CalendarPlus className="h-4 w-4" />
                                    Add to calendar
                                </Button>
                            </>
                        )}
                        {status === "failed" && (
                            <>
                                <Button size="lg" className="flex-1">
                                    <RotateCcw className="h-4 w-4" />
                                    Try payment again
                                </Button>
                                <Button href="/book" variant="outline" size="lg" className="flex-1">
                                    Pick another slot
                                </Button>
                            </>
                        )}
                        {status === "cancelled" && (
                            <Button href="/book" size="lg" className="flex-1">
                                Pick another slot
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            <p className="mt-6 text-center text-[13px] text-ink-3">
                Questions about a payment? Call the desk on +880 1711-000000.
            </p>
        </div>
    );
}

function Item({ label, value }) {
    return (
        <div>
            <dt className="text-[12px] font-medium text-ink-3">{label}</dt>
            <dd className="mt-1 text-[15px] font-semibold text-ink tnum">{value}</dd>
        </div>
    );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatDate(iso) {
    const d = new Date(`${iso}T00:00:00`);
    return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
