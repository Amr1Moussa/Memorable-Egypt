import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env";

/**
 * Root middleware — Supabase SSR session handling + route protection.
 *
 * Responsibilities (docs 12, 21):
 *   1. Refresh the Supabase session on every navigation (cookie sync).
 *   2. Maintenance mode: redirect non-admins to /maintenance.
 *   3. Route-group protection:
 *        (auth)   → redirect signed-in users to /explore (except callback)
 *        (app)    → require a session
 *        (admin)  → require a session + admin role
 *
 * The matcher excludes static assets, Next internals, and the OAuth
 * callback (which must run without a pre-existing session).
 *
 * Source: doc 12 (Authentication), 21 (Security), 22 (System Settings),
 *         Supabase SSR Next.js docs.
 */

const PUBLIC_AUTH_ROUTES = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]);

// App-group routes that require authentication.
const APP_PREFIXES = ["/create", "/profile", "/settings", "/payments", "/memories/my"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;

  // 1. Session refresh — create a Supabase client bound to this request's
  //    cookies and let it set updated session cookies on the response.
  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Refresh the session; do not block on failure.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Resolve role if signed in (for admin gate + maintenance bypass).
  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
  }

  // 2. Maintenance mode (doc 22 §11). Admins always pass.
  if (path !== "/maintenance") {
    const { data: maintenanceRow } = await supabase
      .from("settings")
      .select("value")
      .eq("category", "general")
      .eq("key", "maintenance_mode")
      .single();
    const maintenanceOn = maintenanceRow?.value === "true";
    if (maintenanceOn && role !== "admin") {
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }
  }

  // 3a. (auth) routes: redirect signed-in users away to /explore.
  if (PUBLIC_AUTH_ROUTES.has(path) && user) {
    return NextResponse.redirect(new URL("/explore", request.url));
  }

  // 3b. (app) routes: require a session.
  if (APP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", path);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3c. (admin) routes: require session + admin role.
  if (path === "/admin" || path.startsWith("/admin/")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", path);
      return NextResponse.redirect(loginUrl);
    }
    if (role !== "admin") {
      // Forbidden — send to a friendly forbidden page rather than a raw 403.
      return NextResponse.redirect(new URL("/forbidden", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match everything except:
     *  - _next/static, _next/image (Next internals)
     *  - favicon, public assets
     *  - /auth/callback (must run without a pre-existing session)
     *  - API routes that aren't auth-related (auth routes still run through)
     */
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
