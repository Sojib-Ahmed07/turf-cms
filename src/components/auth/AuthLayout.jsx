// src/components/auth/AuthLayout.jsx
import Image from "next/image";
import Logo from "@/components/site/Logo";
import PitchLines from "@/components/site/PitchLines";
import { canOptimize } from "@/lib/utils";

/** Split screen: photo panel on the left (desktop), form on the right. */
export default function AuthLayout({ settings, imageUrl, title, subtitle, children, footer }) {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            {/* Visual panel */}
            <div className="relative m-3 hidden overflow-hidden rounded-frame bg-pitch lg:block">
                {imageUrl && <Image src={imageUrl} alt="" fill sizes="50vw" unoptimized={!canOptimize(imageUrl)} className="object-cover opacity-55" priority />}
                <div className="absolute inset-0 bg-gradient-to-t from-pitch via-pitch/40 to-pitch/20" />
                <PitchLines className="absolute inset-0 h-full w-full text-white/10" />

                <div className="relative flex h-full flex-col justify-between p-10 text-white">
                    <Logo settings={settings} tone="light" />

                    <div>
                        {/* Ticket preview */}
                        <div className="mb-10 w-[300px] overflow-hidden rounded-card bg-white text-ink shadow-[0_30px_60px_-20px_rgb(0_0_0/0.5)]">
                            <div className="flex items-center justify-between bg-brand px-5 py-3 text-white">
                                <span className="text-[13px] font-semibold">Confirmed</span>
                                <span className="text-[12px] font-semibold tnum opacity-80">TZ-8F2K1</span>
                            </div>
                            <div className="flex items-center gap-4 px-5 py-4">
                                <div className="text-center">
                                    <p className="text-[11px] font-medium text-ink-3">Sat</p>
                                    <p className="display text-[34px] leading-none tnum">17</p>
                                    <p className="text-[11px] font-semibold text-ink-3">Oct</p>
                                </div>
                                <span className="h-12 border-l-2 border-dashed border-line" />
                                <div>
                                    <p className="display text-[20px]">Pitch B</p>
                                    <p className="text-[13px] text-ink-3 tnum">9 pm to 10:30 pm</p>
                                </div>
                            </div>
                        </div>
                        <p className="display max-w-[16ch] text-[clamp(40px,4vw,60px)]">Book in a minute. Play all night.</p>
                    </div>
                </div>
            </div>

            {/* Form panel */}
            <div className="flex flex-col px-5 py-6 sm:px-10">
                <div className="lg:hidden">
                    <Logo settings={settings} />
                </div>
                <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
                    <h1 className="display text-[clamp(34px,5vw,44px)] text-ink">{title}</h1>
                    {subtitle && <p className="mt-2 text-[15px] text-ink-3">{subtitle}</p>}
                    <div className="mt-8">{children}</div>
                    {footer && <div className="mt-8 text-center text-[14px] text-ink-3">{footer}</div>}
                </div>
            </div>
        </div>
    );
}