import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Exchanges a one-time ?code= from Supabase (Google sign-in, or a code-style email link) for session cookies. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await serverClient().auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext(url.searchParams.get("next")), url.origin));
    console.error("auth/exchange:", error.code, error.message);
  }
  return NextResponse.redirect(new URL("/login?error=1", url.origin));
}
