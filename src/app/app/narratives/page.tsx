import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireProject } from "@/lib/auth/current";
import { schema as s } from "@/lib/db/client";
import { PageHeader, Panel, Table, ModeBadge, Badge, Velocity, Empty } from "@/components/ui";
import { Sparkline } from "@/components/charts";
import { DAY_MS } from "@/lib/util/time";

const STATUS_TONE: Record<string, "good" | "info" | "warn" | "bad" | "neutral" | "accent"> = { EMERGING: "accent", ACCELERATING: "good", PEAKING: "warn", DECLINING: "bad", CONTROVERSIAL: "warn", UNDEREXPLORED: "info", STABLE: "neutral" };

export default async function Narratives() {
  const { project, db } = await requireProject();
  const rows = await db.select().from(s.narratives).where(eq(s.narratives.projectId, project.id)).orderBy(desc(s.narratives.relevance), desc(s.narratives.volume7d));
  const links = await db.select({ n: s.narrativePosts.narrativeId, at: s.socialPosts.publishedAt }).from(s.narrativePosts).innerJoin(s.socialPosts, eq(s.narrativePosts.postId, s.socialPosts.id)).where(eq(s.socialPosts.projectId, project.id));
  const series = (id: string) => Array.from({ length: 14 }, (_, i) => links.filter((l) => l.n === id && Math.floor((Date.now() - l.at.getTime()) / DAY_MS) === 13 - i).length);
  const top = rows.filter((r) => r.relevance >= 40).slice(0, 5);
  return (
    <div>
      <PageHeader title="Narratives" sub="Public conversation clustered into themes. Week-over-week volume decides the lifecycle; relevance is overlap with the product's own vocabulary." />
      {top.length > 0 && (
        <Panel title="Your market this week" className="mb-3">
          <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
            {top.map((n) => (
              <Link key={n.id} href={`/app/narratives/${n.id}`} className="flex items-center justify-between border-b border-line py-1.5">
                <span className="text-[13.5px] text-ink">{n.label}</span>
                <Velocity pct={n.velocityPct} />
              </Link>
            ))}
          </div>
        </Panel>
      )}
      <Panel pad={false}>
        {rows.length ? (
          <Table>
            <thead>
              <tr>
                <th>Narrative</th>
                <th>Status</th>
                <th className="text-right">7d</th>
                <th className="text-right">Prior 7d</th>
                <th className="text-right">Velocity</th>
                <th className="text-right">Relevance</th>
                <th>14 days</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id}>
                  <td>
                    <Link href={`/app/narratives/${n.id}`} className="font-medium hover:underline">
                      {n.label}
                    </Link>
                    <div className="text-[11px] text-ink-3">{n.terms.slice(0, 5).join(" · ")}</div>
                  </td>
                  <td>
                    <Badge tone={STATUS_TONE[n.status]}>{n.status}</Badge>
                    <div className="mt-0.5 text-[10.5px] text-ink-3">{n.summary}</div>
                  </td>
                  <td className="num text-right">{n.volume7d}</td>
                  <td className="num text-right text-ink-3">{n.volumePrev7d}</td>
                  <td className="text-right">
                    <Velocity pct={n.velocityPct} />
                  </td>
                  <td className="num text-right">{n.relevance}</td>
                  <td>
                    <Sparkline values={series(n.id)} width={110} height={22} label={n.label} />
                  </td>
                  <td className="text-right">
                    <ModeBadge mode={n.dataMode} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="p-4">
            <Empty title="No narratives yet">Narratives appear once enough relevant public posts are collected.</Empty>
          </div>
        )}
      </Panel>
    </div>
  );
}
