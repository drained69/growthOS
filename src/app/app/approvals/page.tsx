import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowUpRight, CheckCircle2, Inbox, Lock, ShieldAlert } from "lucide-react";
import { requireProject } from "@/server/auth/current";
import { can } from "@/server/auth/access";
import { schema as s } from "@/server/db/client";
import { fmtUsdc, microToDecimal } from "@/lib/money";
import { relTime } from "@/lib/time";
import { Badge, Callout, Card, CardBody, CardHeader, Confidence, EmptyState, ModeBadge, PageHeader, Stat, StatStrip, StatusBadge } from "@/components/ui";
import { DataTable } from "@/components/ui/data-table";
import { ApprovalControls } from "@/components/features/approvals/approval-controls";

type Details = {
  rationale?: string;
  reasons?: string[];
  expectedOutcome?: string | null;
  evidence?: { url: string; title: string }[];
  confidence?: number;
  policy?: { rule: string; detail: string }[];
};

const humanize = (k: string) => k.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export default async function Approvals() {
  const { project, role, db } = await requireProject();
  const canApprove = can(role, "approve");
  const rows = await db
    .select({ a: s.approvals, d: s.agentDecisions })
    .from(s.approvals)
    .innerJoin(s.agentDecisions, eq(s.approvals.decisionId, s.agentDecisions.id))
    .where(eq(s.approvals.projectId, project.id))
    .orderBy(desc(s.approvals.createdAt));
  const pending = rows.filter((r) => r.a.status === "pending");
  const done = rows.filter((r) => r.a.status !== "pending");
  const pendingTotal = pending.reduce((n, r) => n + r.a.requestedMicro, 0);
  const approvedTotal = done.filter((r) => r.a.status === "approved").reduce((n, r) => n + (r.a.approvedMicro ?? r.a.requestedMicro), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Approvals"
        description="Spend the policy engine will not allow autonomously. Approving waives approval-level rules for this one decision; deny rules (hard ceiling, mission budget, chains, kill switch) are re-checked and still apply."
        meta={
          <>
            <ModeBadge mode={project.dataMode} />
            {pending.length ? <span>{pending.length} waiting</span> : <span>Inbox clear</span>}
          </>
        }
      />

      <StatStrip className="grid-cols-2 lg:grid-cols-4">
        <Stat label="Waiting" value={pending.length} tone={pending.length ? "warn" : undefined} sub="pending decisions" />
        <Stat label="Requested" value={fmtUsdc(pendingTotal, { unit: false })} sub="USDC awaiting you" />
        <Stat label="Resolved" value={done.length} sub={`${done.filter((r) => r.a.status === "approved").length} approved · ${done.filter((r) => r.a.status === "rejected").length} rejected`} />
        <Stat label="Approved spend" value={fmtUsdc(approvedTotal, { unit: false })} sub="USDC, all time" />
      </StatStrip>

      {!canApprove && pending.length > 0 && (
        <Callout tone="info" title="View only">
          Only workspace owners and admins can approve or reject spend. You can review the reasoning below.
        </Callout>
      )}

      {pending.length ? (
        <div className="space-y-4">
          {pending.map(({ a, d }) => {
            const det = a.details as Details;
            return (
              <Card key={a.id}>
                <CardHeader
                  icon={<ShieldAlert />}
                  title={
                    <span className="flex items-center gap-2">
                      {humanize(d.kind)} <span className="num font-normal text-ink-4">#{d.number}</span>
                    </span>
                  }
                  description={`Proposed by the ${d.agent} agent · ${relTime(a.createdAt)}`}
                  action={
                    <>
                      <ModeBadge mode={d.dataMode} />
                      <StatusBadge status="pending" label="Awaiting approval" />
                    </>
                  }
                />
                <div className="grid lg:grid-cols-[1fr_340px]">
                  <CardBody className="space-y-4">
                    <div>
                      <div className="text-[15px] font-semibold leading-snug text-ink">{a.title}</div>
                      <div className="num mt-1.5 text-[28px] font-medium leading-none tracking-[-0.03em]">
                        {fmtUsdc(a.requestedMicro, { unit: false })}
                        <span className="ml-1 text-[13px] text-ink-3">USDC</span>
                      </div>
                    </div>
                    {det.rationale && <p className="text-[12.5px] leading-relaxed text-ink-2">{det.rationale}</p>}
                    {det.expectedOutcome && (
                      <div className="rounded-[8px] border border-line bg-bg/50 px-3 py-2 text-[12.5px]">
                        <span className="label mr-2">Expected outcome</span>
                        <span className="text-ink">{det.expectedOutcome}</span>
                      </div>
                    )}
                    {det.reasons && det.reasons.length > 0 && (
                      <div>
                        <div className="label mb-1.5">Why now</div>
                        <ul className="space-y-1.5 text-[12.5px] leading-snug text-ink-2">
                          {det.reasons.map((r) => (
                            <li key={r} className="flex gap-2">
                              <span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-4" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {det.evidence && det.evidence.length > 0 && (
                      <div>
                        <div className="label mb-1.5">Evidence</div>
                        <ul className="space-y-1 text-[12.5px]">
                          {det.evidence.map((e) => (
                            <li key={e.url + e.title}>
                              <a href={e.url} target={e.url.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="inline-flex max-w-full items-center gap-1 text-s1 hover:underline">
                                <span className="truncate">{e.title}</span>
                                <ArrowUpRight className="size-3 shrink-0" />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardBody>
                  <div className="space-y-4 border-t border-line p-4 lg:border-l lg:border-t-0">
                    {det.confidence != null && (
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-ink-3">Agent confidence</span>
                        <Confidence value={det.confidence} />
                      </div>
                    )}
                    {(det.policy ?? []).length > 0 && (
                      <div>
                        <div className="label mb-1.5">Why it needs you</div>
                        <ul className="space-y-1.5">
                          {(det.policy ?? []).map((p) => (
                            <li key={p.rule} className="text-[12px] leading-snug">
                              <Badge tone="warn" className="num mr-1.5">
                                {p.rule}
                              </Badge>
                              <span className="text-ink-2">{p.detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="border-t border-line pt-4">
                      {canApprove ? (
                        <ApprovalControls id={a.id} requested={microToDecimal(a.requestedMicro)} />
                      ) : (
                        <p className="flex items-center gap-2 text-[12px] text-ink-3">
                          <Lock className="size-3.5" /> Owner or admin required to resolve.
                        </p>
                      )}
                    </div>
                    <Link href={`/app/receipts/${d.id}`} className="inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink">
                      Decision receipt <ArrowUpRight className="size-3" />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<Inbox />} title="Nothing waiting for you" description="GrowthOS is operating within its autonomous limits. Spend above your auto-approve threshold (Settings → Spend policy) lands here for a decision." />
      )}

      <Card>
        <CardHeader title="Resolved" description="Every approval keeps its receipt, amount and note" icon={<CheckCircle2 />} />
        <DataTable
          columns={[
            { key: "title", label: "Request" },
            { key: "decision", label: "Decision", className: "w-20" },
            { key: "amount", label: "Amount", align: "right", sortable: true },
            { key: "status", label: "Outcome", sortable: true },
            { key: "note", label: "Note" },
            { key: "when", label: "Resolved", sortable: true },
          ]}
          defaultSort={{ key: "when", dir: "desc" }}
          searchable={done.length > 8}
          rows={done.map(({ a, d }) => ({
            id: a.id,
            href: `/app/receipts/${d.id}`,
            cells: {
              title: <span className="block max-w-[340px] truncate">{a.title}</span>,
              decision: <span className="num text-ink-3">#{d.number}</span>,
              amount: (
                <span className="num">
                  {fmtUsdc(a.approvedMicro ?? a.requestedMicro)}
                  {a.approvedMicro != null && a.approvedMicro !== a.requestedMicro && <span className="ml-1 text-[11px] text-ink-4 line-through">{fmtUsdc(a.requestedMicro, { unit: false })}</span>}
                </span>
              ),
              status: (
                <span className="flex items-center gap-1.5">
                  <StatusBadge status={a.status} />
                  <ModeBadge mode={d.dataMode} />
                </span>
              ),
              note: <span className="block max-w-[260px] truncate text-ink-3">{a.note ?? "—"}</span>,
              when: <span className="whitespace-nowrap text-ink-3">{relTime(a.resolvedAt)}</span>,
            },
            sort: { amount: a.approvedMicro ?? a.requestedMicro, status: a.status, when: a.resolvedAt?.getTime() ?? 0 },
            search: `${a.title} ${a.status} ${a.note ?? ""} #${d.number}`,
          }))}
          empty={<p className="text-center text-[12.5px] text-ink-3">No approvals resolved yet. Approved and rejected requests are kept here with their receipts.</p>}
        />
      </Card>
    </div>
  );
}
