import Link from "next/link";
import InviteEditor from "@/components/InviteEditor";
import { designs } from "@/lib/designs";

export const dynamic = "force-dynamic";

/** Public editor: anyone can pick a template and fill it in; saving asks for a login. */
export default function Create({ searchParams }: { searchParams: { d?: string; restore?: string } }) {
  const design = designs.some((x) => x.n === searchParams.d) ? searchParams.d! : designs[0].n;
  return (
    <div className="wrap">
      <div className="bar">
        <Link className="logo" href="/">Nimantran</Link>
        <Link className="btn ghost small" href="/login">Log in</Link>
      </div>
      <InviteEditor
        v={{
          id: "", n1: "Meera", n2: "Kabir", occ: "wedding", lang: "en", date_text: "14 February 2027", time_text: "7:30 PM",
          venue: "City Palace, Udaipur", msg: "With the blessings of our families, we invite you to celebrate with us.", design,
        }}
        title="Create your invitation"
        saveLabel="Save and get guest link"
        restoreDraft={searchParams.restore === "1"}
        status={<span className="note">You will be asked for your email to save it.</span>}
      />
    </div>
  );
}
