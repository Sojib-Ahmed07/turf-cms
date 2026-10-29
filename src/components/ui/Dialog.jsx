// src/components/ui/Dialog.jsx
"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Modal dialog. Bottom sheet on mobile, centred card on desktop.
 * <Dialog open={open} onClose={() => setOpen(false)} title="Edit ground" footer={<Buttons/>}>…</Dialog>
 */
export default function Dialog({ open, onClose, title, description, footer, size = "md", children }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === "Escape" && onClose?.();
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/45 backdrop-blur-sm sm:items-center sm:p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        onClick={(e) => e.stopPropagation()}
                        initial={{ y: 32, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 24, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className={cn(
                            "flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-[24px] bg-white sm:rounded-card",
                            size === "sm" && "sm:max-w-md",
                            size === "md" && "sm:max-w-xl",
                            size === "lg" && "sm:max-w-3xl"
                        )}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
                            <div>
                                <h2 className="text-[17px] font-semibold text-ink wide">{title}</h2>
                                {description && <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{description}</p>}
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="বন্ধ করুন"
                                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-chalk hover:text-ink"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
                        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}