import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/** Dense data table. Cells pad 12px; header is sticky inside scroll containers. */
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left text-[12.5px] [&_td]:border-b [&_td]:border-line [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-middle [&_th]:sticky [&_th]:top-0 [&_th]:z-[1] [&_th]:border-b [&_th]:border-line [&_th]:bg-surface [&_th]:px-3 [&_th]:py-2 [&_th]:text-[11px] [&_th]:font-medium [&_th]:text-ink-3 [&_tr:last-child_td]:border-b-0 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-surface-2/60 first:[&_td]:pl-4 first:[&_th]:pl-4 last:[&_td]:pr-4 last:[&_th]:pr-4">
        {children}
      </table>
    </div>
  );
}
