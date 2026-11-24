import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Starts "Continue with Google". Supabase returns to /auth/callback with a one-time ?code=. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const { data, error } = await serverClient().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${url.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) {
    console.error("auth/google:", error?.code, error?.message);
    return NextResponse.redirect(new URL("/login?error=google", url.origin));
  }
  return NextResponse.redirect(data.url);
}
