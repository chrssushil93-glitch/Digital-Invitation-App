"use server";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { serverClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { cats, designs } from "@/lib/designs";
import { orderPayments, razorpayConfigured } from "@/lib/razorpay";
import { getSettings, MAX_PRICE, normalizeSettings, SETTINGS_TAG } from "@/lib/settings";

const str = (fd: FormData, k: string, max = 300) => String(fd.get(k) ?? "").trim().slice(0, max);

/** Where to come back to: only admin pages. */
function backOf(fd: FormData): string {
  const b = str(fd, "back", 300);
  return /^\/admin(\/[\w-]+)*(\?[\w=&%.-]*)?$/.test(b) ? b : "/admin";
}

function withMsg(back: string, key: "ok" | "err", value: string): string {
  const u = new URL(back, "http://x");
  u.searchParams.delete("ok");
  u.searchParams.delete("err");
  u.searchParams.set(key, value);
  return u.pathname + u.search;
}

/** Runs one admin database function, then returns to the page with a message. */
async function run(back: string, fn: string, args: Record<string, unknown>, ok: string, then?: string): Promise<never> {
  await requireAdmin();
  const { error } = await serverClient().rpc(fn, args);
  if (error) {
    console.error(`admin ${fn} failed`, error.code, error.message);
    redirect(withMsg(back, "err", error.message || "That did not work. Please try again."));
  }
  redirect(withMsg(then ?? back, "ok", ok));
}

const UUID = /^[0-9a-f-]{36}$/i;

// ---------------------------------------------------------------- invitations

export async function inviteAction(fd: FormData): Promise<void> {
  const id = str(fd, "id", 40);
  const action = str(fd, "action", 20);
  if (!UUID.test(id) || !["publish", "suspend", "restore", "draft"].includes(action)) redirect("/admin/invitations");
  await run(backOf(fd), "admin_invite_action", { p_id: id, p_action: action, p_reason: str(fd, "reason", 300) },
    action === "publish" ? "published" : action);
}

export async function updateInvite(fd: FormData): Promise<void> {
  const id = str(fd, "id", 40);
  if (!UUID.test(id)) redirect("/admin/invitations");
  const occ = str(fd, "occ", 20);
  const lang = str(fd, "lang", 2);
  const design = str(fd, "design", 60);
  const n1 = str(fd, "n1", 80);
  if (!n1) redirect(withMsg(backOf(fd), "err", "The first name cannot be empty."));
  const fields = {
    n1, n2: str(fd, "n2", 80), date_text: str(fd, "date_text", 60), time_text: str(fd, "time_text", 40),
    venue: str(fd, "venue", 160), msg: str(fd, "msg", 500),
    occ: cats.some((c) => c.id === occ) ? occ : "wedding",
    lang: lang === "hi" || lang === "mr" ? lang : "en",
    ...(designs.some((d) => d.n === design) ? { design } : {}),
  };
  await run(backOf(fd), "admin_update_invite", { p_id: id, p_fields: fields }, "edited");
}

export async function deleteInviteAdmin(fd: FormData): Promise<void> {
  const id = str(fd, "id", 40);
  if (!UUID.test(id)) redirect("/admin/invitations");
  await run(backOf(fd), "admin_delete_invite", { p_id: id }, "deleted", "/admin/invitations");
}

// ---------------------------------------------------------------- customers

export async function customerHold(fd: FormData): Promise<void> {
  const id = str(fd, "id", 40);
  if (!UUID.test(id)) redirect("/admin/customers");
  const hold = str(fd, "hold", 5) === "1";
  await run(backOf(fd), "admin_set_blocked", { p_user: id, p_blocked: hold, p_reason: str(fd, "reason", 300) }, hold ? "hold" : "release");
}

export async function customerRole(fd: FormData): Promise<void> {
  const id = str(fd, "id", 40);
  if (!UUID.test(id)) redirect("/admin/customers");
  const admin = str(fd, "admin", 5) === "1";
  await run(backOf(fd), "admin_set_role", { p_user: id, p_admin: admin }, admin ? "admin_add" : "admin_remove");
}

export async function addAdminByEmail(fd: FormData): Promise<void> {
  await requireAdmin();
  const back = backOf(fd);
  const email = str(fd, "email", 254);
  const { data, error } = await serverClient().rpc("admin_user_id", { p_email: email });
  if (error) redirect(withMsg(back, "err", error.message));
  if (!data) redirect(withMsg(back, "err", "No account uses that email yet. Ask them to sign up on the site first."));
  await run(back, "admin_set_role", { p_user: data, p_admin: true }, "admin_add");
}

export async function deleteCustomer(fd: FormData): Promise<void> {
  const id = str(fd, "id", 40);
  if (!UUID.test(id)) redirect("/admin/customers");
  await run(backOf(fd), "admin_delete_customer", { p_user: id, p_confirm: str(fd, "confirm", 254) }, "deleted", "/admin/customers");
}

// ---------------------------------------------------------------- orders

export async function orderAction(fd: FormData): Promise<void> {
  const order = str(fd, "order", 80);
  const action = str(fd, "action", 20);
  if (!order || !["paid", "refunded"].includes(action)) redirect("/admin/orders");
  await run(backOf(fd), "admin_payment_action", {
    p_order_id: order, p_action: action, p_payment_id: str(fd, "payment_id", 80) || null,
    p_note: str(fd, "note", 300), p_unpublish: str(fd, "unpublish", 5) === "on",
  }, action);
}

/** Asks Razorpay whether an unpaid order was in fact paid (for when the webhook or the browser missed it). */
export async function checkRazorpay(fd: FormData): Promise<void> {
  await requireAdmin();
  const back = backOf(fd);
  const order = str(fd, "order", 80);
  if (!razorpayConfigured()) redirect(withMsg(back, "err", "Razorpay keys are not set in Vercel, so the order cannot be checked."));
  let items: Awaited<ReturnType<typeof orderPayments>> = [];
  let failure = "";
  try {
    items = await orderPayments(order);
  } catch (e) {
    failure = e instanceof Error ? e.message : "Razorpay could not be reached.";
  }
  if (failure) redirect(withMsg(back, "err", `Razorpay: ${failure}`));
  const captured = items.find((p) => p.status === "captured");
  if (captured) {
    await run(back, "admin_payment_action", {
      p_order_id: order, p_action: "paid", p_payment_id: captured.id, p_note: "Confirmed with Razorpay", p_unpublish: false,
    }, "rzp_paid");
  }
  redirect(withMsg(back, "ok", items.some((p) => p.status === "authorized") ? "rzp_auth" : "rzp_none"));
}

// ---------------------------------------------------------------- settings

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function saveSettings(fd: FormData): Promise<void> {
  await requireAdmin();
  const back = "/admin/settings";
  const current = await getSettings();

  const prices: Record<string, number> = {};
  for (const d of designs) {
    const raw = str(fd, `price:${d.n}`, 10);
    if (raw === "") continue;
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n) || n < 0 || n > MAX_PRICE) redirect(withMsg(back, "err", `Price for ${d.n} must be between 0 and ${MAX_PRICE}.`));
    if (n !== d.p) prices[d.n] = n;
  }
  const hiddenDesigns = designs.filter((d) => fd.get(`show:${d.n}`) !== "on").map((d) => d.n);
  if (hiddenDesigns.length === designs.length) redirect(withMsg(back, "err", "Keep at least one template visible."));

  let logoVersion = current.logoVersion;
  const sb = serverClient();
  if (fd.get("removeLogo") === "on") {
    const { error } = await sb.rpc("admin_delete_asset", { p_name: "logo" });
    if (error) redirect(withMsg(back, "err", error.message));
    logoVersion = 0;
  } else {
    const file = fd.get("logo");
    if (file && typeof file === "object" && "size" in file && file.size > 0) {
      if (!LOGO_TYPES.includes(file.type)) redirect(withMsg(back, "err", "The logo must be a PNG, JPG, WebP or SVG image."));
      if (file.size > 1024 * 1024) redirect(withMsg(back, "err", "The logo must be smaller than 1 MB."));
      const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      const { data, error } = await sb.rpc("admin_save_asset", { p_name: "logo", p_mime: file.type, p_b64: b64 });
      if (error) redirect(withMsg(back, "err", error.message));
      logoVersion = Number(data) || Math.floor(Date.now() / 1000);
    }
  }

  const next = normalizeSettings({
    siteName: str(fd, "siteName", 40),
    heroTitle: str(fd, "heroTitle", 120),
    heroText: str(fd, "heroText", 400),
    metaDescription: str(fd, "metaDescription", 200),
    bannerOn: fd.get("bannerOn") === "on",
    bannerText: str(fd, "bannerText", 200),
    supportEmail: str(fd, "supportEmail", 120),
    supportPhone: str(fd, "supportPhone", 30),
    paymentsMode: str(fd, "paymentsMode", 10) === "free" ? "free" : "razorpay",
    acceptingNew: fd.get("acceptingNew") === "on",
    watermark: fd.get("watermark") === "on",
    prices,
    hiddenDesigns,
    logoVersion,
  });
  const { error } = await sb.rpc("admin_save_settings", { p_data: next });
  if (error) redirect(withMsg(back, "err", error.message));
  revalidateTag(SETTINGS_TAG);
  redirect(withMsg(back, "ok", "settings"));
}
