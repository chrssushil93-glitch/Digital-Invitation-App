"use client";
import { useState } from "react";
import Link from "next/link";
import { browserClient } from "@/lib/supabase/browser";

export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    try {
      const { error } = await browserClient().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
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
        <p role="status" className={state === "error" ? "note err" : "note okmsg"} style={{ marginTop: ".8rem" }}>
          {state === "sent" ? "Check your inbox for the sign-in link." : state === "error" ? msg : ""}
        </p>
      </form>
    </div>
  );
}
