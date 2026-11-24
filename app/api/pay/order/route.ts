import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { adminClient, adminConfigured } from "@/lib/supabase/admin";
import { createOrder, razorpayConfigured, razorpayKeyId } from "@/lib/razorpay";
import { designBy } from "@/lib/designs";

export const dynamic = "force-dynamic";

const fail = (error: string, status: number) => NextResponse.json({ ok: false, error }, { status });

/** Starts checkout for one of the host's draft invitations. The price comes from the design, never the browser. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { inviteId?: unknown } | null;
  const inviteId = typeof body?.inviteId === "string" ? body.inviteId : "";
  if (!/^[0-9a-f-]{36}$/i.test(inviteId)) return fail("Unknown invitation.", 400);

  const sb = serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return fail("Please log in again.", 401);

  if (!razorpayConfigured() || !adminConfigured()) {
    console.error("pay/order: payments are not configured (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, SUPABASE_SERVICE_ROLE_KEY)");
    return fail("Online payment is not available right now. Please try again later.", 503);
  }

  // Row level security returns the invitation only to its owner.
  const { data: inv, error } = await sb.from("invites").select("id,design,status,n1,n2").eq("id", inviteId).maybeSingle();
  if (error) {
    console.error("pay/order: could not read invitation", error.code, error.message);
    return fail("Could not load your invitation. Please refresh and try again.", 500);
  }
  if (!inv) return fail("Unknown invitation.", 404);
  if (inv.status === "published") return NextResponse.json({ ok: true, alreadyPaid: true });

  const design = designBy(inv.design);
  const amount = design.p * 100;

  try {
    const order = await createOrder(amount, inv.id, { invite_id: inv.id, design: design.n });
    const { error: insErr } = await adminClient().from("payments").insert({
      invite_id: inv.id, owner: user.id, order_id: order.id, design: design.n, amount, currency: "INR",
    });
    if (insErr) throw new Error(`payments insert: ${insErr.code} ${insErr.message}`);
    return NextResponse.json({
      ok: true,
      keyId: razorpayKeyId(),
      orderId: order.id,
      amount,
      currency: "INR",
      description: `${design.n} invitation for ${inv.n1}${inv.n2 ? ` & ${inv.n2}` : ""}`,
      email: user.email ?? "",
    });
  } catch (e) {
    console.error("pay/order:", e instanceof Error ? e.message : e);
    return fail("Could not start the payment. Please try again.", 502);
  }
}
