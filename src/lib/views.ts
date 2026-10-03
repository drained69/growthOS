import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { DB } from "./db/client";
import * as s from "./db/schema";
import { categorySpend, missionSpend, spentToday, SPENT_STATES } from "./agent/ledger";
import { missionPerformance, missionProgress } from "./growth/attribution";
import { cpa, evaluateExperiments, growthEfficiency } from "./growth/learning";
import { DAY_MS } from "./util/time";

export const CATEGORY_LABEL: Record<string, string> = { research: "Research", services: "Services", kol: "KOLs", bounty: "Bounties", content: "Content", community: "Community", treasury: "Treasury" };

/** Budget + progress numbers for a mission, computed from the ledger and attribution only. */
export async function missionSummary(db: DB, mission: typeof s.missions.$inferSelect) {
  const { spent, pending } = await missionSpend(db, mission.id);
  const exps = await db.select().from(s.experiments).where(eq(s.experiments.missionId, mission.id));
  const perf = await missionPerformance(db, mission.id);
  const open = perf.filter((p) => ["proposed", "awaiting_approval", "running"].includes(p.status));
  // Committed = budget reserved by live experiments that hasn't been spent yet (+ pending approvals not tied to one).
  const committed = open.reduce((sum, p) => sum + Math.max(0, p.budgetMicro - p.spentMicro), 0);
  const available = Math.max(0, mission.budgetMicro - spent - committed);
  const progress = await missionProgress(db, mission);
  const findings = evaluateExperiments(perf);
  const successful = exps.filter((x) => (x.outcome as { verdict?: string } | null)?.verdict === "SCALE" || x.status === "succeeded").length;
  const allocs = await db.select().from(s.missionBudgets).where(eq(s.missionBudgets.missionId, mission.id));
  const allocation = await Promise.all(
    allocs.map(async (a) => ({ category: a.category, allocated: a.allocatedMicro, used: await categorySpend(db, mission.id, a.category) })),
  );
  const elapsed = Math.min(1, Math.max(0, (Date.now() - mission.startsAt.getTime()) / (mission.endsAt.getTime() - mission.startsAt.getTime())));
  return {
    spent,
    pending,
    committed,
    available,
    achieved: progress.achieved,
    attributed: progress.attributed,
    costPerQualified: cpa(spent, progress.attributed),
    experiments: exps.length,
    successful,
    efficiency: growthEfficiency({ goal: mission.goalTarget, achieved: progress.achieved, budgetMicro: mission.budgetMicro, spentMicro: spent, experiments: exps.length, successful }),
    pace: mission.goalTarget * elapsed,
    daysLeft: Math.max(0, Math.ceil((mission.endsAt.getTime() - Date.now()) / DAY_MS)),
    perf,
    findings,
    allocation,
  };
}

export async function activeMission(db: DB, projectId: string) {
  const [m] = await db.select().from(s.missions).where(and(eq(s.missions.projectId, projectId), eq(s.missions.status, "active")));
  return m ?? null;
}

export async function walletSnapshot(db: DB, projectId: string) {
  const [wallet] = await db.select().from(s.wallets).where(eq(s.wallets.projectId, projectId));
  return { wallet: wallet ?? null, spentToday: await spentToday(db, projectId) };
}

/**
 * Real traction counters across the deployment. Anything belonging to a DEMO project is
 * excluded (unless includeDemo), and money counts only TESTNET/LIVE rows that reached Circle.
 */
export async function tractionMetrics(db: DB, opts: { includeDemo?: boolean } = {}) {
  const ids = (await db.select({ id: s.projects.id, mode: s.projects.dataMode }).from(s.projects)).filter((p) => opts.includeDemo || p.mode !== "DEMO").map((p) => p.id);
  const zero = { projects: 0, opportunities: 0, qualified: 0, kols: 0, experiments: 0, spentMicro: 0, x402: 0, arcTx: 0, conversions: 0, costPerConversion: null as number | null, decisions: 0, autonomous: 0, approvals: 0 };
  if (!ids.length) return zero;
  const n = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const c = sql<number>`count(*)::int`;
  const realTx = and(inArray(s.transactions.projectId, ids), inArray(s.transactions.state, ["SUBMITTED", "SETTLED"]), inArray(s.transactions.dataMode, ["TESTNET", "LIVE"]));
  const [spent] = await db.select({ n: sql<string>`coalesce(sum(${s.transactions.amountMicro}),0)` }).from(s.transactions).where(and(realTx, sql`${s.transactions.budgetCategory} <> 'treasury'`));
  const conversions = await n(db.select({ n: c }).from(s.attribution).innerJoin(s.conversionEvents, eq(s.attribution.conversionEventId, s.conversionEvents.id)).where(inArray(s.conversionEvents.projectId, ids)));
  const spentMicro = Number(spent?.n ?? 0);
  return {
    projects: ids.length,
    opportunities: await n(db.select({ n: c }).from(s.opportunities).where(inArray(s.opportunities.projectId, ids))),
    qualified: await n(db.select({ n: c }).from(s.companies).where(and(inArray(s.companies.projectId, ids), eq(s.companies.status, "qualified")))),
    kols: await n(db.select({ n: c }).from(s.kols).where(inArray(s.kols.projectId, ids))),
    experiments: await n(db.select({ n: c }).from(s.experiments).where(inArray(s.experiments.projectId, ids))),
    spentMicro,
    x402: await n(db.select({ n: c }).from(s.transactions).where(and(realTx, eq(s.transactions.rail, "gateway_x402")))),
    arcTx: await n(db.select({ n: c }).from(s.transactions).where(and(realTx, inArray(s.transactions.rail, ["app_kit_send", "app_kit_bridge"])))),
    conversions,
    costPerConversion: conversions && spentMicro ? spentMicro / conversions : null,
    decisions: await n(db.select({ n: c }).from(s.agentDecisions).where(inArray(s.agentDecisions.projectId, ids))),
    autonomous: await n(db.select({ n: c }).from(s.agentDecisions).where(and(inArray(s.agentDecisions.projectId, ids), eq(s.agentDecisions.autonomous, true)))),
    approvals: await n(db.select({ n: c }).from(s.approvals).where(and(inArray(s.approvals.projectId, ids), sql`${s.approvals.status} <> 'pending'`))),
  };
}

export async function recentDecisions(db: DB, projectId: string, limit = 12) {
  return db.select().from(s.agentDecisions).where(eq(s.agentDecisions.projectId, projectId)).orderBy(desc(s.agentDecisions.createdAt)).limit(limit);
}

export async function recentTransactions(db: DB, projectId: string, limit = 50) {
  return db.select().from(s.transactions).where(eq(s.transactions.projectId, projectId)).orderBy(desc(s.transactions.createdAt)).limit(limit);
}

export { SPENT_STATES };
