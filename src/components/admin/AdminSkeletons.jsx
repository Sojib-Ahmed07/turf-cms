// src/components/admin/AdminSkeletons.jsx
// Loading screens for the admin pages (used by each admin route's loading.jsx). The sidebar stays on screen.
import { Bone, CardBone, Loading, times } from "@/components/ui/Skeleton";

function Header({ action = true }) {
    return (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-3">
                <Bone className="h-12 w-56" />
                <Bone className="h-4 w-80 max-w-full rounded-full" />
            </div>
            {action && <Bone className="h-11 w-40 rounded-full" />}
        </div>
    );
}

/** Overview: 4 stats, today board, latest bookings. */
export function OverviewSkeleton() {
    return (
        <Loading className="mx-auto max-w-[1280px]">
            <Header />
            <CardBone className="grid grid-cols-2 divide-x divide-line overflow-hidden lg:grid-cols-4">
                {times(4).map((i) => (
                    <div key={i} className="space-y-3 p-6">
                        <Bone className="h-4 w-24 rounded-full" />
                        <Bone className="h-9 w-20" />
                    </div>
                ))}
            </CardBone>
            <CardBone className="mt-6 h-72" />
            <div className="mt-6 grid gap-6 lg:grid-cols-12">
                <CardBone className="h-80 lg:col-span-8" />
                <CardBone className="h-80 lg:col-span-4" />
            </div>
        </Loading>
    );
}

/** Lists with a table: bookings, payments, coupons, users. */
export function TableSkeleton({ tabs = 4, rows = 7 }) {
    return (
        <Loading className="mx-auto max-w-[1280px]">
            <Header />
            {tabs > 0 && (
                <div className="mb-4 flex gap-2 overflow-hidden">
                    {times(tabs).map((i) => (
                        <Bone key={i} className="h-10 w-28 shrink-0 rounded-full" />
                    ))}
                </div>
            )}
            <CardBone className="overflow-hidden">
                <div className="flex gap-3 border-b border-line p-4">
                    <Bone className="h-11 w-72 max-w-full" />
                    <Bone className="hidden h-11 w-40 sm:block" />
                </div>
                <div className="divide-y divide-line">
                    {times(rows).map((i) => (
                        <div key={i} className="flex items-center gap-4 px-6 py-4">
                            <Bone className="h-9 w-9 shrink-0 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Bone className="h-4 w-1/3 rounded-full" />
                                <Bone className="h-3 w-1/4 rounded-full" />
                            </div>
                            <Bone className="hidden h-4 w-24 rounded-full sm:block" />
                            <Bone className="h-7 w-20 rounded-full" />
                        </div>
                    ))}
                </div>
            </CardBone>
        </Loading>
    );
}

/** Content editors (branding, menu, hero, banners, sections, footer, terms): form panels. */
export function EditorSkeleton({ panels = 3, side = false }) {
    const form = (
        <div className="space-y-6">
            {times(panels).map((i) => (
                <CardBone key={i} className="overflow-hidden">
                    <div className="border-b border-line p-6">
                        <Bone className="h-5 w-40" />
                        <Bone className="mt-2 h-3 w-64 max-w-full rounded-full" />
                    </div>
                    <div className="space-y-4 p-6">
                        {times(3).map((j) => (
                            <div key={j} className="space-y-2">
                                <Bone className="h-3 w-24 rounded-full" />
                                <Bone className="h-11 w-full max-w-lg" />
                            </div>
                        ))}
                    </div>
                </CardBone>
            ))}
        </div>
    );
    return (
        <Loading className="mx-auto max-w-[1280px]">
            <Header action={false} />
            {side ? (
                <div className="grid gap-6 xl:grid-cols-12">
                    <div className="xl:col-span-7">{form}</div>
                    <CardBone className="h-96 xl:col-span-5" />
                </div>
            ) : (
                <div className="max-w-[1080px]">{form}</div>
            )}
        </Loading>
    );
}

/** Grounds: ground cards. */
export function GroundsAdminSkeleton() {
    return (
        <Loading className="mx-auto max-w-[1280px]">
            <Header />
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {times(3).map((i) => (
                    <CardBone key={i} className="overflow-hidden">
                        <div className="aspect-[16/9] bg-pitch/80" />
                        <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
                            {times(3).map((j) => (
                                <div key={j} className="space-y-2 p-4">
                                    <Bone className="mx-auto h-3 w-14 rounded-full" />
                                    <Bone className="mx-auto h-5 w-16" />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2 p-4">
                            <Bone className="h-9 w-20 rounded-full" />
                            <Bone className="h-9 w-24 rounded-full" />
                        </div>
                    </CardBone>
                ))}
            </div>
        </Loading>
    );
}

/** Slot editor: day tabs + slot rows. */
export function SlotEditorSkeleton() {
    return (
        <Loading className="mx-auto max-w-[1280px]">
            <Bone className="mb-4 h-5 w-28" />
            <Header action={false} />
            <div className="mb-6 flex gap-2 overflow-hidden">
                {times(10).map((i) => (
                    <Bone key={i} className="h-14 w-20 shrink-0" />
                ))}
            </div>
            <CardBone className="divide-y divide-line">
                {times(6).map((i) => (
                    <div key={i} className="flex flex-wrap items-center gap-4 p-4">
                        <Bone className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Bone className="h-4 w-40 rounded-full" />
                            <Bone className="h-3 w-16 rounded-full" />
                        </div>
                        <Bone className="h-10 w-32" />
                        <div className="ml-auto flex gap-1.5">
                            {times(4).map((j) => (
                                <Bone key={j} className="h-8 w-14 rounded-full" />
                            ))}
                        </div>
                    </div>
                ))}
            </CardBone>
        </Loading>
    );
}

/** Image library: folder tabs + image grid. */
export function MediaSkeleton() {
    return (
        <Loading className="mx-auto max-w-[1280px]">
            <Header />
            <div className="mb-4 flex gap-2 overflow-hidden">
                {times(6).map((i) => (
                    <Bone key={i} className="h-10 w-24 shrink-0 rounded-full" />
                ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {times(10).map((i) => (
                    <CardBone key={i} className="aspect-square" />
                ))}
            </div>
        </Loading>
    );
}