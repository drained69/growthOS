import { getJson } from "./http";
import type { FetchedPost, MarketProvider } from "./types";

/** GitHub REST search (issues/discussions + repositories). Works unauthenticated at low rate; GITHUB_TOKEN raises limits. */
const headers = (): Record<string, string> => ({
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
});

interface Issue {
  id: number;
  html_url: string;
  title: string;
  body: string | null;
  user: { login: string; html_url: string };
  created_at: string;
  comments: number;
  reactions?: { total_count: number };
  repository_url: string;
}
interface Repo {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  owner: { login: string; html_url: string; type: string };
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
  created_at: string;
  topics?: string[];
}

export const github: MarketProvider = {
  id: "github",
  name: "GitHub",
  status: () => ({
    id: "github",
    name: "GitHub",
    available: true,
    note: process.env.GITHUB_TOKEN ? "GitHub REST search (authenticated)" : "GitHub REST search (unauthenticated, 10 req/min)",
    requiresEnv: [],
  }),
  async search(query, { since, limit }) {
    const day = since.toISOString().slice(0, 10);
    const per = Math.min(Math.ceil(limit / 2), 30);
    const [issues, repos] = await Promise.all([
      getJson<{ items: Issue[] }>("github", `https://api.github.com/search/issues?q=${encodeURIComponent(`${query} created:>${day}`)}&sort=created&order=desc&per_page=${per}`, { headers: headers() }),
      getJson<{ items: Repo[] }>("github", `https://api.github.com/search/repositories?q=${encodeURIComponent(`${query} pushed:>${day}`)}&sort=updated&order=desc&per_page=${per}`, { headers: headers() }),
    ]);
    const fromIssues = issues.items.map(
      (i): FetchedPost => ({
        externalId: `issue-${i.id}`,
        url: i.html_url,
        authorHandle: i.user.login,
        authorUrl: i.user.html_url,
        title: `${i.repository_url.split("/repos/")[1]}: ${i.title}`,
        content: `${i.title}\n${(i.body ?? "").slice(0, 3000)}`,
        publishedAt: new Date(i.created_at),
        engagement: { comments: i.comments, likes: i.reactions?.total_count ?? 0 },
      }),
    );
    const fromRepos = repos.items.map(
      (r): FetchedPost => ({
        externalId: `repo-${r.id}`,
        url: r.html_url,
        authorHandle: r.owner.login,
        authorUrl: r.owner.html_url,
        title: r.full_name,
        companyHint: r.owner.type === "Organization" ? r.owner.login : undefined,
        content: `${r.full_name}: ${r.description ?? ""} ${(r.topics ?? []).join(" ")}`,
        publishedAt: new Date(r.pushed_at),
        engagement: { stars: r.stargazers_count, shares: r.forks_count },
      }),
    );
    return [...fromIssues, ...fromRepos];
  },
};
