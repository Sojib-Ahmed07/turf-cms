// src/components/NavProgress.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { NAV_START_EVENT } from "@/lib/nav-progress";

/**
 * Thin brand-coloured bar at the very top while the next page loads, so every page change shows that something
 * is happening (the page skeletons in each loading.jsx show next). Starts on a click on any same-site link, or on
 * startNavProgress() (lib/nav-progress.js) before router.push(); finishes when the address changes.
 * Must sit inside <Suspense> (useSearchParams).
 */
export default function NavProgress() {
    const pathname = usePathname();
    const search = useSearchParams();
    const url = `${pathname}?${search}`;
    const [state, setState] = useState("idle"); // idle | loading | done
    const [lastUrl, setLastUrl] = useState(url);
    const safety = useRef(null);

    // The address changed: the new page is on screen, finish the bar.
    if (url !== lastUrl) {
        setLastUrl(url);
        if (state === "loading") setState("done");
    }

    useEffect(() => {
        const start = () => {
            setState("loading");
            clearTimeout(safety.current);
            // Never stay stuck (a link to the page you're already on, a failed request...).
            safety.current = setTimeout(() => setState((s) => (s === "loading" ? "done" : s)), 10000);
        };
        const onClick = (e) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
            if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
            let next;
            try {
                next = new URL(a.href, window.location.href);
            } catch {
                return;
            }
            if (next.origin !== window.location.origin) return;
            // Same page (or only a #hash): nothing loads.
            if (next.pathname === window.location.pathname && next.search === window.location.search) return;
            start();
        };
        document.addEventListener("click", onClick, true);
        window.addEventListener(NAV_START_EVENT, start);
        return () => {
            document.removeEventListener("click", onClick, true);
            window.removeEventListener(NAV_START_EVENT, start);
            clearTimeout(safety.current);
        };
    }, []);

    // Fade out after finishing.
    useEffect(() => {
        if (state !== "done") return;
        const t = setTimeout(() => setState("idle"), 400);
        return () => clearTimeout(t);
    }, [state]);

    return (
        <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
            <div
                className={
                    state === "loading"
                        ? "h-full w-[85%] bg-brand shadow-[0_0_10px_var(--brand)] transition-[width] duration-[8000ms] ease-out"
                        : state === "done"
                            ? "h-full w-full bg-brand opacity-0 transition-[width,opacity] duration-300 ease-out"
                            : "h-full w-0 bg-brand opacity-0"
                }
            />
        </div>
    );
}