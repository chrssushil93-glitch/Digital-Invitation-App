import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";

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
  const { error } = await serverClient().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) {
    const limited = error.status === 429 || /rate limit/i.test(error.message);
    return NextResponse.json(
      { ok: false, error: limited ? "Too many sign-in emails were sent. Please wait a few minutes and try again." : "The sign-in email could not be sent. Please try again." },
      { status: limited ? 429 : 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
