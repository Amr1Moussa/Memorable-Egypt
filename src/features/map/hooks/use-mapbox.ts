"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl, { type Map as MapboxMap, type MapboxOptions } from "mapbox-gl";
import { mapboxPublicToken } from "@/lib/mapbox/client";
import {
  EGYPT_BOUNDS,
  EGYPT_CENTER,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  MAP_STYLE,
} from "../constants";

/**
 * Initialize and own a Mapbox GL JS map instance (Phase 3 #2 — rendering is
 * isolated here; other concerns communicate via callbacks/services).
 *
 * Responsibilities:
 *   - Create the map bound to a container ref.
 *   - Apply Egypt bounds, center, zoom, style.
 *   - Clean up on unmount (memory-leak prevention).
 *
 * The token is read once at module load; the map is created only after the
 * container is mounted (client-only — Mapbox needs the DOM).
 *
 * Source: doc 13 (Map System), Phase 3 requirement #2.
 */
export function useMapbox(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options?: {
    onReady?: (map: MapboxMap) => void;
  },
) {
  const mapRef = useRef<MapboxMap | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Keep the latest onReady in a ref so the effect doesn't re-run.
  const onReadyRef = useRef(options?.onReady);
  useEffect(() => {
    onReadyRef.current = options?.onReady;
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current || ready) return;
    if (!mapboxPublicToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time setup error; the map cannot initialize without a token.
      setError("Mapbox token is missing.");
      return;
    }

    mapboxgl.accessToken = mapboxPublicToken;

    const opts: MapboxOptions = {
      container: containerRef.current,
      style: MAP_STYLE,
      center: [EGYPT_CENTER.lng, EGYPT_CENTER.lat],
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxBounds: EGYPT_BOUNDS,
      cooperativeGestures: false,
    };

    const map = new mapboxgl.Map(opts);
    mapRef.current = map;

    map.on("load", () => {
      setReady(true);
      onReadyRef.current?.(map);
    });

    map.on("error", (e) => {
      setError(e.error?.message ?? "Map failed to load.");
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- container is stable
  }, []);

  /** Imperatively fly to a location. */
  const flyTo = useCallback((lng: number, lat: number, zoom?: number) => {
    const m = mapRef.current;
    if (!m) return;
    m.flyTo({
      center: [lng, lat],
      zoom: zoom ?? m.getZoom(),
      essential: true,
    });
  }, []);

  return { mapRef, ready, error, flyTo };
}
