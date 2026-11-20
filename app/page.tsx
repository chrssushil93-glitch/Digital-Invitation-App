import Link from "next/link";
import { artSvg, catLabel, designs } from "@/lib/designs";
import DoorReveal from "@/components/DoorReveal";
import InviteCard from "@/components/InviteCard";
import DoorCredit from "@/components/DoorCredit";

export default function Home() {
  return (
    <div className="wrap">
      <div className="bar">
        <Link className="logo" href="/">Nimantran</Link>
        <div className="row">
          <Link className="btn ghost small" href="/login">Log in</Link>
          <Link className="btn small" href="/studio">Open studio</Link>
        </div>
      </div>

      <div className="hero">
        <div>
          <p className="eyebrow">Animated invitations · हिन्दी · English · मराठी</p>
          <h1>An invitation that opens like a door.</h1>
          <p className="lead">
            Pick a design, add your names and ceremonies, and share one link on WhatsApp. Guests reply with a tap and
            you see who has opened it. No app or sign-up for guests.
          </p>
          <div className="row">
            <Link className="btn" href="/studio/new">Create an invitation</Link>
            <a className="btn ghost" href="#designs">Browse designs</a>
          </div>
        </div>
        <div style={{ maxWidth: "min(400px, calc((100svh - 6rem) * 9 / 16))", justifySelf: "center", width: "100%" }}>
          <DoorReveal hint="Tap to open" replayLabel="Replay the doors" autoOpenMs={2600}>
            <InviteCard lang="en" inv={{ n1: "Meera", n2: "Kabir", occ: "wedding", date_text: "14 February 2027", time_text: "7:30 PM",
              venue: "City Palace, Udaipur", msg: "With the blessings of our families, we invite you to celebrate with us.", design: designs[0].n }} />
          </DoorReveal>
        </div>
      </div>

      <section className="block" id="designs">
        <p className="eyebrow">The collection</p>
        <h2 style={{ marginBottom: "1.6rem" }}>What are we celebrating?</h2>
        <div className="grid">
          {designs.map((d) => (
            <article key={d.n} style={{ display: "grid", gap: ".6rem" }}>
              <div className="art" dangerouslySetInnerHTML={{ __html: artSvg(d) }} />
              <h3>{d.n}</h3>
              <div className="meta"><span>{catLabel(d.c)}</span><span className="price">₹{d.p}</span></div>
            </article>
          ))}
        </div>
      </section>

      <section className="block">
        <p className="eyebrow">After you press send</p>
        <h2>Everything that happens next, handled.</h2>
        <div className="feat">
          <div><h3>One link for every guest</h3><p>Share on WhatsApp, Instagram or SMS. Edit the venue or time later and the same link shows the update.</p></div>
          <div><h3>See who opened it</h3><p>Views per day and unique guests, so you know who has seen it before you call.</p></div>
          <div><h3>RSVPs that answer themselves</h3><p>Guests choose coming, maybe or can't make it, add a head-count and leave a blessing.</p></div>
          <div><h3>A guest list for the caterer</h3><p>Every reply in one list with head-counts. Download it as CSV for Excel or Sheets.</p></div>
        </div>
      </section>
      <footer className="sitefoot"><DoorCredit /></footer>
    </div>
  );
}
