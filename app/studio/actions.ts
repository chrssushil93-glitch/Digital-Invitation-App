"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { serverClient } from "@/lib/supabase/server";
import { newSlug } from "@/lib/slug";
import { cats, designs } from "@/lib/designs";

function str(fd: FormData, key: string, max: number): string {
  return String(fd.get(key) ?? "").trim().slice(0, max);
}

export async function saveInvite(fd: FormData): Promise<void> {
  const sb = serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    // The editor keeps the draft in the browser; after logging in the host returns to it.
    cookies().set("nm_next", "/studio/new", { path: "/", maxAge: 60 * 60 * 24, sameSite: "lax", httpOnly: true, secure: true });
    redirect("/login?next=save");
  }

  const id = str(fd, "id", 40);
  const n1 = str(fd, "n1", 80);
  if (!n1) redirect(`/studio/${id || "new"}?error=name`);

  const occ = str(fd, "occ", 20);
  const lang = str(fd, "lang", 2);
  const design = str(fd, "design", 60);
  const fields = {
    n1,
    n2: str(fd, "n2", 80),
    occ: cats.some((c) => c.id === occ) ? occ : "wedding",
    lang: lang === "hi" || lang === "mr" ? lang : "en",
    date_text: str(fd, "date_text", 60),
    time_text: str(fd, "time_text", 40),
    venue: str(fd, "venue", 160),
    msg: str(fd, "msg", 500),
    design: designs.some((d) => d.n === design) ? design : designs[0].n,
  };

  if (id && id !== "new") {
    // Row level security limits this to the host's own invitation.
    const { error } = await sb.from("invites").update(fields).eq("id", id);
    if (error) {
      console.error("saveInvite update failed", error.code, error.message, error.details, error.hint);
      redirect(`/studio/${id}?error=save`);
    }
    redirect(`/studio/${id}?saved=1`);
  }

  for (let i = 0; i < 4; i++) {
    const { data, error } = await sb.from("invites").insert({ ...fields, owner: user.id, slug: newSlug() }).select("id").single();
    if (data) redirect(`/studio/${data.id}?saved=1`);
    if (error && error.code !== "23505") {
      console.error("saveInvite insert failed", error.code, error.message, error.details, error.hint);
      redirect(`/studio/new?error=save&code=${encodeURIComponent(error.code ?? "")}`);
    }
  }
  redirect("/studio/new?error=save");
}

export async function deleteInvite(fd: FormData): Promise<void> {
  const sb = serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const id = str(fd, "id", 40);
  if (id) await sb.from("invites").delete().eq("id", id);
  redirect("/studio");
}

export async function signOut(): Promise<void> {
  await serverClient().auth.signOut();
  redirect("/");
}
