"use client";

import type { MapLocation } from "@/features/locations/types";

/**
 * Client-side search service (Phase 3 #4).
 *
 * Hits /api/v1/locations/search. The server implementation is currently
 * LIKE-based; this client interface is intentionally generic so a fuzzy or
 * AI-assisted backend can replace the implementation WITHOUT changing this
 * function's signature or any caller.
 *
 * Source: doc 13 (Map System — Search), Phase 3 requirement #4.
 */

export interface SearchResult {
  data: MapLocation[];
  total: number;
}

export async function searchLocationsClient(
  q: string,
  page = 1,
  limit = 10,
  signal?: AbortSignal,
): Promise<SearchResult> {
  const params = new URLSearchParams({
    q,
    page: String(page),
    limit: String(limit),
  });
  const res = await fetch(`/api/v1/locations/search?${params}`, { signal });
  const json = (await res.json()) as
    | { success: true; data: MapLocation[]; total?: number }
    | { success: false; error: { message: string } };

  if (!json.success) {
    throw new Error(json.error.message);
  }
  return { data: json.data, total: json.total ?? json.data.length };
}
