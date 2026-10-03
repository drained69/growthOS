import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireProject } from "@/server/auth/current";
import { schema as s } from "@/server/db/client";
import { recentDecisions, recentTransactions } from "@/server/queries/views";
import { fmtUsdc } from "@/lib/money";
import { relTime } from "@/lib/time";
import { ARC, CHAINS } from "@/server/integrations/circle/config";
import { PageHeader, Panel, Table, TxState, ModeBadge, VerdictBadge, Badge, ExternalLink, shortHash } from "@/components/ui";
import { ActionButton } from "@/components/features/agent/action-button";
import { DEMO_PAYOUT_FALLBACK } from "@/server/domain/growth/experiments";
import { refreshSettlementsAction } from "@/server/actions";

const RAIL: Record<string, string> = { gateway_x402: "x402 · Gateway", app_kit_send: "App Kit Send", app_kit_bridge: "App Kit Bridge", gateway_deposit: "Gateway deposit" };

export default async function Activity() {
  const { project, db } = await requireProject();
  const txs = await recentTransactions(db, project.id, 100);
  const purchases = await db.select({ p: s.x402Purchases, tx: s.transactions }).from(s.x402Purchases).innerJoin(s.transactions, eq(s.x402Purchases.transactionId, s.transactions.id)).where(eq(s.transactions.projectId, project.id)).orderBy(desc(s.x402Purchases.createdAt));
  const decisions = await recentDecisions(db, project.id, 100);
  const runs = await db.select().from(s.agentRuns).where(eq(s.agentRuns.projectId, project.id)).orderBy(desc(s.agentRuns.startedAt)).limit(5);
  const real = txs.filter((t) => t.dataMode === "TESTNET" || t.dataMode === "LIVE");
  return (
    <div>
      <PageHeader
        title="Arc / Circle activity"
        sub="Every payment GrowthOS proposed, with its rail, state, Circle settlement ID, Arc transaction hash and explorer link. SIMULATED rows moved nothing and carry no hashes."
        right={<ActionButton action={refreshSettlementsAction} label="Refresh settlements" showLog={false} />}
      />
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["x402 purchases", purchases.length],
          ["Gateway settlements", txs.filter((t) => t.settlementId).length],
          ["Arc transfers (App Kit)", txs.filter((t) => t.rail === "app_kit_send" && t.txHash).length],
          ["On-chain / testnet rows", real.length],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-md border border-line bg-surface px-3.5 py-2.5">
            <div className="label">{l}</div>
            <div className="num mt-1 text-[20px]">{v}</div>
          </div>
        ))}
      </div>

      <Panel title="Payment trace" pad={false}>
        <Table>
          <thead>
            <tr>
              <th>When</th>
              <th>Rail</th>
              <th>Request</th>
              <th className="text-right">Price</th>
              <th>Authorization</th>
              <th>Settlement ID</th>
              <th>Status</th>
              <th>Arc tx / batch</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {txs.map((t) => {
              const purchase = purchases.find((p) => p.tx.id === t.id)?.p;
              return (
                <tr key={t.id}>
                  <td className="whitespace-nowrap text-[11px] text-ink-3">{relTime(t.createdAt)}</td>
                  <td className="whitespace-nowrap">{RAIL[t.rail] ?? t.rail}</td>
                  <td className="max-w-[260px] truncate text-[11.5px] text-ink-2" title={purchase?.resourceUrl ?? t.recipient ?? ""}>
                    {purchase ? purchase.purpose : t.kind === "bridge" ? `${CHAINS[t.chain]?.label} → ${CHAINS[t.destChain ?? ""]?.label}` : t.recipient === DEMO_PAYOUT_FALLBACK ? "placeholder payout address (set the creator\u2019s)" : t.recipient ? `to ${shortHash(t.recipient, 4)}` : t.kind}
                  </td>
                  <td className="num text-right">{fmtUsdc(t.amountMicro)}</td>
                  <td className="text-[11px] text-ink-3">{t.rail === "gateway_x402" ? "EIP-712 TransferWithAuthorization" : t.rail.startsWith("app_kit") ? "App Kit adapter tx" : "—"}</td>
                  <td className="num text-[11px]">{t.settlementId ? shortHash(t.settlementId, 4) : "—"}{t.settlementStatus && <div className="text-ink-3">{t.settlementStatus}</div>}</td>
                  <td>
                    <span className="flex items-center gap-1">
                      <TxState state={t.state} />
                      {t.dataMode !== t.state && <ModeBadge mode={t.dataMode} />}
                    </span>
                  </td>
                  <td className="num text-[11px]">
                    {t.batchTxHash ? <ExternalLink href={`${ARC.explorer}/tx/${t.batchTxHash}`}>batch {shortHash(t.batchTxHash, 4)}</ExternalLink> : t.txHash && t.explorerUrl ? <ExternalLink href={t.explorerUrl}>{shortHash(t.txHash, 4)}</ExternalLink> : <span className="text-ink-4">{t.error ? t.error.slice(0, 40) : "—"}</span>}
                  </td>
                  <td>
                    <Link href={`/app/receipts/${t.decisionId}`} className="text-[11px] text-s1 hover:underline">receipt</Link>
                  </td>
                </tr>
              );
            })}
            {!txs.length && <tr><td colSpan={9} className="text-ink-3">No payments yet.</td></tr>}
          </tbody>
        </Table>
      </Panel>
      <p className="mt-2 text-[11px] text-ink-3">
        x402 lifecycle (Circle Gateway): signed authorization → facilitator settles (settlement ID, status <span className="num">received</span>) → relayer batches → <span className="num">submitBatch</span> on Arc → <span className="num">completed</span>. The batch tx is matched by timestamp, the same heuristic as the organizer&apos;s example.
      </p>

      <Panel id="decisions" title="Agent decisions" className="mt-4" pad={false}>
        <Table>
          <thead>
            <tr><th>#</th><th>When</th><th>Agent</th><th>Decision</th><th>Rationale</th><th>Policy</th><th>Mode</th></tr>
          </thead>
          <tbody>
            {decisions.map((d) => (
              <tr key={d.id}>
                <td className="num"><Link href={`/app/receipts/${d.id}`} className="text-s1 hover:underline">#{d.number}</Link></td>
                <td className="whitespace-nowrap text-[11px] text-ink-3">{relTime(d.createdAt)}</td>
                <td>{d.agent}</td>
                <td className="whitespace-nowrap">{d.kind.replace(/_/g, " ")}{!d.autonomous && <Badge className="ml-1">human</Badge>}</td>
                <td className="max-w-lg truncate text-ink-2">{d.rationale}</td>
                <td><VerdictBadge verdict={d.policyVerdict} /></td>
                <td><ModeBadge mode={d.dataMode} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>

      <Panel title="Recent operator runs" className="mt-4">
        {runs.length ? (
          <ul className="space-y-1.5 text-[12px]">
            {runs.map((r) => (
              <li key={r.id} className="flex justify-between">
                <span>{r.trigger} run · {r.log.length} steps</span>
                <span className="flex items-center gap-2"><Badge tone={r.status === "completed" ? "good" : r.status === "failed" ? "bad" : "info"}>{r.status}</Badge><span className="text-ink-4">{relTime(r.startedAt)}</span></span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-[12px] text-ink-3">No operator runs yet.</div>
        )}
      </Panel>
    </div>
  );
}
