import Link from "next/link";
import { currentAccount, hasSessionCookie } from "@/lib/auth";
import { getSettings, logoUrl } from "@/lib/settings";
import { signOut } from "@/app/studio/actions";

/** Top bar on every host-facing page: logo, announcement banner, and the right links for who is signed in. */
export default async function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  const s = await getSettings();
  const acct = !minimal && hasSessionCookie() ? await currentAccount() : null;
  return (
    <>
      {s.bannerOn && s.bannerText && <p className="sitebanner" role="note">{s.bannerText}</p>}
      <header className="sitehead">
        <Link className="logo" href="/" aria-label={`${s.siteName} home`}>
          {s.logoVersion ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="logoimg" src={logoUrl(s)} alt={s.siteName} />
          ) : (
            <>
              <span className="logomark" aria-hidden="true">{s.siteName.slice(0, 1)}</span>
              <span>{s.siteName}</span>
            </>
          )}
        </Link>
        {!minimal && (
          <nav className="headnav" aria-label="Main">
            {acct ? (
              <>
                {acct.admin && <Link className="navlink" href="/admin">Admin</Link>}
                <Link className="btn ghost small" href="/studio">My invitations</Link>
                <details className="acct">
                  <summary aria-label={`Account: ${acct.email}`}>{(acct.email || "?").slice(0, 1).toUpperCase()}</summary>
                  <div className="acctpop">
                    <p className="note">Signed in as</p>
                    <p className="acctmail">{acct.email}</p>
                    {acct.admin && <Link className="btn ghost small block" href="/admin">Admin dashboard</Link>}
                    <form action={signOut}><button className="btn ghost small block" type="submit">Log out</button></form>
                  </div>
                </details>
              </>
            ) : (
              <>
                <Link className="navlink" href="/login">Log in</Link>
                <Link className="btn small" href="/create">Create<span className="hide-sm">&nbsp;invitation</span></Link>
              </>
            )}
          </nav>
        )}
      </header>
    </>
  );
}
