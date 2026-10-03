"use client";
import { useActionState, useEffect, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { onboardProductAction, onboardMissionAction, onboardAutonomyAction, onboardIcpAction } from "@/server/actions";
import { Btn, cx } from "@/components/ui";

const field = "w-full rounded border border-line bg-bg px-2.5 py-1.5 text-[13px] text-ink outline-none placeholder:text-ink-4 focus:border-s1";

export function ProductStep() {
  const [state, action, pending] = useActionState(onboardProductAction, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) router.push("/onboarding");
  }, [state, router]);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label">Product name *</span><input name="name" required className={field} placeholder="Meterline" /></label>
        <label className="block"><span className="label">Website</span><input name="website" className={field} placeholder="https://…" /></label>
        <label className="block"><span className="label">Docs</span><input name="docsUrl" className={field} placeholder="https://docs…" /></label>
        <label className="block"><span className="label">X account</span><input name="xHandle" className={field} placeholder="@handle" /></label>
        <label className="block sm:col-span-2"><span className="label">GitHub repository</span><input name="githubUrl" className={field} placeholder="https://github.com/org/repo" /></label>
      </div>
      <label className="block"><span className="label">Short description *</span><textarea name="description" required minLength={10} rows={3} className={field} placeholder="What it does, for whom." /></label>
      <div className="flex items-center gap-3">
        <Btn variant="primary" disabled={pending}>{pending ? "Reading public pages…" : "Build product profile"}</Btn>
        {state && !state.ok && <span className="text-[12px] text-critical">{state.error}</span>}
      </div>
      <p className="text-[11.5px] text-ink-3">GrowthOS reads the public pages you list (respecting robots.txt) and drafts a Product Intelligence Profile. You can correct everything in the next step.</p>
    </form>
  );
}

export function GenerateIcp() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="flex items-center gap-3">
      <Btn variant="primary" disabled={pending} onClick={() => start(async () => { const r = await onboardIcpAction(); setMsg(r.ok ? r.message ?? null : r.error); router.refresh(); })}>
        {pending ? "Proposing ICP…" : "Looks right — propose my ICP →"}
      </Btn>
      {msg && <span className="text-[12px] text-ink-3">{msg}</span>}
    </div>
  );
}

const TEMPLATES = [
  { key: "first_100_devs", name: "First 100 Developers", goal: 100, days: 14, budget: "500", desc: "Verified SDK users" },
  { key: "find_buyers", name: "Find 20 Buyers", goal: 20, days: 7, budget: "100", desc: "High-intent qualified companies" },
  { key: "own_narrative", name: "Own the Narrative", goal: 1000, days: 30, budget: "300", desc: "Qualified visits from a narrative" },
  { key: "kol_discovery", name: "KOL Discovery", goal: 30, days: 14, budget: "50", desc: "Validate 3 creator campaigns" },
];

export function MissionStep() {
  const [state, action, pending] = useActionState(onboardMissionAction, null);
  const [t, setT] = useState(TEMPLATES[0]);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      if (state.data?.done) router.push("/app/missions");
      else router.push("/onboarding");
    }
  }, [state, router]);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {TEMPLATES.map((x) => (
          <button type="button" key={x.key} onClick={() => setT(x)} className={cx("rounded border px-3 py-2 text-left", t.key === x.key ? "border-s1 bg-s1/10" : "border-line hover:border-line-strong")}>
            <div className="text-[13px] font-medium">{x.name}</div>
            <div className="text-[11.5px] text-ink-3">{x.desc}</div>
          </button>
        ))}
      </div>
      <input type="hidden" name="template" value={t.key} />
      <div className="grid grid-cols-3 gap-3" key={t.key}>
        <label className="block"><span className="label">Goal</span><input name="goal" defaultValue={t.goal} className={`${field} num`} /></label>
        <label className="block"><span className="label">Days</span><input name="days" defaultValue={t.days} className={`${field} num`} /></label>
        <label className="block"><span className="label">Budget (USDC)</span><input name="budget" defaultValue={t.budget} className={`${field} num`} /></label>
      </div>
      <div className="flex items-center gap-3">
        <Btn variant="primary" disabled={pending}>{pending ? "Saving…" : "Set mission →"}</Btn>
        {state && !state.ok && <span className="text-[12px] text-critical">{state.error}</span>}
      </div>
    </form>
  );
}

export function AutonomyStep() {
  const [state, action, pending] = useActionState(onboardAutonomyAction, null);
  const row = (name: string, label: string, d: string, hint: string) => (
    <label className="grid grid-cols-[1fr_120px] items-center gap-3 border-b border-line py-2">
      <span>
        <span className="text-[13px]">{label}</span>
        <span className="block text-[11px] text-ink-3">{hint}</span>
      </span>
      <span className="flex items-center gap-1"><input name={name} defaultValue={d} className={`${field} num`} /><span className="text-[11px] text-ink-3">USDC</span></span>
    </label>
  );
  return (
    <form action={action}>
      {row("maxTransaction", "Max autonomous purchase", "10", "Above this, every spend needs your approval")}
      {row("dailySpend", "Max daily spend", "50", "Autonomous spend per UTC day")}
      {row("kolThreshold", "KOL spend requiring approval above", "100", "Creator payments always need approval; this is the per-payment line")}
      {row("bountyThreshold", "Bounty approval threshold", "25", "Small bounties are autonomous below this")}
      {row("hardCeiling", "Hard ceiling (always denied above)", "500", "Not even an approval can exceed this")}
      <div className="mt-3 grid gap-2 text-[12px] sm:grid-cols-3">
        <div className="rounded border border-good/30 p-2"><div className="label text-good">Allowed</div>Research · Data · API services · Small bounties · Content</div>
        <div className="rounded border border-warning/30 p-2"><div className="label text-warning">Requires approval</div>KOL payments · Sponsorships · Large bounties · Bridges</div>
        <div className="rounded border border-critical/30 p-2"><div className="label text-critical">Forbidden</div>Mass unsolicited messaging · automated DMs, cold email, mentions</div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Btn variant="primary" disabled={pending}>{pending ? "Activating…" : "Activate GrowthOS →"}</Btn>
        {state && !state.ok && <span className="text-[12px] text-critical">{state.error}</span>}
      </div>
    </form>
  );
}
