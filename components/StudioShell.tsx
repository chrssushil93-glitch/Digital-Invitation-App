import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SupportLine from "@/components/SupportLine";
import { currentAccount } from "@/lib/auth";

/** Signed-in frame for the host studio. Sends signed-out visitors to the login page. */
export default async function StudioShell({ back = false, children }: { back?: boolean; children: React.ReactNode }) {
  const acct = await currentAccount();
  if (!acct) redirect("/login");
  return (
    <div className="wrap">
      <SiteHeader />
      <main className="studio">
        {back && <Link className="backlink" href="/studio">← All invitations</Link>}
        {acct.blocked && (
          <div className="panel notice" role="alert">
            <h2 className="h3">Your account is on hold</h2>
            <p>You can see your invitations, but you cannot create, change or publish them right now.{acct.reason ? ` Reason: ${acct.reason}.` : ""}</p>
            <SupportLine />
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
