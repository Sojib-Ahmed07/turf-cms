// src/lib/cache-tags.js
export const TAGS = {
    settings: "settings",
    nav: "nav",
    hero: "hero",
    banners: "banners",
    pitches: "pitches",
    section: (key) => `section:${key}`,
    slots: (pitchId) => `slots:${pitchId}`,
};