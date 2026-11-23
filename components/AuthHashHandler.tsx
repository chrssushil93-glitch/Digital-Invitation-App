"use client";
import { useEffect } from "react";

/**
 * Supabase's default email link returns to the site with the session in the URL hash
 * (#access_token=…), which the server never sees. This hands it to the server and opens the studio.
 */
export default function AuthHashHandler() {
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    if (h.get("error") || h.get("error_description")) {
      window.location.replace("/login?error=1");
      return;
    }
    const access_token = h.get("access_token");
    const refresh_token = h.get("refresh_token");
    if (!access_token || !refresh_token) return;
    history.replaceState(null, "", window.location.pathname + window.location.search);
    fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token, refresh_token }),
    })
      .then((r) => {
        if (!r.ok) return window.location.replace("/login?error=1");
        const packed = new URLSearchParams(window.location.search).get("draft");
        if (packed) {
          try {
            const json = atob(packed.replace(/-/g, "+").replace(/_/g, "/"));
            localStorage.setItem("nm-draft", decodeURIComponent(escape(json)));
          } catch { /* keep going without the draft */ }
          return window.location.replace("/studio/new");
        }
        window.location.replace("/studio");
      })
      .catch(() => window.location.replace("/login?error=1"));
  }, []);
  return null;
}
