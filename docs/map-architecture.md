# Map Architecture

> Memorable Egypt — Interactive Egypt Map & Location System.
> Source of truth: docs 13 (Map System), 07 (PostGIS), 09 (Frontend), 20 (SEO).

## Design principle

**The map is the product** (doc 03). Every interaction begins with a location.
The architecture keeps map rendering, marker management, clustering, search,
filters, geolocation, and viewport querying in **separate, composable
modules** so the map component stays reusable and independent from
memory-related business logic (Phase 3 requirement #2).

## Module map

```
features/
├── map/                       # Pure map rendering — no memory/auth/payment logic
│   ├── constants.ts           # Egypt bounds, center, zoom, tier styling
│   ├── hooks/
│   │   ├── use-mapbox.ts          # Mapbox GL JS lifecycle (create/cleanup/flyTo)
│   │   ├── use-viewport-locations.ts  # Debounced viewport → locations fetch
│   │   └── use-geolocation.ts     # Browser geolocation wrapper
│   └── components/
│       └── map-view.tsx           # The reusable map (clustering, popups, geolocate)
│
├── locations/                 # Geographic data layer — no memory logic
│   ├── types.ts               # MapLocation, LocationDetail
│   ├── schemas.ts             # viewport/nearby/search/filters Zod schemas
│   └── services.ts            # viewport, nearby, search, by-slug, governorates
│
└── search/                    # Search UX (client-side)
    ├── service.ts             # searchLocationsClient (fuzzy-ready interface)
    └── components/
        └── location-search.tsx   # Suggestions, loading, empty states
```

The explore page (`app/(public)/explore/page.tsx`) wires these together: it
passes a viewport `fetcher` into `MapView` and a tier filter state, and renders
`LocationSearch` + the selected-location preview in a sidebar.

## Map rendering architecture

`useMapbox(containerRef)` owns the single Mapbox GL JS `Map` instance for a
container:

1. Reads the public token (`NEXT_PUBLIC_MAPBOX_TOKEN`) at module load.
2. Creates the map on mount with Egypt bounds/center/zoom/style, constrained
   by `maxBounds` so users can't pan off into the ocean indefinitely.
3. Fires `onReady(map)` once `load` fires; callers add sources/layers then.
4. Cleans up via `map.remove()` on unmount (prevents leaks).

`MapView` composes `useMapbox` + `useViewportLocations` + `useGeolocation` and:
- Adds a **GeoJSON source** (`memorable-locations`) with `cluster: true`.
- Adds three layers: cluster circles, cluster count labels, unclustered markers.
- Colors unclustered markers by **tier** via a `match` expression
  (Local grey, City Nile Blue, Landmark Sand, Iconic Terracotta).
- Wires click handlers: clusters expand (`getClusterExpansionZoom` → flyTo);
  markers emit `onSelectLocation` + show a popup.
- Renders a geolocate button + a loading indicator overlay.

The component receives a `fetcher` and emits `onSelectLocation` — it never
imports memory/payment/auth code.

## Viewport query flow

```
User pans/zooms
      │
      ▼
map "moveend" event
      │
      ▼
useViewportLocations debounce (350ms)        ← prevents request spam per frame
      │
      ▼
fetcher(bounds, zoom)                        ← client → /api/v1/locations/viewport
      │
      ▼
getLocationsInViewport()  (server)           ← PostGIS RPC locations_in_viewport
      │
      ▼
ST_Covers(ST_MakeEnvelope(w,s,e,n), point)   ← bounding-box containment
      │
      ▼
Returns MapLocation[] (cap 500)              ← only viewport data, never the full set
      │
      ▼
GeoJSON source.setData()                     ← map re-renders markers
```

Key rule (Phase 3 #1): **only locations inside the current viewport are
loaded.** The full Egypt dataset never reaches the browser. Results are capped
(500); density is handled by clustering.

## Clustering strategy

Mapbox's native GeoJSON clustering handles density (doc 13 — Marker
Clustering):

- `cluster: true` on the source, `clusterMaxZoom: 14`, `clusterRadius: 50`.
- Below ~zoom 9, dense markers collapse into cluster circles sized by
  `point_count` (step: 16 / 22 / 30 px at 10 / 50 counts).
- Clicking a cluster calls `getClusterExpansionZoom` and flies in until it
  expands.
- Cluster count labels render on top via a symbol layer.

No external clustering library — Mapbox's built-in engine is sufficient for
the MVP and avoids a dependency.

## Search architecture

`searchLocationsClient(q)` → `/api/v1/locations/search` →
`searchLocations()` (server, currently `ILIKE` over name/city/governorate).

**Future-ready (Phase 3 #4):** the client interface is generic. Replacing the
backend with fuzzy trigram search (`pg_trgm`), full-text (`tsvector`), or
AI-assisted ranking requires changes ONLY in `services.ts` / the route handler
— no caller or component changes.

The `LocationSearch` component debounces (250ms), aborts stale requests
(`AbortController`), and shows loading / empty / result states.

## Geolocation flow

`useGeolocation()` wraps `navigator.geolocation.getCurrentPosition`:

- Requests permission on user action (the locate button), never automatically.
- On success, `flyTo(lng, lat, 13)` recenters the map.
- On denial/failure, shows a non-blocking message — the app keeps working
  (doc 13 — "functions normally if permission is denied").

## Performance optimizations

| Concern              | Optimization                                            |
| -------------------- | ------------------------------------------------------- |
| Payload size         | Viewport queries return only visible locations (cap 500)|
| Request volume       | 350ms debounce on `moveend`; 250ms on search input      |
| Marker density       | Native Mapbox clustering; clusterMaxZoom 14             |
| Marker columns       | Map queries select only the 9 columns the map needs     |
| Spatial queries      | PostGIS `ST_Covers` / `ST_DWithin` (GIST-indexed)       |
| Stale requests       | Search uses `AbortController` to cancel in-flight calls |
| Re-renders           | GeoJSON `setData` updates in place; no full remount     |
| Cleanup              | `map.remove()` on unmount; listeners detached           |

## Location pages (SEO)

`/locations/[slug]` is a Server Component (doc 20):

- `generateMetadata` emits title, description, canonical, OpenGraph, Twitter.
- Schema.org `Place` JSON-LD (geo coordinates, address, url).
- Displays tier badge, coordinates, memory/legacy counts, description.
- Pricing hint (tier → standard/legacy price from doc 15 defaults).
- Memory list is a placeholder until Phase 4.

`/locations/[slug]` is server-rendered (`ƒ`); `/explore` is static-prerendered
but the map inside is a client component.

## Future scalability considerations

- **Vector tiles** — at >50k locations, switch the GeoJSON source to a tiled
  source (Mapbox Tiling Service or self-hosted pg_tileserv) so clusters are
  precomputed server-side.
- **Fuzzy / AI search** — drop-in via the documented interface; add `pg_trgm`
  GIN index or a vector column for semantic search.
- **Reverse geocoding** — Mapbox Geocoding API for the "what's here?" long-
  press flow (doc 13). Hook stub ready in the location service.
- **Heatmaps** — explicitly excluded from the MVP (doc 13); the clustering
  layer gives the same visual density cue.
- **Time-based exploration / trails / AR** — future layers on the same map,
  added as additional GeoJSON sources without touching the rendering module.
