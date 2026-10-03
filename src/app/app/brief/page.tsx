import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireProject } from "@/server/auth/current";
import { schema as s } from "@/server/db/client";
import { buildDailyBrief } from "@/server/domain/growth/brief";
import { fmtUsdc } from "@/lib/money";
import { PageHeader, Panel, Stat, Velocity, ModeBadge } from "@/components/ui";
import { ActionButton } from "@/components/features/agent/action-button";
import { rebuildDailyBriefAction } from "@/server/actions";

type Brief = Awaited<ReturnType<typeof buildDailyBrief>>;

export default async function DailyBrief() {
  const { project, db } = await requireProject();
  const [row] = await db.select().from(s.dailyBriefs).where(eq(s.dailyBriefs.projectId, project.id)).orderBy(desc(s.dailyBriefs.date)).limit(1);
  const b: Brief = row ? (row.content as unknown as Brief) : await buildDailyBrief(db, project.id);
  const date = new Date(b.date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toUpperCase();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={<span className="flex items-center gap-2">GROWTHOS — {date} <ModeBadge mode={project.dataMode} /></span>}
        sub="Assembled from the database, not written by a model — every number is a count of real rows."
        right={<ActionButton action={rebuildDailyBriefAction} label="Rebuild" showLog={false} />}
      />
      <Panel title="What changed (24h)">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Stat label="New conversations" value={b.whatChanged.newConversations} />
          <Stat label="High-intent cos." value={b.whatChanged.highIntentCompanies} />
          <Stat label="Emerging narr." value={b.whatChanged.emergingNarratives} />
          <Stat label="KOL opps" value={b.whatChanged.kolOpportunities} />
          <Stat label="Product issues" value={b.whatChanged.productIssues} tone={b.whatChanged.productIssues ? "warn" : undefined} />
        </div>
      </Panel>
      {b.topOpportunity && (
        <Panel title="Top opportunity" className="mt-3">
          <Link href={`/app/opportunities/${b.topOpportunity.id}`} className="text-[15px] font-semibold hover:underline">
            #{b.topOpportunity.number} {b.topOpportunity.title}
          </Link>
          <div className="label mt-3">Why it matters</div>
          <ul className="mt-1 space-y-0.5 text-[12.5px] text-ink-2">{b.topOpportunity.whyNow.slice(0, 4).map((w) => <li key={w}>• {w}</li>)}</ul>
          <div className="label mt-3">Recommended action</div>
          <p className="mt-1 text-[12.5px]">{b.topOpportunity.recommendedAction}</p>
        </Panel>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Panel title="Narratives moving">
          {b.narratives.length ? b.narratives.map((n) => (
            <div key={n.label} className="flex justify-between py-1 text-[12.5px]">
              <span>{n.label} <span className="text-ink-3">{n.status.toLowerCase()}</span></span>
              <Velocity pct={n.velocityPct} />
            </div>
          )) : <div className="text-[12px] text-ink-3">Nothing emerging.</div>}
        </Panel>
        <Panel title="Budget">
          {b.budget ? (
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Total" value={fmtUsdc(b.budget.totalMicro, { unit: false })} />
              <Stat label="Spent" value={fmtUsdc(b.budget.spentMicro, { unit: false })} />
              <Stat label="Remaining" value={fmtUsdc(b.budget.remainingMicro, { unit: false })} />
            </div>
          ) : <div className="text-[12px] text-ink-3">No mission.</div>}
        </Panel>
      </div>
      <Panel title="Experiments (24h)" className="mt-3">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Succeeded / scaling" value={b.experiments.succeeded} tone="good" />
          <Stat label="Failed / stopped" value={b.experiments.failed} tone={b.experiments.failed ? "bad" : undefined} />
          <Stat label="Running" value={b.experiments.running} />
        </div>
      </Panel>
      <Panel title="Today" className="mt-3">
        <p className="text-[14px] text-ink">{b.recommendation}</p>
      </Panel>
    </div>
  );
}
