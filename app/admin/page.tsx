import type { Metadata } from "next";
import Link from "next/link";
import { ColumnChart, RankBars, Tile } from "@/components/admin/charts";
import { OrderPill, href } from "@/components/admin/ui";
import { adminCall, count, day, requireAdmin, rupees, rupeesShort, type Overview } from "@/lib/admin";
import { adminConfigured } from "@/lib/supabase/admin";
import { razorpayConfigured } from "@/lib/razorpay";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin overview" };

const RANGES = [7, 30, 90];

function shortDay(d: string): string {
  return new Date(`${d}T00:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
}

export default async function AdminOverview({ searchParams }: { searchParams: { days?: string } }) {
  await requireAdmin();
  const days = RANGES.includes(Number(searchParams.days)) ? Number(searchParams.days) : 30;
  const [o, s] = await Promise.all([adminCall<Overview>("admin_overview", { p_days: days }), getSettings()]);

  // What still stops the site from taking money, in plain words.
  const todo: { text: string; fix: string }[] = [];
  if (s.paymentsMode === "razorpay") {
    if (!razorpayConfigured()) todo.push({ text: "Razorpay keys are missing, so hosts cannot pay yet.", fix: "Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel → Settings → Environment Variables, then redeploy. Or switch publishing to free in Settings." });
    if (!adminConfigured()) todo.push({ text: "The Supabase service role key is missing, so payments cannot be confirmed.", fix: "Add SUPABASE_SERVICE_ROLE_KEY in Vercel (Supabase → Project Settings → API Keys → secret key), then redeploy." });
    if (razorpayConfigured() && !process.env.RAZORPAY_WEBHOOK_SECRET) todo.push({ text: "No Razorpay webhook secret: a payment made by someone who closes the page early is only confirmed when you check it.", fix: "Razorpay → Webhooks → add <site>/api/pay/webhook (payment.captured, order.paid, refund.processed); put its secret in Vercel as RAZORPAY_WEBHOOK_SECRET." });
  }

  const revenue = o.series.map((d) => ({ key: d.d, label: shortDay(d.d), value: d.revenue }));
  const signups = o.series.map((d) => ({ key: d.d, label: shortDay(d.d), value: d.signups }));

  return (
    <>
      <div className="adminpagehead">
        <h1 className="pagetitle">Overview</h1>
        <div className="chips" role="group" aria-label="Period">
          {RANGES.map((r) => (
            <Link key={r} className="chip" href={href("/admin", { days: r === 30 ? "" : r })} aria-current={days === r ? "true" : undefined}>
              Last {r} days
            </Link>
          ))}
        </div>
      </div>

      {todo.length > 0 && (
        <section className="panel notice" aria-labelledby="todo-h">
          <h2 className="h3" id="todo-h">Before you can take payments</h2>
          <ul className="todo">
            {todo.map((t) => <li key={t.text}><b>{t.text}</b><span className="note">{t.fix}</span></li>)}
          </ul>
        </section>
      )}
      {s.paymentsMode === "free" && (
        <p className="flash warn" role="status">Publishing is free right now (Settings → Payments). Hosts are not asked to pay.</p>
      )}

      <section className="kpis" aria-label="Key numbers">
        <div className="hero-figure panel">
          <span className="statlabel">Revenue, last {days} days</span>
          <span className="herovalue">{rupees(o.revenue_period)}</span>
          <span className="note">{count(o.orders_period)} paid orders · {rupees(o.revenue_total)} all time{o.refunds_total ? ` · ${rupees(o.refunds_total)} refunded` : ""}</span>
        </div>
        <Tile label="New customers" value={count(o.customers_period)} sub={`${count(o.customers)} in total · ${count(o.customers_paying)} paying`} to="/admin/customers" />
        <Tile label="Invitations created" value={count(o.invites_period)} sub={`${count(o.invites_live)} live · ${count(o.invites_draft)} drafts${o.invites_offline ? ` · ${o.invites_offline} offline` : ""}`} to="/admin/invitations" />
        <Tile label="Unpaid checkouts" value={count(o.orders_unpaid)} sub="started payment but did not finish" to="/admin/orders?status=created" />
        <Tile label="Guest views" value={count(o.views_period)} sub={`${count(o.views)} all time`} />
        <Tile label="Guests coming" value={count(o.coming)} sub={`${count(o.rsvps)} replies in total`} />
      </section>

      <div className="chartrow">
        <ColumnChart title="Revenue per day" sub={`Last ${days} days, Indian time`} data={revenue} format={rupees} axisFormat={rupeesShort} />
        <ColumnChart title="New customers per day" sub={`Last ${days} days`} data={signups} format={count} />
      </div>

      <div className="chartrow">
        <RankBars
          title="Templates by revenue"
          sub="All time"
          empty="No invitations yet."
          format={rupees}
          rows={o.top_designs.map((t) => ({ label: t.design, value: t.revenue, note: `${t.invites} invitations · ${t.live} live` }))}
        />
        <section className="panel" aria-labelledby="ro-h">
          <div className="sechead">
            <h2 className="h3" id="ro-h">Latest orders</h2>
            <Link className="btn ghost small" href="/admin/orders">All orders</Link>
          </div>
          {o.recent_orders.length === 0 ? (
            <p className="empty-inline">No orders yet. They appear here as soon as a host starts paying.</p>
          ) : (
            <ul className="minilist">
              {o.recent_orders.map((r) => (
                <li key={r.order_id}>
                  <span className="mlmain">
                    <b>{r.title || "Deleted invitation"}</b>
                    <span className="note">{r.email ?? "deleted account"} · {day(r.created_at)}</span>
                  </span>
                  <span className="mlside"><span className="num">{rupees(r.amount)}</span><OrderPill status={r.status} /></span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel" aria-labelledby="rc-h">
        <div className="sechead">
          <h2 className="h3" id="rc-h">Newest customers</h2>
          <Link className="btn ghost small" href="/admin/customers">All customers</Link>
        </div>
        {o.recent_customers.length === 0 ? (
          <p className="empty-inline">Nobody has signed up yet.</p>
        ) : (
          <ul className="minilist">
            {o.recent_customers.map((c) => (
              <li key={c.id}>
                <span className="mlmain">
                  <Link href={`/admin/customers/${c.id}`}><b>{c.email ?? "No email"}</b></Link>
                  <span className="note">Joined {day(c.created_at)}</span>
                </span>
                <span className="mlside note">{c.invites} invitation{c.invites === 1 ? "" : "s"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
