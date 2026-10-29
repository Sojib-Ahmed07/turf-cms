// src/components/admin/ImageUploader.jsx
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { CloudUpload, Images, RefreshCw, Trash2 } from "lucide-react";
import MediaPicker from "./MediaPicker";
import { uploadImage } from "@/features/cms/upload-client";
import { canOptimize, cn } from "@/lib/utils";

/**
 * Upload box for one image (Cloudinary). Controlled:
 *   value     { url, publicId?, name? } or null
 *   onChange  (image | null) => void, called after the upload is saved in the media library
 *   folder    media folder: "branding" | "hero" | "banners" | "pitches" | "seo" | "misc"
 *   ratio     CSS aspect ratio of the preview, e.g. "16/7", "4/5", "1/1"
 *   hint      recommended size shown under the box
 *   fit       "cover" (photos) or "contain" (logos, icons)
 *   dark      preview a contained image on the dark pitch colour (logos for dark backgrounds)
 */
export default function ImageUploader({
    value,
    onChange,
    folder = "misc",
    ratio = "16/9",
    hint,
    compact = false,
    fit = "cover",
    dark = false,
    disabled = false,
    className,
}) {
    const inputRef = useRef(null);
    const [over, setOver] = useState(false);
    const [progress, setProgress] = useState(null); // null = idle, 0..100 = uploading
    const [error, setError] = useState("");
    const [picking, setPicking] = useState(false);

    async function handleFile(file) {
        if (!file || disabled) return;
        setError("");
        setProgress(0);
        try {
            const item = await uploadImage(file, folder, setProgress);
            onChange?.({ url: item.url, publicId: item.publicId, name: item.name });
        } catch (err) {
            setError(err.message || "ছবি আপলোড হয়নি। আবার চেষ্টা করুন।");
        } finally {
            setProgress(null);
            if (inputRef.current) inputRef.current.value = "";
        }
    }

    const fileInput = (
        <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={disabled || progress !== null}
            onChange={(e) => handleFile(e.target.files?.[0])}
        />
    );

    const picker = (
        <MediaPicker
            open={picking}
            folder={folder}
            onClose={() => setPicking(false)}
            onSelect={(img) => {
                setError("");
                onChange?.(img);
            }}
        />
    );

    const errorLine = error && <p className="mt-2 text-[12px] font-medium text-danger">{error}</p>;

    if (value?.url && progress === null) {
        return (
            <div className={className}>
                <div
                    className={cn("group relative overflow-hidden rounded-ctl ring-1 ring-line", fit === "contain" && !dark ? "bg-chalk" : "bg-pitch")}
                    style={{ aspectRatio: ratio }}
                >
                    <Image
                        src={value.url}
                        alt={value.alt ?? ""}
                        fill
                        sizes="480px"
                        unoptimized={!canOptimize(value.url)}
                        className={fit === "contain" ? "object-contain p-3" : "object-cover"}
                    />
                    <div className="absolute inset-0 flex items-end justify-between gap-2 bg-gradient-to-t from-ink/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                        <span className="truncate text-[12px] font-medium text-white/85">{value.name ?? value.publicId?.split("/").pop() ?? "ছবি"}</span>
                        {!disabled && (
                            <span className="flex gap-1.5">
                                <IconBtn label="ছবি বদলান" onClick={() => inputRef.current?.click()}>
                                    <RefreshCw className="h-3.5 w-3.5" />
                                </IconBtn>
                                <IconBtn label="ছবি সরান" danger onClick={() => onChange?.(null)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </IconBtn>
                            </span>
                        )}
                    </div>
                    {fileInput}
                </div>
                {hint && <p className="mt-2 text-[12px] text-ink-3">{hint}</p>}
                {errorLine}
                {picker}
            </div>
        );
    }

    return (
        <div className={className}>
            <label
                onDragOver={(e) => {
                    e.preventDefault();
                    setOver(true);
                }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setOver(false);
                    handleFile(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                    "relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-ctl border-2 border-dashed px-4 text-center transition-colors",
                    over ? "border-brand bg-brand-soft" : "border-line bg-chalk/60 hover:border-ink-4 hover:bg-chalk",
                    (disabled || progress !== null) && "pointer-events-none"
                )}
                style={{ aspectRatio: compact ? undefined : ratio, minHeight: compact ? 120 : undefined }}
            >
                {fileInput}
                {progress !== null ? (
                    <div className="w-full max-w-[220px]">
                        <p className="text-[13px] font-semibold text-ink">{progress < 100 ? "আপলোড হচ্ছে…" : "সেভ হচ্ছে…"}</p>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
                            <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="mt-2 text-[12px] text-ink-3 tnum">{progress}%</p>
                    </div>
                ) : (
                    <>
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-ink-2 ring-1 ring-line">
                            <CloudUpload className="h-5 w-5" />
                        </span>
                        <span>
                            <span className="block text-[14px] font-semibold text-ink">
                                ছবি এখানে টেনে আনুন, অথবা <span className="text-brand-deep underline underline-offset-2">ফাইল সিলেক্ট করুন</span>
                            </span>
                            {hint && <span className="mt-1 block text-[12px] text-ink-3">{hint}</span>}
                        </span>
                    </>
                )}
            </label>
            {!disabled && (
                <button
                    type="button"
                    onClick={() => setPicking(true)}
                    className="mt-2 inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-semibold text-ink-2 hover:text-ink"
                >
                    <Images className="h-3.5 w-3.5" />
                    লাইব্রেরি থেকে নিন
                </button>
            )}
            {errorLine}
            {picker}
        </div>
    );
}

function IconBtn({ label, danger, onClick, children }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={onClick}
            className={cn(
                "grid h-8 w-8 place-items-center rounded-full bg-white/95 text-ink transition hover:scale-105",
                danger && "hover:bg-danger hover:text-white"
            )}
        >
            {children}
        </button>
    );
}