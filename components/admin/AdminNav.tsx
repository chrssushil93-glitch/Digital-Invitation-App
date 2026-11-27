"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICON: Record<string, string> = {
  overview: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z",
  orders: "M6 3h12l1 4H5l1-4Zm-1 6h14v11H5V9Zm4 3v2h6v-2H9Z",
  customers: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9c0-3.3 3.1-6 7-6s7 2.7 7 6H2Zm15-9a3 3 0 1 0 0-6v6Zm1 3c2.4.5 4 2.3 4 4.5V20h-4c0-2.3-.7-4.3-2-5.9l2-.1Z",
  invitations: "M3 6l9 6 9-6v12H3V6Zm0-2h18l-9 6-9-6Z",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.5 4 2-1.6-2-3.4-2.4.8a7 7 0 0 0-1.7-1L16 4.2h-4l-.4 2.6a7 7 0 0 0-1.7 1l-2.4-.8-2 3.4L7.5 12l-2 1.6 2 3.4 2.4-.8a7 7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7 7 0 0 0 1.7-1l2.4.8 2-3.4-2-1.6Z",
  activity: "M3 12h4l3-8 4 16 3-8h4",
};

const ITEMS = [
  { href: "/admin", label: "Overview", icon: "overview" },
  { href: "/admin/orders", label: "Orders", icon: "orders" },
  { href: "/admin/customers", label: "Customers", icon: "customers" },
  { href: "/admin/invitations", label: "Invitations", icon: "invitations" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
  { href: "/admin/activity", label: "Activity", icon: "activity" },
];

/** Side menu on wide screens; a scrolling tab row on phones. */
export default function AdminNav() {
  const path = usePathname() ?? "/admin";
  return (
    <nav className="adminnav" aria-label="Admin">
      {ITEMS.map((it) => {
        const on = it.href === "/admin" ? path === "/admin" : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} aria-current={on ? "page" : undefined}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d={ICON[it.icon]} fill={it.icon === "activity" ? "none" : "currentColor"} stroke={it.icon === "activity" ? "currentColor" : "none"} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
