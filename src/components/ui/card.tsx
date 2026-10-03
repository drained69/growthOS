import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

export function Card({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("min-w-0 rounded-[10px] border border-line bg-surface", className)}>
      {children}
    </section>
  );
}

export function CardHeader({ title, description, action, icon, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex items-start justify-between gap-3 border-b border-line px-4 py-3", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <span className="mt-0.5 text-ink-3 [&_svg]:size-4">{icon}</span>}
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-[12px] leading-snug text-ink-3">{description}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <footer className={cn("flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[12px] text-ink-3", className)}>{children}</footer>;
}
