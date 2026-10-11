// src/features/cms/admin/MediaLibrary.jsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { CloudUpload, Copy, Search, Trash2, X } from "lucide-react";
import { PageHeader, Label } from "@/components/admin/Kit";
import Button from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Inputs";
import { cn } from "@/lib/utils";

const FOLDERS = [
    { key: "all", label: "All" },
    { key: "hero", label: "Hero" },
    { key: "banners", label: "Banners" },
    { key: "branding", label: "Branding" },
    { key: "pitches", label: "Grounds" },
];

export default function MediaLibrary({ items = [] }) {
    const [folder, setFolder] = useState("all");
    const [selected, setSelected] = useState(items[0]?.id);
    const list = folder === "all" ? items : items.filter((i) => i.folder === folder);
    const item = items.find((i) => i.id === selected);

    return (
        <div className="mx-auto max-w-[1280px]">
            <PageHeader
                title="Media"
                description="Every image uploaded to the website. Images are stored on Cloudinary and resized automatically."
                actions={
                    <Button variant="ink">
                        <CloudUpload className="h-4 w-4" />
                        Upload images
                    </Button>
                }
            />

            <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
                <div className="rounded-card bg-white ring-1 ring-line">
                    <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
                        <div className="relative sm:w-64">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                            <TextInput placeholder="Search by file name" className="pl-10" />
                        </div>
                        <div className="no-scrollbar flex gap-1 overflow-x-auto sm:ml-auto">
                            {FOLDERS.map((f) => (
                                <button
                                    key={f.key}
                                    type="button"
                                    onClick={() => setFolder(f.key)}
                                    className={cn(
                                        "shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold",
                                        folder === f.key ? "bg-ink text-white" : "text-ink-3 hover:bg-chalk hover:text-ink"
                                    )}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
                        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-ctl border-2 border-dashed border-line text-center text-ink-3 hover:border-ink-4 hover:text-ink">
                            <input type="file" multiple accept="image/*" className="sr-only" />
                            <CloudUpload className="h-6 w-6" />
                            <span className="text-[13px] font-semibold">Drop files here</span>
                        </label>
                        {list.map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setSelected(m.id)}
                                className={cn(
                                    "group relative aspect-square overflow-hidden rounded-ctl bg-pitch text-left outline-none ring-offset-2 ring-offset-white",
                                    selected === m.id ? "ring-2 ring-ink" : "hover:ring-2 hover:ring-line"
                                )}
                            >
                                <Image src={m.url} alt="" fill sizes="240px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent px-3 pb-2.5 pt-8">
                                    <span className="block truncate text-[12px] font-semibold text-white">{m.name}</span>
                                    <span className="block text-[11px] text-white/60 tnum">{m.size}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Details */}
                {item && (
                    <aside className="h-fit rounded-card bg-white ring-1 ring-line xl:sticky xl:top-10">
                        <div className="flex items-center justify-between border-b border-line px-5 py-4">
                            <p className="truncate text-[14px] font-semibold text-ink">{item.name}</p>
                            <button type="button" aria-label="Close details" onClick={() => setSelected(null)} className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-chalk">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="space-y-5 p-5">
                            <div className="relative aspect-[4/3] overflow-hidden rounded-ctl bg-pitch">
                                <Image src={item.url} alt="" fill sizes="340px" className="object-cover" />
                            </div>
                            <dl className="grid grid-cols-2 gap-3 text-[13px]">
                                <Meta label="Size" value={item.dims} />
                                <Meta label="File" value={item.size} />
                                <Meta label="Folder" value={item.folder} />
                                <Meta label="Used in" value={item.folder === "hero" ? "Hero slide" : "Ground card"} />
                            </dl>
                            <div>
                                <Label>Alt text</Label>
                                <TextInput placeholder="Describe the image for screen readers" defaultValue="Floodlit football turf at night" />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1">
                                    <Copy className="h-3.5 w-3.5" />
                                    Copy link
                                </Button>
                                <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft hover:text-danger">
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}

function Meta({ label, value }) {
    return (
        <div className="rounded-[12px] bg-chalk px-3 py-2.5">
            <dt className="text-[11px] font-medium text-ink-3">{label}</dt>
            <dd className="mt-0.5 font-semibold capitalize text-ink tnum">{value}</dd>
        </div>
    );
}
