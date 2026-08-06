import Link from "next/link";
import Image from "next/image";
import { MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { truncate, formatRelative } from "@/lib/utils/format";
import type { MemorySummary } from "../types";

/**
 * Memory card for the author's list + (later) discovery feeds (Phase 4 #3).
 * Reused across the "my memories" page. Lazy-loads the cover image.
 *
 * Source: doc 10 (Memory Cards), Phase 4 requirement #3.
 */
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_moderation: "In review",
  awaiting_payment: "Awaiting payment",
  receipt_uploaded: "Receipt uploaded",
  pending_verification: "Verifying payment",
  published: "Published",
  rejected: "Rejected",
};

export function MemoryCard({ memory }: { memory: MemorySummary }) {
  const isLegacy = memory.pinType === "legacy";
  return (
    <Link
      href={`/create?id=${memory.id}`}
      className="group flex gap-4 rounded-lg border border-border bg-card p-4 transition hover:shadow-md"
    >
      {/* Cover (lazy-loaded) */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
        {memory.coverUrl ? (
          <Image
            src={memory.coverUrl}
            alt={memory.title}
            fill
            sizes="80px"
            loading="lazy"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-faint-foreground">
            <MapPin className="h-6 w-6" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              isLegacy
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {isLegacy ? (
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" /> Legacy
              </span>
            ) : (
              "Standard"
            )}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-nile">
            {STATUS_LABELS[memory.publicationStatus] ?? memory.publicationStatus}
          </span>
        </div>
        <h3 className="mt-1 truncate font-semibold text-foreground">
          {memory.title}
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          {memory.locationName ?? "Location"}
          {memory.publishedAt
            ? ` · ${formatRelative(memory.publishedAt)}`
            : ` · edited ${formatRelative(memory.updatedAt)}`}
        </p>
      </div>
    </Link>
  );
}

export { truncate };
