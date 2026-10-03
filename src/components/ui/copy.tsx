"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/components/ui/cn";

export function CopyButton({ value, className, label }: { value: string; className?: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={label ?? "Copy"}
      onClick={async () => {
        await navigator.clipboard?.writeText(value).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
      className={cn("inline-flex items-center gap-1 text-ink-3 hover:text-ink [&_svg]:size-3.5", className)}
    >
      {done ? <Check className="text-good" /> : <Copy />}
      {label && <span className="text-[11.5px]">{done ? "Copied" : label}</span>}
    </button>
  );
}

export function CopyField({ value, mono = true, className, masked }: { value: string; mono?: boolean; className?: string; masked?: boolean }) {
  const [show, setShow] = useState(!masked);
  return (
    <div className={cn("flex min-w-0 items-center gap-2 rounded-[6px] border border-line-strong bg-bg py-1.5 pl-2.5 pr-2", className)}>
      <code className={cn("min-w-0 flex-1 truncate text-[12px] text-ink-2", mono && "num")}>{show ? value : "•".repeat(Math.min(40, value.length))}</code>
      {masked && (
        <button type="button" onClick={() => setShow((s) => !s)} className="text-[11.5px] text-ink-3 hover:text-ink">
          {show ? "Hide" : "Reveal"}
        </button>
      )}
      <CopyButton value={value} />
    </div>
  );
}
