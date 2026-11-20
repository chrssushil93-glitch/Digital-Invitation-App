import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { G, asLang } from "@/lib/i18n";
import { designBy } from "@/lib/designs";
import GuestForm from "@/components/GuestForm";
import DoorReveal from "@/components/DoorReveal";
import InviteCard from "@/components/InviteCard";
import DoorCredit from "@/components/DoorCredit";
import MusicPlayer from "@/components/MusicPlayer";

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

  return (
    <div className="wrap">
      <div className="gwrap">
        <MusicPlayer src="/audio/wedding-music.mp3" on="Play music" off="Mute music" />
        <DoorReveal hint={g.tap} opener={designBy(inv.design).o ?? "wood"}>
          <InviteCard inv={inv} lang={lang} />
        </DoorReveal>
        <GuestForm slug={inv.slug} strings={g} />
        <p className="gfoot">{g.foot}</p>
        <DoorCredit />
      </div>
    </div>
  );
}
