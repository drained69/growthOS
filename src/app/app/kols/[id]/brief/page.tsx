import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireProject } from "@/server/auth/current";
import { schema as s } from "@/server/db/client";
import { generateKolBrief, type KolBrief } from "@/server/domain/growth/kol-brief";
import { PageHeader, Panel, Badge, ModeBadge } from "@/components/ui";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line py-3 last:border-b-0">
      <div className="label mb-1.5">{title}</div>
      <div className="text-[13px] leading-relaxed text-ink">{children}</div>
    </div>
  );
}

export default async function Brief({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ experiment?: string }> }) {
  const { id } = await params;
  const { experiment } = await searchParams;
  const { project, db } = await requireProject();
  const [k] = await db.select().from(s.kols).where(and(eq(s.kols.id, id), eq(s.kols.projectId, project.id)));
  if (!k) notFound();
  let exp = experiment ? (await db.select().from(s.experiments).where(and(eq(s.experiments.id, experiment), eq(s.experiments.projectId, project.id))))[0] : undefined;
  const [camp] = exp ? await db.select().from(s.campaigns).where(eq(s.campaigns.experimentId, exp.id)) : [];
  if (exp && camp?.kolId !== k.id) exp = undefined;
  const b: KolBrief = camp?.brief && camp.kolId === k.id ? (camp.brief as unknown as KolBrief) : await generateKolBrief(db, k.id, exp?.id);
  return (
    <div>
      <PageHeader
        crumbs={[{ label: "KOLs", href: "/app/kols" }, { label: `@${k.handle}`, href: `/app/kols/${k.id}` }]}
        title={<span className="flex items-center gap-2">Campaign brief — {b.creator} <ModeBadge mode={k.dataMode} /></span>}
        sub="A working document for the creator. Every claim carries a source. Not promotional copy."
      />
      <div className="grid gap-3 lg:grid-cols-[1fr_420px]">
        <Panel>
          <Section title="Objective">{b.objective}</Section>
          <Section title="Why this creator">
            <ul className="space-y-0.5">{b.whyThisCreator.map((x) => <li key={x}>• {x}</li>)}</ul>
          </Section>
          <Section title="Why now">
            <ul className="space-y-0.5">{b.whyNow.map((x) => <li key={x}>• {x}</li>)}</ul>
          </Section>
          <Section title="Audience">{b.audience}</Section>
          <Section title="Current narrative">{b.currentNarrative}</Section>
          <Section title="Core idea">{b.coreIdea}</Section>
          <Section title="Demo worth showing">{b.demoWorthShowing}</Section>
          <Section title="Suggested angles">
            <ol className="list-decimal space-y-0.5 pl-4">{b.suggestedAngles.map((x) => <li key={x}>{x}</li>)}</ol>
          </Section>
          <Section title="Claims with evidence">
            <ul className="space-y-1.5">
              {b.claimsWithEvidence.map((c) => (
                <li key={c.claim + c.source}>
                  {c.claim}
                  <a href={c.source} className="ml-1.5 text-[11px] text-s1 hover:underline">[source]</a>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Things to avoid">
            <ul className="space-y-0.5">{b.thingsToAvoid.map((x) => <li key={x}>• {x}</li>)}</ul>
          </Section>
          <Section title="CTA">{b.cta}</Section>
          {b.trackingLink && (
            <Section title="Tracking link">
              <code className="num break-all text-[11.5px] text-s1">{b.trackingLink}</code>
            </Section>
          )}
          <Section title="Compensation">{b.compensation}</Section>
          <Section title="Creator freedom"><Badge tone="good">{b.creatorFreedom}</Badge></Section>
        </Panel>
        <div className="space-y-3">
          <Panel title="Optional drafts — suggestions only" right={<Badge tone={b.draftsGeneratedBy === "claude" ? "info" : "neutral"}>{b.draftsGeneratedBy}</Badge>}>
            <p className="mb-3 rounded border border-warning/30 bg-warning/5 px-2.5 py-2 text-[11.5px] text-warning">{b.disclosure}</p>
            <div className="space-y-3">
              {b.drafts.map((d) => (
                <div key={d.label}>
                  <div className="label mb-1">{d.label}</div>
                  <pre className="whitespace-pre-wrap rounded border border-line bg-bg px-2.5 py-2 font-sans text-[12px] leading-relaxed text-ink-2">{d.body}</pre>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
