import { getJson, stripHtml } from "@/server/integrations/providers/http";
import type { FetchedPost, MarketProvider } from "@/server/integrations/providers/types";

/** Hacker News via the public Algolia HN Search API (no key, documented public API). */
interface HNHit {
  objectID: string;
  title: string | null;
  story_title: string | null;
  story_text: string | null;
  comment_text: string | null;
  author: string;
  created_at: string;
  points: number | null;
  num_comments: number | null;
  url: string | null;
}

export const hackernews: MarketProvider = {
  id: "hackernews",
  name: "Hacker News",
  status: () => ({ id: "hackernews", name: "Hacker News", available: true, note: "Public Algolia HN Search API", requiresEnv: [] }),
  async search(query, { since, limit }) {
    const ts = Math.floor(since.getTime() / 1000);
    const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=(story,comment)&numericFilters=created_at_i>${ts}&hitsPerPage=${Math.min(limit, 50)}`;
    const data = await getJson<{ hits: HNHit[] }>("hackernews", url);
    return data.hits.map(
      (h): FetchedPost => ({
        externalId: h.objectID,
        url: `https://news.ycombinator.com/item?id=${h.objectID}`,
        authorHandle: h.author,
        authorUrl: `https://news.ycombinator.com/user?id=${h.author}`,
        title: h.title ?? h.story_title ?? undefined,
        // "Show HN: Acme – ..." is a self-declared launch by the named product.
        companyHint: h.title?.match(/^(?:Show|Launch) HN:\s*([A-Z][\w.-]{1,30})\b/)?.[1],
        content: stripHtml([h.title, h.story_text, h.comment_text].filter(Boolean).join(" — ")).slice(0, 4000),
        publishedAt: new Date(h.created_at),
        engagement: { score: h.points ?? 0, comments: h.num_comments ?? 0 },
      }),
    );
  },
};
