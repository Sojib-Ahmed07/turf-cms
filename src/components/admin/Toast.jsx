// src/components/admin/Toast.jsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small confirmation at the bottom of the screen.
 *   const { toast, showToast } = useToast();
 *   showToast("Saved");  showToast("Couldn't save", "error");
 *   ...render {toast} once in the component.
 */
export function useToast() {
    const [msg, setMsg] = useState(null);
    const timer = useRef(null);

    const showToast = useCallback((text, tone = "success") => {
        clearTimeout(timer.current);
        setMsg({ text, tone, key: Date.now() });
        timer.current = setTimeout(() => setMsg(null), tone === "error" ? 6000 : 2600);
    }, []);

    useEffect(() => () => clearTimeout(timer.current), []);

    const toast = (
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
            <AnimatePresence>
                {msg && (
                    <motion.p
                        key={msg.key}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        className={cn(
                            "flex max-w-md items-center gap-2 rounded-full px-5 py-3 text-[14px] font-semibold shadow-[0_20px_40px_-16px_rgb(0_0_0/0.5)]",
                            msg.tone === "error" ? "bg-danger text-white" : "bg-ink text-white"
                        )}
                    >
                        {msg.tone === "error" ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />}
                        {msg.text}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );

    return { toast, showToast };
}