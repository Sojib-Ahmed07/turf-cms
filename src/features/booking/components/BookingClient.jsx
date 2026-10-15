// src/features/booking/components/BookingClient.jsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, RefreshCw } from "lucide-react";
import PitchPicker from "./PitchPicker";
import DateStrip from "./DateStrip";
import SlotBoard from "./SlotBoard";
import BookingSummary from "./BookingSummary";
import PromoBanner from "@/components/site/PromoBanner";
import Button from "@/components/ui/Button";
import { createBookingHold, previewCoupon } from "@/features/booking/actions";
import { payForBooking } from "@/features/payment/actions";
import { addDaysISO, operatingMinutes, shortDateLabel } from "@/lib/time";
import { taka, time12 } from "@/lib/utils";

const DAYS_AHEAD = 14;

// ?part= from the home page shortcut. Minutes since the 6 am day start (after midnight continues past 1440).
const PARTS = {
    morning: [6 * 60, 12 * 60],
    day: [12 * 60, 17 * 60],
    evening: [17 * 60, 22 * 60],
    late: [22 * 60, 30 * 60],
};

/** First free block matching ?t=HH:MM, or the first free one inside ?part=. */
function pickInitialBlock(blocks, time, part) {
    const free = blocks.filter((b) => b.state === "free");
    if (time) {
        const exact = free.find((b) => b.start === time);
        if (exact) return exact.id;
    }
    const range = PARTS[part];
    if (range) {
        const hit = free.find((b) => {
            const m = operatingMinutes(b.start);
            return m >= range[0] && m < range[1];
        });
        if (hit) return hit.id;
    }
    return null;
}

/**
 * Booking page. Same flow as the prototype:
 * pick ground -> pick date -> live slots from /api/booked-slots -> reserve.
 *
 * props:
 *   pitches        from getPitches()
 *   startDate      today's operating day "YYYY-MM-DD" (Asia/Dhaka), from the server
 *   initialPitchId optional ?pitch= from the URL
 *   initialDate    optional ?date= from the URL
 *   initialTime    optional ?t=HH:MM (from "Still free today" on the home page): selects that slot if free
 *   initialPart    optional ?part=morning|day|evening|late (home page shortcut): selects the first free slot in it
 *   banner         promo banner for placement "booking_page" (optional)
 *   venue          venue line for the summary card (site address)
 *   isSignedIn     boolean
 *   paymentsLive   SSLCommerz is configured: Pay goes straight to the gateway
 */
export default function BookingClient({
    pitches,
    startDate,
    initialPitchId,
    initialDate,
    initialTime = null,
    initialPart = null,
    banner,
    venue = "",
    isSignedIn,
    paymentsLive = false,
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [leaving, setLeaving] = useState(false); // on the way to the payment page
    const busy = isPending || leaving;

    const [pitchId, setPitchId] = useState(() =>
        pitches.some((p) => p.id === initialPitchId) ? initialPitchId : pitches[0]?.id
    );
    const [dayIndex, setDayIndex] = useState(() => {
        if (!initialDate) return 0;
        for (let i = 0; i < DAYS_AHEAD; i++) if (addDaysISO(startDate, i) === initialDate) return i;
        return 0;
    });
    const [board, setBoard] = useState({ key: null, blocks: [], error: "" }); // last loaded slot board
    const [blockId, setBlockId] = useState(null);
    const [payError, setPayError] = useState("");
    const [couponCode, setCouponCode] = useState(null); // code the player applied (kept when they change slot)
    const [coupon, setCoupon] = useState(null); // { code, discount, total, key } as last checked
    const [reloadKey, setReloadKey] = useState(0);
    // The ?t= / ?part= preselect applies once, to the first board that loads.
    const preselect = useRef(initialTime || initialPart ? { time: initialTime, part: initialPart } : null);

    const pitch = pitches.find((p) => p.id === pitchId);
    const date = useMemo(() => addDaysISO(startDate, dayIndex), [startDate, dayIndex]);
    const dateLabel = shortDateLabel(date);
    const boardKey = `${pitchId}|${date}|${reloadKey}`;
    const loading = Boolean(pitchId) && board.key !== boardKey;
    const blocks = board.key === boardKey ? board.blocks : [];
    const loadError = board.key === boardKey ? board.error : "";
    const block = blocks.find((b) => b.id === blockId && b.state === "free") ?? null;
    const startAsDate = useMemo(() => new Date(`${startDate}T00:00:00`), [startDate]);

    // Load live slots whenever the ground or date changes (or on "Try again").
    useEffect(() => {
        if (!pitchId) return;
        let cancelled = false;
        const key = `${pitchId}|${date}|${reloadKey}`;

        fetch(`/api/booked-slots?pitchId=${pitchId}&date=${date}`, { cache: "no-store" })
            .then(async (res) => {
                if (!res.ok) throw new Error("Failed to load slots");
                const data = await res.json();
                if (cancelled) return;
                const list = data.blocks ?? [];
                setBoard({ key, blocks: list, error: "" });
                if (preselect.current) {
                    const id = pickInitialBlock(list, preselect.current.time, preselect.current.part);
                    preselect.current = null;
                    if (id) setBlockId(id);
                }
            })
            .catch(() => {
                if (!cancelled) setBoard({ key, blocks: [], error: "We couldn't load the time slots. Check your connection and try again." });
            });

        return () => {
            cancelled = true;
        };
    }, [pitchId, date, reloadKey]);

    function choosePitch(id) {
        setPitchId(id);
        setBlockId(null);
        setPayError("");
    }

    function chooseDay(i) {
        setDayIndex(i);
        setBlockId(null);
        setPayError("");
    }

    const reload = useCallback(() => setReloadKey((k) => k + 1), []);

    // A discount depends on the slot (price, time, ground), so a checked coupon only counts for the slot
    // it was checked against (slotKey). When the slot changes, the code is checked again for the new one.
    const slotKey = block && pitch ? `${pitch.id}|${block.id}|${date}` : "";
    const activeCoupon = couponCode && coupon && coupon.key === slotKey ? coupon : null;

    useEffect(() => {
        if (!couponCode || !slotKey) return;
        let cancelled = false;
        const [pId, bId, d] = slotKey.split("|");
        previewCoupon({ pitchId: pId, blockId: bId, date: d, couponCode }).then((res) => {
            if (cancelled) return;
            if (res.ok) setCoupon({ ...res.data, key: slotKey });
            else {
                setCoupon(null);
                setCouponCode(null);
                setPayError(`Code ${couponCode} removed: ${res.error}`);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [couponCode, slotKey]);

    async function applyCoupon(code) {
        if (!block || !pitch) return { ok: false, error: "Pick a time slot first." };
        setPayError("");
        const res = await previewCoupon({ pitchId: pitch.id, blockId: block.id, date, couponCode: code });
        if (res.ok) {
            setCoupon({ ...res.data, key: slotKey });
            setCouponCode(res.data.code);
        }
        return res;
    }

    function removeCoupon() {
        setCoupon(null);
        setCouponCode(null);
    }

    const total = activeCoupon ? activeCoupon.total : Number(block?.price ?? 0);

    function handlePay() {
        if (!block || !pitch) return;
        setPayError("");

        if (!isSignedIn) {
            const back = `/book?pitch=${pitch.id}&date=${date}`;
            router.push(`/login?next=${encodeURIComponent(back)}`);
            return;
        }

        startTransition(async () => {
            const res = await createBookingHold({ pitchId: pitch.id, blockId: block.id, date, couponCode: activeCoupon?.code ?? "" });
            if (!res.ok) {
                if (res.couponError) {
                    removeCoupon();
                    setPayError(`${res.error} The code was removed; check the price and try again.`);
                    return;
                }
                if (res.needsLogin) {
                    router.push(`/login?next=${encodeURIComponent(`/book?pitch=${pitch.id}&date=${date}`)}`);
                    return;
                }
                setPayError(res.error);
                reload(); // slot may have been taken, refresh the board
                return;
            }
            if (res.data.free) {
                // The code covered the whole price: already confirmed, nothing to pay.
                router.push(`/bookings?held=${res.data.code}`);
                return;
            }
            if (!paymentsLive) {
                // Gateway not configured yet: the held booking waits in My bookings.
                router.push(`/bookings?held=${res.data.code}`);
                return;
            }
            // Slot is held; open the SSLCommerz payment page.
            const pay = await payForBooking(res.data.bookingId);
            if (pay.ok) {
                setLeaving(true);
                window.location.assign(pay.data.url);
                return;
            }
            // Couldn't open the gateway: the hold is still there, so send them to pay from My bookings.
            router.push(`/bookings?held=${res.data.code}&pay=failed`);
        });
    }

    if (!pitches.length) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-24 text-center">
                <h1 className="display text-[40px] text-ink">No grounds open for booking</h1>
                <p className="mt-3 text-ink-3">Check back soon, or call the desk to book.</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 pb-32 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pb-24">
            <header className="mb-10 max-w-2xl">
                <h1 className="display text-[clamp(40px,6vw,72px)] text-ink">Book a slot</h1>
                <p className="mt-3 text-[16px] text-ink-3">
                    Prices change with the time of day. Every price includes floodlights and the changing room.
                </p>
            </header>

            <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
                <div className="space-y-10 lg:col-span-8">
                    <Step n={1} title="Ground">
                        <PitchPicker pitches={pitches} value={pitchId} onChange={choosePitch} />
                    </Step>

                    <Step n={2} title="Date">
                        <DateStrip start={startAsDate} days={DAYS_AHEAD} value={dayIndex} onChange={chooseDay} />
                    </Step>

                    <Step n={3} title="Time">
                        {banner && <PromoBanner banner={banner} variant="inline" className="mb-6" />}

                        {loading ? (
                            <SlotSkeleton />
                        ) : loadError ? (
                            <div className="flex flex-col items-start gap-3 rounded-card bg-danger-soft p-5 text-[14px] text-danger">
                                <p className="flex items-center gap-2 font-semibold">
                                    <AlertCircle className="h-4 w-4" />
                                    {loadError}
                                </p>
                                <Button variant="outline" size="sm" onClick={reload}>
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Try again
                                </Button>
                            </div>
                        ) : blocks.length === 0 ? (
                            <div className="rounded-card border-2 border-dashed border-line p-10 text-center">
                                <p className="display text-[24px] text-ink">No slots on this day</p>
                                <p className="mt-2 text-[14px] text-ink-3">Pick another date or another ground.</p>
                            </div>
                        ) : (
                            <SlotBoard blocks={blocks} selectedId={block?.id} onSelect={setBlockId} />
                        )}
                    </Step>
                </div>

                <div className="hidden lg:col-span-4 lg:block">
                    <div className="sticky top-24">
                        <BookingSummary
                            pitch={pitch}
                            dateLabel={dateLabel}
                            block={block}
                            onPay={handlePay}
                            busy={busy}
                            error={payError}
                            isSignedIn={isSignedIn}
                            venue={venue}
                            coupon={activeCoupon}
                            onApplyCoupon={applyCoupon}
                            onRemoveCoupon={removeCoupon}
                        />
                    </div>
                </div>
            </div>

            {/* Mobile checkout bar */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur-xl lg:hidden">
                {payError && <p className="mx-auto mb-2 max-w-xl text-[13px] font-medium text-danger">{payError}</p>}
                <div className="mx-auto flex max-w-xl items-center gap-4">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-ink-3">
                            {block ? `${pitch?.name}, ${dateLabel}, ${time12(block.start)}` : "No slot selected"}
                        </p>
                        <p className="display text-[24px] text-ink tnum">
                            {taka(total)}
                            {activeCoupon && <span className="ml-2 text-[13px] font-semibold text-brand-deep">{activeCoupon.code}</span>}
                        </p>
                    </div>
                    <Button size="lg" disabled={!block || busy} onClick={handlePay}>
                        <Lock className="h-4 w-4" />
                        {busy ? "Reserving…" : !isSignedIn ? "Sign in to book" : block && total === 0 ? "Book for free" : `Pay ${taka(total)}`}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function Step({ n, title, children }) {
    return (
        <section>
            <h2 className="mb-4 flex items-center gap-3 text-[15px] font-semibold text-ink">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[13px] font-bold text-white tnum">{n}</span>
                {title}
            </h2>
            {children}
        </section>
    );
}

function SlotSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4" aria-label="Loading time slots">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[104px] animate-pulse rounded-[16px] bg-white ring-1 ring-line" />
            ))}
        </div>
    );
}