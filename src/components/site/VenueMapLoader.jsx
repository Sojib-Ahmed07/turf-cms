// src/components/site/VenueMapLoader.jsx
"use client";

import dynamic from "next/dynamic";

/**
 * Client wrapper so `ssr: false` is legal under Next 16
 * (next/dynamic with ssr:false is only allowed from Client Components).
 * VenueInfo (a Server Component) imports this normally.
 */
const VenueMap = dynamic(() => import("./VenueMap"), {
    ssr: false,
    loading: () => (
        <div className="aspect-[16/10] animate-pulse rounded-card bg-[#e9eee6] ring-1 ring-line" />
    ),
});

export default function VenueMapLoader({ map, name }) {
    return <VenueMap map={map} name={name} />;
}