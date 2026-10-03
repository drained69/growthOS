import { cn } from "@/components/ui/cn";

const AGENT_COLOR: Record<string, string> = {
  discovery: "text-s1",
  narrative: "text-s7",
  kol: "text-s3",
  strategist: "text-s5",
  operator: "text-ink",
  policy: "text-warning",
  budget: "text-s4",
  attribution: "text-s3",
};

/** Terminal-style agent trace. */
export function AgentLog({ log, className }: { log: { agent: string; message: string }[]; className?: string }) {
  if (!log.length) return <div className="text-[12.5px] text-ink-3">No steps recorded.</div>;
  return (
    <ol className={cn("num max-h-[420px] space-y-0.5 overflow-y-auto rounded-[8px] border border-line bg-bg px-3 py-2.5 text-[11.5px] leading-relaxed", className)}>
      {log.map((l, i) => (
        <li key={i} className="grid grid-cols-[88px_1fr] gap-2">
          <span className={cn("truncate text-right uppercase tracking-wide", AGENT_COLOR[l.agent] ?? "text-ink-3")}>{l.agent}</span>
          <span className="text-ink-2">{l.message}</span>
        </li>
      ))}
    </ol>
  );
}
