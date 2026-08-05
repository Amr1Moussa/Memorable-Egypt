"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import type { MapLocation } from "@/features/locations/types";
import type { LocationFilters } from "@/features/locations/schemas";
import { VIEWPORT_DEBOUNCE_MS } from "../constants";

/**
 * Debounced viewport → locations fetcher (Phase 3 #1: load only what's in the
 * current viewport; never the whole dataset).
 *
 * Takes the map REF (not `.current`) so it reads the instance inside effects
 * rather than during render (satisfies react-hooks/refs). Listens to `moveend`
 * (fires after pan/zoom settles), debounces, then calls the fetcher.
 *
 * Source: doc 13 (Map System), Phase 3 requirement #1.
 */
export function useViewportLocations(
  mapRef: React.RefObject<MapboxMap | null>,
  ready: boolean,
  fetcher: (
    bounds: { west: number; south: number; east: number; north: number },
    zoom: number,
  ) => Promise<MapLocation[]>,
  filters?: LocationFilters,
) {
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep latest fetcher/filters without re-subscribing the map listener.
  const fetcherRef = useRef(fetcher);
  const filtersRef = useRef(filters);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const m = map; // non-null local for the closure

    async function refresh() {
      const b = m.getBounds();
      if (!b) return;
      const bounds = {
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      };
      const zoom = m.getZoom();
      setLoading(true);
      setError(null);
      try {
        const data = await fetcherRef.current(bounds, zoom);
        setLocations(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't load locations.");
      } finally {
        setLoading(false);
      }
    }

    function onMoveEnd() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(refresh, VIEWPORT_DEBOUNCE_MS);
    }

    // Initial load.
    refresh();
    m.on("moveend", onMoveEnd);

    return () => {
      m.off("moveend", onMoveEnd);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [mapRef, ready]);

  return { locations, loading, error };
}
