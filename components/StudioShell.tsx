import Link from "next/link";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/SiteHeader";

/** Signed-in frame for the host studio. Sends signed-out visitors to the login page. */
export default async function StudioShell({ back = false, children }: { back?: boolean; children: React.ReactNode }) {
  const { data: { user } } = await serverClient().auth.getUser();
  if (!user) redirect("/login");
  return (
    <div className="wrap">
      <SiteHeader email={user.email ?? "Account"} />
      <main className="studio">
        {back && <Link className="backlink" href="/studio">← All invitations</Link>}
        {children}
      </main>
    </div>
  );
}
