import type { Metadata } from "next";
import Link from "next/link";
import StudioShell from "@/components/StudioShell";
import SetupNotice from "@/components/SetupNotice";
import { serverClient } from "@/lib/supabase/server";
import { artSvg, catLabel, designBy } from "@/lib/designs";
import { inviteTitle, isSetupError, type Invite } from "@/lib/studio";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My invitations · Nimantran" };

type Row = Pick<Invite, "id" | "n1" | "n2" | "occ" | "date_text" | "design" | "status" | "created_at">;

export default async function StudioHome({ searchParams }: { searchParams: { deleted?: string } }) {
  const sb = serverClient();
  const { data, error } = await sb
    .from("invites")
    .select("id,n1,n2,occ,date_text,design,status,created_at")
    .order("created_at", { ascending: false });
  if (error) console.error("studio: invites query failed", error.code, error.message);
  const invites = (data ?? []) as Row[];

  // Reply and view counts for each invitation.
  const ids = invites.map((i) => i.id);
  const stats = new Map<string, { views: Set<string>; coming: number; replies: number }>();
  ids.forEach((id) => stats.set(id, { views: new Set(), coming: 0, replies: 0 }));
  if (ids.length) {
    const [{ data: rs }, { data: vs }] = await Promise.all([
      sb.from("rsvps").select("invite_id,resp,guests").in("invite_id", ids).limit(10000),
      sb.from("views").select("invite_id,visitor").in("invite_id", ids).limit(20000),
    ]);
    (rs ?? []).forEach((r: { invite_id: string; resp: string; guests: number }) => {
      const s = stats.get(r.invite_id);
      if (!s) return;
      s.replies++;
      if (r.resp === "yes") s.coming += r.guests;
    });
    (vs ?? []).forEach((v: { invite_id: string; visitor: string }) => stats.get(v.invite_id)?.views.add(v.visitor));
  }

  return (
    <StudioShell>
      <div className="pagehead">
        <div>
          <h1 className="pagetitle">My invitations</h1>
          <p className="note">Drafts are private. Publish one to get a link for your guests.</p>
        </div>
        <Link className="btn" href="/studio/new">+ New invitation</Link>
      </div>
      {searchParams.deleted && <p className="toast" role="status">Invitation deleted.</p>}
      {error && isSetupError(error) && <SetupNotice code={error.code} />}
      {error && !isSetupError(error) && (
        <p className="panel err" role="alert">Your invitations could not be loaded right now. Please refresh the page.</p>
      )}

      {!error && invites.length === 0 && (
        <div className="panel empty">
          <div className="emptyart" aria-hidden="true">✉️</div>
          <h2 className="h3">No invitations yet</h2>
          <p className="note">Pick a design, add your names and date, and preview it for free. You pay only when you are ready to share.</p>
          <div className="row center">
            <Link className="btn" href="/studio/new">Create your first invitation</Link>
            <Link className="btn ghost" href="/#designs">Browse designs</Link>
          </div>
        </div>
      )}

      {invites.length > 0 && (
        <ul className="icards">
          {invites.map((i) => {
            const s = stats.get(i.id)!;
            const live = i.status === "published";
            return (
              <li key={i.id}>
                <Link className="icard panel" href={`/studio/${i.id}`}>
                  <span className="art icthumb" dangerouslySetInnerHTML={{ __html: artSvg(designBy(i.design)) }} />
                  <span className="icbody">
                    <span className={`badge ${live ? "live" : "draft"}`}>{live ? "● Live" : "Draft"}</span>
                    <span className="ictitle">{inviteTitle(i)}</span>
                    <span className="note">{catLabel(i.occ)}{i.date_text ? ` · ${i.date_text}` : ""}</span>
                    {live ? (
                      <span className="icstats">
                        <span><b>{s.views.size}</b> opened</span>
                        <span><b>{s.replies}</b> replies</span>
                        <span><b>{s.coming}</b> coming</span>
                      </span>
                    ) : (
                      <span className="note icnext">Pay ₹{designBy(i.design).p} to publish →</span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </StudioShell>
  );
}
