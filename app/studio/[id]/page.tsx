import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StudioShell from "@/components/StudioShell";
import InviteEditor from "@/components/InviteEditor";
import Steps from "@/components/Steps";
import SetupNotice from "@/components/SetupNotice";
import PayButton from "@/components/PayButton";
import ShareCard from "@/components/ShareCard";
import AutoRefresh from "@/components/AutoRefresh";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { serverClient } from "@/lib/supabase/server";
import { designBy, designs } from "@/lib/designs";
import { inviteTitle, isSetupError, siteOrigin, type Invite } from "@/lib/studio";
import { deleteInvite } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invitation · Nimantran" };

type Rsvp = { id: string; name: string; resp: "yes" | "maybe" | "no"; guests: number; note: string; updated_at: string };
type Search = { saved?: string; error?: string; d?: string; code?: string; pay?: string; published?: string };

function statusLine(s: Search, published: boolean) {
  if (s.error === "name") return <span className="note err" role="alert">Please enter at least one name.</span>;
  if (s.error === "design") return <span className="note err" role="alert">That template costs more than you paid. Pick one at the same price or less.</span>;
  if (s.error) return <span className="note err" role="alert">Could not save. Please try again.{s.code ? ` (code ${s.code.slice(0, 12)})` : ""}</span>;
  if (s.saved) return <span className="note okmsg" role="status">✓ Saved{published ? ". Guests see the update straight away." : " as a draft."}</span>;
  return null;
}

export default async function InvitePage({ params, searchParams }: { params: { id: string }; searchParams: Search }) {
  const isNew = params.id === "new";
  let invite: Invite | null = null;

  if (!isNew) {
    if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
    const { data, error } = await serverClient().from("invites").select("*").eq("id", params.id).maybeSingle();
    if (error) {
      console.error("studio/[id]: invite query failed", error.code, error.message);
      return (
        <StudioShell back>
          {isSetupError(error) ? <SetupNotice code={error.code} /> : <p className="panel err" role="alert">This invitation could not be loaded. Please refresh the page.</p>}
        </StudioShell>
      );
    }
    if (!data) notFound();
    invite = data as Invite;
  }

  const published = invite?.status === "published";
  const values = invite ?? {
    id: "", n1: "Meera", n2: "Kabir", occ: "wedding", lang: "en", date_text: "Sunday, 14 February 2027",
    time_text: "7:30 PM onwards", venue: "City Palace, Udaipur",
    msg: "With the blessings of our families, we invite you to celebrate with us.",
    design: designs.some((x) => x.n === searchParams.d) ? searchParams.d! : designs[0].n,
  };

  return (
    <StudioShell back>
      <div className="pagehead">
        <div>
          <h1 className="pagetitle">{invite ? inviteTitle(invite) : "New invitation"}</h1>
          {invite && <span className={`badge ${published ? "live" : "draft"}`}>{published ? "● Live" : "Draft · only you can see it"}</span>}
        </div>
      </div>
      <Steps current={!invite ? 1 : published ? 3 : 2} />

      {invite && !published && (
        <section className="panel publish" aria-labelledby="pub-h">
          <div className="pubtext">
            <h2 className="h3" id="pub-h">Ready to send it?</h2>
            <p className="note">Pay once for this invitation to publish it and get the link for your guests.</p>
            <ul className="ticks">
              <li>One link for WhatsApp, SMS and email</li>
              <li>RSVPs with head-counts, and who opened it</li>
              <li>Edit details any time, same link</li>
            </ul>
          </div>
          <div className="pubpay">
            <p className="pubprice"><b>₹{designBy(invite.design).p}</b><span>one-time · {invite.design}</span></p>
            <PayButton inviteId={invite.id} price={designBy(invite.design).p} autoOpen={searchParams.pay === "1"} />
          </div>
        </section>
      )}

      {invite && published && (
        <ShareCard url={`${siteOrigin()}/i/${invite.slug}`} title={inviteTitle(invite)} fresh={searchParams.published === "1"} />
      )}

      {invite && published && <Responses invite={invite} />}

      {invite && published && <h2 className="edtitle">Edit invitation</h2>}
      <InviteEditor
        v={{ ...values, id: invite?.id ?? "" }}
        published={published}
        paidAmount={invite?.paid_amount ?? null}
        restoreDraft={isNew}
        status={statusLine(searchParams, published)}
      />

      {invite && (
        <section className="panel danger" aria-labelledby="del-h">
          <h2 className="h3" id="del-h">Delete invitation</h2>
          <p className="note">
            {published ? "The guest link stops working and all replies are deleted. Payments are not refunded." : "This draft will be removed."}
          </p>
          <form action={deleteInvite}>
            <input type="hidden" name="id" value={invite.id} />
            <ConfirmSubmit className="btn ghost small dangerbtn" question={`Delete “${inviteTitle(invite)}”? This cannot be undone.`}>
              Delete invitation
            </ConfirmSubmit>
          </form>
        </section>
      )}
    </StudioShell>
  );
}

async function Responses({ invite }: { invite: Invite }) {
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
    days.push({ k: dt.toISOString().slice(0, 10), l: dt.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }), n: 0 });
  }
  views.forEach((v) => { const x = days.find((y) => y.k === v.created_at.slice(0, 10)); if (x) x.n++; });
  const mx = Math.max(1, ...days.map((x) => x.n));

  let yes = 0, maybe = 0, no = 0, head = 0;
  rsvps.forEach((r) => { if (r.resp === "yes") { yes++; head += r.guests; } else if (r.resp === "maybe") maybe++; else no++; });
  const label = { yes: "Coming", maybe: "Maybe", no: "Can't come" } as const;

  return (
    <section className="panel" aria-labelledby="resp-h">
      <div className="sechead">
        <h2 className="h3" id="resp-h">Guests and replies</h2>
        <AutoRefresh seconds={30} />
      </div>
      <div className="stats">
        <div className="stat"><b>{head}</b><span>people coming</span></div>
        <div className="stat"><b>{yes}</b><span>said yes</span></div>
        <div className="stat"><b>{maybe}</b><span>maybe</span></div>
        <div className="stat"><b>{no}</b><span>can't come</span></div>
        <div className="stat"><b>{uniq}</b><span>guests opened</span></div>
        <div className="stat"><b>{views.length}</b><span>total views</span></div>
      </div>
      <p className="grouplabel">Views, last 7 days</p>
      <div className="spark" role="img" aria-label={`Views per day: ${days.map((x) => `${x.l} ${x.n}`).join(", ")}`}>
        {days.map((x) => (
          <span key={x.k} className="sparkcol">
            <i style={{ height: `${Math.max(4, Math.round((x.n / mx) * 100))}%` }} />
            <small>{x.n}</small>
          </span>
        ))}
      </div>
      <div className="days" aria-hidden="true">{days.map((x) => <span key={x.k}>{x.l}</span>)}</div>
      <p className="note" style={{ marginBottom: "1rem" }}>
        {views[0] ? `Last opened ${new Date(views[0].created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST.` : "Not opened by a guest yet."} Your own views are not counted.
      </p>
      {rsvps.length === 0 ? (
        <p className="empty-inline">No replies yet. Share the link above to start collecting them.</p>
      ) : (
        <table className="rtable">
          <thead><tr><th>Guest</th><th>Reply</th><th>People</th><th>Note</th></tr></thead>
          <tbody>
            {rsvps.map((r) => (
              <tr key={r.id}>
                <td data-label="Guest"><b>{r.name}</b></td>
                <td data-label="Reply"><span className={`tag ${r.resp}`}>{label[r.resp]}</span></td>
                <td data-label="People">{r.resp === "no" ? "–" : r.guests}</td>
                <td data-label="Note">{r.note || <span className="note">–</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="row" style={{ marginTop: "1rem" }}>
        <a className="btn ghost small" href={`/studio/${invite.id}/csv`}>Download guest list (CSV)</a>
      </div>
    </section>
  );
}
