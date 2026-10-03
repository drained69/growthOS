import { getJson } from "./http";
import type { FetchedPost, MarketProvider } from "./types";

/** YouTube Data API v3 (API key). Video stats + channel subscriber counts. */
interface SearchItem {
  id: { videoId: string };
  snippet: { title: string; description: string; channelId: string; channelTitle: string; publishedAt: string };
}

export const youtube: MarketProvider = {
  id: "youtube",
  name: "YouTube",
  status: () => {
    const ok = !!process.env.YOUTUBE_API_KEY;
    return { id: "youtube", name: "YouTube", available: ok, note: ok ? "YouTube Data API v3" : "Set YOUTUBE_API_KEY", requiresEnv: ["YOUTUBE_API_KEY"] };
  },
  async search(query, { since, limit }) {
    const key = process.env.YOUTUBE_API_KEY!;
    const s = await getJson<{ items: SearchItem[] }>(
      "youtube",
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=date&q=${encodeURIComponent(query)}&publishedAfter=${since.toISOString()}&maxResults=${Math.min(limit, 25)}&key=${key}`,
    );
    if (!s.items.length) return [];
    const ids = s.items.map((i) => i.id.videoId).join(",");
    const channelIds = [...new Set(s.items.map((i) => i.snippet.channelId))].join(",");
    const [v, c] = await Promise.all([
      getJson<{ items: { id: string; statistics: { viewCount?: string; likeCount?: string; commentCount?: string } }[] }>("youtube", `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${key}`),
      getJson<{ items: { id: string; statistics: { subscriberCount?: string } }[] }>("youtube", `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelIds}&key=${key}`),
    ]);
    const stats = new Map(v.items.map((i) => [i.id, i.statistics]));
    const subs = new Map(c.items.map((i) => [i.id, Number(i.statistics.subscriberCount ?? 0)]));
    return s.items.map((i): FetchedPost => {
      const st = stats.get(i.id.videoId) ?? {};
      return {
        externalId: i.id.videoId,
        url: `https://www.youtube.com/watch?v=${i.id.videoId}`,
        authorHandle: i.snippet.channelTitle,
        authorUrl: `https://www.youtube.com/channel/${i.snippet.channelId}`,
        authorFollowers: subs.get(i.snippet.channelId),
        title: i.snippet.title,
        content: `${i.snippet.title}\n${i.snippet.description}`,
        publishedAt: new Date(i.snippet.publishedAt),
        engagement: { views: Number(st.viewCount ?? 0), likes: Number(st.likeCount ?? 0), comments: Number(st.commentCount ?? 0) },
      };
    });
  },
};
