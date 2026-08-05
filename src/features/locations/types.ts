/**
 * Location domain types shared by map, search, and location pages.
 *
 * Source: doc 06 (Domain Model), doc 13 (Map System), Phase 3 requirement #3.
 */
import type { Database } from "@/lib/supabase/types";

export type LocationRow = Database["public"]["Tables"]["locations"]["Row"];

/**
 * Lightweight location used by the map (Phase 3 #1 — never load the full row
 * for hundreds of markers). The map needs id, coordinates, name, tier, and
 * counts only.
 */
export interface MapLocation {
  id: string;
  name: string;
  slug: string;
  tier: number;
  latitude: number;
  longitude: number;
  memoryCount: number;
  legacyCount: number;
  status: string;
}

/** A location plus its category (for location pages). */
export interface LocationDetail extends MapLocation {
  governorate: string | null;
  city: string | null;
  address: string | null;
  placeType: string | null;
  description: string | null;
}
