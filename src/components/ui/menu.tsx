"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/** Minimal accessible dropdown: click to open, Escape/click-outside to close. */
export function Menu({ trigger, children, align = "end", className, width = 220 }: { trigger: (open: boolean) => ReactNode; children: ReactNode | ((close: () => void) => ReactNode); align?: "start" | "end"; className?: string; width?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const close = () => setOpen(false);
  return (
    <div ref={ref} className={cn("relative", className)}>
      <div onClick={() => setOpen((o) => !o)}>{trigger(open)}</div>
      {open && (
        <div role="menu" style={{ width }} className={cn("absolute top-[calc(100%+6px)] z-50 animate-pop-in overflow-hidden rounded-[10px] border border-line-strong bg-surface-2 p-1 shadow-[var(--shadow-pop)]", align === "end" ? "right-0" : "left-0")}>
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ children, onClick, href, icon, danger, disabled, hint }: { children: ReactNode; onClick?: () => void; href?: string; icon?: ReactNode; danger?: boolean; disabled?: boolean; hint?: ReactNode }) {
  const cls = cn("flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[12.5px] disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0", danger ? "text-critical hover:bg-critical/10" : "text-ink-2 hover:bg-surface-3 hover:text-ink");
  const body = (
    <>
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint && <span className="text-[11px] text-ink-4">{hint}</span>}
    </>
  );
  if (href)
    return (
      <Link role="menuitem" href={href} onClick={onClick} className={cls}>
        {body}
      </Link>
    );
  return (
    <button role="menuitem" disabled={disabled} onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-2 pb-1 pt-1.5 text-[11px] font-medium text-ink-4">{children}</div>;
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-line" />;
}
