import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const bad = (status = 400) => NextResponse.json({ ok: false }, { status });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad();

  const slug = typeof body.slug === "string" ? body.slug : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";
  const resp = body.resp;
  const guests = Math.max(1, Math.min(20, Math.floor(Number(body.guests)) || 1));

  if (!/^[a-z0-9]{4,32}$/.test(slug) || !name) return bad();
  if (resp !== "yes" && resp !== "maybe" && resp !== "no") return bad();

  const admin = adminClient();
  const { data: inv } = await admin.from("invites").select("id").eq("slug", slug).maybeSingle();
  if (!inv) return bad(404);

  // One reply per guest name per invitation. Sending again with the same name updates it.
  const { error } = await admin.from("rsvps").upsert(
    { invite_id: inv.id, name, name_key: name.toLowerCase().replace(/\s+/g, " "), resp, guests, note, updated_at: new Date().toISOString() },
    { onConflict: "invite_id,name_key" }
  );
  if (error) return bad(500);
  return NextResponse.json({ ok: true });
}
