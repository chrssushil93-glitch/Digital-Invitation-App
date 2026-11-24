import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import InviteEditor from "@/components/InviteEditor";
import Steps from "@/components/Steps";
import { designs } from "@/lib/designs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create an invitation · Nimantran" };

/** Public editor: anyone can pick a template and fill it in; saving asks for a login. */
export default function Create({ searchParams }: { searchParams: { d?: string; restore?: string } }) {
  const design = designs.some((x) => x.n === searchParams.d) ? searchParams.d! : designs[0].n;
  return (
    <div className="wrap">
      <SiteHeader />
      <main className="studio">
        <div className="pagehead">
          <div>
            <h1 className="pagetitle">Create your invitation</h1>
            <p className="note">Free to design and preview. You pay only when you publish and share it.</p>
          </div>
        </div>
        <Steps current={1} />
        <InviteEditor
          v={{
            id: "", n1: "Meera", n2: "Kabir", occ: "wedding", lang: "en", date_text: "Sunday, 14 February 2027", time_text: "7:30 PM onwards",
            venue: "City Palace, Udaipur", msg: "With the blessings of our families, we invite you to celebrate with us.", design,
          }}
          restoreDraft={searchParams.restore === "1"}
          status={<span className="note">You will be asked to sign in to save. Nothing you typed is lost.</span>}
        />
      </main>
    </div>
  );
}
