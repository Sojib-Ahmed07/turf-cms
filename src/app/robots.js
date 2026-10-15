// src/app/robots.js
// /robots.txt: keep private and transactional pages out of search results.

const BASE = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");

export default function robots() {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/admin", "/api/", "/bookings", "/profile", "/payment/", "/login", "/register"],
        },
        sitemap: `${BASE}/sitemap.xml`,
    };
}