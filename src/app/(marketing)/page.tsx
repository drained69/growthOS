import Link from "next/link";
import { getDb } from "@/server/db/client";
import { tractionMetrics } from "@/server/queries/views";
import { fmtUsdc } from "@/lib/money";
import { enterDemoAction } from "@/server/actions";

export const dynamic = "force-dynamic";

const SECTIONS = [
  {
    q: "Who wants your product?",
    a: "GrowthOS finds evidence-backed customers showing real intent — launches, hiring, migrations, public questions — and shows every source behind every score.",
    tag: "Customer discovery",
  },
  {
    q: "What is your market talking about?",
    a: "GrowthOS maps narratives across public conversations and tells you which are emerging, accelerating, peaking or declining — and how relevant each is to you.",
    tag: "Narrative intelligence",
  },
  {
    q: "Who shapes the market?",
    a: "GrowthOS ranks creators by audience fit, authority, recency, discussion quality and authenticity — not follower count — and writes evidence-backed briefs.",
    tag: "KOL intelligence",
  },
  {
    q: "Where should the next dollar go?",
    a: "GrowthOS runs experiments with hypotheses and stop conditions, measures real conversions, and moves unspent budget to what works — within your hard limits.",
    tag: "Experiments & reallocation",
  },
];

const LOOP = ["Discover", "Understand", "Verify", "Decide", "Spend", "Execute", "Measure", "Attribute", "Learn", "Reallocate"];

export default async function Landing() {
  const db = await getDb();
  const m = await tractionMetrics(db);
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-[5px] bg-s1 text-[11px] font-bold text-white">G</span>
          <span className="text-[15px] font-semibold tracking-tight">GrowthOS</span>
        </div>
        <nav className="flex items-center gap-5 text-[13px] text-ink-2">
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#money" className="hover:text-ink">Money & rules</a>
          <Link href="/login" className="hover:text-ink">Sign in</Link>
        </nav>
      </header>

      <section className="grid-bg border-y border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1.1fr_1fr] lg:py-28">
          <div>
            <div className="label mb-4 text-s1">Give your AI a growth goal and a budget.</div>
            <h1 className="text-[56px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[72px]">GROWTHOS</h1>
            <p className="mt-4 text-[22px] leading-snug text-ink">Your autonomous growth operator.</p>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-ink-2">
              Give it a product.
              <br />
              Give it a goal.
              <br />
              Give it a budget.
              <br />
              <span className="text-ink">It finds where growth is hiding.</span>
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex h-10 items-center rounded border border-s1 bg-s1 px-5 text-[13px] font-semibold tracking-wide text-white hover:bg-s1/90">
                START A MISSION
              </Link>
              <form action={enterDemoAction}>
                <button className="inline-flex h-10 items-center rounded border border-line-strong bg-surface px-5 text-[13px] font-semibold tracking-wide text-ink hover:bg-surface-2">SEE IT WORK</button>
              </form>
            </div>
          </div>
          <div className="self-center rounded-md border border-line bg-surface/95 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="label">Decision receipt — example</span>
              <span className="num rounded-[3px] border border-s7/50 bg-s7/10 px-1 text-[9.5px] text-s7">DEMO</span>
            </div>
            <dl className="num space-y-1.5 text-[12px]">
              {[
                ["ACTION", "BUY DATA (x402)"],
                ["SERVICE", "company-intel · 0.01 USDC"],
                ["WHY", "intent confidence 60% < 80% threshold"],
                ["VALUE OF INFO", "≈ 5.00 USDC (500× price)"],
                ["POLICY", "ALLOW · research ≤ 10 USDC"],
                ["PAYMENT", "Circle Gateway · Arc"],
                ["RESULT", "+3 verified signals"],
                ["CONFIDENCE", "60% → 90%"],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[120px_1fr] gap-3 border-b border-line pb-1.5 last:border-b-0">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-2">
          {SECTIONS.map((s) => (
            <div key={s.q} className="bg-bg p-7">
              <div className="label text-ink-3">{s.tag}</div>
              <h2 className="mt-2 text-[24px] font-semibold tracking-tight">{s.q}</h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">{s.a}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-2 text-[13px]">
          {LOOP.map((l, i) => (
            <span key={l} className="flex items-center gap-2">
              <span className="rounded border border-line bg-surface px-2.5 py-1 font-medium">{l}</span>
              {i < LOOP.length - 1 && <span className="text-ink-4">→</span>}
            </span>
          ))}
          <span className="text-ink-4">↺ repeat</span>
        </div>
        <p className="mt-4 max-w-2xl text-[14px] text-ink-2">Optimizes verified growth per USDC spent — not followers, impressions, posts or emails sent. It never sends mass unsolicited messages; it finds qualified opportunities and shows a human the evidence.</p>
      </section>

      <section id="money" className="border-t border-line bg-surface/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-2">
          <div>
            <div className="label text-s1">A company card with strict limits</div>
            <h2 className="mt-2 text-[28px] font-semibold tracking-tight">Financial autonomy lives in code, not in a prompt.</h2>
            <p className="mt-4 text-[14.5px] leading-relaxed text-ink-2">Every money movement is a structured action validated by Zod, checked by a deterministic policy engine — max transaction, daily spend, mission budget, approved categories, KOL and bounty thresholds, allowed tokens and chains — and only then executed. Above your limits it lands in the Approval Inbox. Above the hard ceiling it is denied, approval or not.</p>
          </div>
          <pre className="num self-center overflow-x-auto rounded-md border border-line bg-bg p-4 text-[12px] leading-relaxed text-ink-2">{`AI ─► structured action ─► Zod schema
   ─► policy engine ─► ALLOW | APPROVAL | DENY
   ─► transaction state machine (idempotent)
   ─► Circle  (x402 · Gateway · Agent Wallet · App Kit)
   ─► Arc     (USDC settlement)
   ─► decision receipt (sha256-sealed)`}</pre>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="label mb-3">Traction — live counts from this deployment (demo data excluded)</div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4 lg:grid-cols-7">
          {[
            ["Projects", m.projects],
            ["Opportunities", m.opportunities],
            ["Qualified customers", m.qualified],
            ["KOLs identified", m.kols],
            ["Experiments", m.experiments],
            ["USDC spent", fmtUsdc(m.spentMicro, { unit: false })],
            ["x402 purchases", m.x402],
            ["Arc transactions", m.arcTx],
            ["Qualified conversions", m.conversions],
            ["Cost / conversion", m.costPerConversion ? fmtUsdc(m.costPerConversion, { unit: false }) : "—"],
            ["Agent decisions", m.decisions],
            ["Autonomous actions", m.autonomous],
            ["Human approvals", m.approvals],
          ].map(([k, v]) => (
            <div key={k as string} className="bg-bg px-4 py-3">
              <div className="num text-[20px]">{v}</div>
              <div className="mt-0.5 text-[11px] text-ink-3">{k}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8">
          <div>
            <div className="label">Powered by</div>
            <div className="mt-2 flex flex-wrap gap-2 text-[13px]">
              {["Arc", "USDC", "Circle Agent Stack", "x402", "Gateway"].map((p) => (
                <span key={p} className="rounded border border-line px-2.5 py-1 font-medium text-ink-2">
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div className="text-[12px] text-ink-3">Testnet build. Demo data is fictional and always labelled.</div>
        </div>
      </footer>
    </div>
  );
}
