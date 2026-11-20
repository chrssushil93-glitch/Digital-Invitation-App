import { artSvg, catLabel, designBy, type Lang } from "@/lib/designs";
import { G } from "@/lib/i18n";

export type InviteData = {
  n1: string; n2: string; occ: string; date_text: string; time_text: string;
  venue: string; msg: string; design: string;
};

/** The invitation itself: artwork, names, date and venue. Shown after the door opens. */
export default function InviteCard({ inv, lang, hideText = false }: { inv: InviteData; lang: Lang; hideText?: boolean }) {
  const g = G[lang];
  const d = designBy(inv.design);
  const when = [inv.date_text, inv.time_text].filter(Boolean).join(" · ");

  if (d.s) {
    const base = `/scenes/${d.s}`;
    return (
      <article className="gcard" style={{ background: d.a, color: d.b, borderColor: d.b }}>
        <div className={`scene scene-${d.s}`}>
          {/* eslint-disable @next/next/no-img-element */}
          <img className="ly bg" src={`${base}/bg.webp`} alt="" />
          <img className="ly floor" src={`${base}/floor.webp`} alt="" />
          <img className="ly couple" src={`${base}/couple.webp`} alt="" />
          <img className="ly hl" src={`${base}/left.webp`} alt="" />
          <img className="ly hr" src={`${base}/right.webp`} alt="" />
          {/* eslint-enable @next/next/no-img-element */}
          {!hideText && (
            <div className="stxt">
              <p className="gk">{g.inv}</p>
              <h1 className="sname">{inv.n1}</h1>
              {inv.n2 && (<><div className="samp">&amp;</div><h1 className="sname">{inv.n2}</h1></>)}
              <p className="socc">{catLabel(inv.occ, lang)}</p>
            </div>
          )}
        </div>
        {!hideText && (
          <div className="gin">
            {when && <p className="gwhen">{when}</p>}
            {inv.venue && <p>{inv.venue}</p>}
            {inv.msg && <p className="gmsg">{inv.msg}</p>}
          </div>
        )}
      </article>
    );
  }

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
