import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const slug = body && typeof body.slug === "string" ? body.slug : "";
  if (!/^[a-z0-9]{4,32}$/.test(slug)) return NextResponse.json({ ok: false }, { status: 400 });

  const admin = adminClient();
  const { data: inv } = await admin.from("invites").select("id,owner").eq("slug", slug).maybeSingle();
  if (!inv) return NextResponse.json({ ok: false }, { status: 404 });

  // The host previewing their own invitation is not a guest view.
  const { data: { user } } = await serverClient().auth.getUser();
  if (user && user.id === inv.owner) return NextResponse.json({ ok: true, counted: false });

  const vid = cookies().get("nm_vid")?.value || randomUUID();
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from("views").select("id").eq("invite_id", inv.id).eq("visitor", vid).gte("created_at", since).limit(1);
  if (!recent || recent.length === 0) await admin.from("views").insert({ invite_id: inv.id, visitor: vid });

  const res = NextResponse.json({ ok: true, counted: true });
  res.cookies.set("nm_vid", vid, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/",
  });
  return res;
}
