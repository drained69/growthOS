import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireProject } from "@/server/auth/current";
import { schema as s } from "@/server/db/client";
import { PageHeader, Panel, Table, ModeBadge, Badge, Empty } from "@/components/ui";
import type { ScoreComponent } from "@/server/domain/scoring/intent";

const COLS: [string, string][] = [
  ["audienceFit", "Audience"],
  ["topicAuthority", "Authority"],
  ["recentRelevance", "Recent"],
  ["engagementQuality", "Engage"],
  ["narrativeFit", "Narrative"],
  ["historicalProductFit", "History"],
  ["authenticity", "Authentic"],
  ["campaignFit", "Campaign"],
];

function cell(v?: number) {
  if (v == null) return <span className="text-ink-4">—</span>;
  const tone = v >= 75 ? "text-ink" : v >= 50 ? "text-ink-2" : "text-ink-4";
  return <span className={`num ${tone}`}>{v}</span>;
}

export default async function Kols() {
  const { project, db } = await requireProject();
  const rows = await db.select().from(s.kols).where(eq(s.kols.projectId, project.id)).orderBy(desc(s.kols.overallScore));
  return (
    <div>
      <PageHeader title="KOL intelligence" sub="Ranked by relevance, authority, recency, discussion quality and authenticity. Follower count is shown, but only enters scoring log-damped (max +10 on authority)." />
      <Panel pad={false}>
        {rows.length ? (
          <Table>
            <thead>
              <tr>
                <th>Creator</th>
                <th className="text-right">Followers</th>
                {COLS.map(([, l]) => (
                  <th key={l} className="text-right">
                    {l}
                  </th>
                ))}
                <th className="text-right">Overall</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((k) => {
                const m = k.metrics as Record<string, ScoreComponent>;
                return (
                  <tr key={k.id}>
                    <td>
                      <Link href={`/app/kols/${k.id}`} className="font-medium hover:underline">
                        @{k.handle}
                      </Link>
                      <div className="text-[11px] text-ink-3">{k.provider}</div>
                    </td>
                    <td className="num text-right text-ink-3">{k.followers ? k.followers.toLocaleString() : "—"}</td>
                    {COLS.map(([key]) => (
                      <td key={key} className="text-right">
                        {cell(m[key]?.score)}
                      </td>
                    ))}
                    <td className="num text-right text-[14px]">{k.overallScore}</td>
                    <td className="text-right">
                      {k.status !== "candidate" && <Badge className="mr-1">{k.status}</Badge>}
                      <ModeBadge mode={k.dataMode} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <div className="p-4">
            <Empty title="No relevant voices yet" />
          </div>
        )}
      </Panel>
    </div>
  );
}
