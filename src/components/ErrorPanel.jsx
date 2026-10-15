// src/components/ErrorPanel.jsx
"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import Button from "@/components/ui/Button";

/** Shared body of the error.jsx boundaries. retry() re-fetches and re-renders the failed part of the page. */
export default function ErrorPanel({ error, retry, homeHref = "/", homeLabel = "Go home" }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-danger-soft text-danger">
                <TriangleAlert className="h-6 w-6" />
            </span>
            <h1 className="display mt-6 text-[clamp(32px,5vw,48px)] text-ink">Something went wrong</h1>
            <p className="mt-3 text-[15px] text-ink-3">
                This page couldn&apos;t load. It&apos;s usually a short hiccup, so try again. If it keeps happening, let us know.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button onClick={() => retry?.()} variant="ink">
                    <RotateCcw className="h-4 w-4" />
                    Try again
                </Button>
                <Button href={homeHref} variant="outline">
                    {homeLabel}
                </Button>
            </div>
            {error?.digest && <p className="mt-8 text-[12px] text-ink-4 tnum">Error code {error.digest}</p>}
        </div>
    );
}