import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { requireProject } from "@/server/auth/current";
import { schema as s } from "@/server/db/client";
import { microToDecimal } from "@/lib/money";
import { PROVIDERS } from "@/server/integrations/providers";
import { PageHeader, Panel, StatusDot, Badge } from "@/components/ui";
import { ProfileForm, IcpForm, PolicyForm } from "@/components/features/settings/settings-forms";

export default async function Settings() {
  const { project, db } = await requireProject();
  const [profile] = await db.select().from(s.productProfiles).where(eq(s.productProfiles.projectId, project.id));
  const icps = await db.select().from(s.icps).where(eq(s.icps.projectId, project.id));
  const [policy] = await db.select().from(s.policies).where(eq(s.policies.projectId, project.id));
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
  return (
    <div>
      <PageHeader title="Settings" sub="Product intelligence, ICP, the founder's hard rules, and integrations." />
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title={<span className="flex items-center gap-2">Product intelligence profile <Badge>{profile.generatedBy}{profile.founderEdited ? " · edited" : ""}</Badge></span>}>
          <ProfileForm p={profile} />
          <div className="mt-3 border-t border-line pt-2 text-[11px] text-ink-3">
            Sources read: {profile.crawledSources.map((c) => `${c.url} (${c.ok ? "ok" : c.note})`).join(" · ") || "none"}
          </div>
        </Panel>
        <div className="space-y-3">
          <Panel title={<span>Policy engine <span className="num text-ink-4">v{policy.version}</span></span>}>
            <PolicyForm
              p={{
                maxTransaction: microToDecimal(policy.maxTransactionMicro),
                dailySpend: microToDecimal(policy.dailySpendMicro),
                kolThreshold: microToDecimal(policy.kolApprovalThresholdMicro),
                bountyThreshold: microToDecimal(policy.bountyApprovalThresholdMicro),
                hardCeiling: microToDecimal(policy.hardCeilingMicro),
                autonomous: policy.autonomousCategories,
                approval: policy.approvalCategories,
                chains: policy.allowedChains,
                forbidden: policy.forbiddenActions,
              }}
            />
            <p className="mt-3 text-[11px] text-ink-3">Enforced in code (src/lib/agent/policy.ts) on every structured action — not in a prompt. Changes are versioned and audit-logged.</p>
          </Panel>
          <Panel title="Ideal customer profile">
            <IcpForm icps={icps} />
          </Panel>
        </div>
        <Panel title="Conversion events (attribution webhook)">
          <p className="text-[12px] text-ink-2">Send product events (signup, wallet connect, SDK key created, …) with the visitor&apos;s <code className="num">gos_ref</code> to attribute them to experiments. Requests are HMAC-signed.</p>
          <pre className="num mt-2 overflow-x-auto rounded bg-bg p-2.5 text-[11px] leading-relaxed text-ink-2">{`POST ${origin}/api/events
x-growthos-project: ${project.id}
x-growthos-signature: t=<unix>,v1=hex(HMAC_SHA256(secret, "<t>.<body>"))

{"event":"sdk_key_created","ref":"<gos_ref>","visitorId":"<your user id>",
 "idempotencyKey":"<unique>","occurredAt":"2026-10-03T12:00:00Z"}`}</pre>
          <details className="mt-2 text-[12px]">
            <summary className="cursor-pointer text-ink-3">Reveal signing secret</summary>
            <code className="num mt-1 block break-all text-[11px] text-ink">{project.webhookSecret}</code>
          </details>
          <p className="mt-2 text-[11px] text-ink-3">Visits are recorded automatically by the tracked short link <code className="num">/r/&lt;referral code&gt;</code>, which then redirects to the UTM-tagged destination.</p>
        </Panel>
        <Panel title="Market data sources">
          <ul className="space-y-2">
            {PROVIDERS.map((p) => {
              const st = p.status();
              return (
                <li key={p.id} className="text-[12px]">
                  <span className="flex items-center gap-2">
                    <StatusDot tone={st.available ? "good" : "idle"} /> {st.name}
                    {st.requiresEnv.length > 0 && <span className="num text-[10.5px] text-ink-4">{st.requiresEnv.join(", ")}</span>}
                  </span>
                  <span className="ml-3.5 text-[11px] text-ink-3">{st.note}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] text-ink-3">Official APIs only, within their terms and rate limits. No scraping behind logins, no bypassing access controls. Unavailable sources return nothing rather than invented data.</p>
        </Panel>
      </div>
    </div>
  );
}
