"use client";
import { useState } from "react";

/** The guest link with one-tap copy, WhatsApp and the phone's own share sheet. */
export default function ShareCard({ url, title, fresh }: { url: string; title: string; fresh: boolean }) {
  const [copied, setCopied] = useState(false);
  const text = `You are invited! ${title} – please open the invitation and let us know if you can come: ${url}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const t = document.createElement("textarea");
      t.value = url;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        /* closed by the user */
      }
    } else copy();
  };

  return (
    <section className={`panel sharecard${fresh ? " fresh" : ""}`} aria-labelledby="share-h">
      {fresh && <p className="celebrate" role="status">🎉 Payment received. Your invitation is live!</p>}
      <h2 className="h3" id="share-h">Share with your guests</h2>
      <p className="note">Send this one link to everyone. Edits you save later show up on the same link.</p>
      <div className="linkfield">
        <input type="text" readOnly value={url} aria-label="Guest link" onFocus={(e) => e.currentTarget.select()} />
        <button className="btn small" type="button" onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button>
      </div>
      <div className="sharebtns">
        <a className="btn wa" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3z" />
          </svg>
          Send on WhatsApp
        </a>
        <button className="btn ghost" type="button" onClick={share}>More ways to share</button>
        <a className="btn ghost" href={url} target="_blank" rel="noreferrer">Open guest view ↗</a>
      </div>
    </section>
  );
}
