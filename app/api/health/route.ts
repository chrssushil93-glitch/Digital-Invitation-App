import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/** Reports whether the database tables and guest functions are reachable (no data is returned). */
export async function GET() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const check = async (t: string) => {
    const { error } = await sb.from(t).select("id", { head: true, count: "exact" }).limit(1);
    return error ? `${error.code}: ${error.message}` : "ok";
  };
  const rpc = await sb.rpc("get_public_invite", { p_slug: "health-check" });
  return NextResponse.json({
    invites: await check("invites"),
    rsvps: await check("rsvps"),
    views: await check("views"),
    get_public_invite: rpc.error ? `${rpc.error.code}: ${rpc.error.message}` : "ok",
  });
}
