import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { currentAccount } from "@/lib/auth";
import { csvCell } from "@/lib/slug";
import type { CustomerRow, InviteRow, OrderRow, Paged } from "@/lib/admin";

export const dynamic = "force-dynamic";

const MAX = 5000;
const ist = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "";

/** CSV of orders, customers or invitations, with the same filters as the admin list. Admins only. */
export async function GET(req: Request, { params }: { params: { kind: string } }) {
  const acct = await currentAccount();
  if (!acct?.admin) return new NextResponse("Not found", { status: 404 });
  const q = new URL(req.url).searchParams;
  const search = (q.get("q") ?? "").slice(0, 100);
  const sb = serverClient();
  let head: string[] = [];
  let rows: unknown[][] = [];

  if (params.kind === "orders") {
    const { data, error } = await sb.rpc("admin_orders", { p_status: q.get("status") ?? "", p_search: search, p_limit: MAX, p_offset: 0 });
    if (error) return new NextResponse(error.message, { status: 500 });
    head = ["created", "status", "amount_inr", "customer_email", "invitation", "template", "order_id", "payment_id", "paid", "refunded", "note"];
    rows = (data as Paged<OrderRow>).rows.map((r) => [ist(r.created_at), r.status, r.amount / 100, r.email, r.title, r.design, r.order_id, r.payment_id, ist(r.paid_at), ist(r.refunded_at), r.note]);
  } else if (params.kind === "customers") {
    const { data, error } = await sb.rpc("admin_customers", { p_filter: q.get("filter") ?? "", p_search: search, p_limit: MAX, p_offset: 0 });
    if (error) return new NextResponse(error.message, { status: 500 });
    head = ["email", "joined", "last_sign_in", "sign_in_method", "email_confirmed", "invitations", "live", "spent_inr", "admin", "on_hold"];
    rows = (data as Paged<CustomerRow>).rows.map((c) => [c.email, ist(c.created_at), ist(c.last_sign_in_at), c.provider, c.email_confirmed_at ? "yes" : "no", c.invites, c.live, c.spent / 100, c.is_admin ? "yes" : "", c.blocked ? "yes" : ""]);
  } else if (params.kind === "invitations") {
    const { data, error } = await sb.rpc("admin_invites", { p_status: q.get("status") ?? "", p_search: search, p_limit: MAX, p_offset: 0 });
    if (error) return new NextResponse(error.message, { status: 500 });
    head = ["created", "status", "names", "occasion", "template", "date", "venue", "host_email", "link_code", "views", "replies", "coming", "published", "published_how"];
    rows = (data as Paged<InviteRow>).rows.map((i) => [ist(i.created_at), i.status, i.n2 ? `${i.n1} & ${i.n2}` : i.n1, i.occ, i.design, i.date_text, i.venue, i.email, i.slug, i.views, i.replies, i.coming, ist(i.published_at), i.publish_source]);
  } else {
    return new NextResponse("Not found", { status: 404 });
  }

  const csv = [head.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n") + "\n";
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${params.kind}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
