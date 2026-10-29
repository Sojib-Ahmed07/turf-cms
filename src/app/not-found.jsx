// src/app/not-found.jsx
import Link from "next/link";
import Button from "@/components/ui/Button";
import PitchLines from "@/components/site/PitchLines";
import { Mark } from "@/components/site/Logo";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
    const { t } = await getI18n();
    return { title: t("notFound.meta") };
}

/** Any URL that doesn't exist (and any notFound() call) lands here. */
export default async function NotFound() {
    const { t } = await getI18n();
    return (
        <main className="flex min-h-svh p-3 sm:p-4">
            <div className="relative flex flex-1 flex-col overflow-hidden rounded-frame bg-pitch px-6 py-8 text-white sm:px-12 sm:py-10">
                <PitchLines className="absolute inset-0 h-full w-full text-white/[0.07]" />

                <Link href="/" className="relative flex w-fit items-center gap-2.5" aria-label={t("nav.home")}>
                    <Mark className="h-9 w-9" />
                </Link>

                <div className="relative my-auto py-16 text-center">
                    <p className="display text-[clamp(120px,26vw,280px)] leading-[0.85] text-white/10 tnum" aria-hidden="true">
                        404
                    </p>
                    <h1 className="display -mt-[0.6em] text-[clamp(36px,6vw,64px)]">{t("notFound.title")}</h1>
                    <p className="mx-auto mt-4 max-w-md text-[16px] text-white/65">{t("notFound.body")}</p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <Button href="/" variant="white" size="lg">
                            {t("notFound.home")}
                        </Button>
                        <Button href="/book" size="lg">
                            {t("common.bookSlot")}
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
}