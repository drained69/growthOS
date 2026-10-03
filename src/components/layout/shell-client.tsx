"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runCycleAction, switchProjectAction } from "@/server/actions";
import { AgentLog } from "@/components/features/agent/action-button";
import { Btn } from "@/components/ui";

export function ProjectSwitcher({ projects, current }: { projects: { id: string; name: string; dataMode: string }[]; current: string }) {
  return (
    <select
      aria-label="Project"
      defaultValue={current}
      onChange={(e) => switchProjectAction(e.target.value)}
      className="h-7 max-w-48 rounded border border-line bg-surface-2 px-2 text-[12.5px] font-medium text-ink outline-none"
    >
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
          {p.dataMode === "DEMO" ? " (DEMO)" : ""}
        </option>
      ))}
    </select>
  );
}

export function CycleButton() {
  const [pending, start] = useTransition();
  const [log, setLog] = useState<{ agent: string; message: string }[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="relative">
      <Btn
        variant="primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setErr(null);
            const r = await runCycleAction();
            if (r.ok) setLog(r.log ?? []);
            else setErr(r.error);
            router.refresh();
          })
        }
      >
        {pending ? "Operator running…" : "Run agent cycle"}
      </Btn>
      {(log || err) && (
        <div className="absolute right-0 top-9 z-20 w-[min(640px,90vw)] rounded-md border border-line-strong bg-surface p-2 shadow-2xl">
          <div className="mb-1.5 flex items-center justify-between px-1">
            <span className="label">Operator cycle</span>
            <button className="text-[11px] text-ink-3 hover:text-ink" onClick={() => (setLog(null), setErr(null))}>
              close
            </button>
          </div>
          {err ? <div className="px-1 text-[12px] text-critical">{err}</div> : <AgentLog log={log ?? []} />}
        </div>
      )}
    </div>
  );
}
