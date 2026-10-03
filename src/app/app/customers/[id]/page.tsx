import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { requireProject } from "@/server/auth/current";
import { schema as s } from "@/server/db/client";
import { PageHeader, Panel, ScoreBar, Confidence, EvidenceItem, ModeBadge, Badge, KV, LinkBtn } from "@/components/ui";
import { ActionButton } from "@/components/features/agent/action-button";
import { purchaseIntelAction } from "@/server/actions";
import { COMPANY_WEIGHTS, type ScoreComponent } from "@/server/domain/scoring/intent";
import { COMMIT_THRESHOLD } from "@/server/domain/agent/information-value";

const LABEL: Record<string, string> = { productFit: "Product fit", timing: "Timing", buyingIntent: "Buying intent", evidenceQuality: "Evidence quality", engagementOpportunity: "Engagement opportunity" };

export default async function Company({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project, db } = await requireProject();
  const [c] = await db.select().from(s.companies).where(and(eq(s.companies.id, id), eq(s.companies.projectId, project.id)));
  if (!c) notFound();
  const ev = await db.select().from(s.evidence).where(eq(s.evidence.companyId, c.id)).orderBy(desc(s.evidence.observedAt));
  const [opp] = await db.select().from(s.opportunities).where(and(eq(s.opportunities.projectId, project.id), eq(s.opportunities.subjectKey, `company:${c.id}`)));
  const scores = c.scores as Record<string, ScoreComponent>;
  const purchases = ev.filter((e) => e.classifiedBy === "x402");
  return (
    <div>
      <PageHeader
        crumbs={[{ label: "Customers", href: "/app/customers" }]}
        title={
          <span className="flex items-center gap-2">
            {c.name} <ModeBadge mode={c.dataMode} /> <Badge tone={c.status === "qualified" ? "good" : "neutral"}>{c.status}</Badge>
          </span>
        }
        sub={c.whyFit ?? undefined}
        right={opp ? <LinkBtn href={`/app/opportunities/${opp.id}`}>Opportunity #{opp.number} →</LinkBtn> : null}
      />
      <div className="grid gap-3 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          <Panel title="Why now">
            <ul className="space-y-1.5 text-[12.5px] text-ink-2">
              {c.whyNow.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          </Panel>
          <Panel title={`Evidence (${ev.length})`} right={purchases.length ? <Badge tone="info">{purchases.length} verified via x402</Badge> : null}>
            <ul className="space-y-2">
              {ev.map((e) => (
                <EvidenceItem key={e.id} e={e} />
              ))}
            </ul>
          </Panel>
          <Panel title="Recommended action">
            <p className="text-[13px] text-ink">{c.recommendedAction}</p>
            <p className="mt-2 text-[11.5px] text-ink-3">GrowthOS prepares the approach; a human decides whether and how to contact them. No automated emails, DMs, mentions or comments — ever.</p>
          </Panel>
        </div>
        <div className="space-y-3">
          <Panel title="Opportunity score" right={<span className="num text-[18px] text-ink">{c.overallScore}</span>}>
            <div className="space-y-3">
              {Object.entries(COMPANY_WEIGHTS).map(([k, w]) => {
                const sc = scores[k];
                if (!sc) return null;
                return (
                  <div key={k}>
                    <ScoreBar label={`${LABEL[k]} ×${w}`} value={sc.score} />
                    <ul className="ml-0.5 mt-1 space-y-0.5 text-[11px] text-ink-3">
                      {sc.reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 border-t border-line pt-2 text-[11px] text-ink-3">Overall = Σ component × weight. Deterministic — the LLM never sets a score.</p>
          </Panel>
          <Panel title="Verify before spending">
            <KV k="Confidence" v={<Confidence value={c.confidence} />} />
            <KV k="Commit threshold" v={<span className="num">{Math.round(COMMIT_THRESHOLD * 100)}%</span>} />
            <KV k="Signals purchased" v={<span className="num">{purchases.length}</span>} />
            <div className="mt-3">
              <ActionButton action={purchaseIntelAction.bind(null, c.id)} label="Should GrowthOS buy more data?" pending="Evaluating & buying…" />
            </div>
            <p className="mt-2 text-[11px] text-ink-3">Runs the real decision: find an x402 service, quote it, compute expected value of information, apply policy, pay via Circle Gateway if it is worth it.</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
