import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Emailed links land here. A ?code= is exchanged on the server; a #access_token is handled by AuthHashHandler. */
export default function AuthCallback({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  if (searchParams.code) redirect(`/auth/exchange?code=${encodeURIComponent(searchParams.code)}`);
  if (searchParams.token_hash && searchParams.type)
    redirect(`/auth/confirm?token_hash=${encodeURIComponent(searchParams.token_hash)}&type=${encodeURIComponent(searchParams.type)}`);
  if (searchParams.error || searchParams.error_description) redirect("/login?error=1");
  return (
    <div className="wrap" style={{ maxWidth: 460, paddingTop: "4rem", textAlign: "center" }}>
      <p className="note">Signing you in…</p>
    </div>
  );
}
