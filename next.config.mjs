// next.config.mjs
/** Security headers for every response. No CSP on purpose: the site loads Cloudinary/Unsplash images,
 *  OpenStreetMap tiles and Google sign-in, and a wrong CSP silently breaks those. These are safe defaults. */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" }, // nobody can frame the site (clickjacking on admin / payment buttons)
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, // ticket /verify/<token> paths never leak to other sites
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }, // browsers ignore it on http://localhost
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};
export default nextConfig;
