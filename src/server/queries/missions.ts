import { and, eq } from "drizzle-orm";
import type { DB } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { categorySpend, missionSpend } from "@/server/domain/agent/ledger";
import { missionPerformance, missionProgress } from "@/server/domain/growth/attribution";
import { cpa, evaluateExperiments, growthEfficiency } from "@/server/domain/growth/learning";
import { DAY_MS } from "@/lib/time";

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

