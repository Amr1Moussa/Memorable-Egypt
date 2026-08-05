import { clientEnv, serverEnv } from "@/lib/env";

/**
 * Mapbox tokens.
 *
 * The PUBLIC token is safe to ship to the browser (used by the Mapbox
 * GL JS map and client-side geocoding UI). The SECRET token is for
 * server-side geocoding only (doc 13 — "Creating New Locations" flow).
 *
 * Mapbox GL JS itself is loaded dynamically inside the `features/map`
 * component in Phase 3; this file is just the token surface.
 *
 * Source: doc 13 (Map System), doc 21 (Security).
 */
export const mapboxPublicToken = clientEnv.NEXT_PUBLIC_MAPBOX_TOKEN;
export const mapboxSecretToken = serverEnv.MAPBOX_SECRET_TOKEN;
