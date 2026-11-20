import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The sign-in email links here. The token is checked on the server, then the host lands in the studio. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const { error } = await serverClient().auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL("/studio", url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=1", url.origin));
}
