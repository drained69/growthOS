import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { requireProject } from "@/server/auth/current";
import { schema as s } from "@/server/db/client";
import { activeMission, missionSummary, walletSnapshot } from "@/server/queries/views";
import { walletMode, ARC, addressExplorerUrl } from "@/server/integrations/circle/config";
import { agentAddress } from "@/server/integrations/circle/signer";
import { arcUsdcBalanceMicro } from "@/server/integrations/circle/wallet-balance";
import { gatewayBalance } from "@/server/integrations/circle/gateway";
import { unifiedBalance } from "@/server/integrations/circle/appkit";
import { fmtUsdc } from "@/lib/money";
import { DAY_MS } from "@/lib/time";
import { PageHeader, Panel, Stat, KV, Badge, ExternalLink, StatusDot } from "@/components/ui";
import { ActionButton } from "@/components/features/agent/action-button";
import { OnrampButton } from "@/components/features/wallet/onramp-button";
import { toggleFreezeAction, refreshSettlementsAction } from "@/server/actions";

async function attempt<T>(fn: () => Promise<T>): Promise<{ v: T | null; err: string | null }> {
  try {
    return { v: await fn(), err: null };
  } catch (e) {
    return { v: null, err: (e as Error).message.slice(0, 140) };
  }
}

export default async function Wallet() {
  const { project, db, user } = await requireProject();
  const mode = walletMode();
  const address = agentAddress();
  const { wallet, spentToday } = await walletSnapshot(db, project.id);
  const [policy] = await db.select().from(s.policies).where(eq(s.policies.projectId, project.id));
  const mission = await activeMission(db, project.id);
  const sum = mission ? await missionSummary(db, mission) : null;
  const [onchain, gw, ub] = address ? await Promise.all([attempt(() => arcUsdcBalanceMicro(address)), attempt(() => gatewayBalance(address)), attempt(() => unifiedBalance(address))]) : [null, null, null];
  // Earn recommendation input: 7-day run rate of real spend.
  const [rate] = await db.select({ n: sql<string>`coalesce(sum(${s.transactions.amountMicro}),0)` }).from(s.transactions).where(and(eq(s.transactions.projectId, project.id), inArray(s.transactions.state, ["SUBMITTED", "SETTLED", "SIMULATED"]), gte(s.transactions.createdAt, new Date(Date.now() - 7 * DAY_MS))));
  const weekly = Number(rate?.n ?? 0);
  const idle = sum ? Math.max(0, sum.available - weekly * 2) : 0;

  return (
    <div>
      <PageHeader title="Growth wallet" sub="The agent's operating budget. Keys never reach the AI: Circle custodies them (developer-controlled wallet) or, in testnet-key mode, they stay in server env and only sign through the policy engine." />
      <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        <Panel title="Growth wallet" right={wallet?.frozen ? <Badge tone="bad">FROZEN</Badge> : mode === "unconfigured" ? <Badge tone="warn">SIMULATION</Badge> : <Badge tone="good">ACTIVE</Badge>}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Wallet USDC (Arc)" value={onchain?.v != null ? fmtUsdc(onchain.v, { unit: false }) : "—"} sub={onchain?.err ? "RPC unreachable" : address ? "on-chain balance" : "no wallet"} />
            <Stat label="Gateway balance" value={gw?.v != null ? fmtUsdc(gw.v.availableMicro, { unit: false }) : "—"} sub={gw?.err ? "Gateway API unreachable" : "spendable via x402"} />
            <Stat label="Spent today" value={fmtUsdc(spentToday, { unit: false })} sub={`limit ${fmtUsdc(policy?.dailySpendMicro, { unit: false })}`} />
            <Stat label="Mission remaining" value={sum ? fmtUsdc(mission!.budgetMicro - sum.spent, { unit: false }) : "—"} sub={sum ? `${fmtUsdc(sum.available, { unit: false })} uncommitted` : ""} />
          </div>
          <div className="mt-4 border-t border-line pt-3">
            <KV k="Network" v={`${ARC.name} (chain ${ARC.chainId}, Gateway domain ${ARC.gatewayDomain})`} />
            <KV k="Custody" v={mode === "circle_dcw" ? "Circle developer-controlled wallet" : mode === "local_testnet" ? "Server-side testnet key (never sent to client or LLM)" : "None configured"} />
            <KV k="Address" v={address ? <ExternalLink href={addressExplorerUrl("Arc_Testnet", address)}>{address.slice(0, 10)}…{address.slice(-6)}</ExternalLink> : "—"} />
            {wallet?.circleWalletId && <KV k="Circle wallet ID" v={<span className="num text-[11px]">{wallet.circleWalletId}</span>} />}
            <KV k="USDC contract" v={<span className="num text-[11px]">{ARC.usdc}</span>} />
            <KV k="GatewayWallet" v={<span className="num text-[11px]">{ARC.gatewayWallet}</span>} />
          </div>
          {(onchain?.err || gw?.err) && <p className="mt-2 text-[11px] text-ink-3">Live reads failed: {[onchain?.err, gw?.err].filter(Boolean).join(" · ")}. Nothing is shown in their place.</p>}
          {mode === "unconfigured" && (
            <div className="mt-3 rounded border border-warning/30 bg-warning/5 p-3 text-[12px] text-ink-2">
              <div className="mb-1 font-medium text-warning">No wallet configured — payments run as SIMULATED</div>
              Set <code className="num">CIRCLE_API_KEY</code>, <code className="num">CIRCLE_ENTITY_SECRET</code> and run <code className="num">npm run wallet:setup</code> to create an Arc Testnet wallet, fund it from faucet.circle.com, then <code className="num">npm run wallet:deposit</code> to deposit into Gateway for x402.
            </div>
          )}
        </Panel>
        <div className="space-y-3">
          <Panel title="Unified balance (Gateway, via App Kit)">
            {ub?.v ? (
              <>
                <div className="num text-[22px]">{fmtUsdc(ub.v.totalMicro)}</div>
                <div className="mt-1 text-[11px] text-ink-3">Available growth capital across chains</div>
                <div className="mt-2">
                  {ub.v.byChain.map((c) => (
                    <KV key={c.chain} k={c.label} v={<span className="num">{fmtUsdc(c.micro)}</span>} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-[12px] text-ink-3">{address ? `Unavailable: ${ub?.err ?? "—"}` : "Configure a wallet to read the chain-abstracted Gateway balance (Arc + Base Sepolia + Arbitrum Sepolia)."}</div>
            )}
          </Panel>
          <Panel title="Controls">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[12px]">
                <StatusDot tone={wallet?.frozen ? "bad" : "good"} /> {wallet?.frozen ? "Kill switch ON — every spend is denied by policy" : "Spending allowed within policy"}
              </div>
              <ActionButton action={toggleFreezeAction} label={wallet?.frozen ? "Resume spending" : "Freeze all spending"} variant={wallet?.frozen ? "default" : "danger"} showLog={false} confirm={wallet?.frozen ? undefined : "Freeze all agent spending?"} />
              <ActionButton action={refreshSettlementsAction} label="Refresh settlement status" showLog={false} />
              {process.env.ONRAMP_API_KEY && address ? <OnrampButton address={address} userId={user.id} /> : <p className="text-[11px] text-ink-3">Add budget via Arc Onramp: set ONRAMP_API_KEY (optional).</p>}
            </div>
          </Panel>
          <Panel title="Idle funds — Earn (recommendation only)">
            <p className="text-[12px] text-ink-2">
              7-day spend run-rate <span className="num">{fmtUsdc(weekly)}</span>. Uncommitted beyond two weeks of run-rate: <span className="num">{fmtUsdc(idle)}</span>.
            </p>
            <p className="mt-2 text-[11.5px] text-ink-3">
              {idle >= 1_000_000_000
                ? "GrowthOS would recommend placing part of this in a supported App Kit Earn vault — only with explicit founder approval."
                : "Not enough idle capital to justify moving funds."}{" "}
              GrowthOS never makes yield decisions autonomously; Circle&apos;s Earn Kit is marked &quot;coming soon&quot;, so execution is not enabled in this build. Borrow is intentionally not built.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
