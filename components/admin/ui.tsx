import Link from "next/link";
import { INVITE_LABEL, ORDER_LABEL, type InviteStatus, type OrderStatus } from "@/lib/admin";

/** Builds an /admin URL from a base path and query values, dropping empty ones. */
export function href(base: string, q: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "" && !(k === "page" && Number(v) <= 1)) p.set(k, String(v));
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}

const OK: Record<string, string> = {
  settings: "Settings saved. The site shows the changes now.",
  published: "Invitation published.", suspend: "Invitation taken offline.", restore: "Invitation is back online.",
  draft: "Invitation moved back to draft.", edited: "Invitation updated.", deleted: "Deleted.",
  hold: "Customer put on hold.", release: "Hold lifted.", admin_add: "Admin access given.", admin_remove: "Admin access removed.",
  paid: "Order marked as paid; the invitation is live.", refunded: "Order marked as refunded.",
  rzp_paid: "Razorpay confirms the payment: order marked paid and the invitation is live.",
  rzp_none: "Razorpay has no completed payment for this order yet.",
  rzp_auth: "Razorpay shows the payment as authorised but not captured. Capture it in the Razorpay dashboard, then check again.",
};

/** The one-line result of the last action (?ok= or ?err=). */
export function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (err) return <p className="flash err" role="alert">{err.slice(0, 240)}</p>;
  if (ok && OK[ok]) return <p className="flash ok" role="status">{OK[ok]}</p>;
  return null;
}

export function OrderPill({ status }: { status: OrderStatus }) {
  return <span className={`pill o-${status}`}>{ORDER_LABEL[status] ?? status}</span>;
}

export function InvitePill({ status }: { status: InviteStatus }) {
  return <span className={`pill i-${status}`}>{INVITE_LABEL[status] ?? status}</span>;
}

/** Status chips plus a search box: one row above the list they filter. */
export function FilterBar({
  base, param, current, options, q, placeholder, children,
}: {
  base: string; param: string; current: string; options: [string, string][]; q: string; placeholder: string; children?: React.ReactNode;
}) {
  return (
    <div className="filterbar">
      <div className="chips" role="group" aria-label="Filter">
        {options.map(([v, label]) => (
          <Link key={v || "all"} href={href(base, { [param]: v, q })} aria-current={current === v ? "true" : undefined} className="chip">
            {label}
          </Link>
        ))}
      </div>
      <form className="search" action={base} method="get" role="search">
        {current && <input type="hidden" name={param} value={current} />}
        <input type="search" name="q" defaultValue={q} placeholder={placeholder} aria-label={placeholder} />
        <button className="btn small" type="submit">Search</button>
      </form>
      {children}
    </div>
  );
}

export function Pager({ base, q, page, total, size }: { base: string; q: Record<string, string>; page: number; total: number; size: number }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pages">
      {page > 1 ? <Link className="btn ghost small" href={href(base, { ...q, page: page - 1 })}>← Newer</Link> : <span />}
      <span className="note">Page {page} of {pages}</span>
      {page < pages ? <Link className="btn ghost small" href={href(base, { ...q, page: page + 1 })}>Older →</Link> : <span />}
    </nav>
  );
}

export function BackTo({ to, label }: { to: string; label: string }) {
  return <Link className="backlink" href={to}>← {label}</Link>;
}
