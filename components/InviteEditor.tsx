import LivePreview from "@/components/LivePreview";
import DraftKeeper from "@/components/DraftKeeper";
import SaveBar from "@/components/SaveBar";
import { artSvg, cats, designs } from "@/lib/designs";
import { saveAndPay, saveDraft } from "@/app/studio/actions";

export type EditorValues = {
  id: string; n1: string; n2: string; occ: string; lang: string;
  date_text: string; time_text: string; venue: string; msg: string; design: string;
};

const PRICES = Object.fromEntries(designs.map((d) => [d.n, d.p]));

/**
 * The invitation editor: template strip, then the live phone preview, then the text boxes.
 * Works without an account; saving asks the host to log in and keeps what they typed.
 */
export default function InviteEditor({
  v, published = false, paidAmount = null, restoreDraft = false, status,
}: {
  v: EditorValues; published?: boolean; paidAmount?: number | null; restoreDraft?: boolean; status?: React.ReactNode;
}) {
  const lang = v.lang === "hi" || v.lang === "mr" ? v.lang : "en";
  const locked = (p: number) => published && paidAmount != null && p > paidAmount;
  return (
    <>
      <form className="editor" id="invform" action={saveDraft}>
        <input type="hidden" name="id" value={v.id} />

        <section className="panel edsec" aria-labelledby="tpl-h">
          <div className="sechead">
            <h2 className="h3" id="tpl-h">Choose a template</h2>
            <span className="note">{designs.length} designs · swipe for more</span>
          </div>
          <fieldset className="tpick">
            <legend className="sr-only">Template</legend>
            <div className="tstrip">
              {designs.map((x) => (
                <label key={x.n} className="topt" title={locked(x.p) ? "Costs more than you paid for this invitation" : undefined}>
                  <input type="radio" name="design" value={x.n} defaultChecked={x.n === v.design} disabled={locked(x.p)} />
                  <span className="art" dangerouslySetInnerHTML={{ __html: artSvg(x) }} />
                  <span className="tname">{x.n}</span>
                  <span className="tprice">{locked(x.p) ? "🔒 " : ""}₹{x.p}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <div className="edmain">
          <div className="edpreview">
            <LivePreview
              formId="invform"
              initialLang={lang}
              watermark={!published}
              initial={{ n1: v.n1, n2: v.n2, occ: v.occ, date_text: v.date_text, time_text: v.time_text, venue: v.venue, msg: v.msg, design: v.design }}
            />
          </div>

          <section className="panel edsec edfields" aria-labelledby="det-h">
            <h2 className="h3" id="det-h">Your details</h2>

            <p className="grouplabel">Who is celebrating</p>
            <div className="fgrid">
              <div className="field">
                <label htmlFor="n1">Name</label>
                <input id="n1" name="n1" type="text" required maxLength={80} autoCapitalize="words" placeholder="e.g. Meera" defaultValue={v.n1} />
              </div>
              <div className="field">
                <label htmlFor="n2">Second name <span className="opt">optional</span></label>
                <input id="n2" name="n2" type="text" maxLength={80} autoCapitalize="words" placeholder="e.g. Kabir" defaultValue={v.n2} />
              </div>
              <div className="field">
                <label htmlFor="occ">Occasion</label>
                <select id="occ" name="occ" defaultValue={v.occ}>{cats.map((c) => <option key={c.id} value={c.id}>{c.en}</option>)}</select>
              </div>
              <div className="field">
                <label htmlFor="lang">Invitation language</label>
                <select id="lang" name="lang" defaultValue={lang}>
                  <option value="en">English</option><option value="hi">हिन्दी (Hindi)</option><option value="mr">मराठी (Marathi)</option>
                </select>
              </div>
            </div>

            <p className="grouplabel">When and where</p>
            <div className="fgrid">
              <div className="field">
                <label htmlFor="date_text">Date</label>
                <input id="date_text" name="date_text" type="text" maxLength={60} placeholder="e.g. Sunday, 14 February 2027" defaultValue={v.date_text} />
              </div>
              <div className="field">
                <label htmlFor="time_text">Time</label>
                <input id="time_text" name="time_text" type="text" maxLength={40} placeholder="e.g. 7:30 PM onwards" defaultValue={v.time_text} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="venue">Venue</label>
              <input id="venue" name="venue" type="text" maxLength={160} placeholder="Hall name, area, city" defaultValue={v.venue} />
            </div>

            <p className="grouplabel">A few words</p>
            <div className="field">
              <label htmlFor="msg">Message to guests <span className="opt">optional</span></label>
              <textarea id="msg" name="msg" maxLength={500} rows={3} placeholder="With the blessings of our families…" defaultValue={v.msg} />
            </div>

            <SaveBar formId="invform" prices={PRICES} published={published} saveDraft={saveDraft} saveAndPay={saveAndPay} status={status} />
          </section>
        </div>
      </form>
      <DraftKeeper formId="invform" restore={restoreDraft} track={!v.id} />
    </>
  );
}
