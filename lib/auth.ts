import { cache } from "react";
import { cookies } from "next/headers";
import { serverClient } from "@/lib/supabase/server";

/** Where someone may be sent after signing in. Anything else falls back to the studio. */
export function safeNext(v: string | null | undefined): string {
  return v && /^\/(studio|create|admin)(\/[\w-]+)*$/.test(v) ? v : "/studio";
}

export type Account = { userId: string; email: string; admin: boolean; blocked: boolean; reason: string };

/** The signed-in person, checked with Supabase, plus their standing. Once per request. */
export const currentAccount = cache(async (): Promise<Account | null> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const sb = serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  // Before the admin part of supabase/setup.sql is run, my_account does not exist: treat as a regular host.
  const { data, error } = await sb.rpc("my_account");
  const a = (error ? null : data) as { admin?: boolean; blocked?: boolean; reason?: string | null } | null;
  return { userId: user.id, email: user.email ?? "", admin: Boolean(a?.admin), blocked: Boolean(a?.blocked), reason: a?.reason ?? "" };
});

/** Cheap check for the header: is there a Supabase session cookie? (Pages that need the user verify it properly.) */
export function hasSessionCookie(): boolean {
  return cookies().getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthErr = { code?: string; message?: string; status?: number } | null | undefined;

/** Turns a Supabase auth error into a sentence a host can act on. */
export function authMessage(e: AuthErr): string {
  const code = e?.code ?? "";
  const m = e?.message ?? "";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(m))
    return "That email and password do not match. New here? Choose “Create an account”.";
  if (code === "email_not_confirmed" || /email not confirmed/i.test(m))
    return "Please confirm your email first. Open the link we sent you, or use “Email me a sign-in link”.";
  if (code === "user_already_exists" || code === "email_exists" || /already registered/i.test(m))
    return "An account with this email already exists. Sign in instead.";
  if (code === "weak_password" || /password should/i.test(m))
    return "Please choose a longer password (at least 8 characters, with letters and numbers).";
  if (code === "over_email_send_rate_limit" || e?.status === 429 || /rate limit/i.test(m))
    return "Too many emails were sent just now. Please wait a few minutes, or sign in with a password.";
  if (code === "email_address_not_authorized" || /not authorized/i.test(m))
    return "We cannot send email to this address yet. Please sign in with a password or Google instead.";
  if (code === "signup_disabled" || /signups not allowed/i.test(m))
    return "New accounts are switched off right now. Please try again later.";
  if (code === "email_address_invalid" || /invalid.*email|email.*invalid/i.test(m))
    return "Please enter a valid email address.";
  return "Something went wrong while signing in. Please try again.";
}

export type AuthOptions = { google: boolean; email: boolean };

/** Reads which sign-in methods are switched on in Supabase (a public endpoint), cached for five minutes. */
export async function authOptions(): Promise<AuthOptions> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const fallback = { google: false, email: true };
  if (!url || !key) return fallback;
  try {
    const r = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return fallback;
    const j = (await r.json()) as { external?: Record<string, boolean> };
    return { google: Boolean(j.external?.google), email: j.external?.email !== false };
  } catch {
    return fallback;
  }
}
