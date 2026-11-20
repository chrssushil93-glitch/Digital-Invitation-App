"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Login() {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(new URLSearchParams(window.location.search).has("error")); }, []);
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
        body: JSON.stringify({ email: email.trim() }),
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
          Enter your email and we will send you a sign-in link. New hosts are signed up automatically.
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
