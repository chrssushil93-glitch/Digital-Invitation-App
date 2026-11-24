"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Re-fetches the page's server data every `seconds` while the tab is visible, and on demand. */
export default function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [at, setAt] = useState<Date | null>(null);

  useEffect(() => {
    setAt(new Date());
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      start(() => router.refresh());
      setAt(new Date());
    };
    const t = window.setInterval(tick, seconds * 1000);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [router, seconds]);

  return (
    <div className="refresh">
      <span className="note" aria-live="polite">
        {pending ? "Updating…" : at ? `Updated ${at.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : ""}
      </span>
      <button type="button" className="btn ghost small" disabled={pending}
        onClick={() => { start(() => router.refresh()); setAt(new Date()); }}>
        Refresh
      </button>
    </div>
  );
}
