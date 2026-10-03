import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/components/ui/cn";

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-[10px] border border-dashed border-line-strong px-6 py-12 text-center", className)}>
      {icon && <div className="mb-3 grid size-9 place-items-center rounded-[8px] bg-surface-2 text-ink-3 ring-1 ring-line [&_svg]:size-4.5">{icon}</div>}
      <div className="text-[13.5px] font-medium text-ink">{title}</div>
      {description && <div className="mt-1 max-w-md text-[12.5px] leading-relaxed text-ink-3">{description}</div>}
      {action && <div className="mt-4 flex gap-2">{action}</div>}
    </div>
  );
}

const CALLOUT = {
  info: { cls: "border-s1/25 bg-s1/[0.06]", icon: <Info className="text-s1" /> },
  warn: { cls: "border-warning/30 bg-warning/[0.06]", icon: <AlertTriangle className="text-warning" /> },
  danger: { cls: "border-critical/30 bg-critical/[0.06]", icon: <OctagonAlert className="text-critical" /> },
  success: { cls: "border-good/30 bg-good/[0.06]", icon: <CheckCircle2 className="text-good" /> },
};

export function Callout({ tone = "info", title, children, action, className }: { tone?: keyof typeof CALLOUT; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  const c = CALLOUT[tone];
  return (
    <div className={cn("flex gap-3 rounded-[8px] border px-3.5 py-3 text-[12.5px]", c.cls, className)}>
      <span className="mt-px shrink-0 [&_svg]:size-4">{c.icon}</span>
      <div className="min-w-0 flex-1">
        {title && <div className="font-medium text-ink">{title}</div>}
        {children && <div className={cn("leading-relaxed text-ink-2", !!title && "mt-0.5")}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

export function KeyValue({ items, className }: { items: { k: ReactNode; v: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-line", className)}>
      {items.map((it, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
          <dt className="shrink-0 text-[12px] text-ink-3">{it.k}</dt>
          <dd className="min-w-0 text-right text-[12.5px] text-ink">{it.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4", className)} />;
}

export function Avatar({ name, size = 24, className, square }: { name: string; size?: number; className?: string; square?: boolean }) {
  const initials = name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  const hue = [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);
  return (
    <span className={cn("inline-grid shrink-0 place-items-center font-semibold text-white", square ? "rounded-[6px]" : "rounded-full", className)} style={{ width: size, height: size, fontSize: size * 0.4, background: `oklch(0.52 0.12 ${hue})` }}>
      {initials}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="num inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-line-strong bg-surface-2 px-1 text-[10.5px] text-ink-3">{children}</kbd>;
}

export function ExternalLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cn("text-s1 underline-offset-2 hover:underline", className)}>
      {children}
      <span aria-hidden> ↗</span>
    </a>
  );
}

export function shortHash(h?: string | null, n = 6): string {
  if (!h) return "—";
  return h.length > 2 * n + 2 ? `${h.slice(0, n + 2)}…${h.slice(-n)}` : h;
}
