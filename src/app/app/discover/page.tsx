import Link from "next/link";
import { and, desc, eq, gte } from "drizzle-orm";
import { requireProject } from "@/lib/auth/current";
import { schema as s } from "@/lib/db/client";
import { classifySignals, SIGNAL_LABEL, termHits } from "@/lib/intel/signals";
import { analyzeMention } from "@/lib/intel/mentions";
import { PROVIDERS } from "@/lib/providers";
import { relTime, DAY_MS } from "@/lib/util/time";
import { PageHeader, Panel, ModeBadge, Badge, StatusDot, cx } from "@/components/ui";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "customers", label: "Customers" },
  { key: "kols", label: "KOLs" },
  { key: "narratives", label: "Narratives" },
  { key: "competitors", label: "Competitors" },
  { key: "feedback", label: "Product feedback" },
] as const;

export default async function Discover({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter = "all" } = await searchParams;
  const { project, db } = await requireProject();
  const [profile] = await db.select().from(s.productProfiles).where(eq(s.productProfiles.projectId, project.id));
  const posts = await db.select().from(s.socialPosts).where(and(eq(s.socialPosts.projectId, project.id), gte(s.socialPosts.publishedAt, new Date(Date.now() - 30 * DAY_MS)))).orderBy(desc(s.socialPosts.publishedAt)).limit(300);
  const kolHandles = new Set((await db.select({ h: s.kols.handle }).from(s.kols).where(eq(s.kols.projectId, project.id))).map((k) => k.h.toLowerCase()));
  const narrPostIds = new Set((await db.select({ id: s.narrativePosts.postId }).from(s.narrativePosts).innerJoin(s.narratives, eq(s.narrativePosts.narrativeId, s.narratives.id)).where(eq(s.narratives.projectId, project.id))).map((r) => r.id));
  const keywords = [...profile.keywords, ...profile.terminology];

  const rows = posts.map((p) => {
    const text = `${p.title ?? ""}\n${p.content}`;
    const signals = classifySignals(text, { competitors: profile.competitors, provider: p.provider });
    const mentionsUs = termHits(text, [project.name]).length > 0;
    const comp = termHits(text, profile.competitors);
    return { p, signals, topics: termHits(text, keywords), mentionsUs, comp, mention: mentionsUs ? analyzeMention(text, profile.competitors) : null };
  });
  const filtered = rows.filter((r) => {
    switch (filter) {
      case "customers":
        return r.p.entities.companies.length > 0 || r.signals.some((x) => ["recommendation_request", "initiative", "hiring", "funding", "migration"].includes(x.type));
      case "kols":
        return kolHandles.has(r.p.authorHandle.toLowerCase());
      case "narratives":
        return narrPostIds.has(r.p.id);
      case "competitors":
        return r.comp.length > 0;
      case "feedback":
        return r.mentionsUs;
      default:
        return r.topics.length > 0 || r.mentionsUs;
    }
  });

  return (
    <div>
      <PageHeader title="Discover" sub="Live research feed from legitimately accessible public sources. Every card links to its source; signals are classified by auditable rules." />
      <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
        <div>
          <div className="mb-3 flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <Link key={f.key} href={`/app/discover?filter=${f.key}`} className={cx("rounded border px-2.5 py-1 text-[12px]", filter === f.key ? "border-s1 bg-s1/10 text-ink" : "border-line text-ink-3 hover:text-ink")}>
                {f.label}
              </Link>
            ))}
            <span className="ml-auto self-center text-[11.5px] text-ink-3">{filtered.length} items</span>
          </div>
          <ul className="space-y-2">
            {filtered.slice(0, 120).map(({ p, signals, topics, mention, comp }) => (
              <li key={p.id} className="rounded-md border border-line bg-surface px-3.5 py-2.5">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-3">
                  <span className="num uppercase text-ink-2">{p.provider}</span>
                  <span>·</span>
                  <span className="text-ink-2">@{p.authorHandle}</span>
                  {p.authorFollowers ? <span className="num">({p.authorFollowers.toLocaleString()})</span> : null}
                  {p.entities.companies[0] && <Badge tone="info">{p.entities.companies[0]}</Badge>}
                  <span>·</span>
                  <span>{relTime(p.publishedAt)}</span>
                  <ModeBadge mode={p.dataMode} className="ml-auto" />
                </div>
                {p.title && <div className="mt-1 text-[13px] font-medium text-ink">{p.title}</div>}
                <p className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{p.content.slice(0, 360)}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {signals.filter((x) => x.type !== "mention").slice(0, 3).map((x) => (
                    <Badge key={x.type} tone="accent">
                      {SIGNAL_LABEL[x.type]}
                    </Badge>
                  ))}
                  {topics.slice(0, 4).map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                  {comp.map((c) => (
                    <Badge key={c} tone="warn">
                      vs {c}
                    </Badge>
                  ))}
                  {mention && (
                    <Badge tone={mention.sentiment === "negative" ? "bad" : mention.sentiment === "positive" ? "good" : "neutral"}>
                      {mention.sentiment} · {mention.categories.slice(0, 2).join(", ").replace(/_/g, " ") || "mention"}
                    </Badge>
                  )}
                  <a href={p.url} target={p.url.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="ml-auto text-[11px] text-s1 hover:underline">
                    source {p.url.startsWith("http") ? "↗" : ""}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <Panel title="Sources">
            <ul className="space-y-2">
              {PROVIDERS.map((pr) => {
                const st = pr.status();
                return (
                  <li key={pr.id} className="text-[12px]">
                    <div className="flex items-center gap-2">
                      <StatusDot tone={st.available ? "good" : "idle"} />
                      <span className={st.available ? "text-ink" : "text-ink-3"}>{st.name}</span>
                    </div>
                    <div className="ml-3.5 text-[11px] text-ink-3">{st.note}</div>
                  </li>
                );
              })}
            </ul>
            {project.dataMode === "DEMO" && <p className="mt-3 text-[11px] text-ink-3">This DEMO project analyzes a seeded fictional corpus; live providers are used by non-demo projects.</p>}
          </Panel>
          <Panel title="Search terms">
            <div className="flex flex-wrap gap-1">
              {profile.keywords.map((k) => (
                <Badge key={k}>{k}</Badge>
              ))}
            </div>
            <Link href="/app/settings" className="mt-2 block text-[11px] text-s1 hover:underline">
              edit in product profile →
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
