import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { getDb, schema as s } from "@/server/db/client";
import { runCycle } from "@/server/domain/agent/operator";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Scheduled operator: `Authorization: Bearer $CRON_SECRET`. Runs one cycle per non-demo project. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || got.length !== secret.length || !timingSafeEqual(Buffer.from(got), Buffer.from(secret))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = await getDb();
  const projects = await db.select({ id: s.projects.id }).from(s.projects).where(eq(s.projects.dataMode, "LIVE"));
  const out: { projectId: string; ok: boolean; error?: string }[] = [];
  for (const p of projects) {
    try {
      await runCycle(db, p.id, { trigger: "schedule" });
      out.push({ projectId: p.id, ok: true });
    } catch (e) {
      out.push({ projectId: p.id, ok: false, error: (e as Error).message });
    }
  }
  return NextResponse.json({ ran: out.length, results: out });
}
