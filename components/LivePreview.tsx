"use client";
import { useEffect, useState } from "react";
import DoorReveal from "@/components/DoorReveal";
import InviteCard, { type InviteData } from "@/components/InviteCard";
import { designBy, type Lang } from "@/lib/designs";
import { G } from "@/lib/i18n";
import { WATERMARK_LOGO } from "@/lib/brand";

const FIELDS = ["n1", "n2", "occ", "date_text", "time_text", "venue", "msg", "design"] as const;

/**
 * Live preview for the host while they edit: follows every keystroke in the form,
 * and can play the opening animation exactly as guests will see it. Until the invitation
 * is paid for, the logo is tiled over it so a screenshot is not a usable invitation.
 */
export default function LivePreview({
  formId, initial, initialLang, watermark = true,
}: { formId: string; initial: InviteData; initialLang: Lang; watermark?: boolean }) {
  const [inv, setInv] = useState<InviteData>(initial);
  const [lang, setLang] = useState<Lang>(initialLang);
  const [mode, setMode] = useState<"card" | "opening">("card");
  const [run, setRun] = useState(0);

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const read = () => {
      const fd = new FormData(form);
      const next = { ...initial };
      FIELDS.forEach((k) => (next[k] = String(fd.get(k) ?? "")));
      setInv(next);
      const l = String(fd.get("lang") ?? "en");
      setLang(l === "hi" || l === "mr" ? l : "en");
    };
    form.addEventListener("input", read);
    form.addEventListener("change", read);
    return () => {
      form.removeEventListener("input", read);
      form.removeEventListener("change", read);
    };
  }, [formId, initial]);

  const d = designBy(inv.design);
  const play = () => {
    setMode("opening");
    setRun((r) => r + 1);
  };

  return (
    <aside className="livepv" id="preview" aria-label="Invitation preview">
      <div className="pvhead">
        <h2 className="h3">Preview</h2>
        <div className="seg" role="group" aria-label="Preview mode">
          <button type="button" aria-pressed={mode === "card"} onClick={() => setMode("card")}>Card</button>
          <button type="button" aria-pressed={mode === "opening"} onClick={play}>{mode === "opening" ? "Replay" : "Play opening"}</button>
        </div>
      </div>
      <div className="phone">
        <div className="phonescreen">
          {mode === "card" ? (
            <InviteCard inv={inv} lang={lang} />
          ) : (
            <DoorReveal key={`${run}-${d.n}`} hint={G[lang].tap} autoOpenMs={1500}>
              <InviteCard inv={inv} lang={lang} />
            </DoorReveal>
          )}
          {watermark && (
            <div className="wm" aria-hidden="true">
              <div className="wmtile" style={{ backgroundImage: `url(${WATERMARK_LOGO})` }} />
              <span className="wmbadge">Preview</span>
            </div>
          )}
        </div>
      </div>
      <p className="note pvnote">
        {d.n} · ₹{d.p}. Changes show here as you type.
        {watermark ? " Guests see it without the watermark once you publish." : " Save to update the guest link."}
      </p>
    </aside>
  );
}
