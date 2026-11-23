import { headers } from "next/headers";
import { notFound } from "next/navigation";
import StudioShell from "@/components/StudioShell";
import InviteEditor from "@/components/InviteEditor";
import { serverClient } from "@/lib/supabase/server";
import { designs } from "@/lib/designs";
import { deleteInvite } from "../actions";

export const dynamic = "force-dynamic";

type Invite = {
  id: string; slug: string; n1: string; n2: string; occ: string; lang: string;
  date_text: string; time_text: string; venue: string; msg: string; design: string;
};
type Rsvp = { id: string; name: string; resp: "yes" | "maybe" | "no"; guests: number; note: string; updated_at: string };

function origin(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function EditInvite({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string; error?: string; d?: string; code?: string };
}) {
  const isNew = params.id === "new";
  let invite: Invite | null = null;
  const sb = serverClient();

  if (!isNew) {
    if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
    const { data } = await sb.from("invites").select("*").eq("id", params.id).maybeSingle();
    if (!data) notFound();
    invite = data as Invite;
  }

  const d: Invite = invite ?? {
    id: "", slug: "", n1: "Meera", n2: "Kabir", occ: "wedding", lang: "en", date_text: "14 February 2027",
    time_text: "7:30 PM", venue: "City Palace, Udaipur",
    msg: "With the blessings of our families, we invite you to celebrate with us.",
    design: designs.some((x) => x.n === searchParams.d) ? searchParams.d! : designs[0].n,
  };

  return (
    <StudioShell selectedId={isNew ? "new" : params.id}>
      <InviteEditor
        v={{ ...d, id: isNew ? "" : d.id }}
        title={isNew ? "New invitation" : "Edit invitation"}
        saveLabel={isNew ? "Save and get guest link" : "Save invitation"}
        restoreDraft={isNew}
        status={
          <>
            {searchParams.saved && <span className="note okmsg" role="status">Saved.</span>}
            {searchParams.error && <span className="note err" role="status">{searchParams.error === "name" ? "Enter at least one name." : `Could not save. Please try again.${searchParams.code ? ` (code ${searchParams.code.slice(0, 12)})` : ""}`}</span>}
          </>
        }
      />

      {invite && <Share invite={invite} />}
      {invite && <Dashboard invite={invite} />}
    </StudioShell>
  );
}

function Share({ invite }: { invite: Invite }) {
  const url = `${origin()}/i/${invite.slug}`;
  return (
    <div className="panel linkbox">
      <h3>Guest link</h3>
      <code>{url}</code>
      <div className="row">
        <a className="btn small" href={url} target="_blank" rel="noreferrer">Open guest view</a>
        <form action={deleteInvite}>
          <input type="hidden" name="id" value={invite.id} />
          <button className="btn ghost small" type="submit">Delete invitation</button>
        </form>
      </div>
      <p className="note" style={{ marginTop: ".7rem" }}>Guests need no account. Anyone with this link can open the invitation and reply.</p>
    </div>
  );
}

async function Dashboard({ invite }: { invite: Invite }) {
  const sb = serverClient();
  const [{ data: rs }, { data: vs }] = await Promise.all([
    sb.from("rsvps").select("id,name,resp,guests,note,updated_at").eq("invite_id", invite.id).order("updated_at", { ascending: false }).limit(2000),
    sb.from("views").select("visitor,created_at").eq("invite_id", invite.id).order("created_at", { ascending: false }).limit(5000),
  ]);
  const rsvps = (rs ?? []) as Rsvp[];
  const views = (vs ?? []) as { visitor: string; created_at: string }[];

  const uniq = new Set(views.map((v) => v.visitor)).size;
  const days: { k: string; l: string; n: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000);
    days.push({ k: dt.toISOString().slice(0, 10), l: dt.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }).slice(0, 1), n: 0 });
  }
  views.forEach((v) => { const x = days.find((y) => y.k === v.created_at.slice(0, 10)); if (x) x.n++; });
  const mx = Math.max(1, ...days.map((x) => x.n));

  let yes = 0, maybe = 0, head = 0;
  rsvps.forEach((r) => { if (r.resp === "yes") { yes++; head += r.guests; } else if (r.resp === "maybe") maybe++; });
  const label = { yes: "Coming", maybe: "Maybe", no: "Can't" } as const;

  return (
    <div className="panel">
      <h3>Views and replies</h3>
      <div className="stats">
        <div className="stat"><b>{uniq}</b><span>guests opened</span></div>
        <div className="stat"><b>{views.length}</b><span>views</span></div>
        <div className="stat"><b>{yes}</b><span>coming ({head} people)</span></div>
        <div className="stat"><b>{maybe}</b><span>maybe</span></div>
      </div>
      <div className="spark" aria-hidden="true">{days.map((x) => <i key={x.k} style={{ height: `${Math.max(4, Math.round((x.n / mx) * 100))}%` }} />)}</div>
      <div className="days" aria-hidden="true">{days.map((x) => <span key={x.k}>{x.l}</span>)}</div>
      <p className="note" style={{ marginBottom: "1rem" }}>
        {views[0] ? `Last opened ${new Date(views[0].created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST.` : "Not opened by a guest yet."} Your own views are not counted.
      </p>
      <div className="tbl">
        <table>
          <thead><tr><th>Guest</th><th>Reply</th><th>People</th><th>Note</th></tr></thead>
          <tbody>
            {rsvps.length === 0 && <tr><td colSpan={4} className="note">No replies yet. Share the link to start collecting them.</td></tr>}
            {rsvps.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td><span className={`tag ${r.resp}`}>{label[r.resp]}</span></td>
                <td>{r.resp === "no" ? "–" : r.guests}</td>
                <td>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row" style={{ marginTop: "1rem" }}>
        <a className="btn ghost small" href={`/studio/${invite.id}/csv`}>Download guest list (CSV)</a>
      </div>
    </div>
  );
}
