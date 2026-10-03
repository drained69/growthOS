"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Play, RotateCcw, X } from "lucide-react";
import { runDemoStepAction, resetDemoAction } from "@/server/actions/demo";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { toast } from "@/components/ui/toast";
import { AgentLog } from "@/components/features/agent/agent-log";

type Step = { step: number; title: string; detail: string };
type Res = { log: { agent: string; message: string }[]; links: { label: string; href: string }[]; error?: string };

export function DemoRunner({ steps, canRun, canReset }: { steps: readonly Step[]; canRun: boolean; canReset: boolean }) {
  const [results, setResults] = useState<Record<number, Res>>({});
  const [running, setRunning] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();
  const next = steps.find((s) => !results[s.step] || results[s.step].error)?.step ?? null;
  const doneCount = steps.filter((s) => results[s.step] && !results[s.step].error).length;
  const busy = running !== null || resetting;

  async function run(step: number) {
    setRunning(step);
    const r = await runDemoStepAction(step);
    setResults((prev) => ({ ...prev, [step]: r.ok ? { log: r.data?.log ?? r.log ?? [], links: r.data?.links ?? [] } : { log: [], links: [], error: r.error } }));
    setRunning(null);
    if (!r.ok) toast.error(`Step ${step} failed`, r.error);
    start(() => router.refresh());
    return r.ok;
  }

  async function runAll() {
    for (const s of steps) {
      if (results[s.step] && !results[s.step].error) continue;
      if (!(await run(s.step))) return;
    }
    toast.success("Demo loop complete", "Every step ran through the real engine.");
  }

  async function reset() {
    if (!window.confirm("Reset the demo workspace to its seeded state?")) return;
    setResetting(true);
    const r = await resetDemoAction();
    setResetting(false);
    if (!r.ok) return toast.error("Couldn’t reset the demo", r.error);
    toast.success(r.message ?? "Demo reset");
    setResults({});
    router.refresh();
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="md" icon={next === null ? <Check /> : <Play />} loading={running !== null} disabled={!canRun || busy || next === null} onClick={runAll}>
          {running !== null ? `Running step ${running}…` : next === null ? "Loop complete" : next === 1 ? "Run the whole loop" : `Continue from step ${next}`}
        </Button>
        {canReset && (
          <Button variant="ghost" size="md" icon={<RotateCcw />} loading={resetting} disabled={busy} onClick={reset}>
            Reset demo
          </Button>
        )}
        <span className="num ml-auto text-[12px] text-ink-3">
          {doneCount}/{steps.length} steps
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-s1 transition-[width] duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      {!canRun && <p className="text-[12px] text-ink-3">Viewers can follow along, but running steps needs the operator role.</p>}

      <ol className="space-y-2">
        {steps.map((s) => {
          const r = results[s.step];
          const state = running === s.step ? "running" : r?.error ? "error" : r ? "done" : "todo";
          return (
            <li
              key={s.step}
              className={cn(
                "rounded-[10px] border bg-surface px-4 py-3 transition-colors",
                state === "done" ? "border-good/30" : state === "error" ? "border-critical/40" : state === "running" ? "border-s1/60" : s.step === next && !busy ? "border-line-strong" : "border-line",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      "num mt-px grid size-6 shrink-0 place-items-center rounded-full text-[11px] ring-1 [&_svg]:size-3.5",
                      state === "done" ? "bg-good/10 text-good ring-good/30" : state === "running" ? "bg-s1/10 text-s1 ring-s1/30" : state === "error" ? "bg-critical/10 text-critical ring-critical/30" : "bg-surface-2 text-ink-3 ring-line-strong",
                    )}
                  >
                    {state === "done" ? <Check /> : state === "running" ? <Loader2 className="animate-spin" /> : state === "error" ? <X /> : s.step}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium leading-snug text-ink">{s.title}</div>
                    <p className="mt-0.5 text-[12px] leading-snug text-ink-3">{s.detail}</p>
                  </div>
                </div>
                <Button size="xs" variant={state === "done" ? "ghost" : "secondary"} disabled={!canRun || busy} onClick={() => run(s.step)}>
                  {state === "running" ? "Running…" : state === "done" ? "Re-run" : state === "error" ? "Retry" : "Run"}
                </Button>
              </div>
              {(r?.error || (r && (r.log.length > 0 || r.links.length > 0))) && (
                <div className="ml-9 mt-2.5 space-y-2">
                  {r.error && <p className="text-[12px] text-critical">{r.error}</p>}
                  {r.log.length > 0 && <AgentLog log={r.log} />}
                  {r.links.length > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {r.links.map((l) => (
                        <Link key={l.href} href={l.href} className="inline-flex items-center gap-1 text-[12px] text-s1 hover:underline">
                          {l.label} <ArrowRight className="size-3" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
