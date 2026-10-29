// src/app/admin/loading.jsx
/** Shown while an admin page loads (the sidebar stays in place). */
export default function Loading() {
    return (
        <div className="mx-auto max-w-[1080px]" aria-busy="true" aria-label="লোড হচ্ছে">
            <div className="h-12 w-64 animate-pulse rounded-ctl bg-ink/[0.07]" />
            <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded-full bg-ink/[0.05]" />
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="h-28 animate-pulse rounded-card bg-white ring-1 ring-line" />
                ))}
            </div>
            <div className="mt-6 h-80 animate-pulse rounded-card bg-white ring-1 ring-line" />
        </div>
    );
}