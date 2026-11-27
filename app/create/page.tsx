import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import InviteEditor from "@/components/InviteEditor";
import Steps from "@/components/Steps";
import SupportLine from "@/components/SupportLine";
import { currentAccount, hasSessionCookie } from "@/lib/auth";
import { getSettings, visibleDesigns } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create an invitation" };

/** Public editor: anyone can pick a template and fill it in; saving asks for a login. */
export default async function Create({ searchParams }: { searchParams: { d?: string; restore?: string } }) {
  const settings = await getSettings();
  const acct = hasSessionCookie() ? await currentAccount() : null;
  const offered = visibleDesigns(settings);
  const design = offered.some((x) => x.n === searchParams.d) ? searchParams.d! : offered[0]?.n ?? "Royal Portico";
  const closed = !settings.acceptingNew && !acct?.admin;
  return (
    <div className="wrap">
      <SiteHeader />
      <main className="studio">
        <div className="pagehead">
          <div>
            <h1 className="pagetitle">Create your invitation</h1>
            <p className="note">
              {settings.paymentsMode === "free"
                ? "Design, preview and publish for free."
                : "Free to design and preview. You pay only when you publish and share it."}
            </p>
          </div>
        </div>
        {closed ? (
          <div className="panel notice" role="status">
            <h2 className="h3">New invitations are paused</h2>
            <p>We are not taking new invitations at the moment. Please check back soon.</p>
            <SupportLine />
            <div className="row"><Link className="btn ghost small" href="/">Back to the home page</Link></div>
          </div>
        ) : (
          <>
            <Steps current={1} />
            <InviteEditor
              settings={settings}
              v={{
                id: "", n1: "Meera", n2: "Kabir", occ: "wedding", lang: "en", date_text: "Sunday, 14 February 2027", time_text: "7:30 PM onwards",
                venue: "City Palace, Udaipur", msg: "With the blessings of our families, we invite you to celebrate with us.", design,
              }}
              restoreDraft={searchParams.restore === "1"}
              status={<span className="note">You will be asked to sign in to save. Nothing you typed is lost.</span>}
            />
          </>
        )}
      </main>
    </div>
  );
}
