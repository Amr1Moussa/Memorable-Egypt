import type { NextConfig } from "next";

/**
 * Next.js configuration for Memorable Egypt.
 *
 * Architecture decisions:
 * - `reactStrictMode` is on to surface side-effects during development.
 * - `poweredByHeader` is off to avoid advertising the stack (small hardening).
 * - Image remote patterns are restricted to Supabase Storage (where all
 *   user-uploaded avatars and memory images live, per doc 16). We add
 *   patterns here rather than disabling the Next/Image optimizer.
 *
 * Source: docs 05 (System Architecture), 16 (Storage System), 21 (Security).
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseUrl ? new URL(supabaseUrl).hostname : "localhost",
      },
    ],
  },
  // Keep the experimental block minimal; enable features only when needed.
  experimental: {},
};

export default nextConfig;
