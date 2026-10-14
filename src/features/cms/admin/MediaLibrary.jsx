// src/features/cms/admin/MediaLibrary.jsx
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, CloudUpload, Copy, Search, Trash2, X } from "lucide-react";
import { PageHeader, Label } from "@/components/admin/Kit";
import { useToast } from "@/components/admin/Toast";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { TextInput } from "@/components/ui/Inputs";
import { deleteMedia, updateMediaAlt } from "@/features/cms/actions/media";
import { uploadImage } from "@/features/cms/upload-client";
import { canOptimize, cn } from "@/lib/utils";

const FOLDERS = [
    { key: "all", label: "All" },
    { key: "hero", label: "Hero" },
    { key: "banners", label: "Banners" },
    { key: "branding", label: "Branding" },
    { key: "pitches", label: "Grounds" },
    { key: "seo", label: "Sharing" },
    { key: "misc", label: "Other" },
];

function fileSize(bytes) {
    if (!bytes) return "–";
    return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/** items: from getMediaAdmin() */
export default function MediaLibrary({ items = [], uploadsReady = true }) {
    const router = useRouter();
    const inputRef = useRef(null);
    const [folder, setFolder] = useState("all");
    const [q, setQ] = useState("");
    const [selected, setSelected] = useState(null);
    const [uploads, setUploads] = useState([]); // [{ key, name, progress, error }]
    const [alt, setAlt] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [pending, startTransition] = useTransition();
    const { toast, showToast } = useToast();

    const list = useMemo(() => {
        const term = q.trim().toLowerCase();
        return items.filter((i) => (folder === "all" || i.folder === folder) && (!term || i.name.toLowerCase().includes(term)));
    }, [items, folder, q]);
    const item = items.find((i) => i.id === selected) ?? null;

    useEffect(() => setAlt(item?.alt ?? ""), [item?.id, item?.alt]);

    async function handleFiles(fileList) {
        const files = Array.from(fileList ?? []);
        if (!files.length) return;
        const target = folder === "all" ? "misc" : folder;
        const batch = files.map((f, i) => ({ key: `${Date.now()}-${i}`, name: f.name, progress: 0, error: "" }));
        setUploads((u) => [...batch, ...u]);
        let done = 0;
        for (const [i, file] of files.entries()) {
            const key = batch[i].key;
            try {
                await uploadImage(file, target, (p) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, progress: p } : x))));
                setUploads((u) => u.filter((x) => x.key !== key));
                done++;
            } catch (err) {
                setUploads((u) => u.map((x) => (x.key === key ? { ...x, error: err.message } : x)));
            }
        }
        if (inputRef.current) inputRef.current.value = "";
        if (done) {
            showToast(done === 1 ? "Image uploaded" : `${done} images uploaded`);
            router.refresh();
        }
    }

    function saveAlt() {
        if (!item || alt === (item.alt ?? "")) return;
        startTransition(async () => {
            const res = await updateMediaAlt({ id: item.id, alt });
            if (!res.ok) return showToast(res.error, "error");
            showToast("Description saved");
            router.refresh();
        });
    }

    function remove() {
        startTransition(async () => {
            const res = await deleteMedia(item.id);
            setConfirmDelete(false);
            if (!res.ok) return showToast(res.error, "error");
            setSelected(null);
            showToast("Image deleted");
            router.refresh();
        });
    }

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(item.url);
            showToast("Link copied");
        } catch {
            showToast("Couldn't copy. Select the link and copy it by hand.", "error");
        }
    }

    return (
        <div className="mx-auto max-w-[1280px]">
            <PageHeader
                title="Media"
                description="Every image uploaded to the website. Images are stored on Cloudinary and resized automatically."
                actions={
                    uploadsReady && (
                        <Button variant="ink" onClick={() => inputRef.current?.click()}>
                            <CloudUpload className="h-4 w-4" />
                            Upload images
                        </Button>
                    )
                }
            />

            {!uploadsReady && (
                <p className="mb-6 rounded-card bg-flare-soft px-5 py-4 text-[14px] font-medium text-flare-deep ring-1 ring-flare/40">
                    Image uploads aren&apos;t set up yet. Add the Cloudinary keys to the environment settings, then restart the site.
                </p>
            )}

            <input ref={inputRef} type="file" multiple accept="image/*" className="sr-only" onChange={(e) => handleFiles(e.target.files)} />

            <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
                <div className="rounded-card bg-white ring-1 ring-line">
                    <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
                        <div className="relative sm:w-64">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                            <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by file name" className="pl-10" />
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

                    {uploads.length > 0 && (
                        <ul className="space-y-2 border-b border-line p-4">
                            {uploads.map((u) => (
                                <li key={u.key} className="flex items-center gap-3 text-[13px]">
                                    <span className="min-w-0 flex-1 truncate font-medium text-ink">{u.name}</span>
                                    {u.error ? (
                                        <>
                                            <span className="max-w-[60%] truncate text-danger">{u.error}</span>
                                            <button type="button" aria-label="Dismiss" onClick={() => setUploads((x) => x.filter((y) => y.key !== u.key))} className="text-ink-3 hover:text-ink">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <span className="h-1.5 w-32 overflow-hidden rounded-full bg-line">
                                            <span className="block h-full rounded-full bg-brand transition-[width]" style={{ width: `${u.progress}%` }} />
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
                        {uploadsReady && (
                            <label
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    handleFiles(e.dataTransfer.files);
                                }}
                                className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-ctl border-2 border-dashed border-line text-center text-ink-3 hover:border-ink-4 hover:text-ink"
                            >
                                <input type="file" multiple accept="image/*" className="sr-only" onChange={(e) => handleFiles(e.target.files)} />
                                <CloudUpload className="h-6 w-6" />
                                <span className="px-2 text-[13px] font-semibold">Drop files here</span>
                                <span className="px-2 text-[11px]">Saved to {folder === "all" ? "Other" : FOLDERS.find((f) => f.key === folder)?.label}</span>
                            </label>
                        )}
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
                                <Image src={m.url} alt={m.alt} fill sizes="240px" unoptimized={!canOptimize(m.url)} className="object-cover transition-transform duration-500 group-hover:scale-105" />
                                {m.usedIn.length > 0 && (
                                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-ink">
                                        <Check className="h-3 w-3" /> In use
                                    </span>
                                )}
                                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent px-3 pb-2.5 pt-8">
                                    <span className="block truncate text-[12px] font-semibold text-white">{m.name}</span>
                                    <span className="block text-[11px] text-white/60 tnum">{fileSize(m.bytes)}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                    {list.length === 0 && (
                        <p className="px-4 pb-8 text-center text-[14px] text-ink-3">
                            {items.length === 0 ? "No images yet. Upload your first one." : "No images match."}
                        </p>
                    )}
                </div>

                {/* Details */}
                {item ? (
                    <aside className="h-fit rounded-card bg-white ring-1 ring-line xl:sticky xl:top-10">
                        <div className="flex items-center justify-between border-b border-line px-5 py-4">
                            <p className="truncate text-[14px] font-semibold text-ink">{item.name}</p>
                            <button type="button" aria-label="Close details" onClick={() => setSelected(null)} className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-chalk">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="space-y-5 p-5">
                            <div className="relative aspect-[4/3] overflow-hidden rounded-ctl bg-chalk">
                                <Image src={item.url} alt={item.alt} fill sizes="340px" unoptimized={!canOptimize(item.url)} className="object-contain" />
                            </div>
                            <dl className="grid grid-cols-2 gap-3 text-[13px]">
                                <Meta label="Size" value={item.width && item.height ? `${item.width} × ${item.height}` : "–"} />
                                <Meta label="File" value={`${fileSize(item.bytes)}${item.format ? `, ${item.format.toUpperCase()}` : ""}`} />
                                <Meta label="Folder" value={FOLDERS.find((f) => f.key === item.folder)?.label ?? item.folder} />
                                <Meta label="Used in" value={item.usedIn.length ? `${item.usedIn.length} place${item.usedIn.length > 1 ? "s" : ""}` : "Not used"} />
                            </dl>
                            {item.usedIn.length > 0 && (
                                <ul className="space-y-1 rounded-[12px] bg-chalk px-3 py-2.5 text-[12px] text-ink-2">
                                    {item.usedIn.map((u) => (
                                        <li key={u} className="truncate">
                                            {u}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div>
                                <Label htmlFor="m-alt" optional>
                                    Description
                                </Label>
                                <TextInput
                                    id="m-alt"
                                    value={alt}
                                    onChange={(e) => setAlt(e.target.value)}
                                    onBlur={saveAlt}
                                    onKeyDown={(e) => e.key === "Enter" && saveAlt()}
                                    maxLength={160}
                                    placeholder="Describe the image for screen readers"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1" onClick={copyLink}>
                                    <Copy className="h-3.5 w-3.5" />
                                    Copy link
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-danger hover:bg-danger-soft hover:text-danger"
                                    disabled={pending}
                                    onClick={() =>
                                        item.usedIn.length
                                            ? showToast(`Still used in ${item.usedIn[0]}${item.usedIn.length > 1 ? " and more" : ""}. Replace it there first.`, "error")
                                            : setConfirmDelete(true)
                                    }
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </aside>
                ) : (
                    <aside className="hidden h-fit rounded-card border-2 border-dashed border-line p-8 text-center text-[14px] text-ink-3 xl:block">
                        Select an image to see its details.
                    </aside>
                )}
            </div>

            <Dialog
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                size="sm"
                title="Delete this image?"
                description="It is removed from Cloudinary and the media library. This can't be undone."
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                            Keep it
                        </Button>
                        <Button variant="ink" className="bg-danger hover:bg-danger" disabled={pending} onClick={remove}>
                            Delete image
                        </Button>
                    </>
                }
            />
            {toast}
        </div>
    );
}

function Meta({ label, value }) {
    return (
        <div className="rounded-[12px] bg-chalk px-3 py-2.5">
            <dt className="text-[11px] font-medium text-ink-3">{label}</dt>
            <dd className="mt-0.5 font-semibold text-ink tnum">{value}</dd>
        </div>
    );
}