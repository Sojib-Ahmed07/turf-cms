// src/app/layout.jsx
import { Archivo } from "next/font/google";
import { brandInk, getSiteSettings } from "@/features/cms/queries";
import "./globals.css";

// Archivo is variable in weight AND width: the width axis gives the
// expanded, sporty display style (see the `display` utility in globals.css).
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

// Every page reads CMS settings (cached) and most read the session or live slots,
// so render on request. This also means `next build` never needs the database.
export const dynamic = "force-dynamic";

/** Title, description, favicon and share image come from Admin > Footer & SEO and Branding. */
export async function generateMetadata() {
  const s = await getSiteSettings();
  const title = s.seo.title || (s.tagline ? `${s.siteName}: ${s.tagline}` : s.siteName);
  const description = s.seo.description || s.tagline || undefined;
  const base = process.env.APP_URL || process.env.BETTER_AUTH_URL;

  return {
    metadataBase: base ? new URL(base) : undefined,
    title: { default: title, template: `%s | ${s.siteName}` },
    description,
    icons: s.faviconUrl ? { icon: s.faviconUrl } : undefined,
    openGraph: {
      siteName: s.siteName,
      title,
      description,
      type: "website",
      images: s.seo.ogImageUrl ? [{ url: s.seo.ogImageUrl }] : undefined,
    },
  };
}

export default async function RootLayout({ children }) {
  const settings = await getSiteSettings();
  const brand = settings.brandColor;

  return (
    <html lang="en" className={archivo.variable} style={{ "--brand": brand, "--brand-ink": brandInk(brand) }}>
      <body className="min-h-svh antialiased">{children}</body>
    </html>
  );
}