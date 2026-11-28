import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { paymentsDbConfigured, recordOrder } from "@/lib/paymentsDb";
import { createOrder, razorpayConfigured, razorpayKeyId } from "@/lib/razorpay";
import { designBy } from "@/lib/designs";
import { currentAccount } from "@/lib/auth";
import { getSettings, isFree, priceOf } from "@/lib/settings";

export const dynamic = "force-dynamic";

const fail = (error: string, status: number) => NextResponse.json({ ok: false, error }, { status });

/** Starts checkout for one of the host's draft invitations. The price comes from the admin settings, never the browser. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { inviteId?: unknown } | null;
  const inviteId = typeof body?.inviteId === "string" ? body.inviteId : "";
  if (!/^[0-9a-f-]{36}$/i.test(inviteId)) return fail("Unknown invitation.", 400);

  const acct = await currentAccount();
  if (!acct) return fail("Please log in again.", 401);
  if (acct.blocked) return fail("Your account is on hold, so payments are paused.", 403);

  if (!razorpayConfigured() || !paymentsDbConfigured()) {
    console.error("pay/order: payments are not configured (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, PAYMENTS_DB_SECRET)");
    return fail("Online payment is not available right now. Please try again later.", 503);
  }

  // Row level security returns the invitation only to its owner.
  const { data: inv, error } = await serverClient().from("invites").select("id,design,status,n1,n2").eq("id", inviteId).maybeSingle();
  if (error) {
    console.error("pay/order: could not read invitation", error.code, error.message);
    return fail("Could not load your invitation. Please refresh and try again.", 500);
  }
  if (!inv) return fail("Unknown invitation.", 404);
  if (inv.status === "published") return NextResponse.json({ ok: true, alreadyPaid: true });
  if (inv.status === "suspended") return fail("This invitation was taken offline by the site team.", 403);

  const settings = await getSettings();
  if (isFree(settings, inv.design)) return fail("This template is free right now. Refresh the page to publish it without paying.", 409);
  const design = designBy(inv.design);
  const amount = priceOf(settings, design.n) * 100;
  const title = `${inv.n1}${inv.n2 ? ` & ${inv.n2}` : ""}`;

  try {
    const order = await createOrder(amount, inv.id, { invite_id: inv.id, design: design.n });
    // Email and title are copied onto the order so the admin's history survives later deletions.
    await recordOrder({ inviteId: inv.id, owner: acct.userId, orderId: order.id, design: design.n, amount, email: acct.email, title });
    return NextResponse.json({
      ok: true,
      keyId: razorpayKeyId(),
      orderId: order.id,
      amount,
      currency: "INR",
      description: `${design.n} invitation for ${title}`,
      email: acct.email,
    });
  } catch (e) {
    console.error("pay/order:", e instanceof Error ? e.message : e);
    return fail("Could not start the payment. Please try again.", 502);
  }
}
