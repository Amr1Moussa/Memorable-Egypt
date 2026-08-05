import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { APP_NAME } from "@/lib/constants/app";
import { SEO_DEFAULTS, siteUrl } from "@/lib/constants/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Root metadata (doc 20 — SEO).
 * Per-page `metadata` objects override these for locations/memories/profiles.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SEO_DEFAULTS.title,
    template: `%s | ${APP_NAME}`,
  },
  description: SEO_DEFAULTS.description,
  applicationName: APP_NAME,
  openGraph: {
    type: SEO_DEFAULTS.type,
    siteName: SEO_DEFAULTS.siteName,
    title: SEO_DEFAULTS.title,
    description: SEO_DEFAULTS.description,
    locale: SEO_DEFAULTS.locale,
    images: [{ url: SEO_DEFAULTS.ogImage }],
  },
  twitter: {
    card: SEO_DEFAULTS.twitterCard,
    title: SEO_DEFAULTS.title,
    description: SEO_DEFAULTS.description,
    images: [SEO_DEFAULTS.ogImage],
  },
  robots: {
    // Public pages are indexable; route groups (auth)/(app)/(admin)
    // override per-page as needed (doc 20).
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#D8B36A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground min-h-full font-sans">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
