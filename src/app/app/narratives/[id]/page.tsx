import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { requireProject } from "@/lib/auth/current";
import { schema as s } from "@/lib/db/client";
import { termHits } from "@/lib/intel/signals";
import { PageHeader, Panel, EvidenceItem, ModeBadge, Badge, KV, Velocity } from "@/components/ui";
import { Columns } from "@/components/charts";
import { DAY_MS } from "@/lib/util/time";

export default async function Narrative({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project, db } = await requireProject();
  const [n] = await db.select().from(s.narratives).where(and(eq(s.narratives.id, id), eq(s.narratives.projectId, project.id)));
  if (!n) notFound();
  const [profile] = await db.select().from(s.productProfiles).where(eq(s.productProfiles.projectId, project.id));
  const posts = (await db.select({ p: s.socialPosts }).from(s.narrativePosts).innerJoin(s.socialPosts, eq(s.narrativePosts.postId, s.socialPosts.id)).where(eq(s.narrativePosts.narrativeId, n.id))).map((r) => r.p);
  const ev = await db.select().from(s.evidence).where(eq(s.evidence.narrativeId, n.id)).orderBy(desc(s.evidence.observedAt));
  const voices = (await db.select({ k: s.kols }).from(s.narrativeKols).innerJoin(s.kols, eq(s.narrativeKols.kolId, s.kols.id)).where(eq(s.narrativeKols.narrativeId, n.id))).map((r) => r.k).sort((a, b) => b.overallScore - a.overallScore);
  const companies = (await db.select({ c: s.companies }).from(s.narrativeCompanies).innerJoin(s.companies, eq(s.narrativeCompanies.companyId, s.companies.id)).where(eq(s.narrativeCompanies.narrativeId, n.id))).map((r) => r.c);
  const competitors = [...new Set(posts.flatMap((p) => termHits(p.content, profile.competitors)))];
  const daily = Array.from({ length: 14 }, (_, i) => posts.filter((p) => Math.floor((Date.now() - p.publishedAt.getTime()) / DAY_MS) === 13 - i).length);
  const authors = [...new Set(posts.map((p) => p.authorHandle))];
  return (
    <div>
      <PageHeader
        crumbs={[{ label: "Narratives", href: "/app/narratives" }]}
        title={
          <span className="flex items-center gap-2">
            {n.label} <Badge tone="info">{n.status}</Badge> <ModeBadge mode={n.dataMode} />
          </span>
        }
        sub={n.summary ?? undefined}
      />
      <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <Panel title="Volume — last 14 days (this week highlighted)">
            <Columns values={daily} highlightFrom={7} height={70} labels={daily.map((_, i) => `${13 - i}d ago`)} />
          </Panel>
          <Panel title="Representative evidence">
            <ul className="space-y-2">
              {ev.map((e) => (
                <EvidenceItem key={e.id} e={e} />
              ))}
            </ul>
          </Panel>
        </div>
        <div className="space-y-3">
          <Panel title="Signal">
            <KV k="Volume (7d)" v={<span className="num">{n.volume7d}</span>} />
            <KV k="Prior 7d" v={<span className="num">{n.volumePrev7d}</span>} />
            <KV k="Velocity" v={<Velocity pct={n.velocityPct} />} />
            <KV k="Relevance to us" v={<span className="num">{n.relevance}/100</span>} />
            <KV k="Controversy" v={<span className="num">{Math.round(n.controversy * 100)}%</span>} />
            <KV k="Distinct voices" v={<span className="num">{authors.length}</span>} />
            <div className="mt-2 flex flex-wrap gap-1">
              {n.terms.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          </Panel>
          <Panel title="Important voices">
            {voices.length ? (
              <ul className="space-y-1.5">
                {voices.map((k) => (
                  <li key={k.id} className="flex items-center justify-between text-[12.5px]">
                    <Link href={`/app/kols/${k.id}`} className="hover:underline">
                      @{k.handle} <span className="text-ink-3">({k.provider})</span>
                    </Link>
                    <span className="num text-ink-2">{k.overallScore}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-[12px] text-ink-3">No dominant voice — room to lead.</div>
            )}
          </Panel>
          <Panel title="Related companies / potential customers">
            {companies.length ? companies.map((c) => (
              <Link key={c.id} href={`/app/customers/${c.id}`} className="block py-0.5 text-[12.5px] hover:underline">
                {c.name} <span className="num text-ink-3">intent {c.intentScore}</span>
              </Link>
            )) : <div className="text-[12px] text-ink-3">None yet.</div>}
          </Panel>
          <Panel title="Competitors involved">
            {competitors.length ? competitors.map((c) => <Badge key={c} tone="warn" className="mr-1">{c}</Badge>) : <div className="text-[12px] text-ink-3">No competitor mentions in this narrative.</div>}
          </Panel>
        </div>
      </div>
    </div>
  );
}
