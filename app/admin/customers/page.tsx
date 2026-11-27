import type { Metadata } from "next";
import Link from "next/link";
import { FilterBar, Flash, Pager, href } from "@/components/admin/ui";
import { PAGE_SIZE, adminCall, count, day, pageOf, requireAdmin, rupees, when, type CustomerRow, type Paged } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin customers" };

const FILTER: [string, string][] = [["", "All"], ["paying", "Paying"], ["blocked", "On hold"], ["admins", "Admins"]];

export default async function AdminCustomers({ searchParams }: { searchParams: { filter?: string; q?: string; page?: string; ok?: string; err?: string } }) {
  await requireAdmin();
  const filter = FILTER.some(([v]) => v === searchParams.filter) ? searchParams.filter! : "";
  const q = (searchParams.q ?? "").slice(0, 100);
  const page = pageOf(searchParams.page);
  const data = await adminCall<Paged<CustomerRow>>("admin_customers", { p_filter: filter, p_search: q, p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE });

  return (
    <>
      <div className="adminpagehead">
        <div>
          <h1 className="pagetitle">Customers</h1>
          <p className="note">{count(data.total)} account{data.total === 1 ? "" : "s"}{filter || q ? " match" : ""}</p>
        </div>
        <a className="btn ghost small" href={href("/admin/export/customers", { filter, q })}>Download CSV</a>
      </div>
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <FilterBar base="/admin/customers" param="filter" current={filter} options={FILTER} q={q} placeholder="Search by email" />

      {data.rows.length === 0 ? (
        <p className="panel empty-inline">{filter || q ? "No customers match." : "Nobody has signed up yet."}</p>
      ) : (
        <div className="panel flush">
          <table className="rtable">
            <thead>
              <tr><th>Customer</th><th>Joined</th><th>Last sign-in</th><th className="num">Invitations</th><th className="num">Spent</th></tr>
            </thead>
            <tbody>
              {data.rows.map((c) => (
                <tr key={c.id}>
                  <td data-label="Customer">
                    <Link href={`/admin/customers/${c.id}`}><b>{c.email ?? "No email"}</b></Link>
                    <span className="tags">
                      {c.is_admin && <span className="pill admin">Admin</span>}
                      {c.blocked && <span className="pill i-suspended">On hold</span>}
                      {!c.email_confirmed_at && <span className="pill muted">Email not confirmed</span>}
                    </span>
                    <small className="sub">Signs in with {c.provider === "google" ? "Google" : c.provider === "email" ? "email" : c.provider}</small>
                  </td>
                  <td data-label="Joined">{day(c.created_at)}</td>
                  <td data-label="Last sign-in">{c.last_sign_in_at ? when(c.last_sign_in_at) : "Never"}</td>
                  <td data-label="Invitations" className="num">{c.live} live / {c.invites}</td>
                  <td data-label="Spent" className="num">{rupees(c.spent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager base="/admin/customers" q={{ filter, q }} page={page} total={data.total} size={PAGE_SIZE} />
    </>
  );
}
