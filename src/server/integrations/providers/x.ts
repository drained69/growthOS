import { getJson } from "@/server/integrations/providers/http";
import type { FetchedPost, MarketProvider } from "@/server/integrations/providers/types";

/** X API v2 recent search (bearer token; requires an X API plan that includes search). */
interface Tweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: { like_count: number; reply_count: number; retweet_count: number; quote_count: number; impression_count?: number };
}
interface User {
  id: string;
  username: string;
  name: string;
  public_metrics?: { followers_count: number };
}

export const x: MarketProvider = {
  id: "x",
  name: "X",
  description: "Recent posts with engagement and author follower counts via X API v2 recent search.",
  category: "social",
  docsUrl: "https://developer.x.com/en/docs/x-api/tweets/search/introduction",
  access: "official_api",
  credentialFields: [{ key: "bearerToken", label: "Bearer token", secret: true, help: "Requires an X API plan that includes recent search." }],
  envFallback: { bearerToken: "X_BEARER_TOKEN" },
  isReady: (c) => !!c.bearerToken,
  async search(query, { since, limit }, creds) {
    const params = new URLSearchParams({
      query: `${query} -is:retweet lang:en`,
      max_results: String(Math.max(10, Math.min(limit, 100))),
      start_time: new Date(Math.max(since.getTime(), Date.now() - 6.9 * 86_400_000)).toISOString(),
      "tweet.fields": "created_at,public_metrics,author_id",
      expansions: "author_id",
      "user.fields": "username,name,public_metrics",
    });
    const data = await getJson<{ data?: Tweet[]; includes?: { users?: User[] } }>("x", `https://api.x.com/2/tweets/search/recent?${params}`, {
      headers: { Authorization: `Bearer ${creds.bearerToken}` },
    });
    const users = new Map((data.includes?.users ?? []).map((u) => [u.id, u]));
    return (data.data ?? []).map((t): FetchedPost => {
      const u = users.get(t.author_id);
      const handle = u?.username ?? t.author_id;
      return {
        externalId: t.id,
        url: `https://x.com/${handle}/status/${t.id}`,
        authorHandle: handle,
        authorName: u?.name,
        authorUrl: `https://x.com/${handle}`,
        authorFollowers: u?.public_metrics?.followers_count,
        content: t.text,
        publishedAt: new Date(t.created_at),
        engagement: { likes: t.public_metrics.like_count, comments: t.public_metrics.reply_count, shares: t.public_metrics.retweet_count + t.public_metrics.quote_count, views: t.public_metrics.impression_count },
      };
    });
  },
};
