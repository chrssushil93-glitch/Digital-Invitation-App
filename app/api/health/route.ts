import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { noStoreFetch } from "@/lib/supabase/fetch";
import { paymentsKeyState } from "@/lib/paymentsDb";
import { razorpayConfigured } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

/** Reports whether the database and payment setup are complete. No data or secret values are returned. */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ supabase_env: "missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" });

  const fmt = (e: { code?: string; message?: string } | null) => (e ? `${e.code}: ${e.message} -> run supabase/setup.sql` : "ok");
  const sb = createClient(url, key, { auth: { persistSession: false }, global: { fetch: noStoreFetch } });
  // Plain GETs: supabase-js turns the empty 404 of a HEAD request for a missing table into "no error".
  // Guests are not allowed to read these tables, so "permission denied" means the table exists and is locked: good.
  const table = async (t: string) => {
    const e = (await sb.from(t).select("id").limit(1)).error;
    return e && e.code === "42501" ? "ok" : fmt(e);
  };

  const pk = await paymentsKeyState();
  return NextResponse.json({
    invites: await table("invites"),
    rsvps: await table("rsvps"),
    views: await table("views"),
    guest_functions: fmt((await sb.rpc("get_public_invite", { p_slug: "health-check" })).error),
    site_settings: fmt((await sb.from("site_settings").select("id").limit(1)).error),
    payments_key: {
      ok: "ok",
      missing: "missing PAYMENTS_DB_SECRET (any random text of 32+ characters) in Vercel",
      unlinked: "not linked yet: Admin -> Settings -> Connect payments",
      setup: "database not updated -> run supabase/setup.sql",
    }[pk],
    razorpay_keys: razorpayConfigured() ? "ok" : "missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET",
    razorpay_webhook: process.env.RAZORPAY_WEBHOOK_SECRET ? "ok" : "not set (optional, recommended)",
  });
}
