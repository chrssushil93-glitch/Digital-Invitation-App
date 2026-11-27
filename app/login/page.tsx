import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import LoginForm from "@/components/LoginForm";
import { authOptions, safeNext } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Log in" };

export default async function Login({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const saving = searchParams.next === "save";
  const next = saving ? "/studio/new" : safeNext(searchParams.next);
  // Already signed in: go straight on.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { data: { user } } = await serverClient().auth.getUser().catch(() => ({ data: { user: null } }));
    if (user) redirect(next);
  }
  const [opts, s] = await Promise.all([authOptions(), getSettings()]);
  return (
    <div className="wrap">
      <SiteHeader minimal />
      <main className="authpage">
        <LoginForm google={opts.google} saving={saving} next={next} siteName={s.siteName} error={searchParams.error ?? ""} />
      </main>
    </div>
  );
}
