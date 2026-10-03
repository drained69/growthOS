import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/components/ui/cn";

const FIELD = "w-full rounded-[6px] border border-line-strong bg-bg px-2.5 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-4 hover:border-ink-4 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60";

export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input {...p} className={cn(FIELD, "h-8", className)} />;
}

export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea {...p} className={cn(FIELD, "py-2 leading-relaxed", className)} />;
}

export function Select({ className, children, ...p }: ComponentProps<"select">) {
  return (
    <select {...p} className={cn(FIELD, "h-8 cursor-pointer pr-7", className)}>
      {children}
    </select>
  );
}

export function Field({ label, hint, error, children, className, htmlFor, required }: { label: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string; htmlFor?: string; required?: boolean }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[12px] font-medium text-ink-2">
        {label}
        {required && <span className="ml-0.5 text-critical">*</span>}
      </label>
      {children}
      {error ? <p className="text-[11.5px] text-critical">{error}</p> : hint ? <p className="text-[11.5px] leading-snug text-ink-3">{hint}</p> : null}
    </div>
  );
}

export function Checkbox({ label, className, ...p }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("inline-flex cursor-pointer select-none items-center gap-2 text-[12.5px] text-ink-2 hover:text-ink", className)}>
      <input type="checkbox" {...p} className="size-3.5 cursor-pointer rounded-[3px] accent-[var(--color-accent)]" />
      {label}
    </label>
  );
}
