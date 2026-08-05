"use client";

import { useCallback, useState } from "react";
import { MapView } from "@/features/map/components/map-view";
import { LocationSearch } from "@/features/search/components/location-search";
import { TIER_STYLES } from "@/features/map/constants";
import type { MapLocation } from "@/features/locations/types";
import type { LocationFilters } from "@/features/locations/schemas";

/**
 * Explore page — the map is the product (doc 03). This is a client component
 * because the interactive map requires the browser; everything else stays
 * server-rendered where possible.
 *
 * Layout (doc 10 — Explore Page): search + filters sidebar on the left, the
 * map filling the viewport, with a location-preview state on selection.
 *
 * Source: doc 13 (Map System), doc 10 (UI/UX), Phase 3 requirements.
 */
export default function ExplorePage() {
  const [filters, setFilters] = useState<LocationFilters>({});
  const [selected, setSelected] = useState<MapLocation | null>(null);

  // The fetcher wires the map's viewport hook to the public API.
  const fetcher = useCallback(
    async (bounds: {
      west: number;
      south: number;
      east: number;
      north: number;
    }) => {
      const params = new URLSearchParams({
        west: String(bounds.west),
        south: String(bounds.south),
        east: String(bounds.east),
        north: String(bounds.north),
        zoom: "6",
        ...(filters.tier ? { tier: String(filters.tier) } : {}),
        ...(filters.governorate
          ? { governorate: filters.governorate }
          : {}),
      });
      const res = await fetch(`/api/v1/locations/viewport?${params}`);
      const json = (await res.json()) as
        | { success: true; data: { locations: MapLocation[] } }
        | { success: false; error: { message: string } };
      if (!json.success) return [];
      return json.data.locations;
    },
    [filters],
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* Sidebar (doc 10 — filters, search, preview). */}
      <aside className="flex w-full flex-col gap-4 border-b border-border bg-surface p-4 lg:w-80 lg:border-b-0 lg:border-r">
        <LocationSearch />

        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-faint-foreground">
            Filter by tier
          </h2>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((t) => {
              const tier = t as 1 | 2 | 3 | 4;
              const active = filters.tier === tier;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      tier: active ? undefined : tier,
                    }))
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition"
                  style={{
                    borderColor: active
                      ? TIER_STYLES[tier].color
                      : "var(--color-border)",
                    backgroundColor: active
                      ? TIER_STYLES[tier].color
                      : "transparent",
                    color: active ? "#FFFFFF" : "var(--color-foreground)",
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: active
                        ? "#FFFFFF"
                        : TIER_STYLES[tier].color,
                    }}
                  />
                  {TIER_STYLES[tier].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected location preview (doc 13 — Location Selection). */}
        {selected ? (
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs uppercase tracking-widest text-nile">
              {TIER_STYLES[selected.tier as 1 | 2 | 3 | 4]?.label ?? "Location"}
            </p>
            <h3 className="mt-1 font-semibold">{selected.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {selected.memoryCount} memories · {selected.legacyCount} legacy pins
            </p>
            <a
              href={`/locations/${selected.slug}`}
              className="mt-3 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              View location
            </a>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Select a marker on the map to preview a location.
          </div>
        )}
      </aside>

      {/* Map fills the rest of the viewport. */}
      <div className="relative flex-1">
        <MapView
          fetcher={fetcher}
          filters={filters}
          onSelectLocation={setSelected}
          className="absolute inset-0"
        />
      </div>
    </div>
  );
}
