"use client";
import { useState } from "react";

type Mode = "signin" | "signup" | "link";

function readDraft(): Record<string, string> | null {
  try {
    return JSON.parse(localStorage.getItem("nm-draft") ?? "null") as Record<string, string> | null;
  } catch {
    return null;
  }
}

const TITLES: Record<Mode, string> = {
  signin: "Welcome back",
  signup: "Create your account",
  link: "Sign in with an email link",
};

/** Password sign-in / sign-up, an emailed sign-in link, and Google when it is switched on in Supabase. */
export default function LoginForm({ google, saving, error }: { google: boolean; saving: boolean; error: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(
    error === "google"
      ? { text: "Google sign-in is not available right now. Please use your email instead.", bad: true }
      : error
        ? { text: "That sign-in link did not work or has expired. Please sign in again.", bad: true }
        : null
  );
  const next = saving ? "/studio/new" : "/studio";

  const switchTo = (m: Mode) => {
    setMode(m);
    setMsg(null);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "link") {
        const res = await fetch("/api/auth/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), draft: readDraft() }),
        });
        const data = (await res.json().catch(() => ({ ok: false }))) as { ok: boolean; error?: string };
        if (!data.ok) throw new Error(data.error ?? "Could not send the sign-in link.");
        setMsg({ text: `We sent a sign-in link to ${email.trim()}. Open it on any device to continue. It can take a minute; check spam too.`, bad: false });
        return;
      }
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, email: email.trim(), password }),
      });
      const data = (await res.json().catch(() => ({ ok: false }))) as { ok: boolean; error?: string; confirm?: boolean };
      if (!data.ok) throw new Error(data.error ?? "Could not sign you in.");
      if (data.confirm) {
        setMsg({ text: `Almost done: we sent a confirmation link to ${email.trim()}. Open it, then you are in.`, bad: false });
        return;
      }
      setMsg({ text: "Signed in. Opening your studio…", bad: false });
      window.location.assign(next);
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Something went wrong. Please try again.", bad: true });
    } finally {
      setBusy(false);
    }
  }

  const cta = busy
    ? mode === "link" ? "Sending…" : "Please wait…"
    : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Email me a link";

  return (
    <div className="authcard panel">
      <p className="eyebrow">Nimantran studio</p>
      <h1 className="authtitle">{TITLES[mode]}</h1>
      {saving && (
        <p className="callout">Your invitation is safe. Sign in to save it; it will be waiting exactly as you left it.</p>
      )}

      {google && mode !== "link" && (
        <>
          <a className="btn google" href={`/auth/google?next=${encodeURIComponent(next)}`}>
            <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            Continue with Google
          </a>
          <div className="divider"><span>or use your email</span></div>
        </>
      )}

      <form onSubmit={submit} noValidate={false}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" inputMode="email" autoComplete="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        {mode !== "link" && (
          <div className="field">
            <div className="labelrow">
              <label htmlFor="password">Password</label>
              {mode === "signin" && (
                <button type="button" className="linkbtn" onClick={() => switchTo("link")}>Forgot password?</button>
              )}
            </div>
            <div className="pwrow">
              <input id="password" type={showPw ? "text" : "password"} required minLength={8} maxLength={72}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="pwtoggle" onClick={() => setShowPw((s) => !s)} aria-pressed={showPw}>
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
            {mode === "signup" && <p className="hint">At least 8 characters.</p>}
          </div>
        )}
        <button className="btn block" type="submit" disabled={busy}>{cta}</button>
        <p role="status" aria-live="polite" className={`authmsg ${msg?.bad ? "err" : "okmsg"}`}>{msg?.text ?? ""}</p>
      </form>

      <div className="authswitch">
        {mode === "signin" && (
          <>
            <p>New to Nimantran? <button type="button" className="linkbtn" onClick={() => switchTo("signup")}>Create an account</button></p>
            <p><button type="button" className="linkbtn" onClick={() => switchTo("link")}>Email me a sign-in link instead</button></p>
          </>
        )}
        {mode === "signup" && (
          <p>Already have an account? <button type="button" className="linkbtn" onClick={() => switchTo("signin")}>Sign in</button></p>
        )}
        {mode === "link" && (
          <p>We will email you a one-time link, no password needed. <button type="button" className="linkbtn" onClick={() => switchTo("signin")}>Use a password instead</button></p>
        )}
      </div>
    </div>
  );
}
