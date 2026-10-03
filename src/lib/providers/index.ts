import { github } from "./github";
import { hackernews } from "./hackernews";
import { reddit } from "./reddit";
import { youtube } from "./youtube";
import { x } from "./x";
import { rss } from "./rss";
import { tiktok, discord, telegram } from "./unavailable";
import type { MarketProvider } from "./types";

/** Priority order: X, GitHub, Reddit, YouTube, news/blogs — then declared-only sources. */
export const PROVIDERS: MarketProvider[] = [x, github, reddit, youtube, hackernews, rss, tiktok, discord, telegram];

export function availableProviders(): MarketProvider[] {
  return PROVIDERS.filter((p) => p.status().available);
}

export * from "./types";
