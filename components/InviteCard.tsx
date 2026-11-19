import { artSvg, catLabel, designBy, type Lang } from "@/lib/designs";
import { G } from "@/lib/i18n";

export type InviteData = {
  n1: string; n2: string; occ: string; date_text: string; time_text: string;
  venue: string; msg: string; design: string;
};

/** The invitation itself: artwork, names, date and venue. Shown after the door opens. */
export default function InviteCard({ inv, lang }: { inv: InviteData; lang: Lang }) {
  const g = G[lang];
  const d = designBy(inv.design);
  const when = [inv.date_text, inv.time_text].filter(Boolean).join(" · ");
  return (
    <article className="gcard" style={{ background: d.a, color: d.b, borderColor: d.b }}>
      <div className="gart" dangerouslySetInnerHTML={{ __html: artSvg(d, { noName: true, crop: true }) }} />
      <div className="gin">
        <p className="gk">{g.inv}</p>
        <h1 className="gn">{inv.n1}</h1>
        {inv.n2 && (<><div className="gamp">&amp;</div><h1 className="gn">{inv.n2}</h1></>)}
        <p>{catLabel(inv.occ, lang)}</p>
        {when && <p className="gwhen">{when}</p>}
        {inv.venue && <p>{inv.venue}</p>}
        {inv.msg && <p className="gmsg">{inv.msg}</p>}
      </div>
    </article>
  );
}
