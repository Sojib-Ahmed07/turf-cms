// src/components/site/VenueMap.jsx
"use client";

import { useEffect, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin } from "lucide-react";

/**
 * Admin-set venue map. The admin enters latitude/longitude in Admin -> Branding.
 * When those are empty, VenueInfo shows the illustrated MapArt instead of this.
 *
 * map: { lat: number, lng: number, zoom: number, label: string, address: string }
 * name: fallback popup title (the site name)
 */
export default function VenueMap({ map, name = "TurfZone" }) {
    const position = useMemo(() => [map.lat, map.lng], [map.lat, map.lng]);

    // A brand-coloured pin, so we never rely on Leaflet's default icon files
    // (their URLs break under bundlers).
    const icon = useMemo(
        () =>
            L.divIcon({
                className: "",
                html: `<span style="display:block;width:32px;height:32px;border-radius:9999px 9999px 9999px 0;transform:rotate(-45deg);background:var(--brand,#18a058);box-shadow:0 8px 20px -6px rgb(11 59 44 / 0.55);border:3px solid #fff"></span>`,
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32],
            }),
        []
    );

    const title = map.label || name;
    const subtitle = map.address || "";

    return (
        <div className="relative aspect-[16/10] overflow-hidden rounded-card ring-1 ring-line">
            <MapContainer
                center={position}
                zoom={map.zoom}
                scrollWheelZoom={false}
                className="h-full w-full"
                style={{ background: "#e9eee6" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={position} icon={icon}>
                    <Popup>
                        <strong style={{ display: "block", fontSize: 14, color: "#0f1f19" }}>{title}</strong>
                        {subtitle && <span style={{ display: "block", marginTop: 2, fontSize: 12, color: "#6b7a73" }}>{subtitle}</span>}
                    </Popup>
                </Marker>
                <Recenter position={position} zoom={map.zoom} />
            </MapContainer>

            {/* Brand chip, so the map reads as part of the site rather than a widget */}
            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-pitch py-1.5 pl-1.5 pr-4 text-[13px] font-bold text-white shadow-[0_12px_30px_-10px_rgb(11_59_44/0.7)]">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand">
                    <MapPin className="h-3.5 w-3.5" />
                </span>
                {title}
            </div>
        </div>
    );
}

/** Keep the map centred when the admin saves new coordinates and the page refreshes. */
function Recenter({ position, zoom }) {
    const map = useMap();
    useEffect(() => {
        map.setView(position, zoom);
    }, [map, position, zoom]);
    return null;
}