import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Sign-in links land here. A ?code= is exchanged on the server; a #access_token is handled by AuthHashHandler. */
export default function AuthCallback({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const next = searchParams.next ? `&next=${encodeURIComponent(searchParams.next)}` : "";
  if (searchParams.code) redirect(`/auth/exchange?code=${encodeURIComponent(searchParams.code)}${next}`);
  if (searchParams.token_hash && searchParams.type)
    redirect(`/auth/confirm?token_hash=${encodeURIComponent(searchParams.token_hash)}&type=${encodeURIComponent(searchParams.type)}`);
  if (searchParams.error || searchParams.error_description) redirect("/login?error=1");
  return (
    <main className="authwait" aria-busy="true">
      <span className="spinner" aria-hidden="true" />
      <p>Signing you in…</p>
    </main>
  );
}
