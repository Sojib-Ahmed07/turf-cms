// src/components/admin/ImageUploader.jsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { CloudUpload, Images, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Upload box for one image. UI only for now.
 * Later: signUpload() -> POST to Cloudinary -> saveMedia() -> onChange({ publicId, url }).
 *
 * ratio:  CSS aspect ratio of the preview, e.g. "16/7", "4/5", "1/1"
 * hint:   recommended size shown under the box
 * state:  "idle" | "uploading" (shows the progress bar)
 */
export default function ImageUploader({ value, ratio = "16/9", hint, state = "idle", progress = 64, compact = false, className }) {
    const [over, setOver] = useState(false);

    if (value) {
        return (
            <div className={className}>
                <div className="group relative overflow-hidden rounded-ctl bg-pitch ring-1 ring-line" style={{ aspectRatio: ratio }}>
                    <Image src={value.url} alt={value.alt ?? ""} fill sizes="480px" className="object-cover" />
                    <div className="absolute inset-0 flex items-end justify-between gap-2 bg-gradient-to-t from-ink/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <span className="truncate text-[12px] font-medium text-white/85">{value.name ?? "image.jpg"}</span>
                        <span className="flex gap-1.5">
                            <IconBtn label="Replace image"><RefreshCw className="h-3.5 w-3.5" /></IconBtn>
                            <IconBtn label="Remove image" danger><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                        </span>
                    </div>
                </div>
                {hint && <p className="mt-2 text-[12px] text-ink-3">{hint}</p>}
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
                }}
                className={cn(
                    "relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-ctl border-2 border-dashed px-4 text-center transition-colors",
                    over ? "border-brand bg-brand-soft" : "border-line bg-chalk/60 hover:border-ink-4 hover:bg-chalk"
                )}
                style={{ aspectRatio: compact ? undefined : ratio, minHeight: compact ? 120 : undefined }}
            >
                <input type="file" accept="image/*" className="sr-only" />
                {state === "uploading" ? (
                    <div className="w-full max-w-[220px]">
                        <p className="text-[13px] font-semibold text-ink">Uploading…</p>
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
                                Drop an image or <span className="text-brand-deep underline underline-offset-2">browse</span>
                            </span>
                            {hint && <span className="mt-1 block text-[12px] text-ink-3">{hint}</span>}
                        </span>
                    </>
                )}
            </label>
            <button type="button" className="mt-2 inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-semibold text-ink-2 hover:text-ink">
                <Images className="h-3.5 w-3.5" />
                From media library
            </button>
        </div>
    );
}

function IconBtn({ label, danger, children }) {
    return (
        <button
            type="button"
            aria-label={label}
            className={cn(
                "grid h-8 w-8 place-items-center rounded-full bg-white/95 text-ink transition hover:scale-105",
                danger && "hover:bg-danger hover:text-white"
            )}
        >
            {children}
        </button>
    );
}
