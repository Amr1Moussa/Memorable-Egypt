import { NextResponse } from "next/server";
import { getGoogleOAuthUrl } from "@/features/auth/services";
import { handle } from "@/lib/response";

/**
 * GET /api/v1/auth/google?next=/path
 * Returns the Google OAuth URL for client-side redirect. (The client hook
 * can also call Supabase directly; this endpoint is an optional server-side
 * builder for cases where the client lacks the public token.)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const next = url.searchParams.get("next") ?? "/";
    const oauthUrl = await getGoogleOAuthUrl(next);
    return NextResponse.json({ success: true, data: { url: oauthUrl } });
  } catch (error) {
    return handle(error);
  }
}
