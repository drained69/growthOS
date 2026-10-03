import { desc, eq } from "drizzle-orm";
import type { DB } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { spentToday } from "@/server/domain/agent/ledger";

export async function recentDecisions(db: DB, projectId: string, limit = 12) {
  return db.select().from(s.agentDecisions).where(eq(s.agentDecisions.projectId, projectId)).orderBy(desc(s.agentDecisions.createdAt)).limit(limit);
}

export async function recentTransactions(db: DB, projectId: string, limit = 50) {
  return db.select().from(s.transactions).where(eq(s.transactions.projectId, projectId)).orderBy(desc(s.transactions.createdAt)).limit(limit);
}


export async function spentTodayMicro(db: DB, projectId: string) {
  return spentToday(db, projectId);
}
