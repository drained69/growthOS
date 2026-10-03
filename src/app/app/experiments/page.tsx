import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireProject } from "@/lib/auth/current";
import { schema as s } from "@/lib/db/client";
import { activeMission, missionSummary } from "@/lib/views";
import { fmtUsdc } from "@/lib/util/money";
import { PageHeader, Panel, Table, ModeBadge, Badge, Empty } from "@/components/ui";

export default async function Experiments() {
  const { project, db } = await requireProject();
  const exps = await db.select().from(s.experiments).where(eq(s.experiments.projectId, project.id)).orderBy(desc(s.experiments.number));
  const mission = await activeMission(db, project.id);
  const sum = mission ? await missionSummary(db, mission) : null;
  const perf = new Map(sum?.perf.map((p) => [p.experimentId, p]) ?? []);
  const finding = new Map(sum?.findings.map((f) => [f.experimentId, f]) ?? []);
  return (
    <div>
      <PageHeader title="Experiments" sub="Every dollar has a hypothesis, a success metric and a stop condition attached. Spend comes from the ledger; conversions from attribution." />
      <Panel pad={false}>
        {exps.length ? (
          <Table>
            <thead>
              <tr>
                <th>#</th>
                <th>Experiment</th>
                <th>Channel</th>
                <th className="text-right">Budget</th>
                <th className="text-right">Spent</th>
                <th className="text-right">Visits</th>
                <th className="text-right">Conv.</th>
                <th className="text-right">CPA</th>
                <th>Stop if</th>
                <th>Verdict</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {exps.map((x) => {
                const p = perf.get(x.id);
                const f = finding.get(x.id);
                return (
                  <tr key={x.id}>
                    <td className="num text-ink-3">{x.number}</td>
                    <td>
                      <Link href={`/app/experiments/${x.id}`} className="font-medium hover:underline">{x.title}</Link>
                      <div className="max-w-md truncate text-[11px] text-ink-3">{x.hypothesis}</div>
                    </td>
                    <td>{x.channel}</td>
                    <td className="num text-right">{fmtUsdc(x.budgetMicro, { unit: false })}</td>
                    <td className="num text-right">{p ? fmtUsdc(p.spentMicro, { unit: false }) : "—"}</td>
                    <td className="num text-right text-ink-2">{p?.visits ?? "—"}</td>
                    <td className="num text-right">{p?.conversions ?? "—"}</td>
                    <td className="num text-right">{f?.cpaMicro != null ? fmtUsdc(f.cpaMicro, { unit: false }) : "—"}</td>
                    <td className="num text-[11px] text-ink-3">CPA &gt; {fmtUsdc(x.stopMaxCpaMicro, { unit: false })} after {fmtUsdc(x.stopAfterSpendMicro, { unit: false })}</td>
                    <td>{f ? <Badge tone={f.verdict === "SCALE" ? "good" : f.verdict === "STOP" || f.verdict === "REDUCE" ? "bad" : "neutral"}>{f.verdict.replace("_", " ")}</Badge> : "—"}</td>
                    <td>
                      <span className="flex items-center gap-1.5">
                        <Badge>{x.status}</Badge>
                        <ModeBadge mode={x.dataMode} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <div className="p-4">
            <Empty title="No experiments yet">GrowthOS creates them once an opportunity crosses the confidence threshold.</Empty>
          </div>
        )}
      </Panel>
    </div>
  );
}
