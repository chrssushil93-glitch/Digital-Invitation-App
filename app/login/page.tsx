"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

function readDraft(): Record<string, string> | null {
  try {
    return JSON.parse(localStorage.getItem("nm-draft") ?? "null") as Record<string, string> | null;
  } catch {
    return null;
  }
}

export default function Login() {
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setFailed(q.has("error"));
    setSaving(q.get("next") === "save");
  }, []);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    try {
      const res = await fetch("/api/auth/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), draft: readDraft() }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Could not send the sign-in link.");
      setState("sent");
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : "Could not send the sign-in link.");
    }
  }

  return (
    <div className="wrap" style={{ maxWidth: 460 }}>
      <div className="bar"><Link className="logo" href="/">Nimantran</Link></div>
      <form className="panel" onSubmit={submit}>
        <h3>Log in to your studio</h3>
        <p className="note" style={{ marginBottom: "1rem" }}>
          {saving
            ? "Your invitation is ready to save. Enter your email and we will send you a link; open it and your invitation will be waiting, exactly as you left it."
            : "Enter your email and we will send you a sign-in link. New hosts are signed up automatically."}
        </p>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button className="btn" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Email me a link"}
        </button>
        <p role="status" className={state === "error" || (failed && state === "idle") ? "note err" : "note okmsg"} style={{ marginTop: ".8rem" }}>
          {state === "sent" ? "Check your inbox for the sign-in link." : state === "error" ? msg : failed ? "That sign-in link did not work or has expired. Please request a new one." : ""}
        </p>
      </form>
    </div>
  );
}
