// src/lib/cache-tags.js
// Tags for cached CMS reads (src/features/cms/queries.js).
// After saving in the admin, call revalidateTag(TAGS.x, "max") so the site updates.
export const TAGS = {
    settings: "settings",
    nav: "nav",
    hero: "hero",
    banners: "banners",
    sections: "sections",
    pitches: "pitches",
    section: (key) => `section:${key}`,
    slots: (pitchId) => `slots:${pitchId}`,
};