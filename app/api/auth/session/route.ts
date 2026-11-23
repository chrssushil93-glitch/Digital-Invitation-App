import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Receives the tokens from an emailed sign-in link and stores them as the host's session cookies. */
export async function POST(request: Request) {
  let access_token = "";
  let refresh_token = "";
  try {
    const b = (await request.json()) as { access_token?: unknown; refresh_token?: unknown };
    access_token = typeof b.access_token === "string" ? b.access_token : "";
    refresh_token = typeof b.refresh_token === "string" ? b.refresh_token : "";
  } catch {
    /* validated below */
  }
  if (!access_token || !refresh_token) return NextResponse.json({ ok: false }, { status: 400 });
  const { error } = await serverClient().auth.setSession({ access_token, refresh_token });
  return NextResponse.json({ ok: !error }, { status: error ? 401 : 200 });
}
