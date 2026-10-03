import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { requireProject } from "@/server/auth/current";
import { schema as s } from "@/server/db/client";
import { PageHeader, Panel, ScoreBar, EvidenceItem, ModeBadge, KV, LinkBtn, Badge } from "@/components/ui";
import type { ScoreComponent } from "@/server/domain/scoring/intent";
import { KOL_WEIGHTS } from "@/server/domain/scoring/kol";
import { estimateKolCostMicro } from "@/server/domain/intel/analyze";
import { fmtUsdc } from "@/lib/money";

const LABEL: Record<string, string> = { audienceFit: "Audience fit", topicAuthority: "Topic authority", recentRelevance: "Recent relevance", engagementQuality: "Engagement quality", narrativeFit: "Narrative fit", historicalProductFit: "Historical product fit", authenticity: "Authenticity signals", campaignFit: "Estimated campaign fit" };

export default async function Kol({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project, db } = await requireProject();
  const [k] = await db.select().from(s.kols).where(and(eq(s.kols.id, id), eq(s.kols.projectId, project.id)));
  if (!k) notFound();
  const m = k.metrics as Record<string, ScoreComponent>;
  const ev = await db.select().from(s.evidence).where(eq(s.evidence.kolId, k.id)).orderBy(desc(s.evidence.observedAt));
  const camps = await db.select({ c: s.campaigns, x: s.experiments }).from(s.campaigns).innerJoin(s.experiments, eq(s.campaigns.experimentId, s.experiments.id)).where(eq(s.campaigns.kolId, k.id));
  const [opp] = await db.select().from(s.opportunities).where(and(eq(s.opportunities.projectId, project.id), eq(s.opportunities.subjectKey, `kol:${k.id}`)));
  return (
    <div>
      <PageHeader
        crumbs={[{ label: "KOLs", href: "/app/kols" }]}
        title={
          <span className="flex items-center gap-2">
            @{k.handle} <span className="text-[13px] font-normal text-ink-3">{k.provider}</span> <ModeBadge mode={k.dataMode} />
          </span>
        }
        sub={k.recommendedAngle ? `Recommended angle: ${k.recommendedAngle}` : undefined}
        right={
          <>
            {opp && <LinkBtn href={`/app/opportunities/${opp.id}`}>Opportunity #{opp.number}</LinkBtn>}
            <LinkBtn href={`/app/kols/${k.id}/brief${camps[0] ? `?experiment=${camps.at(-1)!.x.id}` : ""}`} variant="primary">
              Creator brief →
            </LinkBtn>
          </>
        }
      />
      <div className="grid gap-3 lg:grid-cols-[1fr_400px]">
        <div className="space-y-3">
          <Panel title="Why now">
            <ul className="space-y-1.5 text-[12.5px] text-ink-2">
              {k.whyNow.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          </Panel>
          <Panel title="Evidence">
            <ul className="space-y-2">
              {ev.map((e) => (
                <EvidenceItem key={e.id} e={e} />
              ))}
            </ul>
          </Panel>
          {camps.length > 0 && (
            <Panel title="Campaign history">
              {camps.map(({ c, x }) => (
                <KV key={c.id} k={<a href={`/app/experiments/${x.id}`} className="hover:underline">EXP #{x.number} — {x.title}</a>} v={<Badge>{x.status}</Badge>} />
              ))}
            </Panel>
          )}
        </div>
        <div className="space-y-3">
          <Panel title="KOL score" right={<span className="num text-[18px] text-ink">{k.overallScore}</span>}>
            <div className="space-y-3">
              {Object.keys(LABEL).map((key) => {
                const sc = m[key];
                if (!sc) return null;
                const w = (KOL_WEIGHTS as Record<string, number>)[key];
                return (
                  <div key={key}>
                    <ScoreBar label={`${LABEL[key]}${w ? ` ×${w}` : ""}`} value={sc.score} />
                    <ul className="mt-1 space-y-0.5 text-[11px] text-ink-3">
                      {sc.reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel title="Profile">
            <KV k="Followers" v={<span className="num">{k.followers?.toLocaleString() ?? "unknown"}</span>} />
            <KV k="Estimated campaign cost" v={<span className="num">{fmtUsdc(estimateKolCostMicro(k.followers))} (estimate)</span>} />
            <KV k="Payout address" v={<span className="num text-[11px]">{k.payoutAddress ?? "not set — founder provides"}</span>} />
            {k.url && <KV k="Profile" v={<a href={k.url} className="text-s1 hover:underline">{k.url.startsWith("http") ? "open ↗" : "demo source"}</a>} />}
          </Panel>
        </div>
      </div>
    </div>
  );
}
