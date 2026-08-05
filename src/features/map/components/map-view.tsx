"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { LocateFixed, Loader2 } from "lucide-react";
import { useMapbox } from "../hooks/use-mapbox";
import { useViewportLocations } from "../hooks/use-viewport-locations";
import { useGeolocation } from "../hooks/use-geolocation";
import {
  CLUSTER_RADIUS,
  TIER_STYLES,
} from "../constants";
import type { MapLocation } from "@/features/locations/types";
import type { LocationFilters } from "@/features/locations/schemas";

/**
 * MapView — the reusable, business-logic-free map component (Phase 3 #2).
 *
 * Responsibilities (kept separate from memory logic):
 *   - Render the Mapbox map (via useMapbox).
 *   - Fetch viewport locations on pan/zoom (via useViewportLocations).
 *   - Render clustered markers using a GeoJSON source + Mapbox cluster
 *     layers (Phase 3 #1, #2 — clustering for dense areas).
 *   - Handle selection + popups + geolocation.
 *
 * The component receives a `fetcher` (so the explore page can wire it to the
 * API) and emits `onSelectLocation` when a marker is clicked. It never imports
 * memory/payment/auth code — those features live in their own modules.
 *
 * Source: doc 13 (Map System), Phase 3 requirements #1, #2, #5.
 */

const SOURCE_ID = "memorable-locations";
const CLUSTER_LAYER = "clusters";
const UNCLUSTERED_LAYER = "unclustered-points";
const CLUSTER_COUNT_LAYER = "cluster-count";

/**
 * Minimal feature shape for click handling. Mapbox's own
 * `MapboxGeoJSONFeature` typing is overly strict in v3; we use a local
 * interface for the properties/geometry we actually read.
 */
interface MapFeature {
  properties?: Record<string, unknown> | null;
  geometry?: { type: string; coordinates: [number, number] } | null;
}

export function MapView({
  fetcher,
  filters,
  onSelectLocation,
  className,
}: {
  fetcher: (
    bounds: { west: number; south: number; east: number; north: number },
    zoom: number,
  ) => Promise<MapLocation[]>;
  filters?: LocationFilters;
  onSelectLocation?: (location: MapLocation) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const markersDataRef = useRef<Map<string, MapLocation>>(new Map());

  const { mapRef, ready, error, flyTo } = useMapbox(containerRef);
  const { locations, loading } = useViewportLocations(
    mapRef,
    ready,
    fetcher,
    filters,
  );
  const geo = useGeolocation();

  // Keep the lookup map in sync for click handling (feature properties are
  // limited; we store the full MapLocation keyed by id).
  useEffect(() => {
    markersDataRef.current = new Map(locations.map((l) => [l.id, l]));
  }, [locations]);

  // The GeoJSON source data, memoized on locations.
  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: locations.map((l) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [l.longitude, l.latitude],
        },
        properties: {
          id: l.id,
          name: l.name,
          tier: l.tier,
          memoryCount: l.memoryCount,
        },
      })),
    }),
    [locations],
  );

  // (Re)sync the GeoJSON source when locations change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource(SOURCE_ID);
    if (src && "setData" in src && typeof src.setData === "function") {
      (src as mapboxgl.GeoJSONSource).setData(geojson);
    }
  }, [geojson, ready, mapRef]);

  // Set up sources + layers once the map is ready.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (map.getSource(SOURCE_ID)) return; // already added

    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: CLUSTER_RADIUS,
    });

    // Cluster circles.
    map.addLayer({
      id: CLUSTER_LAYER,
      type: "circle",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#2C6E91",
        "circle-radius": [
          "step",
          ["get", "point_count"],
          16,
          10,
          22,
          50,
          30,
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#FFFFFF",
        "circle-stroke-opacity": 0.7,
      },
    });

    // Cluster count labels.
    map.addLayer({
      id: CLUSTER_COUNT_LAYER,
      type: "symbol",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-size": 12,
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#FFFFFF",
      },
    });

    // Unclustered markers — colored by tier.
    map.addLayer({
      id: UNCLUSTERED_LAYER,
      type: "circle",
      source: SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": [
          "match",
          ["get", "tier"],
          1,
          TIER_STYLES[1].color,
          2,
          TIER_STYLES[2].color,
          3,
          TIER_STYLES[3].color,
          4,
          TIER_STYLES[4].color,
          "#9CA3AF",
        ],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 4, 12, 9],
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#FFFFFF",
      },
    });

    // Click handlers.
    map.on("click", CLUSTER_LAYER, (e) => {
      const features = (e.features ?? []) as unknown as MapFeature[];
      const feature = features[0];
      const clusterId = feature?.properties?.cluster_id;
      if (clusterId === undefined) return;
      const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId as number, (err, zoom) => {
        if (err || zoom === undefined || zoom === null) return;
        const geom = feature?.geometry;
        if (!geom || geom.type !== "Point") return;
        map.flyTo({
          center: geom.coordinates,
          zoom: zoom,
          essential: true,
        });
      });
    });

    map.on("click", UNCLUSTERED_LAYER, (e) => {
      const features = (e.features ?? []) as unknown as MapFeature[];
      const props = features[0]?.properties;
      if (!props) return;
      const loc = markersDataRef.current.get(String(props.id));
      if (!loc) return;
      onSelectLocation?.(loc);
      // Show a popup at the marker.
      popupRef.current?.remove();
      popupRef.current = new mapboxgl.Popup({ offset: 14, closeButton: false })
        .setLngLat([loc.longitude, loc.latitude])
        .setHTML(
          `<div style="font-weight:600">${escapeHtml(loc.name)}</div>` +
            `<div style="color:#6B7280;font-size:12px">${loc.memoryCount} memories</div>`,
        )
        .addTo(map);
    });

    // Cursor feedback.
    const cursorPointer = () => (map.getCanvas().style.cursor = "pointer");
    const cursorDefault = () => (map.getCanvas().style.cursor = "");
    map.on("mouseenter", CLUSTER_LAYER, cursorPointer);
    map.on("mouseleave", CLUSTER_LAYER, cursorDefault);
    map.on("mouseenter", UNCLUSTERED_LAYER, cursorPointer);
    map.on("mouseleave", UNCLUSTERED_LAYER, cursorDefault);

    // eslint-disable-next-line react-hooks/exhaustive-deps -- setup runs once
  }, [ready]);

  // Geolocation control.
  const handleLocate = useCallback(async () => {
    const pos = await geo.request();
    if (pos) flyTo(pos.lng, pos.lat, 13);
  }, [geo, flyTo]);

  return (
    <div className={className} style={{ position: "relative" }}>
      <div ref={containerRef} className="h-full w-full" aria-label="Map of Egypt" />

      {/* Loading indicator (Phase 3 #5). */}
      {loading ? (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-surface/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
          <Loader2 className="mr-1.5 inline h-3 w-3 animate-spin" />
          Loading locations…
        </div>
      ) : null}

      {/* Geolocation button. */}
      <button
        type="button"
        onClick={handleLocate}
        disabled={geo.loading}
        className="absolute right-3 top-3 rounded-md border border-border bg-surface p-2 text-foreground shadow-sm transition hover:bg-muted disabled:opacity-50"
        aria-label="Use my location"
        title="Use my location"
      >
        {geo.loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LocateFixed className="h-4 w-4" />
        )}
      </button>

      {geo.error ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-surface/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
          {geo.error}
        </div>
      ) : null}

      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/80 text-sm text-muted-foreground">
          {error}
        </div>
      ) : null}
    </div>
  );
}

/** Minimal HTML escaper for popup content. */
function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] ?? c,
  );
}
