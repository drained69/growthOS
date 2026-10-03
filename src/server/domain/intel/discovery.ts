import { eq } from "drizzle-orm";
import type { DB } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { readyProviders, listConnections } from "@/server/integrations/vault";
import { ingestPosts } from "@/server/domain/intel/ingest";
import { analyzeProject, type Logger, type AnalysisStats } from "@/server/domain/intel/analyze";
import { daysAgo } from "@/lib/time";

/**
 * DISCOVERY AGENT — queries every available provider for the product's keywords,
 * stores what it finds (LIVE), then runs the analysis engine. Provider errors and
 * unavailable providers are logged, never papered over.
 */
export async function runDiscovery(db: DB, projectId: string, log: Logger): Promise<{ fetched: Record<string, number>; errors: string[]; stats: AnalysisStats }> {
  const [profile] = await db.select().from(s.productProfiles).where(eq(s.productProfiles.projectId, projectId));
  if (!profile) throw new Error("No product profile");
  const keywords = [...new Set([...profile.keywords, ...profile.terminology.slice(0, 6)])];
  const queries = profile.keywords.slice(0, 4);
  const fetched: Record<string, number> = {};
  const errors: string[] = [];

  for (const c of await listConnections(db, projectId)) {
    if (!c.ready) log("discovery", `${c.provider.name}: skipped — ${c.source === "restricted" ? c.provider.restrictedReason : "not connected"}`);
  }
  for (const { provider, creds, source } of await readyProviders(db, projectId)) {
    let n = 0;
    for (const q of queries) {
      try {
        const posts = await provider.search(q.includes(" ") ? `"${q}"` : q, { since: daysAgo(14), limit: 25 }, creds);
        n += await ingestPosts(db, projectId, provider.id, posts, "LIVE", { keywords });
      } catch (e) {
        const msg = (e as Error).message;
        errors.push(msg);
        log("discovery", msg);
        if (/429|rate limited/.test(msg)) break;
      }
    }
    fetched[provider.id] = n;
    log("discovery", `${provider.name} (${source === "workspace" ? "workspace key" : source === "platform" ? "platform key" : "keyless"}): ${n} new post(s)`);
  }
  const stats = await analyzeProject(db, projectId, log);
  return { fetched, errors, stats };
}
