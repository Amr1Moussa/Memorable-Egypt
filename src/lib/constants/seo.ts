import { clientEnv } from "@/lib/env";
import { APP_NAME } from "./app";

/**
 * SEO defaults (doc 20).
 *
 * Per-page metadata overrides these via `export const metadata` in the
 * page file. `siteUrl` is the canonical origin used for absolute URLs,
 * OG tags, and sitemap entries.
 */
export const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

export const SEO_DEFAULTS = {
  siteName: APP_NAME,
  title: `${APP_NAME} | Preserve Your Memories Across Egypt`,
  description:
    "Memorable Egypt is a location-first platform where you can permanently preserve a memory, story, or confession at any real place in Egypt.",
  locale: "en_US",
  type: "website" as const,
  ogImage: "/og-default.png",
  twitterCard: "summary_large_image" as const,
};
