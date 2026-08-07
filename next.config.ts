import type { NextConfig } from "next";

/**
 * Next.js configuration for Memorable Egypt.
 *
 * Architecture decisions:
 * - `reactStrictMode` is on to surface side-effects during development.
 * - `poweredByHeader` is off to avoid advertising the stack (small hardening).
 * - Image remote patterns are restricted to Supabase Storage (where all
 *   user-uploaded avatars and memory images live, per doc 16).
 * - Security headers (Phase 7 #4): CSP, X-Frame-Options, X-Content-Type-
 *   Options, Referrer-Policy, Permissions-Policy, HSTS.
 *
 * Source: docs 05 (System Architecture), 16 (Storage System), 21 (Security),
 *         Phase 7 requirement #4.
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
  experimental: {},
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Content Security Policy — restrict to self + Supabase + Mapbox + Google Fonts.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: https://*.supabase.co https://*.mapbox.com",
              "connect-src 'self' https://*.supabase.co https://*.mapbox.com wss://*.supabase.co",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
