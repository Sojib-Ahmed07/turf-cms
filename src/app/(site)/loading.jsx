// src/app/(site)/loading.jsx
/** Shown while a public page loads (the navbar and footer stay in place). */
export default function Loading() {
    return (
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12 lg:px-8" aria-busy="true" aria-label="Loading">
            <div className="h-14 w-2/3 max-w-md animate-pulse rounded-ctl bg-ink/[0.06] sm:h-20" />
            <div className="mt-4 h-4 w-full max-w-lg animate-pulse rounded-full bg-ink/[0.05]" />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="h-40 animate-pulse rounded-card bg-white ring-1 ring-line" />
                ))}
            </div>
            <div className="mt-6 h-64 animate-pulse rounded-card bg-white ring-1 ring-line" />
        </div>
    );
}