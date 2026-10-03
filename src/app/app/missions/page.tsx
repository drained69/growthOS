import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireProject } from "@/lib/auth/current";
import { schema as s } from "@/lib/db/client";
import { missionSummary, CATEGORY_LABEL } from "@/lib/views";
import { fmtUsdc } from "@/lib/util/money";
import { PageHeader, Panel, Stat, ModeBadge, Badge, Table, Empty } from "@/components/ui";
import { GoalProgress, StackedBar } from "@/components/charts";
import { ActionButton } from "@/components/action-button";
import { runLearningAction } from "@/app/actions";
import { EVENT_LABEL, type ConversionEventType } from "@/lib/growth/attribution-links";

export default async function Missions() {
  const { project, db } = await requireProject();
  const missions = await db.select().from(s.missions).where(eq(s.missions.projectId, project.id)).orderBy(desc(s.missions.createdAt));
  const learnings = await db.select().from(s.learnings).where(eq(s.learnings.projectId, project.id)).orderBy(desc(s.learnings.createdAt)).limit(5);
  if (!missions.length) return <Empty title="No missions yet">Create one from onboarding.</Empty>;
  return (
    <div>
      <PageHeader title="Missions" sub="A mission is a goal, a timeframe and a budget. Results are counted from conversion events, never estimated." right={<Link href="/onboarding?step=3" className="text-[12px] text-s1 hover:underline">+ New mission</Link>} />
      {await Promise.all(
        missions.map(async (m) => {
          const sum = await missionSummary(db, m);
          return (
            <Panel key={m.id} className="mb-3" title={<span className="flex items-center gap-2">{m.name} <Badge tone={m.status === "active" ? "good" : "neutral"}>{m.status}</Badge> <ModeBadge mode={m.dataMode} /></span>} right={<span className="num">{m.startsAt.toISOString().slice(0, 10)} → {m.endsAt.toISOString().slice(0, 10)}</span>}>
              <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
                <div>
                  <div className="label">Mission result</div>
                  <div className="mt-2 grid grid-cols-3 gap-4 sm:grid-cols-4">
                    <Stat label="Goal" value={m.goalTarget} sub={EVENT_LABEL[m.goalEvent as ConversionEventType] ?? m.goalEvent} />
                    <Stat label="Achieved" value={sum.achieved} sub={`${sum.attributed} attributed`} />
                    <Stat label="Budget" value={fmtUsdc(m.budgetMicro, { unit: false })} sub="USDC" />
                    <Stat label="Spent" value={fmtUsdc(sum.spent, { unit: false })} sub="settled + in flight" />
                    <Stat label="Cost / qualified" value={sum.costPerQualified ? fmtUsdc(sum.costPerQualified, { unit: false }) : "—"} sub="USDC" />
                    <Stat label="Experiments" value={sum.experiments} />
                    <Stat label="Successful" value={sum.successful} />
                    <Stat label="Growth efficiency" value={`${sum.efficiency}/100`} />
                  </div>
                  <div className="mt-4">
                    <GoalProgress achieved={sum.achieved} goal={m.goalTarget} pace={m.status === "active" ? sum.pace : undefined} />
                  </div>
                  <p className="mt-2 text-[11px] text-ink-3">Growth efficiency = 50% goal attainment + 30% cost efficiency vs plan + 20% experiment hit-rate.</p>
                </div>
                <div>
                  <div className="label mb-2">Allocation by category</div>
                  <StackedBar total={m.budgetMicro} parts={sum.allocation.map((a) => ({ key: a.category, label: CATEGORY_LABEL[a.category] ?? a.category, value: a.allocated, display: fmtUsdc(a.allocated, { unit: false }) }))} />
                  <Table>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th className="text-right">Allocated</th>
                        <th className="text-right">Used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sum.allocation.map((a) => (
                        <tr key={a.category}>
                          <td>{CATEGORY_LABEL[a.category] ?? a.category}</td>
                          <td className="num text-right">{fmtUsdc(a.allocated)}</td>
                          <td className="num text-right text-ink-2">{fmtUsdc(a.used)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            </Panel>
          );
        }),
      )}
      <Panel title="Learning & reallocation" right={<ActionButton action={runLearningAction} label="Run learning now" showLog={false} />}>
        {learnings.length ? (
          <ul className="space-y-3">
            {learnings.map((l) => (
              <li key={l.id} className="rounded border border-line p-2.5">
                <div className="flex items-center gap-2 text-[11px] text-ink-3">
                  <span className="num">{l.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
                  <ModeBadge mode={l.dataMode} />
                  {l.decisionId && <Link href={`/app/receipts/${l.decisionId}`} className="text-s1 hover:underline">receipt →</Link>}
                </div>
                <ul className="mt-1.5 space-y-0.5 text-[12px] text-ink-2">
                  {(l.findings as { label: string; verdict: string; reason: string }[]).map((f) => (
                    <li key={f.label}>
                      <Badge tone={f.verdict === "SCALE" ? "good" : f.verdict === "STOP" || f.verdict === "REDUCE" ? "bad" : "neutral"}>{f.verdict}</Badge> {f.label} — {f.reason}
                    </li>
                  ))}
                </ul>
                {(l.reallocations as { amountMicro: number; reason: string }[]).map((r, i) => (
                  <div key={i} className="mt-1.5 text-[12px] text-ink">
                    ↳ moved <span className="num">{fmtUsdc(r.amountMicro)}</span>: {r.reason}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-[12px] text-ink-3">No learning runs yet.</div>
        )}
      </Panel>
    </div>
  );
}
