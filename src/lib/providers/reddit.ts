import { getJson } from "./http";
import { ProviderError, type FetchedPost, type MarketProvider } from "./types";

/** Reddit Data API with app-only OAuth (client credentials), per Reddit's API terms. */
let token: { value: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  if (token && token.exp > Date.now() + 60_000) return token.value;
  const id = process.env.REDDIT_CLIENT_ID!;
  const secret = process.env.REDDIT_CLIENT_SECRET!;
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": process.env.REDDIT_USER_AGENT ?? "web:growthos:0.1 (by /u/growthos)",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new ProviderError("reddit", `OAuth failed: HTTP ${res.status}`, res.status);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return token.value;
}

interface Child {
  data: { id: string; title: string; selftext: string; author: string; created_utc: number; score: number; num_comments: number; permalink: string; subreddit: string };
}

export const reddit: MarketProvider = {
  id: "reddit",
  name: "Reddit",
  status: () => {
    const ok = !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET);
    return { id: "reddit", name: "Reddit", available: ok, note: ok ? "Reddit Data API (app-only OAuth)" : "Set REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET (Reddit requires OAuth for API access)", requiresEnv: ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET"] };
  },
  async search(query, { since, limit }) {
    const t = await accessToken();
    const data = await getJson<{ data: { children: Child[] } }>(
      "reddit",
      `https://oauth.reddit.com/search?q=${encodeURIComponent(query)}&sort=new&t=month&limit=${Math.min(limit, 50)}&type=link`,
      { headers: { Authorization: `Bearer ${t}`, "User-Agent": process.env.REDDIT_USER_AGENT ?? "web:growthos:0.1 (by /u/growthos)" } },
    );
    return data.data.children
      .map((c) => c.data)
      .filter((d) => d.created_utc * 1000 >= since.getTime())
      .map(
        (d): FetchedPost => ({
          externalId: d.id,
          url: `https://www.reddit.com${d.permalink}`,
          authorHandle: d.author,
          authorUrl: `https://www.reddit.com/user/${d.author}`,
          title: `r/${d.subreddit}: ${d.title}`,
          content: `${d.title}\n${d.selftext.slice(0, 3000)}`,
          publishedAt: new Date(d.created_utc * 1000),
          engagement: { score: d.score, comments: d.num_comments },
        }),
      );
  },
};
