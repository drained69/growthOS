import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

export function Stat({ label, value, sub, tone, className, size = "md" }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: "good" | "warn" | "bad"; className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="truncate text-[11.5px] font-medium text-ink-3">{label}</div>
      <div
        className={cn(
          "num mt-1 truncate font-medium leading-none tracking-[-0.03em]",
          size === "lg" ? "text-[30px]" : size === "sm" ? "text-[17px]" : "text-[22px]",
          tone === "good" && "text-good",
          tone === "warn" && "text-warning",
          tone === "bad" && "text-critical",
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-1.5 truncate text-[11.5px] text-ink-3">{sub}</div>}
    </div>
  );
}

/** A row of stats separated by hairlines — the KPI strip used at the top of pages. */
export function StatStrip({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid divide-line overflow-hidden rounded-[10px] border border-line bg-surface sm:divide-x [&>*]:px-4 [&>*]:py-3.5", className)}>{children}</div>;
}
