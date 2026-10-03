"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Btn, cx } from "./ui";

type Result = { ok: boolean; error?: string; message?: string; log?: { agent: string; message: string }[] };

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

export function AgentLog({ log, className }: { log: { agent: string; message: string }[]; className?: string }) {
  if (!log.length) return null;
  return (
    <div className={cx("num max-h-80 overflow-y-auto rounded border border-line bg-bg px-2.5 py-2 text-[11.5px] leading-relaxed", className)}>
      {log.map((l, i) => (
        <div key={i} className="flex gap-2">
          <span className={cx("w-20 shrink-0 text-right uppercase", AGENT_COLOR[l.agent] ?? "text-ink-3")}>{l.agent}</span>
          <span className="text-ink-2">{l.message}</span>
        </div>
      ))}
    </div>
  );
}

/** Runs a server action, shows its agent log and refreshes the page data. */
export function ActionButton({ action, label, pending = "Working…", variant = "default", showLog = true, confirm }: { action: () => Promise<Result>; label: string; pending?: string; variant?: "default" | "primary" | "danger" | "ghost"; showLog?: boolean; confirm?: string }) {
  const [isPending, start] = useTransition();
  const [res, setRes] = useState<Result | null>(null);
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Btn
          variant={variant}
          disabled={isPending}
          onClick={() => {
            if (confirm && !window.confirm(confirm)) return;
            start(async () => {
              const r = await action();
              setRes(r);
              router.refresh();
            });
          }}
        >
          {isPending ? pending : label}
        </Btn>
        {res && !res.ok && <span className="text-[11.5px] text-critical">{res.error}</span>}
        {res?.ok && res.message && <span className="text-[11.5px] text-ink-3">{res.message}</span>}
      </div>
      {showLog && res?.log && <AgentLog log={res.log} />}
    </div>
  );
}
