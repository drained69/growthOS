import { stripHtml, USER_AGENT } from "./http";
import { ProviderError, type FetchedPost, type MarketProvider } from "./types";
import { termHits } from "../intel/signals";
import { sha256 } from "../util/ids";

/** News/blogs via RSS/Atom feeds the founder configures (RSS_FEEDS, comma-separated). */
function tag(block: string, name: string): string | undefined {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : undefined;
}

export function parseFeed(xml: string): { title: string; link: string; date: Date; author: string; body: string }[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) ?? [];
  return blocks.map((b) => {
    const atomLink = b.match(/<link[^>]*href="([^"]+)"/i)?.[1];
    return {
      title: stripHtml(tag(b, "title") ?? ""),
      link: (tag(b, "link") || atomLink || "").trim(),
      date: new Date(tag(b, "pubDate") ?? tag(b, "updated") ?? tag(b, "published") ?? Date.now()),
      author: stripHtml(tag(b, "dc:creator") ?? tag(b, "author") ?? "unknown").slice(0, 80),
      body: stripHtml(tag(b, "description") ?? tag(b, "content") ?? tag(b, "summary") ?? "").slice(0, 3000),
    };
  });
}

export const rss: MarketProvider = {
  id: "rss",
  name: "News & blogs (RSS)",
  status: () => {
    const ok = !!process.env.RSS_FEEDS;
    return { id: "rss", name: "News & blogs (RSS)", available: ok, note: ok ? `${process.env.RSS_FEEDS!.split(",").length} configured feed(s)` : "Set RSS_FEEDS to a comma-separated list of feed URLs", requiresEnv: ["RSS_FEEDS"] };
  },
  async search(query, { since, limit }) {
    const feeds = (process.env.RSS_FEEDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const terms = query.split(/\s+OR\s+/i).map((t) => t.replace(/"/g, "").trim());
    const out: FetchedPost[] = [];
    for (const feed of feeds) {
      const res = await fetch(feed, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(10_000) }).catch((e) => {
        throw new ProviderError("rss", `${feed}: ${(e as Error).message}`);
      });
      if (!res.ok) continue;
      const host = new URL(feed).host;
      for (const it of parseFeed(await res.text())) {
        if (it.date < since || !it.link) continue;
        if (!termHits(`${it.title} ${it.body}`, terms).length) continue;
        out.push({ externalId: sha256(it.link).slice(0, 24), url: it.link, authorHandle: `${it.author}@${host}`, title: it.title, content: `${it.title}\n${it.body}`, publishedAt: it.date, engagement: {} });
      }
    }
    return out.slice(0, limit);
  },
};
