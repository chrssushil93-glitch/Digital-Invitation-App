import { createHmac, timingSafeEqual } from "node:crypto";

/** Razorpay over its REST API. Keys come from the server environment only. */

const keyId = () => process.env.RAZORPAY_KEY_ID ?? "";
const keySecret = () => process.env.RAZORPAY_KEY_SECRET ?? "";

export function razorpayConfigured(): boolean {
  return Boolean(keyId() && keySecret());
}

export function razorpayKeyId(): string {
  return keyId();
}

export type RazorpayOrder = { id: string; amount: number; currency: string; status: string };

/** Creates an order for `amount` paise. Checkout can only charge exactly this amount. */
export async function createOrder(amount: number, receipt: string, notes: Record<string, string>): Promise<RazorpayOrder> {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${keyId()}:${keySecret()}`).toString("base64"),
    },
    body: JSON.stringify({ amount, currency: "INR", receipt: receipt.slice(0, 40), notes }),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as (RazorpayOrder & { error?: { description?: string } }) | null;
  if (!res.ok || !body?.id) {
    throw new Error(`Razorpay order failed (${res.status}): ${body?.error?.description ?? "no details"}`);
  }
  return body;
}

function safeEqualHex(expected: string, received: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The checkout handler's signature: HMAC-SHA256 of "order_id|payment_id" with the key secret. */
export function validPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!keySecret() || !orderId || !paymentId || !signature) return false;
  const expected = createHmac("sha256", keySecret()).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC-SHA256 of the raw request body with the webhook secret. */
export function validWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
