// src/lib/nav-progress.js
// Start the thin loading bar at the top of the page (components/NavProgress.jsx) for a navigation that isn't a
// plain link click, e.g. before router.push(). Link clicks start it by themselves. Browser only; safe to call anywhere.
export const NAV_START_EVENT = "tz:navstart";

export function startNavProgress() {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(NAV_START_EVENT));
}