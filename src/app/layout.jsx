// src/app/layout.jsx
import { Archivo } from "next/font/google";
import "./globals.css";

// Archivo is variable in weight AND width: the width axis gives the
// expanded, sporty display style (see the `display` utility in globals.css).
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata = {
  title: "TurfZone — Book floodlit turf in Mirpur",
  description: "Pick a ground, choose a slot and pay online in under a minute.",
};

export default function RootLayout({ children }) {
  // Later: read brandColor from site_settings and set style={{ "--brand": brandColor }}
  return (
    <html lang="en" className={archivo.variable} style={{ "--brand": "#18a058" }}>
      <body className="min-h-svh antialiased">{children}</body>
    </html>
  );
}
