import { and, eq } from "drizzle-orm";
import type { DB } from "../db/client";
import * as s from "../db/schema";
import { newId } from "../util/ids";
import type { FetchedPost } from "../providers/types";
import { termHits } from "./signals";

type Mode = (typeof s.dataMode.enumValues)[number];

/** Store fetched posts (idempotent on provider+externalId). Returns number of new posts. */
export async function ingestPosts(db: DB, projectId: string, provider: string, posts: FetchedPost[], mode: Mode, ctx: { keywords: string[] }): Promise<number> {
  let added = 0;
  for (const p of posts) {
    const sourceUrl = p.url;
    const [src] = await db
      .insert(s.sources)
      .values({ id: newId(), projectId, provider, url: sourceUrl, title: p.title ?? null, dataMode: mode })
      .onConflictDoUpdate({ target: [s.sources.projectId, s.sources.url], set: { fetchedAt: new Date() } })
      .returning({ id: s.sources.id });
    const topics = termHits(`${p.title ?? ""} ${p.content}`, ctx.keywords);
    const res = await db
      .insert(s.socialPosts)
      .values({
        id: newId(),
        projectId,
        sourceId: src.id,
        provider,
        externalId: p.externalId,
        url: p.url,
        authorHandle: p.authorHandle,
        authorName: p.authorName ?? null,
        authorUrl: p.authorUrl ?? null,
        authorFollowers: p.authorFollowers ?? null,
        title: p.title ?? null,
        content: p.content,
        publishedAt: p.publishedAt,
        engagement: p.engagement,
        topics,
        entities: { companies: p.companyHint ? [p.companyHint] : [], products: [], people: [p.authorHandle] },
        dataMode: mode,
      })
      .onConflictDoUpdate({
        target: [s.socialPosts.projectId, s.socialPosts.provider, s.socialPosts.externalId],
        set: { engagement: p.engagement, topics, authorFollowers: p.authorFollowers ?? null },
      })
      .returning({ id: s.socialPosts.id, createdAt: s.socialPosts.createdAt });
    if (res[0] && Date.now() - res[0].createdAt.getTime() < 5_000) added++;
  }
  return added;
}

export async function postsForProject(db: DB, projectId: string) {
  return db.select().from(s.socialPosts).where(and(eq(s.socialPosts.projectId, projectId)));
}
