// src/app/global-error.jsx
"use client"; // replaces the root layout when the layout itself fails, so it has its own <html> and <body>

import "./globals.css";

export default function GlobalError({ error, retry }) {
    return (
        <html lang="en">
            <body className="bg-chalk text-ink antialiased">
                <title>Something went wrong</title>
                <main className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center px-6 text-center">
                    <h1 className="text-[40px] font-bold leading-tight">Something went wrong</h1>
                    <p className="mt-3 text-[15px] text-ink-3">The site couldn&apos;t load. Try again in a moment.</p>
                    <div className="mt-8 flex gap-3">
                        <button
                            type="button"
                            onClick={() => retry?.()}
                            className="h-11 rounded-full bg-ink px-6 text-[14px] font-semibold text-white"
                        >
                            Try again
                        </button>
                        {/* A full page load, since the app shell itself failed. */}
                        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                        <a href="/" className="flex h-11 items-center rounded-full px-6 text-[14px] font-semibold ring-1 ring-line">
                            Go home
                        </a>
                    </div>
                    {error?.digest && <p className="mt-8 text-[12px] text-ink-4">Error code {error.digest}</p>}
                </main>
            </body>
        </html>
    );
}