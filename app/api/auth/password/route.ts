import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { EMAIL_RE, authMessage } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Email + password sign-in and sign-up. Works without any email being sent (unless email confirmation is on). */
export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as { mode?: unknown; email?: unknown; password?: unknown } | null;
  const mode = b?.mode === "signup" ? "signup" : "signin";
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b?.password === "string" ? b.password : "";

  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8 || password.length > 72) {
    return NextResponse.json({ ok: false, error: "Your password needs at least 8 characters." }, { status: 400 });
  }

  const sb = serverClient();
  if (mode === "signin") {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.code !== "invalid_credentials") console.error("auth/password signin:", error.code, error.status, error.message);
      return NextResponse.json({ ok: false, error: authMessage(error) }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  }

  const origin = new URL(request.url).origin;
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/auth/callback` } });
  if (error) {
    console.error("auth/password signup:", error.code, error.status, error.message);
    return NextResponse.json({ ok: false, error: authMessage(error) }, { status: 400 });
  }
  // Supabase hides whether an email is taken: an existing account comes back with no identities.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return NextResponse.json({ ok: false, error: authMessage({ code: "user_already_exists" }) }, { status: 409 });
  }
  // With "Confirm email" switched on in Supabase there is no session until the email link is opened.
  return NextResponse.json({ ok: true, confirm: !data.session });
}
