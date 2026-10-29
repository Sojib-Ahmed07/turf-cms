// src/app/global-error.jsx
"use client"; // replaces the root layout when the layout itself fails, so it has its own <html> and <body>

import "./globals.css";

export default function GlobalError({ error, retry }) {
    return (
        <html lang="bn">
            <body className="bg-chalk text-ink antialiased">
                <title>কিছু একটা সমস্যা হয়েছে</title>
                <main className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center px-6 text-center">
                    <h1 className="text-[40px] font-bold leading-tight">কিছু একটা সমস্যা হয়েছে</h1>
                    <p className="mt-3 text-[15px] text-ink-3">সাইটটি লোড হয়নি। একটু পরে আবার চেষ্টা করুন।</p>
                    <div className="mt-8 flex gap-3">
                        <button
                            type="button"
                            onClick={() => retry?.()}
                            className="h-11 rounded-full bg-ink px-6 text-[14px] font-semibold text-white"
                        >
                            আবার চেষ্টা করুন
                        </button>
                        {/* A full page load, since the app shell itself failed. */}
                        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                        <a href="/" className="flex h-11 items-center rounded-full px-6 text-[14px] font-semibold ring-1 ring-line">
                            হোমে ফিরুন
                        </a>
                    </div>
                    {error?.digest && <p className="mt-8 text-[12px] text-ink-4">এরর কোড {error.digest}</p>}
                </main>
            </body>
        </html>
    );
}