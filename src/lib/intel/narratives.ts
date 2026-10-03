import { DAY_MS } from "../util/time";
import { termHits } from "./signals";

/**
 * Narrative engine: deterministic clustering of public conversation into themes.
 *  1. Candidate terms = product keywords ∪ frequent bigrams in the corpus.
 *  2. Each term maps to the set of posts containing it.
 *  3. Terms whose post sets overlap (Jaccard ≥ 0.45) merge into one narrative.
 *  4. Volume/velocity over 7-day windows → lifecycle status.
 */

export type NarrativeStatus = "EMERGING" | "ACCELERATING" | "PEAKING" | "DECLINING" | "CONTROVERSIAL" | "UNDEREXPLORED" | "STABLE";

export interface NarrativePost {
  id: string;
  text: string;
  publishedAt: Date;
  authorHandle: string;
  negative?: boolean;
}

export interface NarrativeCluster {
  key: string;
  label: string;
  terms: string[];
  postIds: string[];
  volume7d: number;
  volumePrev7d: number;
  velocityPct: number;
  relevance: number;
  controversy: number;
  voices: string[];
  status: NarrativeStatus;
  statusReason: string;
}

const STOP = new Set(
  "a an the and or but if then of to in on for with at by from up about into over after is are was were be been being have has had do does did this that these those it its we our you your they their i me my he she his her them as not no so just very can will would should could may might also more most some any all each every than too new one two get got how what why when where who which out like via vs use using used make made here there now really been there's i'm it's don't we're you're".split(" "),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w));
}

export function frequentBigrams(texts: string[], minDocs = 3, limit = 40): string[] {
  const df = new Map<string, number>();
  for (const t of texts) {
    const toks = tokenize(t);
    const seen = new Set<string>();
    for (let i = 0; i < toks.length - 1; i++) seen.add(`${toks[i]} ${toks[i + 1]}`);
    for (const b of seen) df.set(b, (df.get(b) ?? 0) + 1);
  }
  return [...df.entries()]
    .filter(([, n]) => n >= minDocs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([b]) => b);
}

const jaccard = (a: Set<string>, b: Set<string>) => {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
};

const titleCase = (s: string) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\bApi\b/g, "API").replace(/\bSdk\b/g, "SDK").replace(/\bUsdc\b/g, "USDC").replace(/\bAi\b/g, "AI").replace(/\bUx\b/g, "UX");

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export function classifyStatus(v7: number, prev: number, relevance: number, controversy: number, recentShare: number): { status: NarrativeStatus; reason: string } {
  const velocity = prev ? (v7 - prev) / prev : v7 > 0 ? 1 : 0;
  if (controversy >= 0.35 && v7 >= 3) return { status: "CONTROVERSIAL", reason: `${Math.round(controversy * 100)}% of posts are critical or disputed` };
  if (prev <= 1 && v7 >= 3) return { status: "EMERGING", reason: `Appeared this week (${v7} posts vs ${prev} prior)` };
  if (velocity >= 0.3 && v7 >= 4) return { status: "ACCELERATING", reason: `+${Math.round(velocity * 100)}% week over week` };
  if (velocity <= -0.2 && prev >= 3) return { status: "DECLINING", reason: `${Math.round(velocity * 100)}% week over week` };
  if (v7 >= 8 && recentShare < 0.35) return { status: "PEAKING", reason: "High volume, but the last 3 days are slowing" };
  if (relevance >= 60 && v7 <= 3) return { status: "UNDEREXPLORED", reason: "Highly relevant to us, few voices discussing it" };
  return { status: "STABLE", reason: `${v7} posts this week, ${prev} last week` };
}

export function clusterNarratives(posts: NarrativePost[], ctx: { keywords: string[]; now?: number; maxClusters?: number }): NarrativeCluster[] {
  const now = ctx.now ?? Date.now();
  const window = posts.filter((p) => now - p.publishedAt.getTime() <= 14 * DAY_MS);
  if (!window.length) return [];

  const candidates = [...new Set([...ctx.keywords.map((k) => k.toLowerCase()), ...frequentBigrams(window.map((p) => p.text))])];
  const termPosts = new Map<string, Set<string>>();
  for (const term of candidates) {
    const ids = new Set(window.filter((p) => termHits(p.text, [term]).length).map((p) => p.id));
    if (ids.size >= 2) termPosts.set(term, ids);
  }

  // Greedy agglomeration, largest term first.
  const clusters: { terms: string[]; ids: Set<string> }[] = [];
  for (const [term, ids] of [...termPosts.entries()].sort((a, b) => b[1].size - a[1].size)) {
    const home = clusters.find((c) => jaccard(c.ids, ids) >= 0.45);
    if (home) {
      home.terms.push(term);
      for (const id of ids) home.ids.add(id);
    } else clusters.push({ terms: [term], ids: new Set(ids) });
  }

  const byId = new Map(window.map((p) => [p.id, p]));
  const kw = new Set(ctx.keywords.map((k) => k.toLowerCase()));
  const out: NarrativeCluster[] = clusters.map((c) => {
    const ps = [...c.ids].map((id) => byId.get(id)!);
    const v7 = ps.filter((p) => now - p.publishedAt.getTime() <= 7 * DAY_MS).length;
    const prev = ps.length - v7;
    const last3 = ps.filter((p) => now - p.publishedAt.getTime() <= 3 * DAY_MS).length;
    const directKw = c.terms.filter((t) => kw.has(t)).length;
    const coKw = ps.filter((p) => termHits(p.text, ctx.keywords).length).length / (ps.length || 1);
    const relevance = Math.round(Math.min(100, directKw * 45 + coKw * 55));
    const controversy = ps.filter((p) => p.negative).length / (ps.length || 1);
    const { status, reason } = classifyStatus(v7, prev, relevance, controversy, v7 ? last3 / v7 : 0);
    const label = titleCase(c.terms[0]);
    return {
      key: slugify(c.terms[0]),
      label,
      terms: c.terms.slice(0, 8),
      postIds: [...c.ids],
      volume7d: v7,
      volumePrev7d: prev,
      velocityPct: prev ? Math.round(((v7 - prev) / prev) * 100) : v7 ? 100 : 0,
      relevance,
      controversy: Math.round(controversy * 100) / 100,
      voices: [...new Set(ps.map((p) => p.authorHandle))],
      status,
      statusReason: reason,
    };
  });

  return out
    .filter((c) => c.postIds.length >= 3)
    .sort((a, b) => b.relevance * 2 + b.volume7d - (a.relevance * 2 + a.volume7d))
    .slice(0, ctx.maxClusters ?? 12);
}
