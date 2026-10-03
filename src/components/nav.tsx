"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const NAV: { section?: string; items: { href: string; label: string; key?: string }[] }[] = [
  { items: [{ href: "/app", label: "Overview" }, { href: "/app/brief", label: "Daily Brief" }, { href: "/app/demo", label: "Guided Demo" }] },
  {
    section: "Intelligence",
    items: [
      { href: "/app/discover", label: "Discover" },
      { href: "/app/customers", label: "Customers" },
      { href: "/app/narratives", label: "Narratives" },
      { href: "/app/kols", label: "KOLs" },
      { href: "/app/graph", label: "Growth Graph" },
    ],
  },
  {
    section: "Growth",
    items: [
      { href: "/app/opportunities", label: "Opportunities" },
      { href: "/app/missions", label: "Missions" },
      { href: "/app/experiments", label: "Experiments" },
    ],
  },
  {
    section: "Money",
    items: [
      { href: "/app/wallet", label: "Wallet" },
      { href: "/app/approvals", label: "Approvals", key: "approvals" },
      { href: "/app/activity", label: "Arc / Circle Activity" },
    ],
  },
  { section: "Config", items: [{ href: "/app/settings", label: "Settings" }] },
];

export function SideNav({ pendingApprovals }: { pendingApprovals: number }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-4 px-2 py-3">
      {NAV.map((g, i) => (
        <div key={i}>
          {g.section && <div className="label mb-1 px-2 text-[9.5px]">{g.section}</div>}
          <ul className="space-y-px">
            {g.items.map((it) => {
              const active = it.href === "/app" ? path === "/app" : path.startsWith(it.href);
              return (
                <li key={it.href}>
                  <Link href={it.href} className={cx("flex items-center justify-between rounded px-2 py-1 text-[12.5px]", active ? "bg-surface-3 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}>
                    <span>{it.label}</span>
                    {it.key === "approvals" && pendingApprovals > 0 && <span className="num rounded-sm bg-warning/15 px-1 text-[10px] text-warning">{pendingApprovals}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
