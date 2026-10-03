import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireUser, currentProject } from "@/server/auth/current";
import { getDb, schema as s } from "@/server/db/client";
import { Panel, Badge, cx } from "@/components/ui";
import { ProfileForm, IcpForm } from "@/components/features/settings/settings-forms";
import { ProductStep, GenerateIcp, MissionStep, AutonomyStep } from "@/components/features/onboarding/onboarding-forms";

export const dynamic = "force-dynamic";

const STEPS = ["Product", "ICP", "Growth mission", "Autonomy"];

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ new?: string; step?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const db = await getDb();
  const project = sp.new ? null : await currentProject(user.id);
  // Existing finished project + explicit request for a new mission jumps to step 3.
  const step = !project ? 1 : sp.step === "3" ? 3 : Math.min(project.onboardingStep, 4);
  const profile = project ? (await db.select().from(s.productProfiles).where(eq(s.productProfiles.projectId, project.id)))[0] : undefined;
  const icps = project ? await db.select().from(s.icps).where(eq(s.icps.projectId, project.id)) : [];
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-[5px] bg-s1 text-[11px] font-bold text-white">G</span>
          <span className="text-[15px] font-semibold">GrowthOS</span>
        </Link>
        {project && project.onboardingStep >= 5 && <Link href="/app" className="text-[12px] text-ink-3 hover:text-ink">skip to app →</Link>}
      </div>
      <ol className="mb-6 grid grid-cols-4 gap-2">
        {STEPS.map((l, i) => (
          <li key={l} className={cx("border-t-2 pt-2 text-[12px]", i + 1 < step ? "border-good text-ink-2" : i + 1 === step ? "border-s1 text-ink" : "border-line text-ink-4")}>
            <span className="num mr-1">{i + 1}</span> {l}
          </li>
        ))}
      </ol>
      {step === 1 && (
        <Panel title="Step 1 — Your product">
          <ProductStep />
        </Panel>
      )}
      {step === 2 && profile && (
        <Panel title={<span className="flex items-center gap-2">Step 2 — Product intelligence profile <Badge>{profile.generatedBy}</Badge></span>}>
          <p className="mb-3 text-[12px] text-ink-3">
            Read from: {profile.crawledSources.map((c) => `${c.url} ${c.ok ? "✓" : `✕ (${c.note})`}`).join(" · ") || "your description only"}. Correct anything that&apos;s wrong — this drives what GrowthOS searches for.
          </p>
          <ProfileForm p={profile} />
          <div className="mt-4 border-t border-line pt-4">
            <GenerateIcp />
          </div>
        </Panel>
      )}
      {step === 3 && (
        <div className="space-y-3">
          {icps.length > 0 && (
            <Panel title="Proposed ideal customer profile — edit freely">
              <IcpForm icps={icps} />
            </Panel>
          )}
          <Panel title="Step 3 — Growth mission">
            <MissionStep />
          </Panel>
        </div>
      )}
      {step === 4 && (
        <Panel title="Step 4 — Autonomy: the hard rules">
          <p className="mb-2 text-[12px] text-ink-3">These limits are enforced by a deterministic policy engine on every structured action — not by a prompt. You can change them any time in Settings.</p>
          <AutonomyStep />
        </Panel>
      )}
    </div>
  );
}
