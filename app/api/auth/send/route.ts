import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { noStoreFetch } from "@/lib/supabase/fetch";
import { EMAIL_RE, authMessage } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Sends the sign-in email from the server, so the host's own network never has to reach Supabase. */
export async function POST(request: Request) {
  let email = "";
  let draft = "";
  try {
    const body = (await request.json()) as { email?: unknown; draft?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    draft = packDraft(body.draft);
  } catch {
    /* fall through to validation */
  }
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }
  // Implicit flow: the emailed link carries the session itself, so it works even when the
  // email is opened on a different phone or browser from the one that asked for it.
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
    global: { fetch: noStoreFetch },
  });
  const origin = new URL(request.url).origin;
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${origin}/auth/callback${draft ? `?draft=${draft}` : ""}` },
  });
  if (error) {
    // Shows up in Vercel logs. "email_address_not_authorized" means Supabase's built-in email
    // only sends to your own team: add custom SMTP in Supabase (Authentication -> Emails).
    console.error("auth/send:", error.code, error.status, error.message);
    return NextResponse.json({ ok: false, error: authMessage(error) }, { status: error.status === 429 ? 429 : 502 });
  }
  return NextResponse.json({ ok: true });
}

const DRAFT_KEYS = ["design", "n1", "n2", "occ", "lang", "date_text", "time_text", "venue", "msg"];

/** An unsaved invitation travels inside the emailed link, so it survives opening the email on another device. */
function packDraft(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const out: Record<string, string> = {};
  for (const k of DRAFT_KEYS) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === "string") out[k] = v.slice(0, 500);
  }
  if (!Object.keys(out).length) return "";
  const packed = Buffer.from(JSON.stringify(out)).toString("base64url");
  return packed.length <= 3000 ? packed : "";
}
