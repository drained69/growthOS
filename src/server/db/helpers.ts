import { eq, max } from "drizzle-orm";
import type { DB } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { newId } from "@/server/lib/ids";

type Mode = (typeof s.dataMode.enumValues)[number];

/** Combine provenance: anything touched by DEMO data is DEMO; SIMULATED beats TESTNET beats LIVE. */
export function mergeMode(modes: Mode[]): Mode {
  if (modes.includes("DEMO")) return "DEMO";
  if (modes.includes("SIMULATED")) return "SIMULATED";
  if (modes.includes("TESTNET")) return "TESTNET";
  return "LIVE";
}

export async function nextNumber(db: DB, table: "opportunities" | "experiments" | "agent_decisions", projectId: string): Promise<number> {
  const t = table === "opportunities" ? s.opportunities : table === "experiments" ? s.experiments : s.agentDecisions;
  const [row] = await db.select({ n: max(t.number) }).from(t).where(eq(t.projectId, projectId));
  return (row?.n ?? 0) + 1;
}

export async function audit(db: DB, e: { projectId?: string | null; actorType: "user" | "agent" | "system" | "webhook"; actorId?: string | null; action: string; target?: string; data?: Record<string, unknown> }) {
  await db.insert(s.auditLogs).values({ id: newId(), projectId: e.projectId ?? null, actorType: e.actorType, actorId: e.actorId ?? null, action: e.action, target: e.target, data: e.data ?? {} });
}
