import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackTo, Flash, InvitePill, OrderPill } from "@/components/admin/ui";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { adminCall, day, requireAdmin, rupees, title, when, type CustomerDetail } from "@/lib/admin";
import { catLabel } from "@/lib/designs";
import { customerHold, customerRole, deleteCustomer } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin customer" };

export default async function AdminCustomer({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; err?: string } }) {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const c = await adminCall<CustomerDetail | null>("admin_customer", { p_user: params.id });
  if (!c) notFound();
  const back = `/admin/customers/${params.id}`;
  const u = c.user;
  const live = c.invites.filter((i) => i.status === "published").length;

  return (
    <>
      <BackTo to="/admin/customers" label="All customers" />
      <div className="adminpagehead">
        <div>
          <h1 className="pagetitle breakall">{u.email ?? "No email"}</h1>
          <span className="tags">
            {c.is_admin && <span className="pill admin">Admin</span>}
            {c.blocked && <span className="pill i-suspended">On hold</span>}
            {c.is_self && <span className="pill muted">You</span>}
          </span>
        </div>
      </div>
      <Flash ok={searchParams.ok} err={searchParams.err} />

      <div className="detailgrid">
        <section className="panel" aria-labelledby="f-h">
          <h2 className="h3" id="f-h">Account</h2>
          <dl className="facts">
            <dt>Joined</dt><dd>{when(u.created_at)}</dd>
            <dt>Last sign-in</dt><dd>{u.last_sign_in_at ? when(u.last_sign_in_at) : "Never"}</dd>
            <dt>Signs in with</dt><dd>{u.provider === "google" ? "Google" : u.provider === "email" ? "Email" : u.provider}</dd>
            <dt>Email confirmed</dt><dd>{u.email_confirmed_at ? day(u.email_confirmed_at) : "Not yet"}</dd>
            <dt>Invitations</dt><dd>{c.invites.length} ({live} live)</dd>
            <dt>Total paid</dt><dd>{rupees(c.spent)}</dd>
            {c.blocked && (<><dt>On hold since</dt><dd>{when(c.blocked.blocked_at)}{c.blocked.reason ? ` · ${c.blocked.reason}` : ""}</dd></>)}
          </dl>
        </section>

        <section className="panel actions" aria-labelledby="a-h">
          <h2 className="h3" id="a-h">Actions</h2>
          {c.blocked ? (
            <form action={customerHold}>
              <input type="hidden" name="id" value={u.id} /><input type="hidden" name="hold" value="0" /><input type="hidden" name="back" value={back} />
              <p className="note">Lifting the hold lets them edit again and puts back online the invitations the hold took down.</p>
              <button className="btn small" type="submit">Lift hold</button>
            </form>
          ) : !c.is_admin && !c.is_self ? (
            <form action={customerHold} className="stackform">
              <input type="hidden" name="id" value={u.id} /><input type="hidden" name="hold" value="1" /><input type="hidden" name="back" value={back} />
              <label htmlFor="reason">Put on hold</label>
              <p className="note">They cannot create, edit or pay, and their live invitations go offline until you lift the hold.</p>
              <input id="reason" type="text" name="reason" maxLength={300} placeholder="Reason (they will see it)" />
              <ConfirmSubmit className="btn ghost small dangerbtn" question={`Put ${u.email ?? "this customer"} on hold?`}>Put on hold</ConfirmSubmit>
            </form>
          ) : null}

          {!c.blocked && (
            <form action={customerRole}>
              <input type="hidden" name="id" value={u.id} /><input type="hidden" name="admin" value={c.is_admin ? "0" : "1"} /><input type="hidden" name="back" value={back} />
              {c.is_admin ? (
                <ConfirmSubmit className="btn ghost small" question={`Remove admin access from ${u.email ?? "this account"}?`}>Remove admin access</ConfirmSubmit>
              ) : (
                <ConfirmSubmit className="btn ghost small" question={`Give ${u.email ?? "this account"} full admin access?`}>Make admin</ConfirmSubmit>
              )}
            </form>
          )}

          {!c.is_admin && !c.is_self && (
            <form action={deleteCustomer} className="stackform dangerzone">
              <input type="hidden" name="id" value={u.id} /><input type="hidden" name="back" value={back} />
              <label htmlFor="confirm">Delete account</label>
              <p className="note">Deletes their sign-in, invitations, replies and views. Their orders stay in your records.</p>
              <input id="confirm" type="text" name="confirm" autoComplete="off" placeholder={u.email ? `Type ${u.email} to confirm` : "Type DELETE to confirm"} />
              <button className="btn ghost small dangerbtn" type="submit">Delete permanently</button>
            </form>
          )}
        </section>
      </div>

      <section className="panel flush" aria-labelledby="inv-h">
        <h2 className="h3 padhead" id="inv-h">Invitations</h2>
        {c.invites.length === 0 ? (
          <p className="empty-inline">No invitations yet.</p>
        ) : (
          <table className="rtable">
            <thead><tr><th>Invitation</th><th>Status</th><th>Created</th><th className="num">Views</th><th className="num">Replies</th></tr></thead>
            <tbody>
              {c.invites.map((i) => (
                <tr key={i.id}>
                  <td data-label="Invitation"><Link href={`/admin/invitations/${i.id}`}><b>{title(i)}</b></Link><small className="sub">{catLabel(i.occ)} · {i.design}{i.date_text ? ` · ${i.date_text}` : ""}</small></td>
                  <td data-label="Status"><InvitePill status={i.status} /></td>
                  <td data-label="Created">{day(i.created_at)}</td>
                  <td data-label="Views" className="num">{i.views}</td>
                  <td data-label="Replies" className="num">{i.replies}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel flush" aria-labelledby="ord-h">
        <h2 className="h3 padhead" id="ord-h">Orders</h2>
        {c.orders.length === 0 ? (
          <p className="empty-inline">No orders yet.</p>
        ) : (
          <table className="rtable">
            <thead><tr><th>Date</th><th>Invitation</th><th className="num">Amount</th><th>Status</th></tr></thead>
            <tbody>
              {c.orders.map((o) => (
                <tr key={o.order_id}>
                  <td data-label="Date">{when(o.created_at)}</td>
                  <td data-label="Invitation">{o.invite_id ? <Link href={`/admin/invitations/${o.invite_id}`}>{o.title || o.design}</Link> : (o.title || "Deleted invitation")}<small className="sub mono">{o.order_id}</small></td>
                  <td data-label="Amount" className="num">{rupees(o.amount)}</td>
                  <td data-label="Status"><OrderPill status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
