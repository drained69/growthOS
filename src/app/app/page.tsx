import Link from "next/link";
import { and, desc, eq, gte, ne } from "drizzle-orm";
import { requireProject } from "@/lib/auth/current";
import { schema as s } from "@/lib/db/client";
import { activeMission, missionSummary, recentDecisions, recentTransactions, walletSnapshot, CATEGORY_LABEL } from "@/lib/views";
import { fmtUsdc } from "@/lib/util/money";
import { relTime, DAY_MS } from "@/lib/util/time";
import { Panel, PageHeader, Stat, ModeBadge, Confidence, Velocity, VerdictBadge, TxState, Badge, Empty, LinkBtn, shortHash } from "@/components/ui";
import { GoalProgress, StackedBar, BarList, Sparkline } from "@/components/charts";
import { walletMode } from "@/lib/payments/config";

export default async function Overview() {
  const { project, db } = await requireProject();
  const mission = await activeMission(db, project.id);
  const sum = mission ? await missionSummary(db, mission) : null;
  const { spentToday, wallet } = await walletSnapshot(db, project.id);
  const [policy] = await db.select().from(s.policies).where(eq(s.policies.projectId, project.id));
  const qualified = await db.select().from(s.companies).where(eq(s.companies.projectId, project.id)).orderBy(desc(s.companies.overallScore)).limit(5);
  const [topNarr] = await db.select().from(s.narratives).where(eq(s.narratives.projectId, project.id)).orderBy(desc(s.narratives.relevance), desc(s.narratives.velocityPct)).limit(1);
  const [topKol] = await db.select().from(s.opportunities).where(and(eq(s.opportunities.projectId, project.id), eq(s.opportunities.type, "KOL"), ne(s.opportunities.status, "dismissed"))).orderBy(desc(s.opportunities.overallScore)).limit(1);
  const decisions = await recentDecisions(db, project.id, 8);
  const txs = await recentTransactions(db, project.id, 6);
  const blocking = await db.select().from(s.productIssues).where(and(eq(s.productIssues.projectId, project.id), gte(s.productIssues.mentions7d, 3)));
  const posts = await db.select({ at: s.socialPosts.publishedAt }).from(s.socialPosts).where(and(eq(s.socialPosts.projectId, project.id), gte(s.socialPosts.publishedAt, new Date(Date.now() - 14 * DAY_MS))));
  const daily = Array.from({ length: 14 }, (_, i) => posts.filter((p) => Math.floor((Date.now() - p.at.getTime()) / DAY_MS) === 13 - i).length);

  return (
    <div>
      <PageHeader
        title="Overview"
        sub={`${project.name} — the operator's view: goal, money, evidence, and what it decided.`}
        right={
          project.dataMode === "DEMO" ? (
            <LinkBtn href="/app/demo" variant="default">
              Guided demo →
            </LinkBtn>
          ) : null
        }
      />

      {mission && sum ? (
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <Panel title={<span className="flex items-center gap-2">Active mission <ModeBadge mode={mission.dataMode} /></span>} right={<span className="num">{sum.daysLeft}d left</span>}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="text-[15px] font-semibold">{mission.name}</div>
              <div className="text-[12px] text-ink-3">Goal: {mission.goalDescription}</div>
            </div>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div className="num text-[34px] font-medium leading-none">
                {sum.achieved}
                <span className="text-[16px] text-ink-3"> / {mission.goalTarget}</span>
              </div>
              <div className="grid grid-cols-3 gap-5 text-right">
                <Stat label="Attributed" value={sum.attributed} sub="to experiments" />
                <Stat label="Cost / qualified" value={sum.costPerQualified ? fmtUsdc(sum.costPerQualified, { unit: false }) : "—"} sub="USDC, measured" />
                <Stat label="Efficiency" value={sum.efficiency} sub="growth / USDC" />
              </div>
            </div>
            <div className="mt-3">
              <GoalProgress achieved={sum.achieved} goal={mission.goalTarget} pace={sum.pace} />
              <div className="mt-1 flex justify-between text-[10.5px] text-ink-3">
                <span>progress (marker = on-pace target {Math.round(sum.pace)})</span>
                <span className="num">{Math.round((sum.achieved / mission.goalTarget) * 100)}%</span>
              </div>
            </div>
          </Panel>

          <Panel title="Budget" right={<Link href="/app/wallet" className="hover:text-ink">wallet →</Link>}>
            <div className="grid grid-cols-4 gap-3">
              <Stat label="Total" value={fmtUsdc(mission.budgetMicro, { unit: false })} sub="USDC" />
              <Stat label="Spent" value={fmtUsdc(sum.spent, { unit: false })} />
              <Stat label="Committed" value={fmtUsdc(sum.committed, { unit: false })} />
              <Stat label="Available" value={fmtUsdc(sum.available, { unit: false })} tone="good" />
            </div>
            <div className="mt-4">
              <StackedBar total={mission.budgetMicro} parts={sum.allocation.map((a) => ({ key: a.category, label: CATEGORY_LABEL[a.category] ?? a.category, value: a.allocated, display: fmtUsdc(a.allocated, { unit: false }) }))} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-[11.5px] text-ink-3">
              <span>
                Today <span className="num text-ink">{fmtUsdc(spentToday)}</span> of {fmtUsdc(policy?.dailySpendMicro)} daily limit
              </span>
              <span>{wallet?.frozen ? <Badge tone="bad">FROZEN</Badge> : walletMode() === "unconfigured" ? <Badge tone="warn">SIMULATION</Badge> : <Badge tone="good">ACTIVE · Arc</Badge>}</span>
            </div>
          </Panel>
        </div>
      ) : (
        <Empty title="No active mission">Create a mission so GrowthOS has a goal and a budget to work against.</Empty>
      )}

      {blocking.filter((b) => b.blocksAcquisition || b.mentions7d >= 3).map((b) => (
        <div key={b.id} className="mt-3 flex items-center justify-between gap-3 rounded-md border border-serious/40 bg-serious/5 px-3.5 py-2.5">
          <div className="text-[12.5px]">
            <span className="font-medium text-serious">Product issue: {b.label}</span>
            <span className="text-ink-2"> — {b.mentions7d} mentions this week ({b.changePct >= 0 ? "+" : ""}{b.changePct}%). {b.recommendation}</span>
          </div>
          <LinkBtn href="/app/discover?filter=feedback" variant="ghost">
            evidence →
          </LinkBtn>
        </div>
      ))}

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Panel title="Qualified customers" right={<Link href="/app/customers" className="hover:text-ink">all →</Link>} pad={false}>
          <ul>
            {qualified.map((c) => (
              <li key={c.id} className="border-b border-line px-3.5 py-2 last:border-b-0">
                <Link href={`/app/customers/${c.id}`} className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12.5px] font-medium">{c.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="num text-[11px] text-ink-3">intent {c.intentScore}</span>
                    <Confidence value={c.confidence} compact />
                  </span>
                </Link>
              </li>
            ))}
            {!qualified.length && <li className="px-3.5 py-3 text-[12px] text-ink-3">No companies with intent yet.</li>}
          </ul>
        </Panel>

        <Panel title="Top narrative" right={<Link href="/app/narratives" className="hover:text-ink">all →</Link>}>
          {topNarr ? (
            <Link href={`/app/narratives/${topNarr.id}`} className="block">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-semibold">{topNarr.label}</span>
                <Velocity pct={topNarr.velocityPct} />
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11.5px] text-ink-3">
                <Badge tone="info">{topNarr.status}</Badge> <span className="num">{topNarr.volume7d}</span> posts this week · relevance <span className="num">{topNarr.relevance}</span>
              </div>
              <div className="mt-3">
                <div className="label mb-1">Market volume, 14 days</div>
                <Sparkline values={daily} width={260} height={36} label="relevant posts" />
              </div>
            </Link>
          ) : (
            <div className="text-[12px] text-ink-3">No narratives yet.</div>
          )}
        </Panel>

        <Panel title="Top KOL opportunity" right={<Link href="/app/kols" className="hover:text-ink">all →</Link>}>
          {topKol ? (
            <Link href={`/app/opportunities/${topKol.id}`} className="block">
              <div className="text-[14px] font-semibold">{topKol.title}</div>
              <ul className="mt-2 space-y-1 text-[12px] text-ink-2">
                {topKol.whyNow.slice(0, 3).map((w) => (
                  <li key={w}>• {w}</li>
                ))}
              </ul>
              <div className="mt-2 flex items-center justify-between">
                <Confidence value={topKol.confidence} />
                <span className="num text-[11.5px] text-ink-3">est. {fmtUsdc(topKol.estimatedCostMicro)}</span>
              </div>
            </Link>
          ) : (
            <div className="text-[12px] text-ink-3">No open KOL opportunities.</div>
          )}
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.3fr]">
        <Panel title="Experiment performance — cost per qualified conversion" right={<Link href="/app/experiments" className="hover:text-ink">experiments →</Link>}>
          {sum?.findings.length ? (
            <BarList
              format={(v) => fmtUsdc(v, { unit: false })}
              rows={sum.findings.filter((f) => f.cpaMicro != null).map((f) => ({ label: f.label, value: f.cpaMicro!, sub: `${f.conversions} conv · ${f.verdict}`, tone: f.verdict === "STOP" || f.verdict === "REDUCE" ? "bad" : f.verdict === "SCALE" ? "good" : undefined }))}
            />
          ) : (
            <div className="text-[12px] text-ink-3">No measured experiments yet.</div>
          )}
          <p className="mt-3 text-[11px] text-ink-3">USDC per attributed {mission?.goalEvent.replace(/_/g, " ")} (lower is better). From settled spend and referral-code attribution only.</p>
        </Panel>

        <Panel title="Recent agent decisions" right={<Link href="/app/activity#decisions" className="hover:text-ink">all →</Link>} pad={false}>
          <ul>
            {decisions.map((d) => (
              <li key={d.id} className="border-b border-line px-3.5 py-2 last:border-b-0">
                <Link href={`/app/receipts/${d.id}`} className="grid grid-cols-[auto_1fr_auto] items-start gap-3">
                  <span className="num pt-px text-[11px] text-ink-3">#{d.number}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-[12px]">
                      <span className="font-medium uppercase tracking-wide text-ink-2">{d.kind.replace(/_/g, " ")}</span>
                      <span className="text-ink-4">·</span>
                      <span className="text-ink-3">{d.agent}</span>
                      <ModeBadge mode={d.dataMode} />
                    </span>
                    <span className="mt-0.5 line-clamp-1 block text-[12px] text-ink-2">{d.rationale}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <VerdictBadge verdict={d.policyVerdict} />
                    <span className="text-[10.5px] text-ink-4">{relTime(d.createdAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
            {!decisions.length && <li className="px-3.5 py-3 text-[12px] text-ink-3">No decisions yet — run an agent cycle.</li>}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-3" title="Arc / Circle activity" right={<Link href="/app/activity" className="hover:text-ink">full trace →</Link>} pad={false}>
        <ul>
          {txs.map((t) => (
            <li key={t.id} className="grid grid-cols-[110px_1fr_auto_auto] items-center gap-3 border-b border-line px-3.5 py-2 text-[12px] last:border-b-0">
              <span className="num text-ink-3">{t.rail.replace(/_/g, " ")}</span>
              <span className="truncate text-ink-2">
                {t.kind.replace(/_/g, " ")} · {t.settlementId ? `settlement ${shortHash(t.settlementId, 4)}` : t.txHash ? shortHash(t.txHash) : "no on-chain reference"}
              </span>
              <span className="num">{fmtUsdc(t.amountMicro)}</span>
              <span className="flex items-center gap-1.5">
                {t.dataMode !== t.state && <ModeBadge mode={t.dataMode} />}
                <TxState state={t.state} />
              </span>
            </li>
          ))}
          {!txs.length && <li className="px-3.5 py-3 text-[12px] text-ink-3">No payments yet.</li>}
        </ul>
      </Panel>
    </div>
  );
}
