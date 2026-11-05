import Link from "next/link";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { catLabel } from "@/lib/designs";
import { signOut } from "@/app/studio/actions";

/** Signed-in frame for the host studio: top bar plus the list of the host's invitations. */
export default async function StudioShell({ selectedId, children }: { selectedId: string; children: React.ReactNode }) {
  const sb = serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: invites } = await sb
    .from("invites")
    .select("id,n1,n2,occ,date_text,created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="wrap">
      <div className="bar">
        <Link className="logo" href="/">Nimantran</Link>
        <div className="row">
          <span className="note">{user.email}</span>
          <form action={signOut}><button className="btn ghost small" type="submit">Log out</button></form>
        </div>
      </div>
      <div className="cols">
        <aside className="panel">
          <h3>Your invitations</h3>
          <div className="ilist">
            {(invites ?? []).length === 0 && <p className="note">No invitations yet. Fill in the form and save to create your first one.</p>}
            {(invites ?? []).map((i: { id: string; n1: string; n2: string; occ: string; date_text: string }) => (
              <Link key={i.id} className="iitem" href={`/studio/${i.id}`} aria-current={i.id === selectedId}>
                {i.n1}{i.n2 ? ` & ${i.n2}` : ""}
                <small>{catLabel(i.occ)}{i.date_text ? ` · ${i.date_text}` : ""}</small>
              </Link>
            ))}
          </div>
          <Link className="btn small" href="/studio/new">New invitation</Link>
        </aside>
        <div className="stack">{children}</div>
      </div>
    </div>
  );
}
