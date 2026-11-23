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
      .then((r) => window.location.replace(r.ok ? "/studio" : "/login?error=1"))
      .catch(() => window.location.replace("/login?error=1"));
  }, []);
  return null;
}
