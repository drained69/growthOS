import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { requireProject } from "@/server/auth/current";
import { schema as s } from "@/server/db/client";
import { experimentSpend } from "@/server/domain/agent/ledger";
import { buildUtmUrl, EVENT_LABEL, type ConversionEventType } from "@/server/domain/growth/attribution-links";
import { fmtUsdc } from "@/lib/money";
import { PageHeader, Panel, KV, ModeBadge, Badge, EvidenceItem, TxState, Table, LinkBtn } from "@/components/ui";
import { ActionButton } from "@/components/features/agent/action-button";
import { launchExperimentAction } from "@/server/actions";

export default async function Experiment({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project, db } = await requireProject();
  const [x] = await db.select().from(s.experiments).where(and(eq(s.experiments.id, id), eq(s.experiments.projectId, project.id)));
  if (!x) notFound();
  const [camp] = await db.select().from(s.campaigns).where(eq(s.campaigns.experimentId, x.id));
  const spent = await experimentSpend(db, x.id);
  const txs = await db.select().from(s.transactions).where(eq(s.transactions.experimentId, x.id)).orderBy(desc(s.transactions.createdAt));
  const funnel = await db
    .select({ type: s.conversionEvents.eventType, n: sql<number>`count(*)::int` })
    .from(s.attribution)
    .innerJoin(s.conversionEvents, eq(s.attribution.conversionEventId, s.conversionEvents.id))
    .where(eq(s.attribution.experimentId, x.id))
    .groupBy(s.conversionEvents.eventType);
  const ev = x.evidenceIds.length ? await db.select().from(s.evidence).where(inArray(s.evidence.id, x.evidenceIds)) : [];
  const conv = funnel.find((f) => f.type === x.successEvent)?.n ?? 0;
  const link = camp ? buildUtmUrl(camp.destinationUrl, { source: camp.utmSource, medium: camp.utmMedium, campaign: camp.utmCampaign, ref: camp.referralCode }) : null;
  const firstPaid = txs.some((t) => t.state !== "REJECTED" && t.state !== "DENIED" && t.state !== "FAILED");
  return (
    <div>
      <PageHeader
        crumbs={[{ label: "Experiments", href: "/app/experiments" }]}
        title={<span className="flex items-center gap-2"><span className="num text-ink-3">#{x.number}</span> {x.title} <Badge>{x.status}</Badge> <ModeBadge mode={x.dataMode} /></span>}
        right={camp?.kolId ? <LinkBtn href={`/app/kols/${camp.kolId}/brief?experiment=${x.id}`}>Creator brief →</LinkBtn> : null}
      />
      <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <Panel title="Design">
            <KV k="Hypothesis" v={<span className="block max-w-xl text-left">{x.hypothesis}</span>} />
            <KV k="Target" v={x.target} />
            <KV k="Action" v={<span className="block max-w-xl text-left">{x.action}</span>} />
            <KV k="Budget" v={<span className="num">{fmtUsdc(x.budgetMicro)} ({x.budgetCategory})</span>} />
            <KV k="Timeframe" v={`${x.timeframeDays} days`} />
            <KV k="Success metric" v={`${x.successTarget} × ${EVENT_LABEL[x.successEvent as ConversionEventType] ?? x.successEvent}`} />
            <KV k="Stop condition" v={<span className="num">CPA &gt; {fmtUsdc(x.stopMaxCpaMicro)} after {fmtUsdc(x.stopAfterSpendMicro)}</span>} />
          </Panel>
          <Panel title="Measured result">
            <div className="grid grid-cols-4 gap-4">
              <div><div className="label">Spent</div><div className="num mt-1 text-[20px]">{fmtUsdc(spent, { unit: false })}</div></div>
              <div><div className="label">Conversions</div><div className="num mt-1 text-[20px]">{conv}</div></div>
              <div><div className="label">CPA</div><div className="num mt-1 text-[20px]">{conv ? fmtUsdc(Math.round(spent / conv), { unit: false }) : "—"}</div></div>
              <div><div className="label">vs target</div><div className="num mt-1 text-[20px]">{conv}/{x.successTarget}</div></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {funnel.map((f) => (
                <Badge key={f.type}>{EVENT_LABEL[f.type as ConversionEventType] ?? f.type}: <span className="num">{f.n}</span></Badge>
              ))}
            </div>
            {x.outcome && <p className="mt-3 text-[12px] text-ink-2">Learning: {(x.outcome as { reason?: string }).reason}</p>}
          </Panel>
          <Panel title="Payments" pad={false}>
            <Table>
              <thead><tr><th>Rail</th><th className="text-right">Amount</th><th>State</th><th>Reference</th><th /></tr></thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id}>
                    <td className="num">{t.rail}</td>
                    <td className="num text-right">{fmtUsdc(t.amountMicro)}</td>
                    <td><TxState state={t.state} /></td>
                    <td className="num text-[11px] text-ink-3">{t.explorerUrl ? <a href={t.explorerUrl} target="_blank" rel="noreferrer" className="text-s1">{t.txHash?.slice(0, 12)}… ↗</a> : t.error ?? "—"}</td>
                    <td><Link href={`/app/receipts/${t.decisionId}`} className="text-[11px] text-s1 hover:underline">receipt</Link></td>
                  </tr>
                ))}
                {!txs.length && <tr><td colSpan={5} className="text-ink-3">No payments yet.</td></tr>}
              </tbody>
            </Table>
          </Panel>
          {ev.length > 0 && (
            <Panel title="Evidence behind this experiment">
              <ul className="space-y-2">{ev.map((e) => <EvidenceItem key={e.id} e={e} />)}</ul>
            </Panel>
          )}
        </div>
        <div className="space-y-3">
          <Panel title="Attribution">
            {camp ? (
              <>
                <KV k="Campaign ID" v={<span className="num text-[11px]">{camp.id.slice(0, 8)}</span>} />
                <KV k="Experiment ID" v={<span className="num text-[11px]">{x.id.slice(0, 8)}</span>} />
                <KV k="Referral code" v={<span className="num">{camp.referralCode}</span>} />
                <KV k="utm_source" v={<span className="num">{camp.utmSource}</span>} />
                <KV k="utm_medium" v={<span className="num">{camp.utmMedium}</span>} />
                <KV k="utm_campaign" v={<span className="num">{camp.utmCampaign}</span>} />
                <div className="mt-2 space-y-1.5">
                  <div className="label">Tracked short link (records a visit)</div>
                  <code className="num block break-all rounded bg-bg px-2 py-1 text-[11px] text-s1">/r/{camp.referralCode}</code>
                  <div className="label">Destination with UTM</div>
                  <code className="num block break-all rounded bg-bg px-2 py-1 text-[11px] text-ink-2">{link}</code>
                </div>
              </>
            ) : (
              <div className="text-[12px] text-ink-3">No campaign.</div>
            )}
          </Panel>
          <Panel title="Run">
            <div className="space-y-2">
              {x.status === "proposed" && <ActionButton action={launchExperimentAction.bind(null, x.id, "first")} label="Launch — pay first tranche" variant="primary" />}
              {x.status === "running" && firstPaid && <ActionButton action={launchExperimentAction.bind(null, x.id, "second")} label="Release second tranche" />}
              <p className="text-[11px] text-ink-3">Payments go through Zod → policy engine → (approval) → App Kit. Tranche 1 = the amount at risk before the stop condition is evaluated.</p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
