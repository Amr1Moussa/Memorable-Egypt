import { z } from "zod";
import {
  latitudeSchema,
  longitudeSchema,
  paginationSchema,
} from "@/lib/validations/common";

/**
 * Location query/validation schemas.
 *
 * Location logic stays separate from memory logic (Phase 3 requirement #3):
 * these schemas describe geographic queries only; memory creation goes
 * through `features/memories`.
 *
 * Source: doc 13 (Map System), doc 08 (API Specification).
 */

/**
 * Viewport query: the visible map bounds + zoom. The service converts these
 * into a PostGIS bounding-box query and returns only locations inside the
 * current viewport (Phase 3 requirement #1).
 */
export const viewportQuerySchema = z.object({
  west: longitudeSchema,
  south: latitudeSchema,
  east: longitudeSchema,
  north: latitudeSchema,
  zoom: z.number().min(1).max(20),
});
export type ViewportQuery = z.infer<typeof viewportQuerySchema>;

/** Nearby query: a point + radius (doc 13 — Nearby Search). */
export const nearbyQuerySchema = z.object({
  lat: latitudeSchema,
  lng: longitudeSchema,
  radius: z.coerce.number().int().positive().max(50000).default(10000), // meters
});
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;

/**
 * Location search query (doc 13 — Search). `q` is free text matched against
 * name/city/governorate. The search service is designed so fuzzy + AI search
 * can replace the LIKE-based implementation later without changing the client
 * interface (Phase 3 requirement #4).
 */
export const locationSearchSchema = z.object({
  q: z.string().trim().min(1).max(100),
  ...paginationSchema.shape,
});
export type LocationSearchQuery = z.infer<typeof locationSearchSchema>;

/**
 * Location filters (doc 13 — Filters). All optional; combinable.
 */
export const locationFiltersSchema = z.object({
  category: z.string().optional(),
  governorate: z.string().optional(),
  city: z.string().optional(),
  tier: z.coerce.number().int().min(1).max(4).optional(),
  pinType: z.enum(["standard", "legacy"]).optional(),
});
export type LocationFilters = z.infer<typeof locationFiltersSchema>;
