import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireProject } from "@/server/auth/current";
import { schema as s } from "@/server/db/client";
import { PageHeader, Panel, Table, ModeBadge, Confidence, Badge, Empty } from "@/components/ui";
import { relTime } from "@/lib/time";

export default async function Customers() {
  const { project, db } = await requireProject();
  const rows = await db.select().from(s.companies).where(eq(s.companies.projectId, project.id)).orderBy(desc(s.companies.overallScore));
  return (
    <div>
      <PageHeader title="Customers" sub="Companies showing evidence of intent — not a contact list. Scores are transparent weighted components; confidence rises only when evidence quality does." />
      <Panel pad={false}>
        {rows.length ? (
          <Table>
            <thead>
              <tr>
                <th>Company</th>
                <th className="text-right">Overall</th>
                <th className="text-right">Fit</th>
                <th className="text-right">Intent</th>
                <th>Confidence</th>
                <th>Why now</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/app/customers/${c.id}`} className="font-medium text-ink hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="num text-right text-[14px]">{c.overallScore}</td>
                  <td className="num text-right text-ink-2">{c.fitScore}</td>
                  <td className="num text-right text-ink-2">{c.intentScore}</td>
                  <td>
                    <Confidence value={c.confidence} />
                  </td>
                  <td className="max-w-md truncate text-ink-2">{c.whyNow[0] ?? "—"}</td>
                  <td>
                    <Badge tone={c.status === "qualified" ? "good" : "neutral"}>{c.status}</Badge>
                  </td>
                  <td className="text-right">
                    <span className="mr-2 text-[11px] text-ink-4">{relTime(c.updatedAt)}</span>
                    <ModeBadge mode={c.dataMode} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="p-4">
            <Empty title="No companies with intent signals yet">Run an agent cycle to search public sources.</Empty>
          </div>
        )}
      </Panel>
    </div>
  );
}
