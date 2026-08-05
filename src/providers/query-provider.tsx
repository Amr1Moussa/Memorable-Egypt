"use client";

import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  type DefaultOptions,
} from "@tanstack/react-query";

/**
 * TanStack Query provider.
 *
 * Server state (memories, locations, payments) is fetched and cached
 * here. Global defaults favor fresh data over aggressive caching so the
 * map and admin dashboards stay accurate; per-query overrides can opt
 * into longer `staleTime` where appropriate (doc 09 — Server State).
 *
 * Source: doc 09 (Frontend Architecture — State Management).
 */
const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: 30_000, // 30s before refetch is considered
    refetchOnWindowFocus: false,
    retry: 1,
  },
  mutations: {
    retry: 0,
  },
};

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // One client per browser session (not per render) — required by RQ.
  const [client] = useState(() => new QueryClient({ defaultOptions }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
