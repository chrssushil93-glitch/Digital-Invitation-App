import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";

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

  // The database function validates again and writes the reply. No secret key involved.
  const { data, error } = await serverClient().rpc("submit_rsvp", {
    p_slug: slug, p_name: name, p_resp: resp, p_guests: guests, p_note: note,
  });
  if (error) return bad(500);
  if (data !== true) return bad(404);
  return NextResponse.json({ ok: true });
}
