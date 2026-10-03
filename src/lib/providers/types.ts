export type ProviderId = "x" | "github" | "reddit" | "youtube" | "hackernews" | "rss" | "tiktok" | "discord" | "telegram";

export interface ProviderStatus {
  id: ProviderId;
  name: string;
  available: boolean;
  /** Why it is unavailable, or what access it uses. */
  note: string;
  requiresEnv: string[];
}

export interface FetchedPost {
  externalId: string;
  url: string;
  authorHandle: string;
  authorName?: string;
  authorUrl?: string;
  authorFollowers?: number;
  title?: string;
  /** Organization the post is attributable to, only when the source states it (e.g. GitHub org owner). */
  companyHint?: string;
  content: string;
  publishedAt: Date;
  engagement: { likes?: number; comments?: number; shares?: number; views?: number; score?: number; stars?: number };
}

export interface SearchOptions {
  since: Date;
  limit: number;
}

export interface MarketProvider {
  id: ProviderId;
  name: string;
  status(): ProviderStatus;
  search(query: string, opts: SearchOptions): Promise<FetchedPost[]>;
}

export class ProviderError extends Error {
  constructor(
    public provider: ProviderId,
    message: string,
    public status?: number,
  ) {
    super(`[${provider}] ${message}`);
  }
}
