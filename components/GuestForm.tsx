"use client";
import { useEffect, useState } from "react";
import type { GuestStrings } from "@/lib/i18n";

export default function GuestForm({ slug, strings: g }: { slug: string; strings: GuestStrings }) {
  const [name, setName] = useState("");
  const [resp, setResp] = useState<"yes" | "maybe" | "no">("yes");
  const [count, setCount] = useState(1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);

  // Count one view per page load. The server skips the host's own views.
  useEffect(() => {
    fetch("/api/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    }).catch(() => {});
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) { setMsg({ text: g.need, bad: true }); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name: n, resp, guests: count, note: note.trim() }),
      });
      if (!res.ok) throw new Error("save failed");
      setSent(true);
      setMsg({ text: g.thanks.replace("{n}", n), bad: false });
    } catch {
      setMsg({ text: g.fail, bad: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h3>{g.h}</h3>
      <div className="field" style={{ marginTop: "1rem" }}>
        <label htmlFor="g_name">{g.name}</label>
        <input id="g_name" type="text" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label id="g_lbl">{g.reply}</label>
        <div className="choices" role="radiogroup" aria-labelledby="g_lbl">
          {([["yes", g.yes], ["maybe", g.maybe], ["no", g.no]] as const).map(([v, label]) => (
            <span key={v} style={{ display: "contents" }}>
              <input type="radio" name="resp" id={`r-${v}`} value={v} checked={resp === v} onChange={() => setResp(v)} />
              <label htmlFor={`r-${v}`}>{label}</label>
            </span>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="g_count">{g.guests}</label>
        <input id="g_count" type="number" min={1} max={20} value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))} />
      </div>
      <div className="field">
        <label htmlFor="g_note">{g.note}</label>
        <textarea id="g_note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button className="btn" type="submit" disabled={busy}>{sent ? g.update : g.send}</button>
      <p role="status" className={msg?.bad ? "note err" : "note okmsg"} style={{ marginTop: ".8rem", minHeight: "1.5rem" }}>{msg?.text ?? ""}</p>
    </form>
  );
}
