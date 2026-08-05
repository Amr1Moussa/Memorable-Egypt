"use client";

import { useCallback, useState } from "react";

/**
 * Browser geolocation wrapper (doc 13 — Geolocation).
 *
 * With permission, the map can find nearby memories + navigate to the user's
 * current position. The application functions normally if permission is
 * denied (doc 13). Returns a boolean state so callers can disable the control.
 *
 * Source: doc 13 (Map System — Geolocation), Phase 3 requirement #5.
 */
export function useGeolocation() {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setError("Geolocation isn't supported on this device.");
        resolve(null);
        return;
      }
      setLoading(true);
      setError(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPosition(p);
          setLoading(false);
          resolve(p);
        },
        (err) => {
          // PermissionDenied / PositionUnavailable / Timeout — never block the UX.
          setError(
            err.code === err.PERMISSION_DENIED
              ? "Location permission was denied."
              : "We couldn't get your location.",
          );
          setLoading(false);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
      );
    });
  }, []);

  return { position, loading, error, request };
}
