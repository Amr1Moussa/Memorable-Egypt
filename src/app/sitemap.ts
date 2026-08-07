import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/constants/seo";

/**
 * sitemap.xml (doc 20 — Sitemap).
 *
 * Includes: home, explore, search, legal pages, all active locations,
 * published public memories, and categories. Excluded: drafts, private
 * memories, admin/auth/app routes.
 *
 * Source: doc 20 (SEO — Sitemap).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const supabase = await createClient();

  // Static public pages.
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${siteUrl}/explore`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/cookies`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Active locations.
  const { data: locations } = await supabase
    .from("locations")
    .select("slug, updated_at")
    .eq("status", "active");
  const locationPages: MetadataRoute.Sitemap = (locations ?? []).map((l) => ({
    url: `${siteUrl}/locations/${(l as { slug: string }).slug}`,
    lastModified: (l as { updated_at: string }).updated_at
      ? new Date((l as { updated_at: string }).updated_at)
      : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Published public memories.
  const { data: memories } = await supabase
    .from("memories")
    .select("slug, updated_at")
    .not("published_at", "is", null)
    .eq("visibility", "public")
    .is("deleted_at", null);
  const memoryPages: MetadataRoute.Sitemap = (memories ?? []).map((m) => ({
    url: `${siteUrl}/memories/${(m as { slug: string }).slug}`,
    lastModified: (m as { updated_at: string }).updated_at
      ? new Date((m as { updated_at: string }).updated_at)
      : now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...locationPages, ...memoryPages];
}
