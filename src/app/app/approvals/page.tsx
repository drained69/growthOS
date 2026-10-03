import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireProject } from "@/server/auth/current";
import { schema as s } from "@/server/db/client";
import { fmtUsdc } from "@/lib/money";
import { relTime } from "@/lib/time";
import { PageHeader, Panel, Badge, Confidence, Empty, ModeBadge } from "@/components/ui";
import { ApprovalControls } from "@/components/features/approvals/approval-controls";

export default async function Approvals() {
  const { project, db } = await requireProject();
  const rows = await db.select({ a: s.approvals, d: s.agentDecisions }).from(s.approvals).innerJoin(s.agentDecisions, eq(s.approvals.decisionId, s.agentDecisions.id)).where(eq(s.approvals.projectId, project.id)).orderBy(desc(s.approvals.createdAt));
  const pending = rows.filter((r) => r.a.status === "pending");
  const done = rows.filter((r) => r.a.status !== "pending");
  return (
    <div>
      <PageHeader title="Approval Inbox" sub="Spend the policy engine will not allow autonomously. Approving waives approval-level rules for this one decision; deny rules (hard ceiling, mission budget, chains, kill switch) are re-checked and still apply." />
      {pending.length ? (
        <div className="space-y-3">
          {pending.map(({ a, d }) => {
            const det = a.details as { rationale?: string; reasons?: string[]; expectedOutcome?: string | null; evidence?: { url: string; title: string }[]; confidence?: number; policy?: { rule: string; detail: string }[]; findings?: unknown[] };
            return (
              <Panel key={a.id} title={<span className="flex items-center gap-2">{d.kind.replace(/_/g, " ")} · decision #{d.number} <ModeBadge mode={d.dataMode} /></span>} right={relTime(a.createdAt)}>
                <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                  <div>
                    <div className="text-[15px] font-semibold">{a.title}</div>
                    <div className="num mt-1 text-[22px]">{fmtUsdc(a.requestedMicro)}</div>
                    {det.rationale && <p className="mt-2 text-[12.5px] text-ink-2">{det.rationale}</p>}
                    {det.expectedOutcome && <p className="mt-1 text-[12.5px]"><span className="text-ink-3">Expected outcome:</span> {det.expectedOutcome}</p>}
                    {det.reasons && det.reasons.length > 0 && (
                      <>
                        <div className="label mt-3">Why now</div>
                        <ul className="mt-1 space-y-0.5 text-[12px] text-ink-2">{det.reasons.map((r) => <li key={r}>• {r}</li>)}</ul>
                      </>
                    )}
                    {det.evidence && det.evidence.length > 0 && (
                      <>
                        <div className="label mt-3">Evidence</div>
                        <ul className="mt-1 space-y-0.5 text-[12px]">{det.evidence.map((e) => <li key={e.url + e.title}><a href={e.url} className="text-s1 hover:underline">{e.title}</a></li>)}</ul>
                      </>
                    )}
                  </div>
                  <div className="space-y-3">
                    {det.confidence != null && <div className="flex items-center justify-between text-[12px]"><span className="text-ink-3">GrowthOS confidence</span><Confidence value={det.confidence} /></div>}
                    <div>
                      <div className="label mb-1">Policy</div>
                      <ul className="space-y-1">
                        {(det.policy ?? []).map((p) => (
                          <li key={p.rule} className="text-[11.5px]"><Badge tone="warn">{p.rule}</Badge> <span className="text-ink-2">{p.detail}</span></li>
                        ))}
                      </ul>
                    </div>
                    <ApprovalControls id={a.id} requested={fmtUsdc(a.requestedMicro, { unit: false }).replace(/,/g, "")} />
                    <Link href={`/app/receipts/${d.id}`} className="block text-[11px] text-s1 hover:underline">decision receipt →</Link>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <Empty title="Nothing waiting for you">GrowthOS is operating within its autonomous limits.</Empty>
      )}
      {done.length > 0 && (
        <Panel title="Resolved" className="mt-4" pad={false}>
          <ul>
            {done.map(({ a, d }) => (
              <li key={a.id} className="flex items-center justify-between border-b border-line px-3.5 py-2 text-[12px] last:border-b-0">
                <Link href={`/app/receipts/${d.id}`} className="hover:underline">{a.title}</Link>
                <span className="flex items-center gap-2">
                  <span className="num">{fmtUsdc(a.approvedMicro ?? a.requestedMicro)}</span>
                  <Badge tone={a.status === "approved" ? "good" : "bad"}>{a.status}</Badge>
                  <span className="text-ink-4">{relTime(a.resolvedAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
