import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { adminClient, adminConfigured } from "@/lib/supabase/admin";
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
  if (!adminConfigured()) return NextResponse.json({ ok: false, error: "Payments are not configured." }, { status: 503 });

  if (!validPaymentSignature(orderId, paymentId, signature)) {
    console.error("pay/verify: bad signature for order", orderId);
    return NextResponse.json({ ok: false, error: "We could not confirm this payment. If money was taken, it will be confirmed automatically within a few minutes." }, { status: 400 });
  }

  const { data, error } = await adminClient().rpc("confirm_payment", { p_order_id: orderId, p_payment_id: paymentId });
  const res = data as { invite_id: string; owner: string; slug: string } | null;
  if (error || !res) {
    console.error("pay/verify: confirm_payment failed", error?.code, error?.message, orderId);
    return NextResponse.json({ ok: false, error: "Payment received, but we could not publish the invitation yet. Please refresh in a minute." }, { status: 500 });
  }
  if (res.owner !== user.id) return NextResponse.json({ ok: false, error: "This payment belongs to another account." }, { status: 403 });
  return NextResponse.json({ ok: true, inviteId: res.invite_id, slug: res.slug });
}
