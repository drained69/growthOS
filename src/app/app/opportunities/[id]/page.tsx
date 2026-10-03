import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, or } from "drizzle-orm";
import { requireProject } from "@/server/auth/current";
import { schema as s } from "@/server/db/client";
import { PageHeader, Panel, ModeBadge, Badge, Confidence, EvidenceItem, KV, ScoreBar } from "@/components/ui";
import { ActionButton } from "@/components/features/agent/action-button";
import { createExperimentAction, dismissOpportunityAction, purchaseIntelAction } from "@/server/actions";
import { fmtUsdc } from "@/lib/money";
import { COMMIT_THRESHOLD } from "@/server/domain/agent/information-value";

export default async function Opportunity({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project, db } = await requireProject();
  const [o] = await db.select().from(s.opportunities).where(and(eq(s.opportunities.id, id), eq(s.opportunities.projectId, project.id)));
  if (!o) notFound();
  const conds = [o.companyId ? eq(s.evidence.companyId, o.companyId) : undefined, o.kolId ? eq(s.evidence.kolId, o.kolId) : undefined, o.narrativeId ? eq(s.evidence.narrativeId, o.narrativeId) : undefined].filter(Boolean);
  const ev = conds.length ? await db.select().from(s.evidence).where(or(...conds)).orderBy(desc(s.evidence.observedAt)).limit(12) : [];
  const exps = await db.select().from(s.experiments).where(eq(s.experiments.opportunityId, o.id));
  const subjectHref = o.companyId ? `/app/customers/${o.companyId}` : o.kolId ? `/app/kols/${o.kolId}` : o.narrativeId ? `/app/narratives/${o.narrativeId}` : null;
  const scores = o.scores as Record<string, { score: number; reasons: string[] }>;
  return (
    <div>
      <PageHeader
        crumbs={[{ label: "Opportunities", href: "/app/opportunities" }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="num text-ink-3">#{o.number}</span> {o.title} <ModeBadge mode={o.dataMode} />
          </span>
        }
        right={subjectHref ? <Link href={subjectHref} className="text-[12px] text-s1 hover:underline">subject →</Link> : null}
      />
      <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <Panel title="Why now">
            <ul className="space-y-1.5 text-[12.5px] text-ink-2">{o.whyNow.map((w) => <li key={w}>• {w}</li>)}</ul>
          </Panel>
          <Panel title="Recommended experiment">
            <p className="text-[13px]">{o.recommendedAction}</p>
          </Panel>
          <Panel title="Evidence">
            {ev.length ? <ul className="space-y-2">{ev.map((e) => <EvidenceItem key={e.id} e={e} />)}</ul> : <div className="text-[12px] text-ink-3">Evidence is on the subject page.</div>}
          </Panel>
        </div>
        <div className="space-y-3">
          <Panel title="Decision inputs">
            <KV k="Type" v={<Badge>{o.type}{o.secondaryType ? ` + ${o.secondaryType}` : ""}</Badge>} />
            <KV k="Confidence" v={<Confidence value={o.confidence} />} />
            <KV k="Expected value" v={o.expectedValue} />
            <KV k="Estimated cost" v={<span className="num">{fmtUsdc(o.estimatedCostMicro)}</span>} />
            <KV k="Score" v={<span className="num">{o.overallScore}</span>} />
            <KV k="Status" v={<Badge>{o.status}</Badge>} />
          </Panel>
          {Object.keys(scores).length > 0 && (
            <Panel title="Components">
              <div className="space-y-1.5">
                {Object.entries(scores).filter(([, v]) => v && typeof v.score === "number").map(([k, v]) => <ScoreBar key={k} label={k.replace(/([A-Z])/g, " $1").toLowerCase()} value={v.score} />)}
              </div>
            </Panel>
          )}
          <Panel title="Act">
            <div className="space-y-2">
              {o.type === "PRODUCT_ISSUE" ? (
                <p className="text-[12px] text-ink-2">Routed to the product team. GrowthOS will not buy traffic into a growing friction point.</p>
              ) : o.confidence < COMMIT_THRESHOLD && o.companyId ? (
                <>
                  <p className="text-[12px] text-ink-3">Below the {Math.round(COMMIT_THRESHOLD * 100)}% commit threshold — verify first.</p>
                  <ActionButton action={purchaseIntelAction.bind(null, o.companyId)} label="Evaluate data purchase" />
                </>
              ) : null}
              {o.type !== "PRODUCT_ISSUE" && o.status === "open" && <ActionButton action={createExperimentAction.bind(null, o.id)} label="Create experiment" variant="primary" />}
              {exps.map((x) => (
                <Link key={x.id} href={`/app/experiments/${x.id}`} className="block text-[12px] text-s1 hover:underline">
                  Experiment #{x.number} — {x.status} →
                </Link>
              ))}
              {o.status === "open" && <ActionButton action={dismissOpportunityAction.bind(null, o.id)} label="Dismiss" variant="ghost" showLog={false} />}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
