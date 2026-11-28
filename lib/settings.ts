import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { designs, designBy, type Design } from "@/lib/designs";

/**
 * Everything the admin can change from /admin/settings without a deploy. Stored as one JSON
 * row in public.site_settings; anything missing falls back to these defaults.
 */
export type SiteSettings = {
  siteName: string;
  heroTitle: string;
  heroText: string;
  metaDescription: string;
  bannerOn: boolean;
  bannerText: string;
  supportEmail: string;
  supportPhone: string;
  paymentsMode: "razorpay" | "free";
  acceptingNew: boolean;
  /** Rupees per template, overriding the built-in price. 0 makes a template free. */
  prices: Record<string, number>;
  hiddenDesigns: string[];
  /** Uploaded logo version (seconds); 0 means the built-in logo. */
  logoVersion: number;
  watermark: boolean;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "Nimantran",
  heroTitle: "An invitation that opens like a door.",
  heroText:
    "Pick a design, add your names and date, and share one link on WhatsApp. Guests reply with a tap and you see who has opened it. No app or sign-up for guests.",
  metaDescription: "Animated digital invitations in English, Hindi and Marathi with built-in RSVPs and view tracking.",
  bannerOn: false,
  bannerText: "",
  supportEmail: "",
  supportPhone: "",
  paymentsMode: "razorpay",
  acceptingNew: true,
  prices: {},
  hiddenDesigns: [],
  logoVersion: 0,
  watermark: true,
};

export const SETTINGS_TAG = "site-settings";
export const MAX_PRICE = 100000;

const text = (v: unknown, max: number, fallback: string) =>
  typeof v === "string" ? v.trim().slice(0, max) : fallback;

/** Accepts anything (JSON from the database or a form) and returns valid settings. */
export function normalizeSettings(raw: unknown): SiteSettings {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const d = DEFAULT_SETTINGS;
  const prices: Record<string, number> = {};
  if (r.prices && typeof r.prices === "object") {
    for (const [k, v] of Object.entries(r.prices as Record<string, unknown>)) {
      const n = typeof v === "number" ? v : Number(v);
      if (designs.some((x) => x.n === k) && Number.isFinite(n) && n >= 0 && n <= MAX_PRICE) prices[k] = Math.round(n);
    }
  }
  const hidden = Array.isArray(r.hiddenDesigns)
    ? r.hiddenDesigns.filter((x): x is string => typeof x === "string" && designs.some((y) => y.n === x))
    : [];
  return {
    siteName: text(r.siteName, 40, d.siteName) || d.siteName,
    heroTitle: text(r.heroTitle, 120, d.heroTitle) || d.heroTitle,
    heroText: text(r.heroText, 400, d.heroText) || d.heroText,
    metaDescription: text(r.metaDescription, 200, d.metaDescription) || d.metaDescription,
    bannerOn: typeof r.bannerOn === "boolean" ? r.bannerOn : d.bannerOn,
    bannerText: text(r.bannerText, 200, d.bannerText),
    supportEmail: text(r.supportEmail, 120, d.supportEmail),
    supportPhone: text(r.supportPhone, 30, d.supportPhone),
    paymentsMode: r.paymentsMode === "free" ? "free" : "razorpay",
    acceptingNew: typeof r.acceptingNew === "boolean" ? r.acceptingNew : d.acceptingNew,
    prices,
    hiddenDesigns: Array.from(new Set(hidden)),
    logoVersion: typeof r.logoVersion === "number" && r.logoVersion > 0 ? Math.floor(r.logoVersion) : 0,
    watermark: typeof r.watermark === "boolean" ? r.watermark : d.watermark,
  };
}

/** Throws on a failed read, so a passing network problem is never cached as "default settings". */
async function readSettings(): Promise<SiteSettings> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return DEFAULT_SETTINGS;
  // Cached like the function around it, under the same tag, so saving in the admin refreshes both at once.
  const taggedFetch: typeof fetch = (input, init) => fetch(input, { ...init, next: { revalidate: 300, tags: [SETTINGS_TAG] } });
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: taggedFetch } });
  const { data, error } = await sb.from("site_settings").select("data").eq("id", 1).maybeSingle();
  if (error) {
    // Before supabase/setup.sql adds the table, run on defaults.
    if (error.code === "PGRST205" || error.code === "42P01") return DEFAULT_SETTINGS;
    throw new Error(`${error.code} ${error.message}`);
  }
  return normalizeSettings(data?.data);
}

const cachedSettings = unstable_cache(readSettings, [SETTINGS_TAG], { revalidate: 300, tags: [SETTINGS_TAG] });

/** Cached for five minutes; saving in the admin refreshes it at once (revalidateTag). */
export async function getSettings(): Promise<SiteSettings> {
  try {
    return await cachedSettings();
  } catch (e) {
    console.error("settings: read failed, using defaults for this request:", e instanceof Error ? e.message : e);
    return DEFAULT_SETTINGS;
  }
}

export function priceOf(s: SiteSettings, design: string): number {
  const o = s.prices[design];
  return typeof o === "number" ? o : designBy(design).p;
}

/** True when this template can be published without paying. */
export function isFree(s: SiteSettings, design: string): boolean {
  return s.paymentsMode === "free" || priceOf(s, design) === 0;
}

export function priceMap(s: SiteSettings): Record<string, number> {
  return Object.fromEntries(designs.map((d) => [d.n, priceOf(s, d.n)]));
}

/** Templates offered to hosts. A hidden template stays available to an invitation already using it. */
export function visibleDesigns(s: SiteSettings, keep?: string): Design[] {
  return designs.filter((d) => !s.hiddenDesigns.includes(d.n) || d.n === keep);
}

/** The logo used in the header and the preview watermark. */
export function logoUrl(s: SiteSettings): string {
  return s.logoVersion ? `/api/brand/logo?v=${s.logoVersion}` : "/brand/logo.svg";
}

export function formatPrice(s: SiteSettings, design: string): string {
  return isFree(s, design) ? "Free" : `₹${priceOf(s, design).toLocaleString("en-IN")}`;
}
