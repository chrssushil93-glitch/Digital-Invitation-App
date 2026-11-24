import { headers } from "next/headers";

export type Invite = {
  id: string; slug: string; n1: string; n2: string; occ: string; lang: string;
  date_text: string; time_text: string; venue: string; msg: string; design: string;
  status: "draft" | "published"; paid_amount: number | null; published_at: string | null; created_at: string;
};

/** Errors that mean supabase/setup.sql has not been run (fully) on this database. */
export function isSetupError(e: { code?: string } | null | undefined): boolean {
  return Boolean(e?.code && ["PGRST205", "PGRST204", "PGRST202", "42P01", "42703", "42883"].includes(e.code));
}

/** Public address of the site, for guest links. */
export function siteOrigin(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function inviteTitle(i: { n1: string; n2: string }): string {
  return i.n2 ? `${i.n1} & ${i.n2}` : i.n1;
}
