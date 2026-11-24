"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { serverClient } from "@/lib/supabase/server";
import { newSlug } from "@/lib/slug";
import { cats, designBy, designs } from "@/lib/designs";

function str(fd: FormData, key: string, max: number): string {
  return String(fd.get(key) ?? "").trim().slice(0, max);
}

function logDb(where: string, error: { code?: string; message?: string; details?: string | null; hint?: string | null }) {
  console.error(where, error.code, error.message, error.details, error.hint);
}

/**
 * Saves the editor. New invitations are drafts; guests can open them only after payment.
 * With intent "pay" the host is taken straight on to Razorpay checkout.
 */
async function save(fd: FormData, intent: "draft" | "pay"): Promise<void> {
  const sb = serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    // The editor keeps the draft in the browser; after logging in the host returns to it.
    cookies().set("nm_next", "/studio/new", { path: "/", maxAge: 60 * 60 * 24, sameSite: "lax", httpOnly: true, secure: true });
    redirect("/login?next=save");
  }

  const id = str(fd, "id", 40);
  const back = `/studio/${id || "new"}`;
  const n1 = str(fd, "n1", 80);
  if (!n1) redirect(`${back}?error=name`);

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
    const { data: cur, error: readErr } = await sb.from("invites").select("status,paid_amount").eq("id", id).maybeSingle();
    if (readErr) {
      logDb("saveInvite read failed", readErr);
      redirect(`${back}?error=save&code=${encodeURIComponent(readErr.code ?? "")}`);
    }
    if (!cur) redirect("/studio");
    const published = cur.status === "published";
    // After paying, the host can switch to any template that costs the same or less.
    if (published && cur.paid_amount != null && designBy(fields.design).p > cur.paid_amount) redirect(`${back}?error=design`);

    const { error } = await sb.from("invites").update(fields).eq("id", id);
    if (error) {
      logDb("saveInvite update failed", error);
      redirect(`${back}?error=save&code=${encodeURIComponent(error.code ?? "")}`);
    }
    redirect(intent === "pay" && !published ? `${back}?pay=1` : `${back}?saved=1`);
  }

  for (let i = 0; i < 4; i++) {
    const { data, error } = await sb.from("invites").insert({ ...fields, owner: user.id, slug: newSlug() }).select("id").single();
    if (data) redirect(`/studio/${data.id}?${intent === "pay" ? "pay=1" : "saved=1"}`);
    if (error && error.code !== "23505") {
      logDb("saveInvite insert failed", error);
      redirect(`/studio/new?error=save&code=${encodeURIComponent(error.code ?? "")}`);
    }
  }
  redirect("/studio/new?error=save");
}

export async function saveDraft(fd: FormData): Promise<void> {
  await save(fd, "draft");
}

export async function saveAndPay(fd: FormData): Promise<void> {
  await save(fd, "pay");
}

export async function deleteInvite(fd: FormData): Promise<void> {
  const sb = serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const id = str(fd, "id", 40);
  if (id) await sb.from("invites").delete().eq("id", id);
  redirect("/studio?deleted=1");
}

export async function signOut(): Promise<void> {
  await serverClient().auth.signOut();
  cookies().delete("nm_next");
  redirect("/");
}
