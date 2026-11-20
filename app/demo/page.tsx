import type { Metadata } from "next";
import InviteCard from "@/components/InviteCard";
import { designs } from "@/lib/designs";

export const metadata: Metadata = { title: "Demo invitation", robots: { index: false } };

/** Sample invitation, used for previews and thumbnails. ?d=Garden%20Dance picks a design; ?notext=1 hides the text. */
export default function Demo({ searchParams }: { searchParams: { d?: string; notext?: string } }) {
  const name = searchParams.d && designs.some((x) => x.n === searchParams.d) ? searchParams.d : designs[0].n;
  return (
    <div className="wrap"><div className="gwrap">
      <InviteCard
        lang="en"
        hideText={searchParams.notext === "1"}
        inv={{ n1: "Meera", n2: "Kabir", occ: "wedding", date_text: "14 February 2027", time_text: "7:30 PM",
          venue: "City Palace, Udaipur", msg: "With the blessings of our families, we invite you to celebrate with us.", design: name }}
      />
    </div></div>
  );
}
