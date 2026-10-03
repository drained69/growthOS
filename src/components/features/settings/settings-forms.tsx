"use client";
import { useActionState } from "react";
import { saveProfileAction, updatePolicyAction, saveIcpAction } from "@/server/actions";
import { Btn } from "@/components/ui";

const field = "w-full rounded border border-line bg-bg px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-s1";
const CATS = ["research", "services", "bounty", "content", "kol", "community", "treasury"];
const CHAINS = ["Arc_Testnet", "Base_Sepolia", "Arbitrum_Sepolia", "Ethereum_Sepolia"];

type Profile = { summary: string; category: string; targetUsers: string[]; competitors: string[]; valueProps: string[]; integrations: string[]; useCases: string[]; pricing: string | null; terminology: string[]; keywords: string[] };

function Status({ s }: { s: { ok: boolean; error?: string; message?: string } | null }) {
  if (!s) return null;
  return <span className={`text-[11.5px] ${s.ok ? "text-good" : "text-critical"}`}>{s.ok ? s.message ?? "Saved" : s.error}</span>;
}

export function ProfileForm({ p }: { p: Profile }) {
  const [state, action, pending] = useActionState(saveProfileAction, null);
  const list = (name: keyof Profile, label: string, rows = 3) => (
    <label className="block">
      <span className="label">{label} (one per line)</span>
      <textarea name={name} defaultValue={(p[name] as string[]).join("\n")} rows={rows} className={field} />
    </label>
  );
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="label">What the product does</span>
        <textarea name="summary" defaultValue={p.summary} rows={3} className={field} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Category</span>
          <input name="category" defaultValue={p.category} className={field} />
        </label>
        <label className="block">
          <span className="label">Pricing (if public)</span>
          <input name="pricing" defaultValue={p.pricing ?? ""} className={field} />
        </label>
        {list("targetUsers", "Target users")}
        {list("competitors", "Competitors")}
        {list("valueProps", "Value propositions")}
        {list("useCases", "Use cases")}
        {list("integrations", "Integrations")}
        {list("terminology", "Important terminology")}
      </div>
      {list("keywords", "Discovery search terms", 4)}
      <div className="flex items-center gap-3">
        <Btn variant="primary" disabled={pending}>{pending ? "Saving…" : "Save profile"}</Btn>
        <Status s={state} />
      </div>
    </form>
  );
}

type Icp = { id: string; tier: string; title: string; description: string; companySize: string | null; segments: string[]; signals: string[] };
export function IcpForm({ icps }: { icps: Icp[] }) {
  const [state, action, pending] = useActionState(saveIcpAction, null);
  return (
    <form action={action} className="space-y-3">
      {icps.map((i) => (
        <div key={i.id} className="rounded border border-line p-3">
          <input type="hidden" name="icpId" value={i.id} />
          <div className="label mb-1">{i.tier} ICP</div>
          <input name={`title:${i.id}`} defaultValue={i.title} className={`${field} font-medium`} />
          <textarea name={`description:${i.id}`} defaultValue={i.description} rows={2} className={`${field} mt-2`} />
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <input name={`companySize:${i.id}`} defaultValue={i.companySize ?? ""} placeholder="Company size" className={field} />
            <input name={`segments:${i.id}`} defaultValue={i.segments.join(", ")} placeholder="Segments (comma-separated)" className={field} />
            <input name={`signals:${i.id}`} defaultValue={i.signals.join(", ")} placeholder="In-market signals" className={field} />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Btn variant="primary" disabled={pending}>{pending ? "Saving…" : "Save ICP"}</Btn>
        <Status s={state} />
      </div>
    </form>
  );
}

type Policy = { maxTransaction: string; dailySpend: string; kolThreshold: string; bountyThreshold: string; hardCeiling: string; autonomous: string[]; approval: string[]; chains: string[]; forbidden: string[] };
export function PolicyForm({ p }: { p: Policy }) {
  const [state, action, pending] = useActionState(updatePolicyAction, null);
  const num = (name: keyof Policy, label: string, hint: string) => (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-0.5 flex items-center gap-1.5">
        <input name={name} defaultValue={p[name] as string} inputMode="decimal" className={`${field} num w-28`} />
        <span className="text-[11px] text-ink-3">USDC · {hint}</span>
      </div>
    </label>
  );
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {num("maxTransaction", "MAX_TRANSACTION", "above → approval")}
        {num("dailySpend", "DAILY_SPEND", "above → approval")}
        {num("kolThreshold", "KOL_APPROVAL_THRESHOLD", "creator payments above")}
        {num("bountyThreshold", "BOUNTY_APPROVAL_THRESHOLD", "bounties above")}
        {num("hardCeiling", "HARD_CEILING", "above → always DENY")}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset>
          <legend className="label mb-1">Autonomous categories</legend>
          {CATS.map((c) => (
            <label key={c} className="mr-3 inline-flex items-center gap-1 text-[12px]">
              <input type="checkbox" name="autonomous" value={c} defaultChecked={p.autonomous.includes(c)} /> {c}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend className="label mb-1">Require approval</legend>
          {CATS.map((c) => (
            <label key={c} className="mr-3 inline-flex items-center gap-1 text-[12px]">
              <input type="checkbox" name="approval" value={c} defaultChecked={p.approval.includes(c)} /> {c}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend className="label mb-1">ALLOWED_CHAINS</legend>
          {CHAINS.map((c) => (
            <label key={c} className="mr-3 inline-flex items-center gap-1 text-[12px]">
              <input type="checkbox" name="chains" value={c} defaultChecked={p.chains.includes(c)} /> {c.replace("_", " ")}
            </label>
          ))}
        </fieldset>
        <div>
          <div className="label mb-1">ALLOWED_TOKENS · FORBIDDEN</div>
          <div className="text-[12px] text-ink-2">USDC only.</div>
          <div className="mt-1 text-[12px] text-ink-2">Forbidden (not configurable): {p.forbidden.join(", ").replace(/_/g, " ")}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Btn variant="primary" disabled={pending}>{pending ? "Saving…" : "Save policy"}</Btn>
        <Status s={state} />
      </div>
    </form>
  );
}
