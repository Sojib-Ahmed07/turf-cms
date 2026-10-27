// src/app/sitemap.js
// /sitemap.xml: the public pages search engines should index. Uses APP_URL (the live domain).

const BASE = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");

export default function sitemap() {
    const now = new Date();
    return [
        { url: `${BASE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
        { url: `${BASE}/book`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
        { url: `${BASE}/grounds`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
        { url: `${BASE}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    ];
}