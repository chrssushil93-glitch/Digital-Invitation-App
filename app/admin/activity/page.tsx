import type { Metadata } from "next";
import { Pager } from "@/components/admin/ui";
import { adminCall, pageOf, requireAdmin, when, type LogRow, type Paged } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin activity" };

const LABEL: Record<string, string> = {
  "settings.save": "Changed site settings",
  "invite.publish": "Published an invitation", "invite.suspend": "Took an invitation offline",
  "invite.restore": "Put an invitation back online", "invite.draft": "Moved an invitation to draft",
  "invite.edit": "Edited an invitation", "invite.delete": "Deleted an invitation",
  "customer.hold": "Put a customer on hold", "customer.release": "Lifted a hold", "customer.delete": "Deleted a customer",
  "admin.add": "Gave admin access", "admin.remove": "Removed admin access",
  "order.paid": "Marked an order paid", "order.refunded": "Marked an order refunded",
  "asset.upload": "Uploaded a logo", "asset.delete": "Removed the uploaded logo",
};

const SIZE = 50;

function detail(r: LogRow): string {
  const d = r.details ?? {};
  const bits: string[] = [];
  if (Array.isArray(d.changed) && d.changed.length) bits.push(`changed: ${(d.changed as string[]).join(", ")}`);
  if (typeof d.reason === "string" && d.reason) bits.push(`reason: ${d.reason}`);
  if (typeof d.note === "string" && d.note) bits.push(`note: ${d.note}`);
  if (typeof d.invitations === "number" && d.invitations) bits.push(`${d.invitations} invitation(s) affected`);
  if (typeof d.from === "string") bits.push(`was ${d.from === "published" ? "live" : d.from === "suspended" ? "offline" : d.from}`);
  if (d.unpublish === true) bits.push("invitation taken down");
  return bits.join(" · ");
}

export default async function AdminActivity({ searchParams }: { searchParams: { page?: string } }) {
  await requireAdmin();
  const page = pageOf(searchParams.page);
  const data = await adminCall<Paged<LogRow>>("admin_activity", { p_limit: SIZE, p_offset: (page - 1) * SIZE });
  return (
    <>
      <div className="adminpagehead">
        <div>
          <h1 className="pagetitle">Activity</h1>
          <p className="note">Every change made in the admin, newest first.</p>
        </div>
      </div>
      {data.rows.length === 0 ? (
        <p className="panel empty-inline">Nothing yet. Actions you take in the admin are recorded here.</p>
      ) : (
        <ol className="panel activity">
          {data.rows.map((r) => (
            <li key={r.id}>
              <span className="actwhen">{when(r.created_at)}</span>
              <span className="actwhat">
                <b>{LABEL[r.action] ?? r.action}</b>{r.target ? <> · <span className="breakall">{r.target}</span></> : null}
                {detail(r) && <small className="sub">{detail(r)}</small>}
              </span>
              <span className="actwho note">{r.admin_email ?? "admin"}</span>
            </li>
          ))}
        </ol>
      )}
      <Pager base="/admin/activity" q={{}} page={page} total={data.total} size={SIZE} />
    </>
  );
}
