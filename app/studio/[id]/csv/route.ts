import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { csvCell } from "@/lib/slug";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new NextResponse("Not found", { status: 404 });
  const sb = serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new NextResponse("Sign in required", { status: 401 });

  // Row level security returns nothing unless this host owns the invitation.
  const { data: inv } = await sb.from("invites").select("id").eq("id", params.id).maybeSingle();
  if (!inv) return new NextResponse("Not found", { status: 404 });

  const { data } = await sb
    .from("rsvps")
    .select("name,resp,guests,note,updated_at")
    .eq("invite_id", params.id)
    .order("updated_at", { ascending: false });

  const rows = (data ?? []) as { name: string; resp: string; guests: number; note: string; updated_at: string }[];
  const csv =
    "name,reply,people,note,replied_at\n" +
    rows.map((r) => [r.name, r.resp, r.resp === "no" ? 0 : r.guests, r.note, r.updated_at].map(csvCell).join(",")).join("\n") +
    "\n";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="guest-list.csv"',
      "Cache-Control": "no-store",
    },
  });
}
