import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import InviteCard from "@/components/InviteCard";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { BackTo, Flash, InvitePill, OrderPill } from "@/components/admin/ui";
import { adminCall, day, requireAdmin, rupees, title, when, type InviteDetail } from "@/lib/admin";
import { catLabel, cats, designs } from "@/lib/designs";
import { asLang } from "@/lib/i18n";
import { siteOrigin } from "@/lib/studio";
import { deleteInviteAdmin, inviteAction, updateInvite } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin invitation" };

const SOURCE: Record<string, string> = { payment: "Paid online", free: "Published free", admin: "Published by an admin" };
const REPLY = { yes: "Coming", maybe: "Maybe", no: "Can't come" } as const;

export default async function AdminInvitation({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; err?: string } }) {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const d = await adminCall<InviteDetail | null>("admin_invite", { p_id: params.id });
  if (!d) notFound();
  const i = d.invite;
  const back = `/admin/invitations/${i.id}`;
  const link = `${siteOrigin()}/i/${i.slug}`;
  const coming = d.rsvps.filter((r) => r.resp === "yes").reduce((a, r) => a + r.guests, 0);

  const act = (action: string, label: string, opts: { confirm?: string; danger?: boolean; reason?: boolean } = {}) => (
    <form action={inviteAction} className={opts.reason ? "stackform" : undefined}>
      <input type="hidden" name="id" value={i.id} /><input type="hidden" name="action" value={action} /><input type="hidden" name="back" value={back} />
      {opts.reason && <input type="text" name="reason" maxLength={300} placeholder="Reason (the host will see it)" aria-label="Reason" />}
      {opts.confirm ? (
        <ConfirmSubmit className={`btn small ${opts.danger ? "ghost dangerbtn" : ""}`} question={opts.confirm}>{label}</ConfirmSubmit>
      ) : (
        <button className="btn small" type="submit">{label}</button>
      )}
    </form>
  );

  return (
    <>
      <BackTo to="/admin/invitations" label="All invitations" />
      <div className="adminpagehead">
        <div>
          <h1 className="pagetitle">{title(i)}</h1>
          <span className="tags"><InvitePill status={i.status} />{d.owner_blocked && <span className="pill i-suspended">Host on hold</span>}</span>
        </div>
        {i.status === "published" && <a className="btn ghost small" href={link} target="_blank" rel="noreferrer">Open guest page ↗</a>}
      </div>
      <Flash ok={searchParams.ok} err={searchParams.err} />

      <div className="detailgrid invdetail">
        <div className="adminpreview">
          <div className="phone"><div className="phonescreen"><InviteCard inv={i} lang={asLang(i.lang)} /></div></div>
        </div>
        <div className="stack">
          <section className="panel" aria-labelledby="f-h">
            <h2 className="h3" id="f-h">Details</h2>
            <dl className="facts">
              <dt>Host</dt><dd><Link href={`/admin/customers/${i.owner}`}>{d.owner_email ?? "No email"}</Link></dd>
              <dt>Template</dt><dd>{i.design} · {catLabel(i.occ)} · {i.lang === "hi" ? "Hindi" : i.lang === "mr" ? "Marathi" : "English"}</dd>
              <dt>Guest link</dt><dd className="breakall">{i.status === "published" ? <a href={link} target="_blank" rel="noreferrer">{link}</a> : <span className="note">Not live ({i.slug})</span>}</dd>
              <dt>Created</dt><dd>{when(i.created_at)}</dd>
              <dt>Published</dt><dd>{i.published_at ? `${when(i.published_at)}${i.publish_source ? ` · ${SOURCE[i.publish_source] ?? i.publish_source}` : ""}` : "Not yet"}</dd>
              {i.paid_amount != null && (<><dt>Paid</dt><dd>₹{i.paid_amount.toLocaleString("en-IN")}</dd></>)}
              {i.offline_reason && (<><dt>Offline because</dt><dd>{i.offline_reason}</dd></>)}
              <dt>Guests</dt><dd>{d.views} views · {d.visitors} people opened it · {d.rsvps.length} replies · {coming} coming{d.last_view ? ` · last opened ${when(d.last_view)}` : ""}</dd>
            </dl>
          </section>

          <section className="panel actions" aria-labelledby="a-h">
            <h2 className="h3" id="a-h">Actions</h2>
            {i.status === "draft" && act("publish", "Publish without payment", { confirm: "Publish this invitation for free? Guests will be able to open the link." })}
            {i.status === "published" && act("suspend", "Take offline", { confirm: "Take this invitation offline? Guests will see “not available”.", danger: true, reason: true })}
            {i.status === "published" && act("draft", "Move back to draft", { confirm: "Move this invitation back to draft? The host would have to publish it again.", danger: true })}
            {i.status === "suspended" && act("restore", "Put back online")}
            <form action={deleteInviteAdmin}>
              <input type="hidden" name="id" value={i.id} /><input type="hidden" name="back" value={back} />
              <ConfirmSubmit className="btn ghost small dangerbtn" question={`Delete “${title(i)}” and all its replies? This cannot be undone.`}>Delete invitation</ConfirmSubmit>
            </form>
          </section>
        </div>
      </div>

      <details className="panel editbox">
        <summary className="h3">Edit the invitation’s text</summary>
        <form action={updateInvite} className="adminform">
          <input type="hidden" name="id" value={i.id} /><input type="hidden" name="back" value={back} />
          <div className="fgrid">
            <div className="field"><label htmlFor="n1">Name</label><input id="n1" name="n1" type="text" required maxLength={80} defaultValue={i.n1} /></div>
            <div className="field"><label htmlFor="n2">Second name</label><input id="n2" name="n2" type="text" maxLength={80} defaultValue={i.n2} /></div>
            <div className="field"><label htmlFor="occ">Occasion</label>
              <select id="occ" name="occ" defaultValue={i.occ}>{cats.map((c) => <option key={c.id} value={c.id}>{c.en}</option>)}</select></div>
            <div className="field"><label htmlFor="lang">Language</label>
              <select id="lang" name="lang" defaultValue={i.lang}><option value="en">English</option><option value="hi">Hindi</option><option value="mr">Marathi</option></select></div>
            <div className="field"><label htmlFor="date_text">Date</label><input id="date_text" name="date_text" type="text" maxLength={60} defaultValue={i.date_text} /></div>
            <div className="field"><label htmlFor="time_text">Time</label><input id="time_text" name="time_text" type="text" maxLength={40} defaultValue={i.time_text} /></div>
          </div>
          <div className="field"><label htmlFor="venue">Venue</label><input id="venue" name="venue" type="text" maxLength={160} defaultValue={i.venue} /></div>
          <div className="field"><label htmlFor="msg">Message</label><textarea id="msg" name="msg" maxLength={500} rows={3} defaultValue={i.msg} /></div>
          <div className="field"><label htmlFor="design">Template</label>
            <select id="design" name="design" defaultValue={i.design}>{designs.map((x) => <option key={x.n} value={x.n}>{x.n}</option>)}</select></div>
          <button className="btn small" type="submit">Save changes</button>
        </form>
      </details>

      <section className="panel flush" aria-labelledby="r-h">
        <h2 className="h3 padhead" id="r-h">Guest replies</h2>
        {d.rsvps.length === 0 ? <p className="empty-inline">No replies yet.</p> : (
          <table className="rtable">
            <thead><tr><th>Guest</th><th>Reply</th><th className="num">People</th><th>Note</th><th>When</th></tr></thead>
            <tbody>
              {d.rsvps.map((r) => (
                <tr key={r.name + r.updated_at}>
                  <td data-label="Guest"><b>{r.name}</b></td>
                  <td data-label="Reply"><span className={`tag ${r.resp}`}>{REPLY[r.resp]}</span></td>
                  <td data-label="People" className="num">{r.resp === "no" ? "–" : r.guests}</td>
                  <td data-label="Note">{r.note || <span className="note">–</span>}</td>
                  <td data-label="When">{day(r.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel flush" aria-labelledby="p-h">
        <h2 className="h3 padhead" id="p-h">Payments</h2>
        {d.payments.length === 0 ? <p className="empty-inline">No payments for this invitation.</p> : (
          <table className="rtable">
            <thead><tr><th>Date</th><th>Order</th><th className="num">Amount</th><th>Status</th></tr></thead>
            <tbody>
              {d.payments.map((p) => (
                <tr key={p.order_id}>
                  <td data-label="Date">{when(p.created_at)}</td>
                  <td data-label="Order" className="mono">{p.order_id}{p.payment_id ? <small className="sub">{p.payment_id}</small> : null}</td>
                  <td data-label="Amount" className="num">{rupees(p.amount)}</td>
                  <td data-label="Status"><OrderPill status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {d.payments.length > 0 && <p className="note padhead"><Link href={`/admin/orders?q=${encodeURIComponent(i.n1)}`}>Manage these in Orders</Link></p>}
      </section>
    </>
  );
}
