// src/components/admin/MediaPicker.jsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Loader2 } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { listMediaForPicker } from "@/features/cms/actions/media";
import { canOptimize, cn } from "@/lib/utils";

const FOLDERS = [
    { key: "all", label: "সব" },
    { key: "hero", label: "হিরো" },
    { key: "banners", label: "ব্যানার" },
    { key: "branding", label: "লোগো" },
    { key: "pitches", label: "মাঠ" },
    { key: "seo", label: "শেয়ার" },
    { key: "misc", label: "অন্যান্য" },
];

/** Pick an already-uploaded image. onSelect({ url, publicId, name }). */
export default function MediaPicker({ open, onClose, onSelect, folder = "all" }) {
    const [items, setItems] = useState(null);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState(folder);
    const [picked, setPicked] = useState(null);

    // Each time the picker opens: clear the last pick and start on the requested folder.
    const [wasOpen, setWasOpen] = useState(false);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setPicked(null);
            setFilter(folder);
        }
    }

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        listMediaForPicker().then((res) => {
            if (cancelled) return;
            if (res.ok) {
                setItems(res.data);
                setError("");
            } else setError(res.error);
        });
        return () => {
            cancelled = true;
        };
    }, [open, folder]);

    const list = (items ?? []).filter((m) => filter === "all" || m.folder === filter);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            size="lg"
            title="লাইব্রেরি থেকে ছবি সিলেক্ট করুন"
            description="আগে আপলোড করা ছবি। নতুন ছবি আপলোড করুন বক্স থেকে বা “ছবির লাইব্রেরি” পেজ থেকে।"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        বাদ দিন
                    </Button>
                    <Button
                        disabled={!picked}
                        onClick={() => {
                            onSelect({ url: picked.url, publicId: picked.publicId, name: picked.name });
                            onClose();
                        }}
                    >
                        এই ছবিটি নিন
                    </Button>
                </>
            }
        >
            <div className="no-scrollbar -mx-1 mb-4 flex gap-1 overflow-x-auto px-1">
                {FOLDERS.map((f) => (
                    <button
                        key={f.key}
                        type="button"
                        onClick={() => setFilter(f.key)}
                        className={cn(
                            "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold",
                            filter === f.key ? "bg-ink text-white" : "text-ink-3 hover:bg-chalk hover:text-ink"
                        )}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {error ? (
                <p className="rounded-ctl bg-danger-soft px-4 py-3 text-[14px] font-medium text-danger">{error}</p>
            ) : items === null ? (
                <p className="flex items-center justify-center gap-2 py-16 text-[14px] text-ink-3">
                    <Loader2 className="h-4 w-4 animate-spin" /> ছবি লোড হচ্ছে
                </p>
            ) : list.length === 0 ? (
                <p className="py-16 text-center text-[14px] text-ink-3">এখানে এখনো কোনো ছবি নেই।</p>
            ) : (
                <div className="grid max-h-[52vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
                    {list.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => setPicked(m)}
                            onDoubleClick={() => {
                                onSelect({ url: m.url, publicId: m.publicId, name: m.name });
                                onClose();
                            }}
                            className={cn(
                                "group relative aspect-square overflow-hidden rounded-ctl bg-pitch text-left ring-offset-2",
                                picked?.id === m.id ? "ring-2 ring-ink" : "hover:ring-2 hover:ring-line"
                            )}
                        >
                            <Image src={m.url} alt="" fill sizes="200px" unoptimized={!canOptimize(m.url)} className="object-cover" />
                            <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink/80 to-transparent px-2.5 pb-2 pt-6 text-[11px] font-semibold text-white">
                                {m.name}
                            </span>
                            {picked?.id === m.id && (
                                <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-brand text-white">
                                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </Dialog>
    );
}