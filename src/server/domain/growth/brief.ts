import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { DB } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { newId } from "@/server/lib/ids";
import { DAY_MS, isoDate } from "@/lib/time";
import { missionSpend } from "@/server/domain/agent/ledger";
import { missionProgress } from "@/server/domain/growth/attribution";

/** Daily Growth Brief — assembled from tables, not written by an LLM, so every number is real. */
export async function buildDailyBrief(db: DB, projectId: string, now = Date.now()) {
  const since = new Date(now - DAY_MS);
  const [mission] = await db.select().from(s.missions).where(and(eq(s.missions.projectId, projectId), eq(s.missions.status, "active")));
  const count = async (table: typeof s.socialPosts | typeof s.companies | typeof s.kols | typeof s.narratives, col: typeof s.socialPosts.createdAt | typeof s.companies.createdAt | typeof s.kols.createdAt | typeof s.narratives.updatedAt) => {
    const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(table).where(and(eq(table.projectId, projectId), gte(col, since)));
    return r?.n ?? 0;
  };
  const newPosts = await count(s.socialPosts, s.socialPosts.createdAt);
  const intentCompanies = await db.select().from(s.companies).where(and(eq(s.companies.projectId, projectId), gte(s.companies.overallScore, 65)));
  const narratives = await db.select().from(s.narratives).where(eq(s.narratives.projectId, projectId)).orderBy(desc(s.narratives.relevance));
  const emerging = narratives.filter((n) => ["EMERGING", "ACCELERATING"].includes(n.status));
  const kolOpps = await db.select().from(s.opportunities).where(and(eq(s.opportunities.projectId, projectId), eq(s.opportunities.type, "KOL"), eq(s.opportunities.status, "open")));
  const issues = await db.select().from(s.productIssues).where(and(eq(s.productIssues.projectId, projectId), gte(s.productIssues.mentions7d, 1)));
  const [top] = await db.select().from(s.opportunities).where(and(eq(s.opportunities.projectId, projectId), eq(s.opportunities.status, "open"))).orderBy(desc(s.opportunities.overallScore)).limit(1);
  const exps = mission ? await db.select().from(s.experiments).where(eq(s.experiments.missionId, mission.id)) : [];
  const changed = exps.filter((e) => e.updatedAt.getTime() >= since.getTime());
  const spend = mission ? await missionSpend(db, mission.id) : { spent: 0, pending: 0 };
  const progress = mission ? await missionProgress(db, mission) : { achieved: 0, attributed: 0 };
  const [lastLearning] = mission ? await db.select().from(s.learnings).where(eq(s.learnings.missionId, mission.id)).orderBy(desc(s.learnings.createdAt)).limit(1) : [];
  const blocking = issues.filter((i) => i.blocksAcquisition);

  const content = {
    date: isoDate(new Date(now)),
    whatChanged: {
      newConversations: newPosts,
      highIntentCompanies: intentCompanies.length,
      emergingNarratives: emerging.length,
      kolOpportunities: kolOpps.length,
      productIssues: issues.length,
    },
    topOpportunity: top ? { id: top.id, number: top.number, title: top.title, type: top.type, whyNow: top.whyNow, recommendedAction: top.recommendedAction, confidence: top.confidence } : null,
    narratives: emerging.slice(0, 3).map((n) => ({ label: n.label, status: n.status, velocityPct: n.velocityPct })),
    budget: mission ? { totalMicro: mission.budgetMicro, spentMicro: spend.spent, pendingMicro: spend.pending, remainingMicro: mission.budgetMicro - spend.spent - spend.pending } : null,
    mission: mission ? { name: mission.name, goal: mission.goalTarget, achieved: progress.achieved, attributed: progress.attributed } : null,
    experiments: {
      succeeded: changed.filter((e) => (e.outcome as { verdict?: string } | null)?.verdict === "SCALE" || e.status === "succeeded").length,
      failed: changed.filter((e) => e.status === "stopped" || e.status === "failed").length,
      running: exps.filter((e) => e.status === "running").length,
    },
    recommendation: blocking.length
      ? `Fix "${blocking[0].label}" before scaling acquisition — ${blocking[0].mentions7d} mentions this week (+${blocking[0].changePct}%).`
      : lastLearning?.reallocations.length
        ? `Reallocated ${(lastLearning.reallocations as { amount?: string }[]).map((r) => r.amount).join(" + ")} USDC toward the best-performing experiment(s).`
        : top
          ? `Act on opportunity #${top.number}: ${top.recommendedAction}`
          : "Run discovery to find opportunities.",
  };
  await db
    .insert(s.dailyBriefs)
    .values({ id: newId(), projectId, date: content.date, content })
    .onConflictDoUpdate({ target: [s.dailyBriefs.projectId, s.dailyBriefs.date], set: { content } });
  return content;
}
