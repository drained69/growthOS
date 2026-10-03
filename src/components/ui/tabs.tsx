"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/components/ui/cn";

/** URL-driven tabs: each tab is a link; the active one is derived from the path or a query param. */
export function LinkTabs({ tabs, param, className }: { tabs: { label: string; href: string; count?: number; value?: string }[]; param?: string; className?: string }) {
  const path = usePathname();
  const sp = useSearchParams();
  return (
    <div className={cn("flex items-center gap-1 overflow-x-auto border-b border-line", className)}>
      {tabs.map((t, i) => {
        const active = param ? (sp.get(param) ?? tabs[0].value) === t.value : path === t.href || (i > 0 && path.startsWith(t.href));
        return (
          <Link key={t.href} href={t.href} className={cn("-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 pb-2 pt-1 text-[12.5px] transition-colors", active ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink")}>
            {t.label}
            {t.count != null && <span className={cn("num rounded px-1 text-[10.5px]", active ? "bg-accent/15 text-s1" : "bg-surface-3 text-ink-3")}>{t.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}
