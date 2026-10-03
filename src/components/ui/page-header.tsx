import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export function PageHeader({ title, description, actions, crumbs, meta }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; crumbs?: { label: string; href: string }[]; meta?: ReactNode }) {
  return (
    <div className="mb-5">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-[12px] text-ink-3">
          {crumbs.map((c, i) => (
            <span key={c.href} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3 text-ink-4" />}
              <Link href={c.href} className="hover:text-ink">
                {c.label}
              </Link>
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-[20px] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink-3">{description}</p>}
          {meta && <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2.5 mt-7 flex items-center justify-between first:mt-0">
      <h2 className="text-[13px] font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}
