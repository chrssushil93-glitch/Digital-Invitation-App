import type { Metadata } from "next";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/admin";
import { getSettings, logoUrl } from "@/lib/settings";
import { signOut } from "@/app/studio/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const acct = await requireAdmin();
  const s = await getSettings();
  return (
    <div className="wrap wide">
      <header className="sitehead adminhead">
        <Link className="logo" href="/admin" aria-label={`${s.siteName} admin`}>
          {s.logoVersion ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="logoimg" src={logoUrl(s)} alt={s.siteName} />
          ) : (
            <>
              <span className="logomark" aria-hidden="true">{s.siteName.slice(0, 1)}</span>
              <span className="hide-sm">{s.siteName}</span>
            </>
          )}
          <span className="adminpill">Admin</span>
        </Link>
        <nav className="headnav" aria-label="Account">
          <Link className="navlink hide-sm" href="/" target="_blank">View site ↗</Link>
          <details className="acct">
            <summary aria-label={`Account: ${acct.email}`}>{(acct.email || "?").slice(0, 1).toUpperCase()}</summary>
            <div className="acctpop">
              <p className="note">Signed in as</p>
              <p className="acctmail">{acct.email}</p>
              <Link className="btn ghost small block" href="/" target="_blank">View site ↗</Link>
              <Link className="btn ghost small block" href="/studio">My invitations</Link>
              <form action={signOut}><button className="btn ghost small block" type="submit">Log out</button></form>
            </div>
          </details>
        </nav>
      </header>
      <div className="adminbody">
        <AdminNav />
        <main className="admincontent">{children}</main>
      </div>
    </div>
  );
}
