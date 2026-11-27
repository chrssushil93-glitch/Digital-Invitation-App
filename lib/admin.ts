import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { currentAccount } from "@/lib/auth";

/**
 * Admin pages call this first. Signed-out visitors go to the login page; signed-in people who
 * are not admins get a plain 404, so the admin area does not advertise itself. The database
 * checks again inside every admin function, so this is the second lock, not the only one.
 */
export const requireAdmin = cache(async () => {
  const acct = await currentAccount();
  if (!acct) redirect("/login?next=/admin");
  if (!acct.admin) notFound();
  return acct;
});

export class AdminError extends Error {
  code: string;
  constructor(message: string, code = "") {
    super(message);
    this.code = code;
  }
}

/** Calls an admin database function as the signed-in admin. */
export async function adminCall<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  await requireAdmin();
  const { data, error } = await serverClient().rpc(fn, args);
  if (error) throw new AdminError(error.message, error.code);
  return data as T;
}

export const PAGE_SIZE = 25;

export function pageOf(v: string | undefined): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 1 ? n : 1;
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrCompact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 });
const num = new Intl.NumberFormat("en-IN");
const numCompact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

/** Amounts are stored in paise. */
export const rupees = (paise: number) => inr.format((paise || 0) / 100);
export const rupeesShort = (paise: number) => ((paise || 0) >= 10000000 ? inrCompact.format(paise / 100) : inr.format((paise || 0) / 100));
export const count = (n: number) => num.format(n || 0);
export const countShort = (n: number) => ((n || 0) >= 100000 ? numCompact.format(n) : num.format(n || 0));

export function when(iso: string | null | undefined): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
export function day(iso: string | null | undefined): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });
}

export type OrderStatus = "created" | "paid" | "refunded";
export type InviteStatus = "draft" | "published" | "suspended";

export type OrderRow = {
  order_id: string; payment_id: string | null; status: OrderStatus; amount: number; design: string;
  note?: string; created_at: string; paid_at: string | null; refunded_at?: string | null;
  invite_id: string | null; owner: string | null; email: string | null; title: string | null;
  slug?: string | null; invite_status?: InviteStatus | null;
};
export type CustomerRow = {
  id: string; email: string | null; created_at: string; last_sign_in_at: string | null; email_confirmed_at: string | null;
  provider: string; is_admin: boolean; blocked: boolean; invites: number; live: number; spent: number;
};
export type InviteRow = {
  id: string; slug: string; n1: string; n2: string; occ: string; lang: string; design: string; status: InviteStatus;
  date_text: string; venue: string; created_at: string; published_at: string | null; publish_source: string | null;
  paid_amount: number | null; offline_reason: string | null; owner: string; email: string | null;
  views: number; replies: number; coming: number;
};
export type Paged<T> = { total: number; rows: T[]; paid_sum?: number };

export type Overview = {
  days: number; from: string;
  revenue_total: number; revenue_period: number; orders_period: number; orders_paid: number; orders_unpaid: number;
  orders_refunded: number; refunds_total: number;
  customers: number; customers_period: number; customers_paying: number; customers_blocked: number;
  invites: number; invites_period: number; invites_live: number; invites_draft: number; invites_offline: number;
  views: number; views_period: number; rsvps: number; coming: number;
  series: { d: string; revenue: number; orders: number; signups: number; invites: number }[];
  top_designs: { design: string; invites: number; live: number; revenue: number; orders: number }[];
  recent_orders: OrderRow[];
  recent_customers: { id: string; email: string | null; created_at: string; invites: number }[];
};

export type CustomerDetail = {
  user: { id: string; email: string | null; created_at: string; last_sign_in_at: string | null; email_confirmed_at: string | null; provider: string };
  is_admin: boolean; is_self: boolean; blocked: { reason: string; blocked_at: string } | null; spent: number;
  invites: { id: string; slug: string; n1: string; n2: string; occ: string; design: string; status: InviteStatus; date_text: string; created_at: string; published_at: string | null; views: number; replies: number }[];
  orders: { order_id: string; payment_id: string | null; status: OrderStatus; amount: number; design: string; created_at: string; paid_at: string | null; invite_id: string | null; title: string }[];
};

export type InviteDetail = {
  invite: {
    id: string; owner: string; slug: string; n1: string; n2: string; occ: string; lang: string; date_text: string; time_text: string;
    venue: string; msg: string; design: string; status: InviteStatus; paid_amount: number | null; published_at: string | null;
    publish_source: string | null; offline_reason: string | null; created_at: string;
  };
  owner_email: string | null; owner_blocked: boolean; views: number; visitors: number; last_view: string | null;
  rsvps: { name: string; resp: "yes" | "maybe" | "no"; guests: number; note: string; updated_at: string }[];
  payments: { order_id: string; payment_id: string | null; status: OrderStatus; amount: number; design: string; created_at: string; paid_at: string | null; refunded_at: string | null }[];
};

export type LogRow = { id: number; admin_email: string | null; action: string; target: string; details: Record<string, unknown>; created_at: string };

export const ORDER_LABEL: Record<OrderStatus, string> = { created: "Not paid", paid: "Paid", refunded: "Refunded" };
export const INVITE_LABEL: Record<InviteStatus, string> = { draft: "Draft", published: "Live", suspended: "Offline" };

export const title = (i: { n1: string; n2: string }) => (i.n2 ? `${i.n1} & ${i.n2}` : i.n1);
