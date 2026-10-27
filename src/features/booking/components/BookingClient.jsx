// src/features/booking/components/BookingClient.jsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, MailWarning, RefreshCw } from "lucide-react";
import PitchPicker from "./PitchPicker";
import DateStrip from "./DateStrip";
import SlotBoard from "./SlotBoard";
import BookingSummary from "./BookingSummary";
import PromoBanner from "@/components/site/PromoBanner";
import Button from "@/components/ui/Button";
import { createBookingHold, previewCoupon } from "@/features/booking/actions";
import { payForBooking } from "@/features/payment/actions";
import PayMethodPicker from "@/features/payment/components/PayMethodPicker";
import MethodOffDialog from "@/features/payment/components/MethodOffDialog";
import { addDaysISO } from "@/lib/time";
import { partOf } from "@/features/booking/parts";
import { BOOKING_DAYS_AHEAD } from "@/features/booking/calendar";
import { useI18n } from "@/i18n/I18nProvider";

const DAYS_AHEAD = BOOKING_DAYS_AHEAD;

/** First free block matching ?t=HH:MM, or the first free one inside ?part=. */
function pickInitialBlock(blocks, time, part) {
    const free = blocks.filter((b) => b.state === "free");
    if (time) {
        const exact = free.find((b) => b.start === time);
        if (exact) return exact.id;
    }
    if (part) {
        // ?part= from the home page search: first free slot in that part of the day
        const hit = free.find((b) => partOf(b.start, b.late) === part);
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
 *   emailVerified  boolean: unverified players see a verify banner and can't reserve
 *   payMethods     [{ id, label, hint, enabled }] from getPayMethods(): methods that are set up (empty = pay at the desk);
 *                  enabled:false = the admin switched it off (picking it shows "use another method")
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
    emailVerified = false,
    payMethods = [],
}) {
    const paymentsLive = payMethods.length > 0;
    const enabledMethods = payMethods.filter((m) => m.enabled);
    const { t, f } = useI18n();
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
    const [payMethod, setPayMethod] = useState(enabledMethods[0]?.id ?? payMethods[0]?.id ?? "");
    // "This method is off" dialog: { off, alternatives, bookingId?, code? } (bookingId when the slot is already held)
    const [offDialog, setOffDialog] = useState(null);
    const [couponCode, setCouponCode] = useState(null); // code the player applied (kept when they change slot)
    const [coupon, setCoupon] = useState(null); // { code, discount, total, key } as last checked
    const [reloadKey, setReloadKey] = useState(0);
    // The ?t= / ?part= preselect applies once, to the first board that loads.
    const preselect = useRef(initialTime || initialPart ? { time: initialTime, part: initialPart } : null);

    const pitch = pitches.find((p) => p.id === pitchId);
    const date = useMemo(() => addDaysISO(startDate, dayIndex), [startDate, dayIndex]);
    const dateLabel = f.date(date);
    const boardKey = `${pitchId}|${date}|${reloadKey}`;
    const loading = Boolean(pitchId) && board.key !== boardKey;
    const blocks = board.key === boardKey ? board.blocks : [];
    const loadError = board.key === boardKey ? board.error : "";
    const block = blocks.find((b) => b.id === blockId && b.state === "free") ?? null;
    const startAsDate = useMemo(() => new Date(`${startDate}T00:00:00`), [startDate]);

    // Unverified signed-in player: verify first, come back to this ground/date.
    const needsVerify = isSignedIn && !emailVerified;
    const verifyHref = `/verify-email?next=${encodeURIComponent(`/book?pitch=${pitchId ?? ""}&date=${date}`)}`;

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
                if (!cancelled) setBoard({ key, blocks: [], error: "load" }); // translated when shown
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
    const slotKey = block && pitch ? `${pitch.id}|${block.id}|${date}|${block.start}|${block.price}` : "";
    const activeCoupon = couponCode && coupon && coupon.key === slotKey ? coupon : null;

    useEffect(() => {
        if (!couponCode || !slotKey) return;
        let cancelled = false;
        const [pId, bId, d, start, price] = slotKey.split("|");
        previewCoupon({ pitchId: pId, blockId: bId, date: d, couponCode, startTime: start, price: Number(price) }).then((res) => {
            if (cancelled) return;
            if (res.ok) setCoupon({ ...res.data, key: slotKey });
            else {
                setCoupon(null);
                setCouponCode(null);
                setPayError(t("book.codeRemoved", { code: couponCode, reason: res.error }));
            }
        });
        return () => {
            cancelled = true;
        };
    }, [couponCode, slotKey, t]);

    async function applyCoupon(code) {
        if (!block || !pitch) return { ok: false, error: t("book.pickSlotFirst") };
        setPayError("");
        const res = await previewCoupon({ pitchId: pitch.id, blockId: block.id, date, couponCode: code, startTime: block.start, price: block.price });
        if (res.slotChanged) reload();
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

    /** Picker change: a switched-off method opens the dialog instead of being selected. */
    function chooseMethod(id) {
        const m = payMethods.find((x) => x.id === id);
        if (m && !m.enabled) {
            setOffDialog({ off: m, alternatives: enabledMethods });
            return;
        }
        setPayMethod(id);
    }

    /** Pay for a booking that is already held (after the admin switched a method off mid-checkout). */
    function payHeld(bookingId, code, method) {
        startTransition(async () => {
            const pay = await payForBooking(bookingId, method);
            if (pay.ok) {
                setLeaving(true);
                window.location.assign(pay.data.url);
                return;
            }
            if (pay.methodOff) {
                setOffDialog({ off: pay.off, alternatives: pay.available, bookingId, code });
                return;
            }
            router.push(`/bookings?held=${code}&pay=failed`);
        });
    }

    function onUseMethod(id) {
        const d = offDialog;
        setPayMethod(id);
        if (d?.bookingId) {
            payHeld(d.bookingId, d.code, id);
            return;
        }
        setOffDialog(null);
        handlePay(id);
    }

    function closeOffDialog() {
        const d = offDialog;
        setOffDialog(null);
        // The slot is already held: show it in My bookings so the player can pay later or cancel.
        if (d?.bookingId) router.push(`/bookings?held=${d.code}`);
    }

    function handlePay(methodOverride) {
        if (!block || !pitch) return;
        setPayError("");
        const method = typeof methodOverride === "string" ? methodOverride : payMethod;

        if (!isSignedIn) {
            const back = `/book?pitch=${pitch.id}&date=${date}`;
            router.push(`/login?next=${encodeURIComponent(back)}`);
            return;
        }
        if (needsVerify) {
            router.push(verifyHref);
            return;
        }
        // Don't reserve the slot with a method the admin switched off: say which one is on instead.
        if (paymentsLive && total > 0) {
            const m = payMethods.find((x) => x.id === method);
            if (!m || !m.enabled) {
                setOffDialog({ off: m ?? null, alternatives: enabledMethods });
                return;
            }
        }

        startTransition(async () => {
            const res = await createBookingHold({
                pitchId: pitch.id,
                blockId: block.id,
                date,
                couponCode: activeCoupon?.code ?? "",
                // what the player saw: the server refuses if the venue changed this slot meanwhile
                startTime: block.start,
                price: block.price,
            });
            if (!res.ok) {
                if (res.needsVerify) {
                    router.push(verifyHref);
                    return;
                }
                if (res.couponError) {
                    removeCoupon();
                    setPayError(t("book.codeRemovedRecheck", { reason: res.error }));
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
            // Slot is held; open the chosen gateway (bKash or SSLCommerz).
            const pay = await payForBooking(res.data.bookingId, method);
            if (pay.ok) {
                setLeaving(true);
                window.location.assign(pay.data.url);
                return;
            }
            if (pay.methodOff) {
                // Switched off between page load and Pay: the slot is held, offer the method that is on.
                setOffDialog({ off: pay.off, alternatives: pay.available, bookingId: res.data.bookingId, code: res.data.code });
                return;
            }
            if (pay.needsVerify) {
                router.push(verifyHref);
                return;
            }
            // Couldn't open the gateway: the hold is still there, so send them to pay from My bookings.
            router.push(`/bookings?held=${res.data.code}&pay=failed`);
        });
    }

    if (!pitches.length) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-24 text-center">
                <h1 className="display text-[40px] text-ink">{t("book.noGroundsTitle")}</h1>
                <p className="mt-3 text-ink-3">{t("book.noGroundsBody")}</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 pb-32 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pb-24">
            <header className="mb-10 max-w-2xl">
                <h1 className="display text-[clamp(40px,6vw,72px)] text-ink">{t("book.title")}</h1>
                <p className="mt-3 text-[16px] text-ink-3">
                    {t("book.intro")}
                </p>
            </header>

            {needsVerify && (
                <div className="mb-8 flex flex-col gap-3 rounded-card bg-flare/15 p-5 ring-1 ring-flare/40 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-ink" />
                        <div>
                            <p className="font-semibold text-ink">{t("book.verifyTitle")}</p>
                            <p className="text-[14px] text-ink-2">
                                {t("book.verifyBody")}
                            </p>
                        </div>
                    </div>
                    <Button href={verifyHref} variant="ink" size="sm">
                        {t("book.verifyNow")}
                    </Button>
                </div>
            )}

            <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
                <div className="space-y-10 lg:col-span-8">
                    <Step n={f.digits(1)} title={t("book.stepGround")}>
                        <PitchPicker pitches={pitches} value={pitchId} onChange={choosePitch} />
                    </Step>

                    <Step n={f.digits(2)} title={t("book.stepDate")}>
                        <DateStrip start={startAsDate} days={DAYS_AHEAD} value={dayIndex} onChange={chooseDay} />
                    </Step>

                    <Step n={f.digits(3)} title={t("book.stepTime")}>
                        {banner && <PromoBanner banner={banner} variant="inline" className="mb-6" />}

                        {loading ? (
                            <SlotSkeleton label={t("book.loadingSlots")} />
                        ) : loadError ? (
                            <div className="flex flex-col items-start gap-3 rounded-card bg-danger-soft p-5 text-[14px] text-danger">
                                <p className="flex items-center gap-2 font-semibold">
                                    <AlertCircle className="h-4 w-4" />
                                    {t("book.loadError")}
                                </p>
                                <Button variant="outline" size="sm" onClick={reload}>
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    {t("common.tryAgain")}
                                </Button>
                            </div>
                        ) : blocks.length === 0 ? (
                            <div className="rounded-card border-2 border-dashed border-line p-10 text-center">
                                <p className="display text-[24px] text-ink">{t("book.noSlotsTitle")}</p>
                                <p className="mt-2 text-[14px] text-ink-3">{t("book.noSlotsBody")}</p>
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
                            methods={payMethods}
                            method={payMethod}
                            onMethodChange={chooseMethod}
                        />
                    </div>
                </div>
            </div>

            <MethodOffDialog
                open={Boolean(offDialog)}
                onClose={closeOffDialog}
                off={offDialog?.off ?? null}
                alternatives={offDialog?.alternatives ?? []}
                onUse={onUseMethod}
                busy={busy}
            />

            {/* Mobile checkout bar */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur-xl lg:hidden">
                {payError && <p className="mx-auto mb-2 max-w-xl text-[13px] font-medium text-danger">{payError}</p>}
                {block && total > 0 && isSignedIn && !needsVerify && (
                    <PayMethodPicker compact methods={payMethods} value={payMethod} onChange={chooseMethod} className="mx-auto mb-2 max-w-xl" />
                )}
                <div className="mx-auto flex max-w-xl items-center gap-4">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-ink-3">
                            {block ? `${pitch?.name}, ${dateLabel}, ${f.time(block.start)}` : t("book.noSlot")}
                        </p>
                        <p className="display text-[24px] text-ink tnum">
                            {f.taka(total)}
                            {activeCoupon && <span className="ml-2 text-[13px] font-semibold text-brand-deep">{activeCoupon.code}</span>}
                        </p>
                    </div>
                    <Button size="lg" disabled={!block || busy} onClick={handlePay}>
                        <Lock className="h-4 w-4" />
                        {busy
                            ? t("book.reserving")
                            : needsVerify
                                ? t("book.verifyToBook")
                                : !isSignedIn
                                    ? t("book.signInToBook")
                                    : block && total === 0
                                        ? t("book.bookFree")
                                        : t("book.pay", { amount: f.taka(total) })}
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

function SlotSkeleton({ label }) {
    return (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4" aria-label={label}>
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[104px] animate-pulse rounded-[16px] bg-white ring-1 ring-line" />
            ))}
        </div>
    );
}