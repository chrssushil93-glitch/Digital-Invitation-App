import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminClient, adminConfigured } from "@/lib/supabase/admin";
import { razorpayConfigured } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

/** Reports whether the database and payment setup are complete. No data or secret values are returned. */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ supabase_env: "missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" });

  const fmt = (e: { code?: string; message?: string } | null) => (e ? `${e.code}: ${e.message} -> run supabase/setup.sql` : "ok");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const table = async (t: string) => fmt((await sb.from(t).select("id", { head: true, count: "exact" }).limit(1)).error);

  const out: Record<string, string> = {
    invites: await table("invites"),
    rsvps: await table("rsvps"),
    views: await table("views"),
    guest_functions: fmt((await sb.rpc("get_public_invite", { p_slug: "health-check" })).error),
  };

  if (adminConfigured()) {
    const admin = adminClient();
    out.payment_columns = fmt((await admin.from("invites").select("status,paid_amount", { head: true }).limit(1)).error);
    out.payments_table = fmt((await admin.from("payments").select("id", { head: true }).limit(1)).error);
    out.confirm_payment = fmt((await admin.rpc("confirm_payment", { p_order_id: "health-check", p_payment_id: "health-check" })).error);
    out.service_role_key = "ok";
  } else {
    out.service_role_key = "missing SUPABASE_SERVICE_ROLE_KEY (needed to confirm payments)";
  }
  out.razorpay_keys = razorpayConfigured() ? "ok" : "missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET";
  out.razorpay_webhook = process.env.RAZORPAY_WEBHOOK_SECRET ? "ok" : "not set (optional, recommended)";
  return NextResponse.json(out);
}
