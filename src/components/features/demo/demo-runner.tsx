"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runDemoStepAction, resetDemoAction } from "@/server/actions";
import { AgentLog } from "@/components/features/agent/action-button";
import { Btn, cx } from "@/components/ui";

type Step = { step: number; title: string; detail: string };
type Res = { log: { agent: string; message: string }[]; links: { label: string; href: string }[]; error?: string };

export function DemoRunner({ steps }: { steps: readonly Step[] }) {
  const [results, setResults] = useState<Record<number, Res>>({});
  const [running, setRunning] = useState<number | null>(null);
  const [, start] = useTransition();
  const router = useRouter();
  const next = steps.find((s) => !results[s.step] || results[s.step].error)?.step ?? null;

  async function run(step: number) {
    setRunning(step);
    const r = await runDemoStepAction(step);
    setResults((prev) => ({ ...prev, [step]: r.ok ? { log: r.data!.log, links: r.data!.links } : { log: [], links: [], error: r.error } }));
    setRunning(null);
    start(() => router.refresh());
    return r.ok;
  }

  async function runAll() {
    for (const s of steps) {
      if (results[s.step] && !results[s.step].error) continue;
      if (!(await run(s.step))) break;
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Btn variant="primary" disabled={running !== null} onClick={runAll}>
          {running !== null ? `Running step ${running}…` : next === null ? "Done ✓" : next === 1 ? "Run the whole loop" : `Continue from step ${next}`}
        </Btn>
        <Btn
          variant="ghost"
          disabled={running !== null}
          onClick={async () => {
            if (!window.confirm("Reset the demo project to its seeded state?")) return;
            await resetDemoAction();
            setResults({});
            router.refresh();
          }}
        >
          Reset demo
        </Btn>
      </div>
      <ol className="space-y-2">
        {steps.map((s) => {
          const r = results[s.step];
          const state = running === s.step ? "running" : r?.error ? "error" : r ? "done" : "todo";
          return (
            <li key={s.step} className={cx("rounded-md border bg-surface px-3.5 py-3", state === "done" ? "border-good/30" : state === "error" ? "border-critical/40" : state === "running" ? "border-s1/60" : "border-line")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cx("num grid h-5 w-5 place-items-center rounded-full text-[10.5px]", state === "done" ? "bg-good/20 text-good" : state === "running" ? "bg-s1/20 text-s1" : "bg-surface-3 text-ink-3")}>{state === "done" ? "✓" : s.step}</span>
                    <span className="text-[13.5px] font-medium">{s.title}</span>
                  </div>
                  <p className="ml-7 mt-0.5 text-[12px] text-ink-3">{s.detail}</p>
                </div>
                <Btn disabled={running !== null} onClick={() => run(s.step)}>
                  {state === "running" ? "Running…" : state === "done" ? "Re-run" : "Run"}
                </Btn>
              </div>
              {r?.error && <div className="ml-7 mt-2 text-[12px] text-critical">{r.error}</div>}
              {r && r.log.length > 0 && <AgentLog log={r.log} className="ml-7 mt-2" />}
              {r && r.links.length > 0 && (
                <div className="ml-7 mt-2 flex flex-wrap gap-3">
                  {r.links.map((l) => (
                    <Link key={l.href} href={l.href} className="text-[12px] text-s1 hover:underline">
                      {l.label} →
                    </Link>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
