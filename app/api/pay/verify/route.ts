import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { confirmPayment, paymentsDbConfigured, type Confirmed } from "@/lib/paymentsDb";
import { validPaymentSignature } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 200) : "");

/** Called by checkout after a successful payment. Checks Razorpay's signature, then publishes the invitation. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const orderId = str(b?.razorpay_order_id);
  const paymentId = str(b?.razorpay_payment_id);
  const signature = str(b?.razorpay_signature);

  const { data: { user } } = await serverClient().auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Please log in again." }, { status: 401 });
  if (!paymentsDbConfigured()) return NextResponse.json({ ok: false, error: "Payments are not configured." }, { status: 503 });

  if (!validPaymentSignature(orderId, paymentId, signature)) {
    console.error("pay/verify: bad signature for order", orderId);
    return NextResponse.json({ ok: false, error: "We could not confirm this payment. If money was taken, it will be confirmed automatically within a few minutes." }, { status: 400 });
  }

  let res: Confirmed | null = null;
  let failure = "";
  try {
    res = await confirmPayment(orderId, paymentId);
  } catch (e) {
    failure = e instanceof Error ? e.message : String(e);
  }
  if (!res) {
    console.error("pay/verify: could not confirm", failure || "unknown order", orderId);
    return NextResponse.json({ ok: false, error: "Payment received, but we could not publish the invitation yet. Please refresh in a minute." }, { status: 500 });
  }
  if (res.owner !== user.id) return NextResponse.json({ ok: false, error: "This payment belongs to another account." }, { status: 403 });
  return NextResponse.json({ ok: true, inviteId: res.invite_id, slug: res.slug });
}
