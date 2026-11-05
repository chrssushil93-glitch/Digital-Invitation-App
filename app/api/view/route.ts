import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const slug = body && typeof body.slug === "string" ? body.slug : "";
  if (!/^[a-z0-9]{4,32}$/.test(slug)) return NextResponse.json({ ok: false }, { status: 400 });

  const vid = cookies().get("nm_vid")?.value || randomUUID();

  // The database function skips the host's own views and counts one view
  // per visitor per 30 minutes.
  const { error } = await serverClient().rpc("record_view", { p_slug: slug, p_visitor: vid });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("nm_vid", vid, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/",
  });
  return res;
}
