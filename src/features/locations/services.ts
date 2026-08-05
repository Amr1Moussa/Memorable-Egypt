import { createClient } from "@/lib/supabase/server";
import type { LocationViewportRow } from "@/lib/supabase/types";
import type { MapLocation, LocationDetail } from "./types";
import type {
  ViewportQuery,
  NearbyQuery,
  LocationSearchQuery,
  LocationFilters,
} from "./schemas";

/**
 * Location service (server-only).
 *
 * Pure geographic queries — no memory business logic (Phase 3 requirement #3).
 * Every query returns only what the caller needs (Phase 3 #1: never load the
 * full dataset into the browser).
 *
 * PostGIS powers the spatial queries (doc 13):
 *   - viewport → bounding-box containment via ST_MakeEnvelope + ST_Covers
 *   - nearby   → ST_DWithin for radius search
 *
 * The search implementation is currently LIKE-based; the function signature is
 * shaped so a fuzzy/FTS/AI implementation can replace it without changing
 * callers (Phase 3 requirement #4).
 *
 * Source: doc 13 (Map System), doc 07 (PostGIS), Phase 3 requirements.
 */

const MAP_COLUMNS =
  "id, name, slug, tier, latitude, longitude, memory_count, legacy_count, status" as const;

function rowToMapLocation(r: LocationViewportRow | Record<string, unknown>): MapLocation {
  const rec = r as Record<string, unknown>;
  return {
    id: String(rec.id),
    name: String(rec.name),
    slug: String(rec.slug),
    tier: Number(rec.tier),
    latitude: Number(rec.latitude),
    longitude: Number(rec.longitude),
    memoryCount: Number(rec.memory_count ?? 0),
    legacyCount: Number(rec.legacy_count ?? 0),
    status: String(rec.status ?? "active"),
  };
}

/**
 * Viewport query: return active locations inside the visible map bounds.
 * Implemented as a server-side RPC over PostGIS for speed (doc 13).
 *
 * Caps results to keep payloads bounded; clustering on the client handles
 * density (Phase 3 #1, #2).
 */
export async function getLocationsInViewport(
  query: ViewportQuery,
  filters: LocationFilters = {},
  limit = 500,
): Promise<MapLocation[]> {
  const supabase = await createClient();

  // PostGIS bounding-box filter via an RPC. The function is defined in a
  // migration below; if it's not present we fall back to a client-side range
  // filter (works, less precise at the antimeridian — irrelevant for Egypt).
  const { data, error } = await supabase.rpc("locations_in_viewport", {
    west: query.west,
    south: query.south,
    east: query.east,
    north: query.north,
    filter_tier: filters.tier ?? null,
    filter_governorate: filters.governorate ?? null,
    filter_city: filters.city ?? null,
    result_limit: limit,
  });

  if (error || !data) {
    // Fallback: lat/lng range filter. Egypt doesn't cross the antimeridian so
    // this is correct for the MVP coverage area.
    let q = supabase
      .from("locations")
      .select(MAP_COLUMNS)
      .eq("status", "active")
      .gte("latitude", query.south)
      .lte("latitude", query.north)
      .gte("longitude", query.west)
      .lte("longitude", query.east)
      .limit(limit);
    if (filters.tier) q = q.eq("tier", filters.tier);
    if (filters.governorate)
      q = q.eq("governorate", filters.governorate);
    if (filters.city) q = q.eq("city", filters.city);
    const { data: fallback, error: fbErr } = await q;
    if (fbErr || !fallback) return [];
    return fallback.map((r) => rowToMapLocation(r as unknown as LocationViewportRow));
  }

  return (data as LocationViewportRow[]).map(rowToMapLocation);
}

/**
 * Nearby locations within a radius (doc 13 — Nearby Search). Distances:
 * 500m / 1km / 5km / 10km supported by the schema.
 */
export async function getNearbyLocations(
  query: NearbyQuery,
  limit = 50,
): Promise<MapLocation[]> {
  const supabase = await createClient();
  // ST_DWithin in meters (geography). RPC for precision.
  const { data, error } = await supabase.rpc("locations_nearby", {
    lat: query.lat,
    lng: query.lng,
    radius_m: query.radius,
    result_limit: limit,
  });
  if (error || !data) return [];
  return (data as LocationViewportRow[]).map(rowToMapLocation);
}

/**
 * Search locations by free text (doc 13 — Search). Currently name/city/
 * governorate ILIKE; designed so a fuzzy/FTS/AI implementation can replace
 * the internals without changing the signature (Phase 3 requirement #4).
 */
export async function searchLocations(
  query: LocationSearchQuery,
): Promise<{ data: MapLocation[]; total: number }> {
  const supabase = await createClient();
  const term = `%${query.q}%`;
  const from = (query.page - 1) * query.limit;

  const { data, error, count } = await supabase
    .from("locations")
    .select(MAP_COLUMNS, { count: "exact" })
    .eq("status", "active")
    .or(`name.ilike.${term},city.ilike.${term},governorate.ilike.${term}`)
    .order("memory_count", { ascending: false })
    .range(from, from + query.limit - 1);

  if (error || !data) return { data: [], total: 0 };
  return {
    data: data.map((r) => rowToMapLocation(r as unknown as LocationViewportRow)),
    total: count ?? 0,
  };
}

/**
 * Get a single location by slug (doc 20 — /locations/{slug}). Returns the
 * full detail row for the SEO location page.
 */
export async function getLocationBySlug(
  slug: string,
): Promise<LocationDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .select(
      "id, name, slug, tier, latitude, longitude, memory_count, legacy_count, status, governorate, city, address, place_type, description",
    )
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (error || !data) return null;
  const r = data as unknown as Record<string, unknown>;
  return {
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
    tier: Number(r.tier),
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    memoryCount: Number(r.memory_count ?? 0),
    legacyCount: Number(r.legacy_count ?? 0),
    status: String(r.status ?? "active"),
    governorate: (r.governorate as string | null) ?? null,
    city: (r.city as string | null) ?? null,
    address: (r.address as string | null) ?? null,
    placeType: (r.place_type as string | null) ?? null,
    description: (r.description as string | null) ?? null,
  };
}

/**
 * Distinct governorates — used to populate the filter dropdown + city pages.
 */
export async function listGovernorates(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("governorate")
    .not("governorate", "is", null)
    .order("governorate");

  if (error || !data) return [];
  const set = new Set<string>();
  for (const row of data) {
    const g = (row as Record<string, unknown>).governorate;
    if (typeof g === "string") set.add(g);
  }
  return [...set].sort();
}
