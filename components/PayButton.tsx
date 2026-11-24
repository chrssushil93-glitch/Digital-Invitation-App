"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open(): void; on(event: string, cb: (r: { error?: { description?: string } }) => void): void };
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => RazorpayInstance;
  }
}

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    let s = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    if (!s) {
      s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      document.body.appendChild(s);
    }
    s.addEventListener("load", () => resolve(true), { once: true });
    s.addEventListener("error", () => resolve(false), { once: true });
  });
}

/**
 * Pays for a draft invitation with Razorpay Checkout. On success the server checks the
 * signature and publishes the invitation, then the page reloads to show the guest link.
 */
export default function PayButton({ inviteId, price, autoOpen = false }: { inviteId: string; price: number; autoOpen?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const opened = useRef(false);

  const pay = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    try {
      const [ready, res] = await Promise.all([
        loadCheckout(),
        fetch("/api/pay/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteId }) }),
      ]);
      const order = (await res.json().catch(() => ({ ok: false }))) as {
        ok: boolean; error?: string; alreadyPaid?: boolean; keyId?: string; orderId?: string;
        amount?: number; currency?: string; description?: string; email?: string;
      };
      if (!order.ok) throw new Error(order.error ?? "Could not start the payment.");
      if (order.alreadyPaid) {
        router.refresh();
        return;
      }
      if (!ready || !window.Razorpay) throw new Error("The payment window could not load. Check your connection and try again.");

      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Nimantran",
        description: order.description,
        prefill: { email: order.email },
        theme: { color: "#6b1428" },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setMsg({ text: "Payment cancelled. Your invitation is saved as a draft; pay whenever you are ready.", bad: false });
          },
        },
        handler: async (r: RazorpayResponse) => {
          setMsg({ text: "Payment received. Publishing your invitation…", bad: false });
          try {
            const v = await fetch("/api/pay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(r) });
            const out = (await v.json().catch(() => ({ ok: false }))) as { ok: boolean; error?: string };
            if (!out.ok) throw new Error(out.error ?? "Could not confirm the payment.");
            router.replace(`/studio/${inviteId}?published=1`);
            router.refresh();
          } catch (e) {
            setBusy(false);
            setMsg({ text: e instanceof Error ? e.message : "Could not confirm the payment.", bad: true });
          }
        },
      });
      rzp.on("payment.failed", (r) => {
        setMsg({ text: r.error?.description ? `Payment failed: ${r.error.description}` : "Payment failed. Please try again.", bad: true });
      });
      rzp.open();
    } catch (e) {
      setBusy(false);
      setMsg({ text: e instanceof Error ? e.message : "Could not start the payment.", bad: true });
    }
  }, [inviteId, router]);

  useEffect(() => {
    if (!autoOpen || opened.current) return;
    opened.current = true;
    // Drop ?pay=1 so a refresh does not reopen checkout.
    const u = new URL(window.location.href);
    u.searchParams.delete("pay");
    history.replaceState(null, "", u.pathname + u.search);
    pay();
  }, [autoOpen, pay]);

  return (
    <div className="paybox">
      <button className="btn big" type="button" onClick={pay} disabled={busy}>
        {busy ? "Opening secure payment…" : `Pay ₹${price} & get guest link`}
      </button>
      <p className="note paysafe">Secure payment by Razorpay · UPI, cards, net banking, wallets</p>
      <p role="status" aria-live="polite" className={msg?.bad ? "note err" : "note"}>{msg?.text ?? ""}</p>
    </div>
  );
}
