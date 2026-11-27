"use client";
import { useState } from "react";
import Link from "next/link";
import { artSvg, catLabel, cats, designs } from "@/lib/designs";

/** Template cards with occasion filters. Each card opens the editor with that design. */
export default function DesignGallery({ visible, prices, freeAll }: { visible: string[]; prices: Record<string, number>; freeAll: boolean }) {
  const [cat, setCat] = useState("all");
  const offered = designs.filter((d) => visible.includes(d.n));
  const used = cats.filter((c) => offered.some((d) => d.c === c.id));
  const shown = cat === "all" ? offered : offered.filter((d) => d.c === cat);
  const price = (n: string) => (freeAll || prices[n] === 0 ? "Free" : `₹${(prices[n] ?? 0).toLocaleString("en-IN")}`);
  return (
    <>
      <div className="chips" role="group" aria-label="Filter by occasion">
        <button type="button" aria-pressed={cat === "all"} onClick={() => setCat("all")}>All</button>
        {used.map((c) => (
          <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.en}</button>
        ))}
      </div>
      <div className="grid">
        {shown.map((d) => (
          <Link key={d.n} className="tcard" href={`/create?d=${encodeURIComponent(d.n)}`}>
            <span className="art" dangerouslySetInnerHTML={{ __html: artSvg(d) }} />
            <span className="tcardname">{d.n}</span>
            <span className="meta"><span>{catLabel(d.c)}</span><span className="price">{price(d.n)}</span></span>
            <span className="btn small tuse">Use this design</span>
          </Link>
        ))}
      </div>
    </>
  );
}
