import Link from "next/link";
import { hasSessionCookie } from "@/lib/auth";
import { signOut } from "@/app/studio/actions";

/**
 * Top bar on every page. `email` is passed by studio pages, which have verified the user;
 * elsewhere the session cookie is enough to choose which links to show.
 */
export default function SiteHeader({ email, minimal = false }: { email?: string; minimal?: boolean }) {
  const signedIn = Boolean(email) || hasSessionCookie();
  return (
    <header className="sitehead">
      <Link className="logo" href="/" aria-label="Nimantran home">
        <span className="logomark" aria-hidden="true">न</span>
        <span>Nimantran</span>
      </Link>
      {!minimal && (
        <nav className="headnav" aria-label="Main">
          {signedIn ? (
            <>
              <Link className="btn ghost small" href="/studio">My invitations</Link>
              {email ? (
                <details className="acct">
                  <summary aria-label={`Account: ${email}`}>{email.slice(0, 1).toUpperCase()}</summary>
                  <div className="acctpop">
                    <p className="note">Signed in as</p>
                    <p className="acctmail">{email}</p>
                    <form action={signOut}><button className="btn ghost small block" type="submit">Log out</button></form>
                  </div>
                </details>
              ) : (
                <form action={signOut}><button className="linkbtn navlink" type="submit">Log out</button></form>
              )}
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
  );
}
