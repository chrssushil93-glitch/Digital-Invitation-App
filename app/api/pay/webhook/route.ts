import { NextResponse } from "next/server";
import { adminClient, adminConfigured } from "@/lib/supabase/admin";
import { validWebhookSignature } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

type Entity = { id?: string; order_id?: string; payment_id?: string; amount?: number };
type Event = { event?: string; payload?: { payment?: { entity?: Entity }; order?: { entity?: Entity }; refund?: { entity?: Entity } } };

/**
 * Razorpay webhook (events: payment.captured, order.paid, refund.processed). Publishes the invitation
 * even if the host closed the page before checkout reported back, and marks refunds made in the
 * Razorpay dashboard. Set it up in Razorpay: Settings -> Webhooks -> <site>/api/pay/webhook,
 * with RAZORPAY_WEBHOOK_SECRET as the secret.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validWebhookSignature(raw, req.headers.get("x-razorpay-signature") ?? "")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!adminConfigured()) return NextResponse.json({ ok: false }, { status: 503 });

  let ev: Event;
  try {
    ev = JSON.parse(raw) as Event;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (ev.event === "refund.processed" || ev.event === "refund.created") {
    const paymentId = ev.payload?.refund?.entity?.payment_id ?? ev.payload?.payment?.entity?.id ?? "";
    if (!paymentId) return NextResponse.json({ ok: true, ignored: true });
    const { error } = await adminClient().rpc("payment_refunded", { p_payment_id: paymentId });
    if (error) {
      console.error("pay/webhook: payment_refunded failed", error.code, error.message, paymentId);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }
  if (ev.event !== "payment.captured" && ev.event !== "order.paid") return NextResponse.json({ ok: true, ignored: true });

  const pay = ev.payload?.payment?.entity;
  const orderId = pay?.order_id ?? ev.payload?.order?.entity?.id ?? "";
  if (!orderId || !pay?.id) return NextResponse.json({ ok: true, ignored: true });

  const { data, error } = await adminClient().rpc("confirm_payment", {
    p_order_id: orderId, p_payment_id: pay.id, p_amount: typeof pay.amount === "number" ? pay.amount : null,
  });
  if (error) {
    console.error("pay/webhook: confirm_payment failed", error.code, error.message, orderId);
    return NextResponse.json({ ok: false }, { status: 500 }); // Razorpay retries
  }
  if (!data) console.error("pay/webhook: no matching order or amount mismatch", orderId);
  return NextResponse.json({ ok: true });
}
