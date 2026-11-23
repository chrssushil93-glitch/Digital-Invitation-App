import LivePreview from "@/components/LivePreview";
import DraftKeeper from "@/components/DraftKeeper";
import { artSvg, cats, designs } from "@/lib/designs";
import { saveInvite } from "@/app/studio/actions";

export type EditorValues = {
  id: string; n1: string; n2: string; occ: string; lang: string;
  date_text: string; time_text: string; venue: string; msg: string; design: string;
};

/**
 * The invitation editor: every field, a visual template picker and the live phone preview.
 * Works without an account; saving asks the host to log in and keeps what they typed.
 */
export default function InviteEditor({
  v, title, saveLabel, restoreDraft = false, status,
}: {
  v: EditorValues; title: string; saveLabel: string; restoreDraft?: boolean; status?: React.ReactNode;
}) {
  const lang = v.lang === "hi" || v.lang === "mr" ? v.lang : "en";
  return (
    <div className="editgrid">
      <form className="panel" id="invform" action={saveInvite}>
        <h3>{title}</h3>
        <input type="hidden" name="id" value={v.id} />
        <fieldset className="field tpick">
          <legend>Template</legend>
          <div className="tgrid">
            {designs.map((x) => (
              <label key={x.n} className="topt">
                <input type="radio" name="design" value={x.n} defaultChecked={x.n === v.design} />
                <span className="art" dangerouslySetInnerHTML={{ __html: artSvg(x) }} />
                <span className="tname">{x.n}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="fgrid">
          <div className="field"><label htmlFor="n1">Name</label><input id="n1" name="n1" type="text" required maxLength={80} defaultValue={v.n1} /></div>
          <div className="field"><label htmlFor="n2">Second name (optional)</label><input id="n2" name="n2" type="text" maxLength={80} defaultValue={v.n2} /></div>
          <div className="field"><label htmlFor="occ">Occasion</label>
            <select id="occ" name="occ" defaultValue={v.occ}>{cats.map((c) => <option key={c.id} value={c.id}>{c.en}</option>)}</select></div>
          <div className="field"><label htmlFor="lang">Invitation language</label>
            <select id="lang" name="lang" defaultValue={lang}><option value="en">English</option><option value="hi">हिन्दी</option><option value="mr">मराठी</option></select></div>
          <div className="field"><label htmlFor="date_text">Date</label><input id="date_text" name="date_text" type="text" maxLength={60} defaultValue={v.date_text} /></div>
          <div className="field"><label htmlFor="time_text">Time</label><input id="time_text" name="time_text" type="text" maxLength={40} defaultValue={v.time_text} /></div>
        </div>
        <div className="field"><label htmlFor="venue">Venue</label><input id="venue" name="venue" type="text" maxLength={160} defaultValue={v.venue} /></div>
        <div className="field"><label htmlFor="msg">Message to guests</label><textarea id="msg" name="msg" maxLength={500} defaultValue={v.msg} /></div>
        <div className="row">
          <button className="btn" type="submit">{saveLabel}</button>
          {status}
        </div>
      </form>
      <LivePreview
        formId="invform"
        initialLang={lang}
        initial={{ n1: v.n1, n2: v.n2, occ: v.occ, date_text: v.date_text, time_text: v.time_text, venue: v.venue, msg: v.msg, design: v.design }}
      />
      <a className="pvjump" href="#preview">Preview</a>
      <DraftKeeper formId="invform" restore={restoreDraft} track={!v.id} />
    </div>
  );
}
