import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { artSvg, catLabel, designBy } from "@/lib/designs";
import { G, asLang } from "@/lib/i18n";
import GuestForm from "@/components/GuestForm";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  if (!/^[a-z0-9]{4,32}$/.test(slug)) return null;
  // Public fields only, through a database function. No secret key involved.
  const { data } = await serverClient().rpc("get_public_invite", { p_slug: slug });
  return data as null | {
    slug: string; n1: string; n2: string; occ: string; lang: string;
    date_text: string; time_text: string; venue: string; msg: string; design: string;
  };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const inv = await load(params.slug);
  if (!inv) return { title: "Invitation" };
  return {
    title: `${inv.n1}${inv.n2 ? ` & ${inv.n2}` : ""} · Invitation`,
    robots: { index: false, follow: false },
  };
}

export default async function GuestPage({ params }: { params: { slug: string } }) {
  const inv = await load(params.slug);
  if (!inv) notFound();

  const lang = asLang(inv.lang);
  const g = G[lang];
  const d = designBy(inv.design);
  const when = [inv.date_text, inv.time_text].filter(Boolean).join(" · ");

  return (
    <div className="wrap">
      <div className="gwrap">
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
          <div className="door l"><i /></div>
          <div className="door r"><i /></div>
        </article>
        <GuestForm slug={inv.slug} strings={g} />
        <p className="gfoot">{g.foot}</p>
      </div>
    </div>
  );
}
