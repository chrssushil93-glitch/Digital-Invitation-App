import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/** Sends the sign-in email from the server, so the host's own network never has to reach Supabase. */
export async function POST(request: Request) {
  let email = "";
  try {
    const body = (await request.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    /* fall through to validation */
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }
  // Implicit flow: the emailed link carries the session itself, so it works even when the
  // email is opened on a different phone or browser from the one that asked for it.
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
  });
  const origin = new URL(request.url).origin;
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    const limited = error.status === 429 || /rate limit/i.test(error.message);
    return NextResponse.json(
      { ok: false, error: limited ? "Too many sign-in emails were sent. Please wait a few minutes and try again." : "The sign-in email could not be sent. Please try again." },
      { status: limited ? 429 : 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
