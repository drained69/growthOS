import { stripHtml, USER_AGENT } from "../providers/http";

/**
 * Polite public-page reader for product onboarding. Honors robots.txt (User-agent: *),
 * one request per page, short timeouts, text only.
 */

const robotsCache = new Map<string, string[]>();

async function disallowedPaths(origin: string): Promise<string[]> {
  if (robotsCache.has(origin)) return robotsCache.get(origin)!;
  let rules: string[] = [];
  try {
    const r = await fetch(`${origin}/robots.txt`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (r.ok) {
      let applies = false;
      for (const raw of (await r.text()).split("\n")) {
        const line = raw.split("#")[0].trim();
        const [k, ...rest] = line.split(":");
        const v = rest.join(":").trim();
        if (/^user-agent$/i.test(k)) applies = v === "*" || /growthos/i.test(v);
        else if (applies && /^disallow$/i.test(k) && v) rules.push(v);
      }
    }
  } catch {
    rules = [];
  }
  robotsCache.set(origin, rules);
  return rules;
}

export interface PageText {
  url: string;
  ok: boolean;
  title?: string;
  description?: string;
  headings: string[];
  text: string;
  note?: string;
}

export async function readPage(url: string, maxChars = 15_000): Promise<PageText> {
  let u: URL;
  try {
    u = new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    return { url, ok: false, headings: [], text: "", note: "invalid URL" };
  }
  const blocked = (await disallowedPaths(u.origin)).some((p) => u.pathname.startsWith(p));
  if (blocked) return { url: u.toString(), ok: false, headings: [], text: "", note: "disallowed by robots.txt" };
  try {
    const r = await fetch(u, { headers: { "User-Agent": USER_AGENT, Accept: "text/html,text/plain,text/markdown" }, signal: AbortSignal.timeout(12_000), redirect: "follow" });
    if (!r.ok) return { url: u.toString(), ok: false, headings: [], text: "", note: `HTTP ${r.status}` };
    const body = (await r.text()).slice(0, 600_000);
    const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const description = body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? body.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1];
    const headings = [...body.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map((m) => stripHtml(m[1])).filter((h) => h && h.length < 160).slice(0, 40);
    return { url: u.toString(), ok: true, title: title ? stripHtml(title) : undefined, description: description ? stripHtml(description) : undefined, headings, text: stripHtml(body).slice(0, maxChars) };
  } catch (e) {
    return { url: u.toString(), ok: false, headings: [], text: "", note: (e as Error).message };
  }
}

/** README of a public GitHub repo via the REST API (raw media type). */
export async function readGithubReadme(repoUrl: string): Promise<PageText> {
  const m = repoUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/);
  if (!m) return { url: repoUrl, ok: false, headings: [], text: "", note: "not a repo URL (org pages are skipped)" };
  const api = `https://api.github.com/repos/${m[1]}/${m[2].replace(/\.git$/, "")}/readme`;
  try {
    const r = await fetch(api, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/vnd.github.raw+json", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return { url: repoUrl, ok: false, headings: [], text: "", note: `HTTP ${r.status}` };
    const md = await r.text();
    const headings = [...md.matchAll(/^#{1,3}\s+(.+)$/gm)].map((x) => x[1].trim()).slice(0, 40);
    return { url: repoUrl, ok: true, title: `${m[1]}/${m[2]}`, headings, text: md.slice(0, 15_000) };
  } catch (e) {
    return { url: repoUrl, ok: false, headings: [], text: "", note: (e as Error).message };
  }
}
