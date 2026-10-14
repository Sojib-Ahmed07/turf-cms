// src/features/cms/admin/BannersEditor.jsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader, Panel, Label, OrderButtons } from "@/components/admin/Kit";
import ImageUploader from "@/components/admin/ImageUploader";
import StatusBadge from "@/components/admin/StatusBadge";
import { useToast } from "@/components/admin/Toast";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Switch from "@/components/ui/Switch";
import { CharInput, TextInput, Select } from "@/components/ui/Inputs";
import PromoBanner from "@/components/site/PromoBanner";
import { deleteBanner, moveBanner, saveBanner, setBannerActive } from "@/features/cms/actions/banners";
import { shortDateLabel } from "@/lib/time";
import { canOptimize, cn } from "@/lib/utils";

const PLACEMENTS = [
    { key: "top_bar", label: "Top strip", where: "Thin bar above the menu on every page", variant: null, image: false },
    { key: "home_after_hero", label: "Under the hero", where: "First thing after the big banner on the home page", variant: "ticket", image: true },
    { key: "home_mid", label: "Mid page", where: "Between the steps and the venue section", variant: "band", image: false },
    { key: "booking_page", label: "Booking page", where: "Above the time slots on the booking page", variant: "inline", image: false },
    { key: "popup", label: "Popup", where: "Opens once per visitor, 2.5 seconds after they arrive", variant: null, image: true },
];

const EMPTY = {
    id: null,
    placement: "home_after_hero",
    image: null,
    badge: "",
    title: "",
    body: "",
    ctaLabel: "",
    ctaHref: "",
    couponId: "",
    isActive: true,
    startDate: "",
    endDate: "",
};
const FIELDS = Object.keys(EMPTY);
const toDraft = (b, placement) => ({ ...Object.fromEntries(FIELDS.map((k) => [k, b?.[k] ?? EMPTY[k]])), placement: b?.placement ?? placement });

/** initial: from getBannersAdmin() -> { banners, coupons } */
export default function BannersEditor({ initial }) {
    const router = useRouter();
    const { banners, coupons } = initial;
    const [placement, setPlacement] = useState("home_after_hero");
    const inPlacement = (p) => banners.filter((b) => b.placement === p);
    const list = inPlacement(placement);
    const [selectedId, setSelectedId] = useState(() => inPlacement("home_after_hero")[0]?.id ?? "new");
    const selected = banners.find((b) => b.id === selectedId) ?? null;
    const [draft, setDraft] = useState(() => toDraft(selected, placement));
    const [error, setError] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [pending, startTransition] = useTransition();
    const [busyRow, setBusyRow] = useState(null);
    const { toast, showToast } = useToast();

    const baseline = useMemo(() => toDraft(selected, placement), [selected, placement]);
    const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

    useEffect(() => {
        if (!dirty) setDraft(baseline);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseline]);

    const set = (patch) => {
        setError("");
        setDraft((d) => ({ ...d, ...patch }));
    };
    const confirmLeave = () => !dirty || window.confirm("Discard your unsaved changes to this banner?");

    function openPlacement(p) {
        if (p === placement || !confirmLeave()) return;
        const first = inPlacement(p)[0] ?? null;
        setPlacement(p);
        setSelectedId(first?.id ?? "new");
        setDraft(toDraft(first, p));
        setError("");
    }

    function select(id) {
        if (id === selectedId || !confirmLeave()) return;
        const b = banners.find((x) => x.id === id) ?? null;
        setSelectedId(id);
        setDraft(toDraft(b, placement));
        setError("");
    }

    function save() {
        startTransition(async () => {
            const res = await saveBanner(draft);
            if (!res.ok) {
                setError(res.error);
                return;
            }
            if (draft.placement !== placement) setPlacement(draft.placement);
            setSelectedId(res.data.id);
            setDraft((d) => ({ ...d, id: res.data.id }));
            showToast(draft.id ? "Banner saved" : "Banner added");
            router.refresh();
        });
    }

    function remove() {
        startTransition(async () => {
            const res = await deleteBanner(draft.id);
            setConfirmDelete(false);
            if (!res.ok) return showToast(res.error, "error");
            const rest = list.filter((b) => b.id !== draft.id);
            setSelectedId(rest[0]?.id ?? "new");
            setDraft(toDraft(rest[0] ?? null, placement));
            showToast("Banner deleted");
            router.refresh();
        });
    }

    function rowAction(id, fn) {
        setBusyRow(id);
        startTransition(async () => {
            const res = await fn();
            setBusyRow(null);
            if (!res.ok) showToast(res.error, "error");
            router.refresh();
        });
    }

    const current = PLACEMENTS.find((p) => p.key === placement);
    const draftPlacement = PLACEMENTS.find((p) => p.key === draft.placement) ?? current;
    const coupon = coupons.find((c) => c.id === draft.couponId);
    const showingNow = list.find((b) => b.status === "active");
    const preview = {
        id: draft.id ?? "draft",
        imageUrl: draftPlacement.image ? (draft.image?.url ?? null) : null,
        badge: draft.badge || null,
        title: draft.title || "Your banner title",
        body: draft.body || null,
        ctaLabel: draft.ctaLabel || null,
        ctaHref: draft.ctaHref || null,
        code: coupon?.isActive ? coupon.code : null,
        endsAt: draft.endDate ? `Ends ${shortDateLabel(draft.endDate).replace(/^\w+ /, "")}` : null,
    };

    return (
        <div className="mx-auto max-w-[1280px]">
            <PageHeader
                title="Offer banners"
                description="Discount and announcement banners. Pick where a banner shows, attach a promo code, and set the dates it runs."
                actions={
                    <Button variant="ink" onClick={() => select("new")}>
                        <Plus className="h-4 w-4" />
                        New banner
                    </Button>
                }
            />

            {/* Placement tabs */}
            <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                {PLACEMENTS.map((p) => {
                    const n = inPlacement(p.key).length;
                    return (
                        <button
                            key={p.key}
                            type="button"
                            onClick={() => openPlacement(p.key)}
                            className={cn(
                                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold transition-colors",
                                placement === p.key ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-line hover:ring-ink-4"
                            )}
                        >
                            {p.label}
                            <span className={cn("rounded-full px-1.5 text-[11px] tnum", placement === p.key ? "bg-white/20" : "bg-ink/5")}>{n}</span>
                        </button>
                    );
                })}
            </div>

            <div className="grid gap-6 xl:grid-cols-12">
                <div className="space-y-6 xl:col-span-7">
                    {/* Preview of the banner being edited */}
                    <Panel title="How it looks" description={draftPlacement.where} bodyClassName="bg-chalk/60 overflow-hidden">
                        {draftPlacement.variant ? (
                            <div className="pointer-events-none overflow-hidden">
                                <div style={{ zoom: 0.62 }}>
                                    <PromoBanner banner={preview} variant={draftPlacement.variant} />
                                </div>
                            </div>
                        ) : draftPlacement.key === "top_bar" ? (
                            <div className="flex items-center justify-center gap-3 rounded-ctl bg-pitch px-4 py-3 text-center text-[13px] text-white/85">
                                {preview.title}
                                {(preview.code || preview.badge) && (
                                    <span className="rounded border border-dashed border-flare px-1.5 font-bold text-flare">{preview.code ?? preview.badge}</span>
                                )}
                                {preview.ctaHref && <span className="font-semibold text-white underline underline-offset-4">{preview.ctaLabel || "Book now"}</span>}
                            </div>
                        ) : (
                            <PopupPreview banner={preview} />
                        )}
                    </Panel>

                    {/* List */}
                    <Panel
                        title={`Banners in "${current.label}"`}
                        description={
                            showingNow
                                ? `Showing now: "${showingNow.title}". Only the first live banner shows; use the arrows to change which.`
                                : "Nothing is showing here right now."
                        }
                        bodyClassName="p-3"
                    >
                        <ul className="space-y-1.5">
                            {list.map((b, i) => (
                                <li
                                    key={b.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => select(b.id)}
                                    onKeyDown={(e) => e.key === "Enter" && select(b.id)}
                                    className={cn(
                                        "flex cursor-pointer items-center gap-3 rounded-[14px] p-2 pr-3",
                                        b.id === selectedId ? "bg-chalk ring-2 ring-ink" : "hover:bg-chalk",
                                        busyRow === b.id && "opacity-60"
                                    )}
                                >
                                    <OrderButtons
                                        onMove={(d) => rowAction(b.id, () => moveBanner({ id: b.id, direction: d }))}
                                        first={i === 0}
                                        last={i === list.length - 1}
                                        disabled={pending}
                                        label="banner"
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[14px] font-semibold text-ink">{b.title}</span>
                                        <span className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
                                            <StatusBadge status={b.status} />
                                            {b.couponId && <span className="font-bold tracking-wider tnum">{coupons.find((c) => c.id === b.couponId)?.code}</span>}
                                            {b.endDate && <span>Until {shortDateLabel(b.endDate)}</span>}
                                        </span>
                                    </span>
                                    <span onClick={(e) => e.stopPropagation()}>
                                        <Switch
                                            size="sm"
                                            checked={b.isActive}
                                            onChange={(v) => rowAction(b.id, () => setBannerActive({ id: b.id, isActive: v }))}
                                            label={`Show ${b.title}`}
                                        />
                                    </span>
                                </li>
                            ))}
                            {selectedId === "new" && (
                                <li className="flex items-center gap-3 rounded-[14px] bg-chalk p-3 ring-2 ring-ink">
                                    <span className="truncate text-[14px] font-semibold text-ink">{draft.title || "New banner"}</span>
                                </li>
                            )}
                        </ul>
                        {selectedId !== "new" && (
                            <button
                                type="button"
                                onClick={() => select("new")}
                                className="mt-2 flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-line py-4 text-[14px] font-semibold text-ink-3 hover:text-ink"
                            >
                                <Plus className="h-4 w-4" /> Add a banner here
                            </button>
                        )}
                    </Panel>
                </div>

                {/* Editor */}
                <Panel
                    className="xl:col-span-5"
                    title={draft.id ? "Edit banner" : "New banner"}
                    actions={
                        draft.id && (
                            <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setConfirmDelete(true)}>
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                            </Button>
                        )
                    }
                >
                    <form
                        className="space-y-5"
                        onSubmit={(e) => {
                            e.preventDefault();
                            save();
                        }}
                    >
                        <div>
                            <Label htmlFor="b-place">Placement</Label>
                            <Select
                                id="b-place"
                                value={draft.placement}
                                onChange={(e) => set({ placement: e.target.value })}
                                options={PLACEMENTS.map((p) => ({ value: p.key, label: p.label }))}
                            />
                        </div>
                        {draftPlacement.image && (
                            <div>
                                <Label optional>Image</Label>
                                <ImageUploader
                                    value={draft.image}
                                    onChange={(v) => set({ image: v })}
                                    folder="banners"
                                    ratio={draft.placement === "popup" ? "16/9" : "16/7"}
                                    hint={draft.placement === "popup" ? "1200 × 675 px" : "1600 × 700 px"}
                                />
                            </div>
                        )}
                        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                            <div>
                                <Label optional>Badge</Label>
                                <CharInput max={12} value={draft.badge} onChange={(e) => set({ badge: e.target.value })} placeholder="20% off" />
                            </div>
                            <div>
                                <Label>Title</Label>
                                <CharInput max={50} value={draft.title} onChange={(e) => set({ title: e.target.value })} />
                            </div>
                        </div>
                        {draft.placement !== "top_bar" && draft.placement !== "booking_page" && (
                            <div>
                                <Label optional>Text</Label>
                                <CharInput max={140} multiline value={draft.body} onChange={(e) => set({ body: e.target.value })} />
                            </div>
                        )}
                        <div>
                            <Label htmlFor="b-code" optional>
                                Promo code
                            </Label>
                            <Select
                                id="b-code"
                                value={draft.couponId}
                                onChange={(e) => set({ couponId: e.target.value })}
                                options={[
                                    { value: "", label: "No code" },
                                    ...coupons.map((c) => ({
                                        value: c.id,
                                        label: `${c.code}  (${c.type === "percent" ? `${c.value}% off` : `৳${c.value} off`})${c.isActive ? "" : ", switched off"}`,
                                    })),
                                ]}
                            />
                            <p className="mt-1.5 text-[12px] text-ink-3">The code only shows while the coupon is switched on. Coupons are managed under Coupons.</p>
                        </div>
                        {draft.placement !== "booking_page" && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label optional>Button text</Label>
                                    <CharInput max={22} value={draft.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} />
                                </div>
                                <div>
                                    <Label optional>Button link</Label>
                                    <TextInput value={draft.ctaHref} onChange={(e) => set({ ctaHref: e.target.value })} placeholder="/book" />
                                </div>
                            </div>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="b-start" optional>
                                    Starts
                                </Label>
                                <TextInput id="b-start" type="date" value={draft.startDate} onChange={(e) => set({ startDate: e.target.value })} />
                            </div>
                            <div>
                                <Label htmlFor="b-end" optional>
                                    Ends after
                                </Label>
                                <TextInput id="b-end" type="date" value={draft.endDate} onChange={(e) => set({ endDate: e.target.value })} />
                            </div>
                        </div>

                        {error && <p className="rounded-ctl bg-danger-soft px-4 py-3 text-[14px] font-medium text-danger">{error}</p>}

                        <div className="flex justify-end gap-2 border-t border-line pt-5">
                            <Button
                                variant="outline"
                                disabled={pending || !dirty}
                                onClick={() => {
                                    setDraft(baseline);
                                    setError("");
                                }}
                            >
                                Discard
                            </Button>
                            <Button type="submit" disabled={pending || (!dirty && Boolean(draft.id))}>
                                {pending ? "Saving…" : draft.id ? "Save banner" : "Add banner"}
                            </Button>
                        </div>
                    </form>
                </Panel>
            </div>

            <Dialog
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                size="sm"
                title="Delete this banner?"
                description="It disappears from the website. The promo code itself is not deleted."
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                            Keep it
                        </Button>
                        <Button variant="ink" className="bg-danger hover:bg-danger" disabled={pending} onClick={remove}>
                            Delete banner
                        </Button>
                    </>
                }
            />
            {toast}
        </div>
    );
}

/** Small stand-in for the popup (the real one opens over the page). */
function PopupPreview({ banner }) {
    return (
        <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-card bg-white shadow-xl ring-1 ring-line">
            <div className="relative h-28 bg-pitch">
                {banner.imageUrl && <Image src={banner.imageUrl} alt="" fill sizes="300px" unoptimized={!canOptimize(banner.imageUrl)} className="object-cover opacity-70" />}
                {banner.badge && <span className="absolute bottom-3 left-4 rounded-full bg-flare px-2.5 py-0.5 text-[11px] font-bold text-ink">{banner.badge}</span>}
            </div>
            <div className="p-4">
                <p className="display text-[22px] leading-none text-ink">{banner.title}</p>
                {banner.body && <p className="mt-2 text-[12px] leading-relaxed text-ink-3">{banner.body}</p>}
                {banner.code && <p className="mt-3 inline-flex rounded-md border border-dashed border-flare px-2 py-1 text-[12px] font-bold tracking-wider text-flare-deep">{banner.code}</p>}
                {banner.ctaHref && <p className="mt-3 rounded-full bg-brand py-2 text-center text-[12px] font-semibold text-brand-ink">{banner.ctaLabel || "Book now"}</p>}
            </div>
        </div>
    );
}