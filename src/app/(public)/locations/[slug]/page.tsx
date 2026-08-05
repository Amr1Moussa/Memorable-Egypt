import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { getLocationBySlug } from "@/features/locations/services";
import { TIER_STYLES } from "@/features/map/constants";
import { ROUTES } from "@/lib/constants/app";
import { siteUrl } from "@/lib/constants/seo";
import { EmptyState } from "@/components/shared/empty-state";
import { formatEGP } from "@/lib/utils/format";

/**
 * SEO location page (doc 20 — /locations/{slug}).
 *
 * Server Component: fetches by slug, emits full metadata + OpenGraph +
 * Schema.org Place structured data. The memory list is a placeholder until
 * Phase 4 (doc 10 — Location Page).
 *
 * Source: doc 20 (SEO), doc 10 (Location Page), doc 13 (Tiers).
 */

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const location = await getLocationBySlug(slug);
  if (!location) return { title: "Location not found" };

  const title = `${location.name} | Memories & Stories | Memorable Egypt`;
  const description = location.description
    ? `${location.description} Explore ${location.memoryCount} memories shared at ${location.name} on Memorable Egypt.`
    : `Explore memories, stories, and experiences shared at ${location.name} on Memorable Egypt.`;

  return {
    title,
    description,
    alternates: { canonical: `/locations/${location.slug}` },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/locations/${location.slug}`,
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const location = await getLocationBySlug(slug);
  if (!location) notFound();

  const tier = TIER_STYLES[location.tier as 1 | 2 | 3 | 4];

  // Schema.org Place structured data (doc 20 — Structured Data).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: location.name,
    description: location.description ?? undefined,
    geo: {
      "@type": "GeoCoordinates",
      latitude: location.latitude,
      longitude: location.longitude,
    },
    address: {
      "@type": "PostalAddress",
      addressRegion: location.governorate ?? undefined,
      addressLocality: location.city ?? undefined,
    },
    url: `${siteUrl}/locations/${location.slug}`,
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href={ROUTES.explore} className="hover:text-foreground">
          Explore
        </Link>
        <span>/</span>
        <span className="text-foreground">{location.name}</span>
      </nav>

      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: tier?.color ?? "#9CA3AF" }}
          >
            <MapPin className="h-3 w-3" />
            {tier?.label ?? "Location"}
          </span>
          {location.governorate ? (
            <span className="text-xs text-muted-foreground">
              {location.governorate}
              {location.city ? ` · ${location.city}` : ""}
            </span>
          ) : null}
        </div>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {location.name}
        </h1>

        {location.description ? (
          <p className="max-w-2xl text-muted-foreground">{location.description}</p>
        ) : null}

        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="text-faint-foreground">Coordinates</dt>
            <dd className="font-mono text-foreground">
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </dd>
          </div>
          <div>
            <dt className="text-faint-foreground">Memories</dt>
            <dd className="text-foreground">{location.memoryCount}</dd>
          </div>
          <div>
            <dt className="text-faint-foreground">Legacy pins</dt>
            <dd className="text-foreground">{location.legacyCount}</dd>
          </div>
        </dl>
      </header>

      {/* Pricing hint for this tier (doc 15). */}
      <section className="mt-8 rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Leave a memory here</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {tier ? `Tier ${location.tier} (${tier.label})` : `Tier ${location.tier}`}{" "}
          · Standard pin from {formatEGP(standardPriceForTier(location.tier))} ·
          Legacy pin from {formatEGP(legacyPriceForTier(location.tier))}
        </p>
        <Link
          href={`${ROUTES.create}?location=${location.slug}`}
          className="mt-3 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Add a memory
        </Link>
      </section>

      {/* Memory list — placeholder until Phase 4. */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Memories at this location</h2>
        {location.memoryCount === 0 ? (
          <EmptyState
            title="No memories yet"
            description="Be the first to preserve a memory at this place."
            action={
              <Link
                href={`${ROUTES.create}?location=${location.slug}`}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Create the first memory
              </Link>
            }
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Memories will appear here once the memory feature launches.
          </p>
        )}
      </section>
    </main>
  );
}

/** Tier → price lookups (doc 15). The authoritative source is the settings
 *  table; these mirror the seeded defaults for the location-page display. */
function standardPriceForTier(tier: number): number {
  return [30, 50, 90, 180][tier - 1] ?? 30;
}
function legacyPriceForTier(tier: number): number {
  return [80, 130, 200, 400][tier - 1] ?? 80;
}
