import { and, eq, ne } from "drizzle-orm";
import type { DB } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { enqueue } from "@/server/jobs/queue";

export const AUTOPILOT_INTERVAL_MS: Record<string, number> = { hourly: 3_600_000, every_6h: 6 * 3_600_000, daily: 24 * 3_600_000 };
export const AUTOPILOT_LABEL: Record<string, string> = { off: "Off", hourly: "Every hour", every_6h: "Every 6 hours", daily: "Daily" };

/**
 * Turns schedules into jobs. Dedupe keys are time-bucketed, so calling tick() from several
 * workers (or every few seconds) never creates duplicate work.
 */
export async function tick(db: DB, now = Date.now()) {
  // Autopilot: one operator cycle per workspace per interval.
  const due = await db.select({ id: s.projects.id, autopilot: s.projects.autopilot, last: s.projects.lastCycleAt }).from(s.projects).where(and(ne(s.projects.autopilot, "off"), eq(s.projects.dataMode, "LIVE")));
  for (const p of due) {
    const every = AUTOPILOT_INTERVAL_MS[p.autopilot];
    if (!every || (p.last && now - p.last.getTime() < every)) continue;
    await enqueue(db, { kind: "cycle", projectId: p.id, trigger: "schedule", dedupeKey: `cycle:${p.id}:${Math.floor(now / every)}` });
  }
  // Settlements: poll workspaces with payments in flight every 2 minutes.
  const inflight = await db.selectDistinct({ pid: s.transactions.projectId }).from(s.transactions).where(eq(s.transactions.state, "SUBMITTED"));
  for (const r of inflight) await enqueue(db, { kind: "settlements", projectId: r.pid, dedupeKey: `settle:${r.pid}:${Math.floor(now / 120_000)}`, maxAttempts: 1 });
  // Housekeeping once a day.
  await enqueue(db, { kind: "cleanup", dedupeKey: `cleanup:${Math.floor(now / 86_400_000)}`, maxAttempts: 1 });
}
