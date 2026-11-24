import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import LoginForm from "@/components/LoginForm";
import { authOptions } from "@/lib/auth";
import { serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Log in · Nimantran" };

export default async function Login({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const saving = searchParams.next === "save";
  // Already signed in: go straight on.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { data: { user } } = await serverClient().auth.getUser().catch(() => ({ data: { user: null } }));
    if (user) redirect(saving ? "/studio/new" : "/studio");
  }
  const opts = await authOptions();
  return (
    <div className="wrap">
      <SiteHeader minimal />
      <main className="authpage">
        <LoginForm google={opts.google} saving={saving} error={searchParams.error ?? ""} />
      </main>
    </div>
  );
}
