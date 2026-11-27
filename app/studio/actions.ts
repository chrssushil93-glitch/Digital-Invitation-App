"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { serverClient } from "@/lib/supabase/server";
import { newSlug } from "@/lib/slug";
import { isSetupError } from "@/lib/studio";
import { currentAccount } from "@/lib/auth";
import { cats, designs } from "@/lib/designs";
import { getSettings, isFree, priceOf, visibleDesigns } from "@/lib/settings";

function str(fd: FormData, key: string, max: number): string {
  return String(fd.get(key) ?? "").trim().slice(0, max);
}

type DbError = { code?: string; message?: string; details?: string | null; hint?: string | null };

/** Logs a database error and returns the query string for the editor's error message. */
function dbFail(where: string, error: DbError): string {
  console.error(where, error.code, error.message, error.details, error.hint);
  // "dbcode", not "code": ?code= is how Supabase hands back a sign-in, and the middleware treats it so.
  return `error=${isSetupError(error) ? "setup" : "save"}&dbcode=${encodeURIComponent(error.code ?? "")}`;
}

/** Publishes a draft without payment when the admin has made its template free. */
async function goLiveFree(id: string, back: string): Promise<never> {
  const { error } = await serverClient().rpc("publish_free", { p_id: id });
  if (error) {
    console.error("publish_free failed", error.code, error.message);
    redirect(`${back}?error=${error.code === "P0001" ? "price" : "save"}`);
  }
  redirect(`${back}?published=1`);
}

/**
 * Saves the editor. New invitations are drafts; guests can open them only after payment.
 * With intent "pay" the host goes straight on to Razorpay checkout, or live at once when
 * the template is free.
 */
async function save(fd: FormData, intent: "draft" | "pay"): Promise<void> {
  const acct = await currentAccount();
  if (!acct) {
    // The editor keeps the draft in the browser; after logging in the host returns to it.
    cookies().set("nm_next", "/studio/new", { path: "/", maxAge: 60 * 60 * 24, sameSite: "lax", httpOnly: true, secure: true });
    redirect("/login?next=save");
  }

  const id = str(fd, "id", 40);
  const back = `/studio/${id || "new"}`;
  if (acct.blocked) redirect(`${back}?error=hold`);
  const s = await getSettings();
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
    design: designs.some((d) => d.n === design) ? design : visibleDesigns(s)[0]?.n ?? designs[0].n,
  };
  const sb = serverClient();

  if (id && id !== "new") {
    // Row level security limits this to the host's own invitation.
    const { data: cur, error: readErr } = await sb.from("invites").select("status,paid_amount,design").eq("id", id).maybeSingle();
    if (readErr) redirect(`${back}?${dbFail("saveInvite read failed", readErr)}`);
    if (!cur) redirect("/studio");
    if (!visibleDesigns(s, cur.design).some((d) => d.n === fields.design)) redirect(`${back}?error=design`);
    const live = cur.status === "published";
    // After paying, the host can switch to any template that costs the same or less.
    if (live && cur.paid_amount != null && priceOf(s, fields.design) > cur.paid_amount) redirect(`${back}?error=design`);

    const { error } = await sb.from("invites").update(fields).eq("id", id);
    if (error) redirect(`${back}?${dbFail("saveInvite update failed", error)}`);
    if (intent === "pay" && cur.status === "draft") {
      if (isFree(s, fields.design)) await goLiveFree(id, back);
      redirect(`${back}?pay=1`);
    }
    redirect(`${back}?saved=1`);
  }

  if (!s.acceptingNew && !acct.admin) redirect("/studio/new?error=closed");
  if (!visibleDesigns(s).some((d) => d.n === fields.design)) redirect("/studio/new?error=design");
  for (let i = 0; i < 4; i++) {
    const { data, error } = await sb.from("invites").insert({ ...fields, owner: acct.userId, slug: newSlug() }).select("id").single();
    if (data) {
      if (intent === "pay" && isFree(s, fields.design)) await goLiveFree(data.id, `/studio/${data.id}`);
      redirect(`/studio/${data.id}?${intent === "pay" ? "pay=1" : "saved=1"}`);
    }
    if (error && error.code !== "23505") redirect(`/studio/new?${dbFail("saveInvite insert failed", error)}`);
  }
  redirect("/studio/new?error=save");
}

export async function saveDraft(fd: FormData): Promise<void> {
  await save(fd, "draft");
}

export async function saveAndPay(fd: FormData): Promise<void> {
  await save(fd, "pay");
}

/** "Publish for free" on the invitation page. */
export async function publishFree(fd: FormData): Promise<void> {
  const acct = await currentAccount();
  if (!acct) redirect("/login");
  const id = str(fd, "id", 40);
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/studio");
  if (acct.blocked) redirect(`/studio/${id}?error=hold`);
  await goLiveFree(id, `/studio/${id}`);
}

export async function deleteInvite(fd: FormData): Promise<void> {
  const sb = serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const id = str(fd, "id", 40);
  // Orders for it stay in the admin's history: they keep the title and email copied in at checkout.
  if (id) await sb.from("invites").delete().eq("id", id);
  redirect("/studio?deleted=1");
}

export async function signOut(): Promise<void> {
  await serverClient().auth.signOut();
  cookies().delete("nm_next");
  redirect("/");
}
