import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/components/ui/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "xs" | "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-accent-strong border border-accent-strong",
  secondary: "bg-surface-2 text-ink border border-line-strong hover:bg-surface-3 hover:border-ink-4",
  outline: "bg-transparent text-ink border border-line-strong hover:bg-surface-2",
  ghost: "bg-transparent text-ink-2 border border-transparent hover:bg-surface-2 hover:text-ink",
  danger: "bg-transparent text-critical border border-critical/40 hover:bg-critical/10",
};
const SIZE: Record<Size, string> = {
  xs: "h-6 px-2 text-[11.5px] gap-1 rounded-[5px]",
  sm: "h-7 px-2.5 text-[12px] gap-1.5 rounded-[6px]",
  md: "h-8 px-3 text-[12.5px] gap-1.5 rounded-[6px]",
  lg: "h-10 px-4 text-[13.5px] gap-2 rounded-[7px]",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "sm", className?: string) {
  return cn("inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0", VARIANT[variant], SIZE[size], className);
}

export function Button({ variant, size, loading, icon, children, className, ...rest }: ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode }) {
  return (
    <button {...rest} disabled={rest.disabled || loading} className={buttonClass(variant, size, className)}>
      {loading ? <Loader2 className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function LinkButton({ href, variant, size, icon, children, className, external }: { href: string; variant?: Variant; size?: Size; icon?: ReactNode; children?: ReactNode; className?: string; external?: boolean }) {
  if (external)
    return (
      <a href={href} target="_blank" rel="noreferrer" className={buttonClass(variant, size, className)}>
        {icon}
        {children}
      </a>
    );
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
    </Link>
  );
}
