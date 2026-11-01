// src/components/site/PageSkeletons.jsx
// Loading screens for the public pages (used by each route's loading.jsx). Shapes follow the real page layouts,
// so the page doesn't jump when the content arrives. The navbar and footer stay on screen while these show.
import { Bone, CardBone, Loading, times } from "@/components/ui/Skeleton";

const PAGE = "mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12 lg:px-8";

function Heading({ wide = false }) {
    return (
        <>
            <Bone className={wide ? "h-14 w-3/4 max-w-xl sm:h-20" : "h-14 w-2/3 max-w-md sm:h-20"} />
            <Bone className="mt-4 h-4 w-full max-w-lg rounded-full" />
            <Bone className="mt-2 h-4 w-2/3 max-w-sm rounded-full" />
        </>
    );
}

/** Home: hero, quick search, grounds. */
export function HomeSkeleton() {
    return (
        <Loading className="px-2 pt-2 sm:px-3">
            <div className="relative h-[70svh] min-h-[460px] animate-pulse overflow-hidden rounded-[28px] bg-pitch/90 sm:rounded-[32px]">
                <div className="absolute bottom-[18%] left-6 right-6 max-w-xl space-y-4 sm:left-12">
                    <div className="h-12 w-4/5 rounded-ctl bg-white/10 sm:h-16" />
                    <div className="h-12 w-3/5 rounded-ctl bg-white/10 sm:h-16" />
                    <div className="h-4 w-full rounded-full bg-white/10" />
                    <div className="flex gap-3 pt-2">
                        <div className="h-12 w-36 rounded-full bg-white/15" />
                        <div className="h-12 w-40 rounded-full bg-white/10" />
                    </div>
                </div>
            </div>
            <div className="mx-auto -mt-10 max-w-5xl px-2">
                <CardBone className="h-24 shadow-[0_20px_40px_-24px_rgb(0_0_0/0.3)]" />
            </div>
            <div className={PAGE}>
                <Heading />
                <div className="mt-10 grid gap-4 lg:grid-cols-12">
                    <CardBone className="h-[420px] lg:col-span-7" />
                    <div className="grid gap-4 lg:col-span-5">
                        <CardBone className="h-[202px]" />
                        <CardBone className="h-[202px]" />
                    </div>
                </div>
            </div>
        </Loading>
    );
}

/** /book: ground picker, date strip, slots + summary card. */
export function BookSkeleton() {
    return (
        <Loading className={PAGE}>
            <div className="mb-10 max-w-2xl">
                <Heading />
            </div>
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
                <div className="space-y-10 lg:col-span-8">
                    <section>
                        <Bone className="mb-4 h-6 w-40" />
                        <div className="flex gap-3 overflow-hidden">
                            {times(3).map((i) => (
                                <CardBone key={i} className="h-[86px] w-[240px] shrink-0 sm:flex-1" />
                            ))}
                        </div>
                    </section>
                    <section>
                        <Bone className="mb-4 h-6 w-40" />
                        <div className="flex gap-2 overflow-hidden">
                            {times(9).map((i) => (
                                <CardBone key={i} className="h-[84px] w-[60px] shrink-0" />
                            ))}
                        </div>
                    </section>
                    <section>
                        <Bone className="mb-4 h-6 w-40" />
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                            {times(8).map((i) => (
                                <CardBone key={i} className="h-[104px] rounded-[16px]" />
                            ))}
                        </div>
                    </section>
                </div>
                <div className="hidden lg:col-span-4 lg:block">
                    <CardBone className="h-[520px] overflow-hidden">
                        <div className="h-28 bg-pitch/80" />
                    </CardBone>
                </div>
            </div>
        </Loading>
    );
}

/** /grounds: list of ground cards. */
export function GroundsSkeleton() {
    return (
        <Loading className={PAGE}>
            <div className="max-w-2xl">
                <Heading />
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
                {times(2).map((i) => (
                    <CardBone key={i} className="overflow-hidden">
                        <div className="aspect-[16/9] bg-pitch/80" />
                        <div className="space-y-3 p-6">
                            <Bone className="h-4 w-full rounded-full" />
                            <Bone className="h-4 w-2/3 rounded-full" />
                            <div className="flex flex-wrap gap-2 pt-3">
                                {times(5).map((j) => (
                                    <Bone key={j} className="h-9 w-20 rounded-full" />
                                ))}
                            </div>
                            <Bone className="mt-3 h-12 w-full rounded-full" />
                        </div>
                    </CardBone>
                ))}
            </div>
        </Loading>
    );
}

/** /grounds/[slug]: photo header, 7 days, today's times + side card. */
export function GroundSkeleton() {
    return (
        <Loading className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10 lg:px-8">
            <Bone className="h-5 w-28" />
            <div className="mt-5 aspect-[16/9] max-h-[460px] w-full animate-pulse rounded-card bg-pitch/80 sm:aspect-[21/9]" />
            <div className="mt-8 grid gap-8 lg:grid-cols-12">
                <div className="space-y-6 lg:col-span-8">
                    <div className="grid grid-cols-4 gap-2 lg:grid-cols-7">
                        {times(7).map((i) => (
                            <CardBone key={i} className="h-20" />
                        ))}
                    </div>
                    <CardBone className="h-56" />
                </div>
                <CardBone className="h-72 lg:col-span-4" />
            </div>
        </Loading>
    );
}

/** /bookings: tabs + ticket cards. */
export function BookingsSkeleton() {
    return (
        <Loading className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
            <Bone className="h-4 w-24 rounded-full" />
            <div className="mt-3 flex items-end justify-between gap-4">
                <Bone className="h-12 w-56 sm:h-16" />
                <Bone className="h-12 w-36 rounded-full" />
            </div>
            <div className="mt-8 flex gap-6 border-b border-line pb-3">
                {times(3).map((i) => (
                    <Bone key={i} className="h-6 w-24" />
                ))}
            </div>
            <div className="mt-6 space-y-4">
                {times(3).map((i) => (
                    <CardBone key={i} className="flex h-36 overflow-hidden">
                        <div className="w-24 bg-pitch/80 sm:w-28" />
                    </CardBone>
                ))}
            </div>
        </Loading>
    );
}

/** /profile: name header, details form, side cards. */
export function ProfileSkeleton() {
    return (
        <Loading className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
            <div className="flex items-center gap-5">
                <Bone className="h-20 w-20 rounded-full" />
                <div className="flex-1 space-y-3">
                    <Bone className="h-10 w-56" />
                    <Bone className="h-4 w-40 rounded-full" />
                </div>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-12">
                <CardBone className="h-[420px] lg:col-span-7" />
                <div className="space-y-6 lg:col-span-5">
                    <CardBone className="h-44 bg-pitch/80 ring-0" />
                    <CardBone className="h-64" />
                </div>
            </div>
        </Loading>
    );
}

/** Text pages (/terms): heading + numbered sections. */
export function TextPageSkeleton() {
    return (
        <Loading className={PAGE}>
            <div className="max-w-3xl">
                <Heading wide />
            </div>
            <div className="mt-12 max-w-3xl space-y-8">
                {times(4).map((i) => (
                    <div key={i} className="space-y-3">
                        <Bone className="h-7 w-2/3" />
                        <Bone className="h-4 w-full rounded-full" />
                        <Bone className="h-4 w-full rounded-full" />
                        <Bone className="h-4 w-4/5 rounded-full" />
                    </div>
                ))}
            </div>
        </Loading>
    );
}

/** Payment result and ticket check pages: one centred card. */
export function ResultSkeleton() {
    return (
        <Loading className="mx-auto max-w-lg px-4 pb-24 pt-10 sm:pt-16">
            <CardBone className="overflow-hidden">
                <div className="flex flex-col items-center gap-4 px-6 py-10">
                    <Bone className="h-16 w-16 rounded-full" />
                    <Bone className="h-10 w-3/4" />
                    <Bone className="h-4 w-2/3 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-5 border-t border-dashed border-line p-6">
                    {times(4).map((i) => (
                        <div key={i} className="space-y-2">
                            <Bone className="h-3 w-16 rounded-full" />
                            <Bone className="h-5 w-28" />
                        </div>
                    ))}
                </div>
                <div className="flex gap-3 px-6 pb-6">
                    <Bone className="h-12 flex-1 rounded-full" />
                    <Bone className="h-12 flex-1 rounded-full" />
                </div>
            </CardBone>
        </Loading>
    );
}

/** Sign-in, sign-up, verify, reset: a form on the left, a photo on the right (desktop). */
export function AuthSkeleton() {
    return (
        <Loading className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col px-6 py-8 sm:px-12">
                <Bone className="h-10 w-36" />
                <div className="mx-auto my-auto w-full max-w-sm space-y-4 py-12">
                    <Bone className="h-12 w-3/4" />
                    <Bone className="h-4 w-full rounded-full" />
                    <div className="space-y-3 pt-6">
                        <Bone className="h-4 w-16 rounded-full" />
                        <Bone className="h-12 w-full" />
                        <Bone className="h-4 w-20 rounded-full" />
                        <Bone className="h-12 w-full" />
                    </div>
                    <Bone className="h-12 w-full rounded-full" />
                </div>
            </div>
            <div className="hidden animate-pulse bg-pitch/90 lg:block" />
        </Loading>
    );
}