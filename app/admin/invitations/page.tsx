import type { Metadata } from "next";
import Link from "next/link";
import { FilterBar, Flash, InvitePill, Pager, href } from "@/components/admin/ui";
import { PAGE_SIZE, adminCall, count, day, pageOf, requireAdmin, title, type InviteRow, type Paged } from "@/lib/admin";
import { artSvg, catLabel, designBy } from "@/lib/designs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin invitations" };

const STATUS: [string, string][] = [["", "All"], ["published", "Live"], ["draft", "Drafts"], ["suspended", "Offline"]];

export default async function AdminInvitations({ searchParams }: { searchParams: { status?: string; q?: string; page?: string; ok?: string; err?: string } }) {
  await requireAdmin();
  const status = STATUS.some(([v]) => v === searchParams.status) ? searchParams.status! : "";
  const q = (searchParams.q ?? "").slice(0, 100);
  const page = pageOf(searchParams.page);
  const data = await adminCall<Paged<InviteRow>>("admin_invites", { p_status: status, p_search: q, p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE });

  return (
    <>
      <div className="adminpagehead">
        <div>
          <h1 className="pagetitle">Invitations</h1>
          <p className="note">{count(data.total)} invitation{data.total === 1 ? "" : "s"}{status || q ? " match" : ""}</p>
        </div>
        <a className="btn ghost small" href={href("/admin/export/invitations", { status, q })}>Download CSV</a>
      </div>
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <FilterBar base="/admin/invitations" param="status" current={status} options={STATUS} q={q} placeholder="Names, link code, venue or email" />

      {data.rows.length === 0 ? (
        <p className="panel empty-inline">{status || q ? "No invitations match." : "No invitations yet."}</p>
      ) : (
        <div className="panel flush">
          <table className="rtable">
            <thead>
              <tr><th>Invitation</th><th>Host</th><th>Status</th><th className="num">Views</th><th className="num">Coming</th><th>Created</th></tr>
            </thead>
            <tbody>
              {data.rows.map((i) => (
                <tr key={i.id}>
                  <td data-label="Invitation">
                    <span className="invcell">
                      <span className="art minithumb" dangerouslySetInnerHTML={{ __html: artSvg(designBy(i.design)) }} />
                      <span>
                        <Link href={`/admin/invitations/${i.id}`}><b>{title(i)}</b></Link>
                        <small className="sub">{catLabel(i.occ)} · {i.design}{i.date_text ? ` · ${i.date_text}` : ""}</small>
                      </span>
                    </span>
                  </td>
                  <td data-label="Host">{i.owner ? <Link href={`/admin/customers/${i.owner}`}>{i.email ?? "No email"}</Link> : "–"}</td>
                  <td data-label="Status">
                    <InvitePill status={i.status} />
                    {i.status === "published" && i.publish_source && i.publish_source !== "payment" && (
                      <small className="sub">{i.publish_source === "free" ? "Published free" : "Published by admin"}</small>
                    )}
                  </td>
                  <td data-label="Views" className="num">{i.views}</td>
                  <td data-label="Coming" className="num">{i.coming} <small className="sub">{i.replies} replies</small></td>
                  <td data-label="Created">{day(i.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager base="/admin/invitations" q={{ status, q }} page={page} total={data.total} size={PAGE_SIZE} />
    </>
  );
}
