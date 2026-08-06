import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Sparkles } from "lucide-react";
import { getPublishedMemoryBySlug } from "@/features/memories/services";
import { siteUrl } from "@/lib/constants/seo";
import { ROUTES } from "@/lib/constants/app";
import { formatRelative, initials } from "@/lib/utils/format";

/**
 * Public memory page (Phase 4 #6, doc 10 — Memory Page).
 *
 * Server Component: SEO metadata, OpenGraph, Schema.org. Images lazy-load.
 * Comments/reactions/bookmarks are disabled for the MVP.
 *
 * Source: doc 20 (SEO), doc 10 (Memory Page), Phase 4 requirement #6.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const memory = await getPublishedMemoryBySlug(slug);
  if (!memory) return { title: "Memory not found" };

  const title = `${memory.title} | Memorable Egypt`;
  const description =
    memory.story.slice(0, 155) +
    (memory.story.length > 155 ? "…" : "");
  const cover = memory.media[0]?.public_url;

  return {
    title,
    description,
    alternates: { canonical: `/memories/${memory.slug}` },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/memories/${memory.slug}`,
      type: "article",
      ...(cover ? { images: [{ url: cover }] } : {}),
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title,
      description,
      ...(cover ? { images: [cover] } : {}),
    },
  };
}

export default async function MemoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const memory = await getPublishedMemoryBySlug(slug);
  if (!memory) notFound();

  const isLegacy = memory.pinType === "legacy";

  // Schema.org Article structured data (doc 20).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: memory.title,
    description: memory.story.slice(0, 300),
    datePublished: memory.publishedAt,
    author: memory.author?.displayName
      ? { "@type": "Person", name: memory.author.displayName }
      : undefined,
    image: memory.media.map((m) => m.public_url),
    contentLocation: memory.location?.name,
    url: `${siteUrl}/memories/${memory.slug}`,
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        {memory.location ? (
          <>
            <Link
              href={`/locations/${memory.location.slug}`}
              className="hover:text-foreground"
            >
              {memory.location.name}
            </Link>
            <span>/</span>
          </>
        ) : null}
        <span className="truncate text-foreground">{memory.title}</span>
      </nav>

      {/* Header */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {isLegacy ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 font-medium text-accent-foreground">
              <Sparkles className="h-3 w-3" /> Legacy Pin
            </span>
          ) : null}
          {memory.category ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              {memory.category.name}
            </span>
          ) : null}
          <span className="text-muted-foreground">
            {memory.publishedAt ? formatRelative(memory.publishedAt) : ""}
          </span>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {memory.title}
        </h1>

        {memory.location ? (
          <Link
            href={`/locations/${memory.location.slug}`}
            className="inline-flex items-center gap-1 text-sm text-nile hover:underline"
          >
            <MapPin className="h-3.5 w-3.5" />
            {memory.location.name}
            {memory.location.governorate
              ? ` · ${memory.location.governorate}`
              : ""}
          </Link>
        ) : null}

        {/* Author */}
        {memory.author ? (
          <div className="flex items-center gap-2">
            <div className="relative h-8 w-8 overflow-hidden rounded-full bg-muted">
              {memory.author.avatarUrl ? (
                <Image
                  src={memory.author.avatarUrl}
                  alt={memory.author.displayName ?? "Author"}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                  {initials(memory.author.displayName ?? "U")}
                </div>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {memory.author.displayName ?? memory.author.username ?? "Someone"}
            </span>
          </div>
        ) : null}
      </header>

      {/* Gallery */}
      {memory.media.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {memory.media.map((m, i) => (
            <div
              key={m.id}
              className={
                i === 0
                  ? "relative col-span-2 aspect-video overflow-hidden rounded-lg bg-muted sm:col-span-2"
                  : "relative aspect-square overflow-hidden rounded-lg bg-muted"
              }
            >
              <Image
                src={m.public_url}
                alt={m.alt_text ?? memory.title}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                loading={i === 0 ? "eager" : "lazy"}
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}

      {/* Story */}
      <div className="mt-8 whitespace-pre-wrap text-base leading-relaxed text-foreground">
        {memory.story}
      </div>

      {/* Tags */}
      {memory.tags.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {memory.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
      ) : null}

      {/* Footer CTA */}
      {memory.location ? (
        <div className="mt-10 rounded-lg border border-border bg-surface p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Have a memory at {memory.location.name}?
          </p>
          <Link
            href={`${ROUTES.create}?location=${memory.location.slug}`}
            className="mt-2 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Add your memory
          </Link>
        </div>
      ) : null}
    </main>
  );
}
