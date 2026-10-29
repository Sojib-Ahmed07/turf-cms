// src/components/ErrorPanel.jsx
"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n/I18nProvider";

/** Shared body of the error.jsx boundaries. retry() re-fetches and re-renders the failed part of the page. */
export default function ErrorPanel({ error, retry, homeHref = "/", homeLabel }) {
    const { t } = useI18n();
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-danger-soft text-danger">
                <TriangleAlert className="h-6 w-6" />
            </span>
            <h1 className="display mt-6 text-[clamp(32px,5vw,48px)] text-ink">{t("errorPage.title")}</h1>
            <p className="mt-3 text-[15px] text-ink-3">{t("errorPage.body")}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button onClick={() => retry?.()} variant="ink">
                    <RotateCcw className="h-4 w-4" />
                    {t("common.tryAgain")}
                </Button>
                <Button href={homeHref} variant="outline">
                    {homeLabel || t("notFound.home")}
                </Button>
            </div>
            {error?.digest && <p className="mt-8 text-[12px] text-ink-4 tnum">{t("errorPage.code", { code: error.digest })}</p>}
        </div>
    );
}