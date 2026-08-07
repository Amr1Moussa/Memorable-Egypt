import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/constants/seo";

/**
 * robots.txt (doc 20 — Robots).
 *
 * Allow indexing of public pages; block admin, API, auth, and internal routes.
 *
 * Source: doc 20 (SEO — Robots).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api",
          "/auth",
          "/create",
          "/memories", // the author's own list (not /memories/[slug] which is public)
          "/payments",
          "/profile",
          "/settings",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/maintenance",
          "/forbidden",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
