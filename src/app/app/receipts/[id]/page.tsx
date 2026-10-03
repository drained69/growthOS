import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireProject } from "@/server/auth/current";
import { schema as s } from "@/server/db/client";
import { canonicalJson, sha256 } from "@/server/lib/ids";
import { fmtUsdc } from "@/lib/money";
import { PageHeader, Panel, KV, Badge, VerdictBadge, TxState, ModeBadge, ExternalLink } from "@/components/ui";

type Body = {
  decision: number;
  agent: string;
  action: string;
  structuredAction: Record<string, unknown>;
  service: { vendor: string; source: string; resource: string } | null;
  costMicro: number | null;
  why: { rationale: string; reasons: string[] };
  policy: { verdict: string; checks: { rule: string; passed: boolean; detail: string }[] } | null;
  approval: { status: string; resolvedAt: string | null; approvedMicro: number | null; note: string | null } | null;
  status: string;
  autonomous: boolean;
  result: Record<string, unknown> | null;
  confidence: { before: number; after: number | null } | null;
  payment: { rail: string; network: string; destination: string | null; state: string; settlementId: string | null; settlementStatus: string | null; txHash: string | null; batchTxHash: string | null; explorerUrl: string | null; responseDigest: string | null; trail: { from: string | null; to: string; at: string; note: string | null }[] } | null;
  dataMode: string;
  createdAt: string;
};

export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project, db } = await requireProject();
  const [r] = await db.select().from(s.decisionReceipts).where(and(eq(s.decisionReceipts.decisionId, id), eq(s.decisionReceipts.projectId, project.id)));
  if (!r) notFound();
  const b = r.body as unknown as Body;
  const intact = sha256(canonicalJson(r.body)) === r.digest;
  const status = b.payment?.state ?? b.status;
  return (
    <div>
      <PageHeader
        crumbs={[{ label: "Activity", href: "/app/activity#decisions" }]}
        title={<span className="flex items-center gap-2">Decision #{b.decision} <ModeBadge mode={b.dataMode} /></span>}
        sub={`${b.action.replace(/_/g, " ").toUpperCase()} · by ${b.agent} agent · ${b.createdAt.replace("T", " ").slice(0, 19)} UTC`}
        right={<Badge tone={intact ? "good" : "bad"}>{intact ? "digest verified" : "DIGEST MISMATCH"}</Badge>}
      />
      <div className="grid gap-3 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          <Panel title="Receipt">
            <KV k="Action" v={b.action.replace(/_/g, " ").toUpperCase()} />
            {b.service && <KV k="Service" v={<span>{b.service.vendor} <span className="text-ink-3">({b.service.source === "circle_marketplace" ? "Circle Agent Marketplace" : "bundled x402 seller"})</span></span>} />}
            {b.costMicro != null && <KV k="Cost" v={<span className="num">{fmtUsdc(b.costMicro)}</span>} />}
            <KV k="Status" v={b.payment ? <TxState state={status} /> : <Badge>{status}</Badge>} />
            <KV k="Autonomy" v={b.autonomous ? "Autonomously approved" : b.approval ? `Founder ${b.approval.status}` : "—"} />
            {b.confidence && <KV k="Confidence" v={<span className="num">{Math.round(b.confidence.before * 100)}% → {b.confidence.after != null ? `${Math.round(b.confidence.after * 100)}%` : "…"}</span>} />}
            {b.result && "summary" in b.result && <KV k="Result" v={String(b.result.summary)} />}
          </Panel>
          <Panel title="Why">
            <p className="text-[13px]">{b.why.rationale}</p>
            {b.why.reasons.length > 0 && <ul className="mt-2 space-y-0.5 text-[12px] text-ink-2">{b.why.reasons.map((x) => <li key={x}>• {x}</li>)}</ul>}
          </Panel>
          {b.policy && (
            <Panel title="Policy evaluation" right={<VerdictBadge verdict={b.policy.verdict} />}>
              <ul className="space-y-1">
                {b.policy.checks.map((c) => (
                  <li key={c.rule} className="grid grid-cols-[16px_200px_1fr] gap-2 text-[12px]">
                    <span className={c.passed ? "text-good" : "text-warning"}>{c.passed ? "✓" : "✕"}</span>
                    <span className="num text-ink-2">{c.rule}</span>
                    <span className="text-ink-3">{c.detail}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <Panel title="Structured action (Zod-validated)">
            <pre className="num overflow-x-auto text-[11.5px] leading-relaxed text-ink-2">{JSON.stringify(b.structuredAction, null, 2)}</pre>
          </Panel>
        </div>
        <div className="space-y-3">
          {b.payment && (
            <Panel title="Payment trace">
              <KV k="Rail" v={b.payment.rail === "gateway_x402" ? "Circle Gateway · x402" : b.payment.rail === "app_kit_send" ? "Arc App Kit · Send" : b.payment.rail === "app_kit_bridge" ? "Arc App Kit · Bridge" : b.payment.rail} />
              <KV k="Network" v={`${b.payment.network}${b.payment.destination ? ` → ${b.payment.destination}` : ""}`} />
              <KV k="Settlement ID" v={<span className="num text-[11px]">{b.payment.settlementId ?? "—"}</span>} />
              <KV k="Gateway status" v={b.payment.settlementStatus ?? "—"} />
              <KV k="Tx hash" v={b.payment.txHash ? <ExternalLink href={b.payment.explorerUrl ?? "#"}>{b.payment.txHash.slice(0, 14)}…</ExternalLink> : "—"} />
              <KV k="Arc batch tx" v={b.payment.batchTxHash ? <ExternalLink href={b.payment.explorerUrl ?? "#"}>{b.payment.batchTxHash.slice(0, 14)}…</ExternalLink> : "—"} />
              {b.payment.responseDigest && <KV k="Response sha256" v={<span className="num text-[10.5px]">{b.payment.responseDigest.slice(0, 20)}…</span>} />}
              <div className="label mt-3">State machine</div>
              <ol className="mt-1 space-y-1">
                {b.payment.trail.map((t, i) => (
                  <li key={i} className="text-[11.5px]">
                    <span className="num text-ink-4">{t.at.slice(11, 19)}</span> <span className="num text-ink-2">{t.from ?? "∅"} → {t.to}</span>
                    {t.note && <div className="ml-14 text-ink-3">{t.note}</div>}
                  </li>
                ))}
              </ol>
              {status === "SIMULATED" && <p className="mt-3 rounded border border-warning/30 bg-warning/5 p-2 text-[11px] text-warning">SIMULATED: no wallet was configured, so no funds moved and there is no settlement ID or hash. Configure a testnet wallet to run this for real.</p>}
            </Panel>
          )}
          <Panel title="Integrity">
            <p className="text-[11.5px] text-ink-3">sha256 of the canonical receipt body. Recomputed on every view.</p>
            <code className="num mt-1 block break-all text-[10.5px] text-ink-2">{r.digest}</code>
          </Panel>
          <Link href="/app/activity#decisions" className="block text-[12px] text-s1 hover:underline">All decisions →</Link>
        </div>
      </div>
    </div>
  );
}
