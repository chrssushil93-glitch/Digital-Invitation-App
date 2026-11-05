import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await serverClient().auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/studio", url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=1", url.origin));
}
