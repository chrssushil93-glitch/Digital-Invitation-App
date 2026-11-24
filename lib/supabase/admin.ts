import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with the service role (secret) key. It bypasses row level
 * security, so it is used for one thing only: recording Razorpay orders and confirming
 * payments. Never import this from a client component.
 */
function serviceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
}

export function adminConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && serviceKey());
}

export function adminClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
