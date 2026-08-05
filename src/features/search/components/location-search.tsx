"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { TIER_STYLES } from "@/features/map/constants";
import type { MapLocation } from "@/features/locations/types";
import { searchLocationsClient } from "../service";

/**
 * Location search box with suggestions, loading, and empty states (Phase 3 #4).
 *
 * Debounced (250ms). Results link to /locations/{slug}. The component is
 * reusable across the explore sidebar and the landing page.
 *
 * Source: doc 13 (Search), doc 10 (Search Experience), Phase 3 requirement #4.
 */
export function LocationSearch({
  onSelect,
  className,
}: {
  /** Optional callback when a result is picked (e.g. fly the map). */
  onSelect?: (location: MapLocation) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const trimmed = query.trim();

  // Debounced search — only runs when there's a query (empty state handled
  // in the onChange handler + render, not via setState in the effect).
  useEffect(() => {
    if (!trimmed) return;
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      try {
        const { data } = await searchLocationsClient(trimmed, 1, 8, ac.signal);
        setResults(data);
      } catch {
        if (!ac.signal.aborted) setResults([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [trimmed]);

  // Close on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(loc: MapLocation) {
    onSelect?.(loc);
    setOpen(false);
    setQuery(loc.name);
  }

  const showSuggestions = open && trimmed.length > 0;

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setTouched(true);
            setOpen(true);
            if (!e.target.value.trim()) {
              setResults([]);
              setLoading(false);
            }
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search locations, cities, governorates…"
          className="h-10 w-full rounded-md border border-input bg-surface pl-9 pr-9 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Search locations"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setLoading(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-faint-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {showSuggestions ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              {touched
                ? "No locations found. Try another name or city."
                : "Start typing to search across Egypt."}
            </div>
          ) : (
            <ul className="max-h-80 overflow-auto py-1">
              {results.map((loc) => {
                const style = TIER_STYLES[loc.tier as 1 | 2 | 3 | 4];
                return (
                  <li key={loc.id}>
                    <Link
                      href={`/locations/${loc.slug}`}
                      onClick={() => pick(loc)}
                      className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: style?.color ?? "#9CA3AF" }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-foreground">
                          {loc.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {style?.label}
                          {loc.memoryCount > 0
                            ? ` · ${loc.memoryCount} memories`
                            : ""}
                        </span>
                      </span>
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-faint-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
