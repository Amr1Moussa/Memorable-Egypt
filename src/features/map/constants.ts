import type { LocationTier } from "@/types/domain";

/**
 * Map constants for the Egypt coverage area (doc 13 — Supported Area).
 *
 * Egypt's bounding box is used to constrain pan/zoom and to seed viewport
 * queries. Centered on the Nile valley with enough padding to reach the
 * Mediterranean, Red Sea, and Western Desert.
 *
 * Source: doc 13 (Map System), Phase 3 requirement #1.
 */

/** Egypt's approximate geographic bounds [west, south, east, north]. */
export const EGYPT_BOUNDS: [[number, number], [number, number]] = [
  [24.7, 21.7], // SW corner (Libya border / Sudan border)
  [36.9, 31.7], // NE corner (Red Sea / Mediterranean)
];

/** Default map center — Greater Cairo, the population centroid. */
export const EGYPT_CENTER = { lng: 30.8, lat: 26.8 } as const;

/** Default zoom: country-wide view (Egypt fits the viewport). */
export const DEFAULT_ZOOM = 5.2;

/** Min/max zoom (doc 13 — zoom & pan). */
export const MIN_ZOOM = 4;
export const MAX_ZOOM = 18;

/**
 * Zoom threshold below which clustering activates (doc 13 — Marker
 * Clustering). Below this, dense markers collapse; above, they expand.
 */
export const CLUSTER_ZOOM_THRESHOLD = 9;

/** Max cluster radius in pixels for the clustering engine. */
export const CLUSTER_RADIUS = 50;

/**
 * Per-tier marker styling (doc 13 — Marker Types). Tier drives both visual
 * weight and (later) price. Legacy pins render with the accent color.
 */
export const TIER_STYLES: Record<
  LocationTier,
  { color: string; label: string }
> = {
  1: { color: "#9CA3AF", label: "Local" }, // muted grey
  2: { color: "#2C6E91", label: "City" }, // Nile Blue
  3: { color: "#D8B36A", label: "Landmark" }, // Egyptian Sand
  4: { color: "#C76B4F", label: "Iconic" }, // Terracotta
};

/** Mapbox style URL (light, calm — doc 10 design philosophy). */
export const MAP_STYLE = "mapbox://styles/mapbox/light-v11" as const;

/**
 * Debounce for viewport queries (Phase 3 #1 — don't spam the API on every pan
 * frame). 350ms is a good balance of responsiveness vs request volume.
 */
export const VIEWPORT_DEBOUNCE_MS = 350;
