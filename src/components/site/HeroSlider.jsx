// src/components/site/HeroSlider.jsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Fade from "embla-carousel-fade";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import PitchLines from "./PitchLines";
import { canOptimize, cn } from "@/lib/utils";

const FALLBACK = {
    id: "fallback",
    imageUrl: null,
    heading: "Book your turf in under a minute",
    subheading: "Pick a ground, choose a time, pay online. That's it.",
    ctaLabel: "Book a slot",
    ctaHref: "/book",
};

/**
 * Slides come from Admin > Hero slides (getHeroSlides).
 * 0 slides  -> branded placeholder
 * 1 slide   -> static banner (no controls)
 * 2+ slides -> crossfading slider with autoplay + swipe
 */
export default function HeroSlider({ slides = [], autoplayMs = 6000, pauseOnHover = true, liveNote }) {
    const list = slides.length ? slides : [FALLBACK];
    const isSlider = list.length > 1;

    const [emblaRef, emblaApi] = useEmblaCarousel(
        { loop: true, duration: 30, watchDrag: isSlider },
        isSlider ? [Fade(), Autoplay({ delay: autoplayMs, stopOnInteraction: false, stopOnMouseEnter: pauseOnHover })] : []
    );
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (!emblaApi) return;
        const onSelect = () => setIndex(emblaApi.selectedScrollSnap());
        emblaApi.on("select", onSelect);
        return () => emblaApi.off("select", onSelect);
    }, [emblaApi]);

    const go = useCallback((i) => emblaApi?.scrollTo(i), [emblaApi]);
    const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
    const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

    const active = list[index] ?? list[0];

    return (
        <section className="px-3 pt-1 sm:px-4">
            <div
                className="relative isolate h-[clamp(580px,86svh,860px)] overflow-hidden rounded-frame bg-pitch"
                onMouseEnter={() => pauseOnHover && setPaused(true)}
                onMouseLeave={() => setPaused(false)}
            >
                {/* Images */}
                <div ref={emblaRef} className="absolute inset-0 -z-10 overflow-hidden">
                    <div className="flex h-full touch-pan-y">
                        {list.map((s, i) => (
                            <div key={s.id} className="relative h-full min-w-0 flex-[0_0_100%]">
                                {s.imageUrl ? (
                                    <>
                                        <Image
                                            src={s.imageUrl}
                                            alt={s.alt ?? ""}
                                            fill
                                            priority={i === 0}
                                            sizes="100vw"
                                            unoptimized={!canOptimize(s.imageUrl)}
                                            className={cn(
                                                "object-cover transition-transform duration-[7000ms] ease-out",
                                                index === i ? "scale-[1.06]" : "scale-100",
                                                s.mobileImageUrl && "hidden sm:block"
                                            )}
                                        />
                                        {/* Optional portrait image for phones */}
                                        {s.mobileImageUrl && (
                                            <Image
                                                src={s.mobileImageUrl}
                                                alt={s.alt ?? ""}
                                                fill
                                                priority={i === 0}
                                                sizes="100vw"
                                                unoptimized={!canOptimize(s.mobileImageUrl)}
                                                className={cn(
                                                    "object-cover transition-transform duration-[7000ms] ease-out sm:hidden",
                                                    index === i ? "scale-[1.06]" : "scale-100"
                                                )}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <div className="grain absolute inset-0 bg-pitch" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Readability + chalk lines */}
                <div className="pointer-events-none absolute inset-0 -z-[5] bg-[linear-gradient(100deg,rgb(6_28_20/0.92)_0%,rgb(6_28_20/0.65)_38%,rgb(6_28_20/0.05)_75%)]" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-[5] h-1/2 bg-gradient-to-t from-[rgb(6_28_20/0.85)] to-transparent" />
                <PitchLines className="absolute inset-0 -z-[4] h-full w-full text-white/[0.13]" />

                {/* Live note */}
                {liveNote && (
                    <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-[13px] font-medium text-white ring-1 ring-inset ring-white/20 backdrop-blur-md sm:right-6 sm:top-6">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                        </span>
                        {liveNote}
                    </div>
                )}

                {/* Copy */}
                <div className="absolute inset-x-0 bottom-0 px-5 pb-24 sm:px-10 sm:pb-28 lg:px-14 lg:pb-28">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={active.id}
                            initial="hide"
                            animate="show"
                            exit="out"
                            className="max-w-[880px]"
                        >
                            {active.eyebrow && (
                                <motion.p
                                    variants={{ hide: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 }, out: { opacity: 0 } }}
                                    transition={{ duration: 0.4 }}
                                    className="mb-5 inline-flex rounded-full bg-flare px-3 py-1 text-[13px] font-bold text-ink"
                                >
                                    {active.eyebrow}
                                </motion.p>
                            )}
                            <h1 className="display text-balance text-[clamp(40px,6.4vw,92px)] text-white">
                                {active.heading.split(" ").map((word, i) => (
                                    <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                                        <motion.span
                                            className="inline-block"
                                            variants={{
                                                hide: { y: "105%" },
                                                show: { y: 0 },
                                                out: { y: "-105%" },
                                            }}
                                            transition={{ duration: 0.7, delay: 0.05 + i * 0.045, ease: [0.22, 1, 0.36, 1] }}
                                        >
                                            {word}&nbsp;
                                        </motion.span>
                                    </span>
                                ))}
                            </h1>
                            {active.subheading && (
                                <motion.p
                                    variants={{ hide: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 }, out: { opacity: 0 } }}
                                    transition={{ duration: 0.5, delay: 0.35 }}
                                    className="mt-6 max-w-[46ch] text-pretty text-[15px] leading-relaxed text-white/80 sm:text-lg"
                                >
                                    {active.subheading}
                                </motion.p>
                            )}
                            <motion.div
                                variants={{ hide: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 }, out: { opacity: 0 } }}
                                transition={{ duration: 0.5, delay: 0.45 }}
                                className="mt-8 flex flex-wrap items-center gap-3"
                            >
                                {active.ctaHref && (
                                    <Button href={active.ctaHref} size="lg">
                                        {active.ctaLabel}
                                    </Button>
                                )}
                                <Button href="/#grounds" variant="outline-light" size="lg">
                                    See grounds
                                </Button>
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Slide tabs: desktop */}
                {isSlider && (
                    <div className="absolute bottom-24 right-14 hidden w-[260px] flex-col gap-1 xl:flex">
                        {list.map((s, i) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => go(i)}
                                className={cn(
                                    "group relative overflow-hidden rounded-xl px-4 py-3 text-left transition-colors",
                                    i === index ? "bg-white/12 backdrop-blur-md" : "hover:bg-white/6"
                                )}
                            >
                                <span
                                    className={cn(
                                        "block truncate text-[13px] font-semibold",
                                        i === index ? "text-white" : "text-white/55 group-hover:text-white/80"
                                    )}
                                >
                                    {s.eyebrow ?? s.heading}
                                </span>
                                <span className="mt-2 block h-[3px] overflow-hidden rounded-full bg-white/15">
                                    {i === index && (
                                        <span
                                            key={`p-${index}`}
                                            className="block h-full origin-left rounded-full bg-brand"
                                            style={{
                                                animation: `hero-progress ${autoplayMs}ms linear forwards`,
                                                animationPlayState: paused ? "paused" : "running",
                                            }}
                                        />
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Arrows + segments: mobile / tablet */}
                {isSlider && (
                    <div className="absolute inset-x-5 bottom-7 flex items-center gap-3 sm:inset-x-10 xl:hidden">
                        <div className="flex flex-1 gap-1.5">
                            {list.map((s, i) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => go(i)}
                                    aria-label={`Show slide ${i + 1}`}
                                    className="h-1 flex-1 overflow-hidden rounded-full bg-white/20"
                                >
                                    {i === index && (
                                        <span
                                            key={`m-${index}`}
                                            className="block h-full origin-left rounded-full bg-white"
                                            style={{ animation: `hero-progress ${autoplayMs}ms linear forwards` }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                        <button type="button" onClick={prev} aria-label="Previous slide" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={next} aria-label="Next slide" className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            <style>{`@keyframes hero-progress{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>
        </section>
    );
}