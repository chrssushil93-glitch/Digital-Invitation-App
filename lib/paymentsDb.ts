import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { noStoreFetch } from "@/lib/supabase/fetch";

/**
 * How the server records Razorpay orders and confirms payments. Instead of Supabase's
 * service role key (which can do anything), the server holds PAYMENTS_DB_SECRET: a key that
 * opens only the three server_* database functions. The database stores just its SHA-256
 * hash, linked by an admin in Admin → Settings. Server-only: never import from a client component.
 */
const secret = () => process.env.PAYMENTS_DB_SECRET ?? "";

export function paymentsDbConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && secret().length >= 32);
}

/** Fingerprint of the key, which is what the database stores. */
export function paymentsKeyHash(): string {
  return createHash("sha256").update(secret(), "utf8").digest("hex");
}

function db(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: noStoreFetch },
  });
}

export type Confirmed = { invite_id: string | null; owner: string | null; slug: string | null };

export async function recordOrder(o: {
  inviteId: string; owner: string; orderId: string; design: string; amount: number; email: string; title: string;
}): Promise<void> {
  const { error } = await db().rpc("server_record_order", {
    p_secret: secret(), p_invite: o.inviteId, p_owner: o.owner, p_order_id: o.orderId,
    p_design: o.design, p_amount: o.amount, p_email: o.email, p_title: o.title,
  });
  if (error) throw new Error(`server_record_order: ${error.code} ${error.message}`);
}

/** Marks the order paid and publishes its invitation. Returns null when the order is unknown or the amount differs. */
export async function confirmPayment(orderId: string, paymentId: string, amount: number | null = null): Promise<Confirmed | null> {
  const { data, error } = await db().rpc("server_confirm_payment", {
    p_secret: secret(), p_order_id: orderId, p_payment_id: paymentId, p_amount: amount,
  });
  if (error) throw new Error(`server_confirm_payment: ${error.code} ${error.message}`);
  return data as Confirmed | null;
}

export async function markRefunded(paymentId: string): Promise<void> {
  const { error } = await db().rpc("server_payment_refunded", { p_secret: secret(), p_payment_id: paymentId });
  if (error) throw new Error(`server_payment_refunded: ${error.code} ${error.message}`);
}

/** "ok", "missing" (no key in the environment), "unlinked" (key not linked in the admin) or "setup" (database not updated). */
export async function paymentsKeyState(): Promise<"ok" | "missing" | "unlinked" | "setup"> {
  if (!paymentsDbConfigured()) return "missing";
  const { data, error } = await db().rpc("server_key_ok", { p_secret: secret() });
  if (error) return "setup";
  return data === true ? "ok" : "unlinked";
}
