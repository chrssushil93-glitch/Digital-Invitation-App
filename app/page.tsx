import Link from "next/link";
import { designs } from "@/lib/designs";
import SiteHeader from "@/components/SiteHeader";
import DoorReveal from "@/components/DoorReveal";
import InviteCard from "@/components/InviteCard";
import DoorCredit from "@/components/DoorCredit";
import DesignGallery from "@/components/DesignGallery";

export const dynamic = "force-dynamic";

const from = Math.min(...designs.map((d) => d.p));

export default function Home() {
  return (
    <div className="wrap">
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="herotext">
            <p className="eyebrow">Animated invitations · हिन्दी · English · मराठी</p>
            <h1>An invitation that opens like a door.</h1>
            <p className="lead">
              Pick a design, add your names and date, and share one link on WhatsApp. Guests reply with a tap and
              you see who has opened it. No app or sign-up for guests.
            </p>
            <div className="row">
              <Link className="btn big" href="/create">Create an invitation</Link>
              <a className="btn ghost big" href="#designs">Browse designs</a>
            </div>
            <p className="note trust">Free to design and preview · pay from ₹{from} only when you publish</p>
          </div>
          <div className="heroart">
            <DoorReveal hint="Tap to open" replayLabel="Replay the doors" autoOpenMs={2600}>
              <InviteCard lang="en" inv={{ n1: "Meera", n2: "Kabir", occ: "wedding", date_text: "14 February 2027", time_text: "7:30 PM",
                venue: "City Palace, Udaipur", msg: "With the blessings of our families, we invite you to celebrate with us.", design: designs[0].n }} />
            </DoorReveal>
          </div>
        </section>

        <section className="block" aria-labelledby="how-h">
          <p className="eyebrow">How it works</p>
          <h2 id="how-h">Ready in five minutes</h2>
          <ol className="how">
            <li><span className="hownum">1</span><h3>Design it</h3><p>Choose a template, type your names, date and venue, and watch the preview update as you type.</p></li>
            <li><span className="hownum">2</span><h3>Pay once &amp; publish</h3><p>Pay securely with UPI, card or net banking through Razorpay. No subscription.</p></li>
            <li><span className="hownum">3</span><h3>Share &amp; track</h3><p>Send the link on WhatsApp. See who opened it and who is coming, live.</p></li>
          </ol>
        </section>

        <section className="block" id="designs" aria-labelledby="designs-h">
          <p className="eyebrow">The collection</p>
          <h2 id="designs-h" style={{ marginBottom: "1.2rem" }}>What are we celebrating?</h2>
          <DesignGallery />
        </section>

        <section className="block" aria-labelledby="after-h">
          <p className="eyebrow">After you press send</p>
          <h2 id="after-h">Everything that happens next, handled.</h2>
          <div className="feat">
            <div><h3>One link for every guest</h3><p>Share on WhatsApp, Instagram or SMS. Edit the venue or time later and the same link shows the update.</p></div>
            <div><h3>See who opened it</h3><p>Views per day and unique guests, so you know who has seen it before you call.</p></div>
            <div><h3>RSVPs that answer themselves</h3><p>Guests choose coming, maybe or can&apos;t make it, add a head-count and leave a blessing.</p></div>
            <div><h3>A guest list for the caterer</h3><p>Every reply in one list with head-counts. Download it as CSV for Excel or Sheets.</p></div>
          </div>
        </section>

        <section className="ctaband">
          <h2>Your celebration deserves a beautiful invitation.</h2>
          <Link className="btn big light" href="/create">Start designing, it&apos;s free</Link>
        </section>
      </main>
      <footer className="sitefoot"><DoorCredit /></footer>
    </div>
  );
}
