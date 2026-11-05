import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StudioIndex() {
  const sb = serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await sb.from("invites").select("id").order("created_at", { ascending: false }).limit(1);
  redirect(data && data.length ? `/studio/${data[0].id}` : "/studio/new");
}
