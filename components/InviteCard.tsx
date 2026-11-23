import { artSvg, catLabel, designBy, type Lang } from "@/lib/designs";
import { G } from "@/lib/i18n";
import type { Scene } from "@/lib/designs";

/** Image layers of each scene design, back to front: [class name, file in /scenes/<scene>/ or absolute path]. */
const SCENE_LAYERS: Record<Scene, [string, string][]> = {
  portico: [["bg", "bg"], ["floor", "floor"], ["couple", "couple"], ["hl", "left"], ["hr", "right"], ["chand", "/scenes/chandelier.webp"]],
  garden: [["bg", "bg"], ["floor", "floor"], ["couple", "couple"], ["hl", "left"], ["hr", "right"], ["chand", "/scenes/chandelier.webp"]],
  haldi: [["bg", "bg"], ["floor", "floor"], ["decor", "decor"], ["couple", "couple"], ["hl", "left"], ["hr", "right"]],
  tropic: [
    ["bg", "bg"], ["line1", "line1"], ["line2", "line2"],
    ["palm1", "palm1"], ["monstera", "monstera"], ["fl1", "fl1"], ["fl2", "fl2"],
    ["palm2", "palm2"], ["leaf1", "leaf1"], ["leaf2", "leaf2"], ["fl3", "fl3"], ["fl4", "fl4"],
  ],
};

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
          {SCENE_LAYERS[d.s].map(([cls, file]) => (
            <img key={cls} className={`ly ${cls}`} src={file.startsWith("/") ? file : `${base}/${file}.webp`} alt="" />
          ))}
          {/* eslint-enable @next/next/no-img-element */}
          {!hideText && (
            <>
              <div className="stxt">
                <p className="gk">{g.inv}</p>
                <h1 className="sname">{inv.n1}</h1>
                {inv.n2 && (<><div className="samp">&amp;</div><h1 className="sname">{inv.n2}</h1></>)}
                <p className="socc">{catLabel(inv.occ, lang)}</p>
              </div>
              <div className="sdet">
                {when && <p className="gwhen">{when}</p>}
                {inv.venue && <p className="svenue">{inv.venue}</p>}
                {inv.msg && <p className="gmsg">{inv.msg}</p>}
              </div>
            </>
          )}
        </div>
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
