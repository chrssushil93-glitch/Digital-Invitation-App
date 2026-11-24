"use client";
import { useEffect } from "react";

const KEY = "nm-draft";
const FIELDS = ["design", "n1", "n2", "occ", "lang", "date_text", "time_text", "venue", "msg"];

/** Keeps an unsaved new invitation in this browser, so logging in to save it loses nothing. */
export default function DraftKeeper({ formId, restore, track }: { formId: string; restore: boolean; track: boolean }) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    if (!track) {
      try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
      return;
    }
    if (restore) {
      try {
        const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Record<string, string> | null;
        if (saved) {
          Object.entries(saved).filter(([k]) => FIELDS.includes(k)).forEach(([k, val]) => {
            const els = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${k}"]`);
            els.forEach((el) => {
              if (el instanceof HTMLInputElement && el.type === "radio") el.checked = el.value === val;
              else if (k !== "id") el.value = val;
            });
          });
          form.dispatchEvent(new Event("change", { bubbles: true }));
        }
      } catch { /* ignore a broken draft */ }
    }
    const save = () => {
      const out: Record<string, string> = {};
      new FormData(form).forEach((val, k) => { if (FIELDS.includes(k)) out[k] = String(val); });
      try { localStorage.setItem(KEY, JSON.stringify(out)); } catch { /* storage unavailable */ }
    };
    form.addEventListener("input", save);
    form.addEventListener("change", save);
    form.addEventListener("submit", save);
    return () => {
      form.removeEventListener("input", save);
      form.removeEventListener("change", save);
      form.removeEventListener("submit", save);
    };
  }, [formId, restore, track]);
  return null;
}
