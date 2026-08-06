"use client";

import Image from "next/image";
import { MapPin, Sparkles, Globe, Lock, Link2 } from "lucide-react";
import { formatEGP } from "@/lib/utils/format";
import type { MemoryView } from "../types";

/**
 * Memory preview — exactly how the memory will appear when published
 * (Phase 4 #4). Reused as the final wizard step.
 *
 * Source: doc 10 (Preview), Phase 4 requirement #4.
 */
export function MemoryPreview({
  memory,
  tier,
  tierLabel,
}: {
  memory: MemoryView;
  tier: number;
  tierLabel: string;
}) {
  const isLegacy = memory.pinType === "legacy";
  const visibilityIcon =
    memory.visibility === "private" ? (
      <Lock className="h-3.5 w-3.5" />
    ) : memory.visibility === "unlisted" ? (
      <Link2 className="h-3.5 w-3.5" />
    ) : (
      <Globe className="h-3.5 w-3.5" />
    );

  return (
    <article className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {isLegacy ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 font-medium text-accent-foreground">
              <Sparkles className="h-3 w-3" /> Legacy Pin
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            {visibilityIcon}
            {memory.visibility}
          </span>
          {memory.category ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              {memory.category.name}
            </span>
          ) : null}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {memory.title}
        </h1>
        {memory.location ? (
          <p className="inline-flex items-center gap-1 text-sm text-nile">
            <MapPin className="h-3.5 w-3.5" />
            {memory.location.name}
            {memory.location.governorate
              ? ` · ${memory.location.governorate}`
              : ""}
          </p>
        ) : null}
      </header>

      {/* Cover + gallery */}
      {memory.media.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {memory.media.slice(0, 6).map((m, i) => (
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
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}

      {/* Story */}
      <div className="prose prose-sm max-w-none whitespace-pre-wrap text-base leading-relaxed text-foreground">
        {memory.story}
      </div>

      {/* Tags */}
      {memory.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
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

      {/* Pricing summary */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Pricing summary</h2>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Pin type</dt>
            <dd className="font-medium">
              {isLegacy ? "Legacy Pin" : "Standard Pin"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Location tier</dt>
            <dd className="font-medium">
              Tier {tier} · {tierLabel}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <dt className="font-semibold">Total</dt>
            <dd className="font-semibold">{formatEGP(priceFor(tier, isLegacy))}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">
          Genesis Campaign: the first 100 memories are free.
        </p>
      </div>
    </article>
  );
}

/** Tier × pinType → price (doc 15 defaults). The authoritative source is the
 *  settings table via the payments service (Phase 5). */
function priceFor(tier: number, legacy: boolean): number {
  const standard = [30, 50, 90, 180];
  const legacyPrices = [80, 130, 200, 400];
  const table = legacy ? legacyPrices : standard;
  return table[tier - 1] ?? 30;
}
