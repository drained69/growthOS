import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireProject } from "@/server/auth/current";
import { schema as s } from "@/server/db/client";
import { PageHeader, Panel, ModeBadge, Badge, Confidence, Empty, cx } from "@/components/ui";
import { fmtUsdc } from "@/lib/money";

const TYPES = ["ALL", "CUSTOMER", "KOL", "NARRATIVE", "DEVELOPER", "PRODUCT_ISSUE", "COMPETITOR", "PARTNERSHIP", "CONTENT", "COMMUNITY", "EVENT"];

export default async function Opportunities({ searchParams }: { searchParams: Promise<{ type?: string; status?: string }> }) {
  const { type = "ALL", status = "active" } = await searchParams;
  const { project, db } = await requireProject();
  const all = await db.select().from(s.opportunities).where(eq(s.opportunities.projectId, project.id)).orderBy(desc(s.opportunities.overallScore));
  const rows = all.filter((o) => (type === "ALL" || o.type === type) && (status === "all" || (status === "active" ? o.status !== "dismissed" : o.status === status)));
  const counts = Object.fromEntries(TYPES.map((t) => [t, all.filter((o) => t === "ALL" || o.type === t).length]));
  return (
    <div>
      <PageHeader title="Opportunities" sub="Everything GrowthOS found, prioritized. Each one answers: why this, why now, what evidence, what to do, and what it is worth spending." />
      <div className="mb-3 flex flex-wrap gap-1">
        {TYPES.filter((t) => counts[t] > 0 || t === "ALL").map((t) => (
          <Link key={t} href={`/app/opportunities?type=${t}`} className={cx("rounded border px-2.5 py-1 text-[12px]", type === t ? "border-s1 bg-s1/10 text-ink" : "border-line text-ink-3 hover:text-ink")}>
            {t.replace("_", " ")} <span className="num text-ink-4">{counts[t]}</span>
          </Link>
        ))}
      </div>
      {rows.length ? (
        <div className="grid gap-2 lg:grid-cols-2">
          {rows.map((o) => (
            <Link key={o.id} href={`/app/opportunities/${o.id}`} className="block rounded-md border border-line bg-surface px-3.5 py-3 hover:border-line-strong">
              <div className="flex items-center gap-2 text-[11px] text-ink-3">
                <span className="num">#{o.number}</span>
                <Badge tone={o.type === "PRODUCT_ISSUE" ? "bad" : o.type === "KOL" ? "accent" : o.type === "CUSTOMER" ? "info" : "neutral"}>
                  {o.type.replace("_", " ")}
                  {o.secondaryType ? ` + ${o.secondaryType}` : ""}
                </Badge>
                <span>EV {o.expectedValue}</span>
                <span>·</span>
                <span className="num">est. {fmtUsdc(o.estimatedCostMicro)}</span>
                <span className="ml-auto flex items-center gap-1.5">
                  {o.status !== "open" && <Badge>{o.status}</Badge>}
                  <ModeBadge mode={o.dataMode} />
                </span>
              </div>
              <div className="mt-1.5 text-[13.5px] font-medium text-ink">{o.title}</div>
              <ul className="mt-1 space-y-0.5 text-[12px] text-ink-2">
                {o.whyNow.slice(0, 2).map((w) => (
                  <li key={w} className="line-clamp-1">• {w}</li>
                ))}
              </ul>
              <div className="mt-2 flex items-center justify-between">
                <Confidence value={o.confidence} />
                <span className="num text-[12px] text-ink-3">score {o.overallScore}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Empty title="No opportunities match" />
      )}
    </div>
  );
}
