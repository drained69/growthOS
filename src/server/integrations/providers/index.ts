import { github } from "@/server/integrations/providers/github";
import { hackernews } from "@/server/integrations/providers/hackernews";
import { reddit } from "@/server/integrations/providers/reddit";
import { youtube } from "@/server/integrations/providers/youtube";
import { x } from "@/server/integrations/providers/x";
import { rss } from "@/server/integrations/providers/rss";
import { tiktok, discord, telegram } from "@/server/integrations/providers/unavailable";
import type { MarketProvider, ProviderId } from "@/server/integrations/providers/types";

/** Priority order: X, GitHub, Reddit, YouTube, news/blogs — then restricted sources. */
export const PROVIDERS: MarketProvider[] = [x, github, reddit, youtube, hackernews, rss, tiktok, discord, telegram];

export function providerById(id: string): MarketProvider | undefined {
  return PROVIDERS.find((p) => p.id === (id as ProviderId));
}

export * from "@/server/integrations/providers/types";
