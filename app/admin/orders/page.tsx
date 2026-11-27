import type { Metadata } from "next";
import Link from "next/link";
import { FilterBar, Flash, OrderPill, Pager, href } from "@/components/admin/ui";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { PAGE_SIZE, adminCall, count, pageOf, requireAdmin, rupees, when, type OrderRow, type Paged } from "@/lib/admin";
import { checkRazorpay, orderAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin orders" };

const STATUS: [string, string][] = [["", "All"], ["paid", "Paid"], ["created", "Not paid"], ["refunded", "Refunded"]];

export default async function AdminOrders({ searchParams }: { searchParams: { status?: string; q?: string; page?: string; ok?: string; err?: string } }) {
  await requireAdmin();
  const status = STATUS.some(([v]) => v === searchParams.status) ? searchParams.status! : "";
  const q = (searchParams.q ?? "").slice(0, 100);
  const page = pageOf(searchParams.page);
  const data = await adminCall<Paged<OrderRow>>("admin_orders", { p_status: status, p_search: q, p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE });
  const here = href("/admin/orders", { status, q, page });

  return (
    <>
      <div className="adminpagehead">
        <div>
          <h1 className="pagetitle">Orders</h1>
          <p className="note">{count(data.total)} order{data.total === 1 ? "" : "s"}{status || q ? " match" : ""} · {rupees(data.paid_sum ?? 0)} paid</p>
        </div>
        <a className="btn ghost small" href={href("/admin/export/orders", { status, q })}>Download CSV</a>
      </div>
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <FilterBar base="/admin/orders" param="status" current={status} options={STATUS} q={q} placeholder="Order ID, payment ID, email or names" />

      {data.rows.length === 0 ? (
        <p className="panel empty-inline">{status || q ? "No orders match." : "No orders yet. An order appears when a host starts paying for an invitation."}</p>
      ) : (
        <div className="panel flush">
          <table className="rtable">
            <thead>
              <tr><th>Date</th><th>Customer</th><th>Invitation</th><th className="num">Amount</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.order_id}>
                  <td data-label="Date">{when(r.created_at)}</td>
                  <td data-label="Customer">
                    {r.owner ? <Link href={`/admin/customers/${r.owner}`}>{r.email ?? "No email"}</Link> : <span>{r.email ?? "Deleted account"}</span>}
                  </td>
                  <td data-label="Invitation">
                    {r.invite_id ? <Link href={`/admin/invitations/${r.invite_id}`}>{r.title}</Link> : <span>{r.title ?? "Deleted invitation"}</span>}
                    <small className="sub">{r.design}</small>
                  </td>
                  <td data-label="Amount" className="num">{rupees(r.amount)}</td>
                  <td data-label="Status">
                    <OrderPill status={r.status} />
                    <small className="sub">{r.status === "paid" ? `Paid ${when(r.paid_at)}` : r.status === "refunded" ? `Refunded ${when(r.refunded_at)}` : ""}</small>
                  </td>
                  <td data-label="Manage">
                    <details className="manage">
                      <summary className="btn ghost small">Manage</summary>
                      <div className="managepop">
                        <p className="mono">Order {r.order_id}{r.payment_id ? <><br />Payment {r.payment_id}</> : null}</p>
                        {r.note && <p className="note">Note: {r.note}</p>}
                        {r.payment_id && (
                          <a className="btn ghost small block" href={`https://dashboard.razorpay.com/app/payments/${encodeURIComponent(r.payment_id)}`} target="_blank" rel="noreferrer">
                            Open in Razorpay ↗
                          </a>
                        )}
                        {r.status === "created" && (
                          <>
                            <form action={checkRazorpay}>
                              <input type="hidden" name="order" value={r.order_id} />
                              <input type="hidden" name="back" value={here} />
                              <button className="btn small block" type="submit">Check with Razorpay</button>
                            </form>
                            <form action={orderAction} className="stackform">
                              <input type="hidden" name="order" value={r.order_id} />
                              <input type="hidden" name="action" value="paid" />
                              <input type="hidden" name="back" value={here} />
                              <label htmlFor={`pid-${r.order_id}`}>Paid another way? Reference</label>
                              <input id={`pid-${r.order_id}`} type="text" name="payment_id" placeholder="Payment ID or UPI ref (optional)" />
                              <input type="text" name="note" placeholder="Note (optional)" aria-label="Note" />
                              <ConfirmSubmit className="btn ghost small block" question="Mark this order as paid and publish the invitation?">Mark as paid</ConfirmSubmit>
                            </form>
                          </>
                        )}
                        {r.status === "paid" && (
                          <form action={orderAction} className="stackform">
                            <input type="hidden" name="order" value={r.order_id} />
                            <input type="hidden" name="action" value="refunded" />
                            <input type="hidden" name="back" value={here} />
                            <p className="note">Refund the money in the Razorpay dashboard first, then record it here.</p>
                            <input type="text" name="note" placeholder="Reason (optional)" aria-label="Reason" />
                            <label className="checkline"><input type="checkbox" name="unpublish" /> Also take the invitation down (back to draft)</label>
                            <ConfirmSubmit className="btn ghost small block dangerbtn" question="Record this order as refunded?">Mark as refunded</ConfirmSubmit>
                          </form>
                        )}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager base="/admin/orders" q={{ status, q }} page={page} total={data.total} size={PAGE_SIZE} />
    </>
  );
}
