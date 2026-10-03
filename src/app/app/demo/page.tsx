import { requireProject } from "@/server/auth/current";
import { DEMO_STEPS } from "@/server/demo/script";
import { walletMode } from "@/server/integrations/circle/config";
import { SIGNALS_API_URL } from "@/server/integrations/circle/marketplace";
import { claudeEnabled } from "@/server/integrations/llm/claude";
import { PageHeader, Panel, Empty, StatusDot, KV } from "@/components/ui";
import { DemoRunner } from "@/components/features/demo/demo-runner";

async function sellerStatus(): Promise<{ ok: boolean; note: string }> {
  try {
    const r = await fetch(SIGNALS_API_URL, { signal: AbortSignal.timeout(2500) });
    const j = (await r.json()) as { paywall?: string; seller?: string | null };
    return { ok: !!j.seller, note: j.paywall ?? "unknown" };
  } catch {
    return { ok: false, note: `not reachable at ${SIGNALS_API_URL}` };
  }
}

export default async function Demo() {
  const { project } = await requireProject();
  if (project.dataMode !== "DEMO") return <Empty title="The guided demo runs on the DEMO project">Switch to “Meterline (DEMO)” in the project menu, or enter the demo from the login page.</Empty>;
  const mode = walletMode();
  const seller = await sellerStatus();
  return (
    <div>
      <PageHeader
        title="Guided demo — First 100 Developers"
        sub="Meterline is a fictional AI-agent developer tool with 500 test USDC. Each step below calls the same engine the autonomous operator uses. The founder sets goal, budget and rules — not steps."
      />
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <DemoRunner steps={DEMO_STEPS} />
        <div className="space-y-3">
          <Panel title="What is real here">
            <KV k={<span className="flex items-center gap-2"><StatusDot tone="good" /> Engine</span>} v="real code paths" />
            <KV k={<span className="flex items-center gap-2"><StatusDot tone={mode === "unconfigured" ? "warn" : "good"} /> Wallet</span>} v={mode === "circle_dcw" ? "Circle wallet · Arc Testnet" : mode === "local_testnet" ? "testnet key · Arc" : "none → SIMULATED"} />
            <KV k={<span className="flex items-center gap-2"><StatusDot tone={seller.ok ? "good" : "warn"} /> x402 seller</span>} v={<span className="text-[11px]">{seller.note}</span>} />
            <KV k={<span className="flex items-center gap-2"><StatusDot tone={claudeEnabled() ? "good" : "idle"} /> Claude</span>} v={claudeEnabled() ? "drafts & extraction" : "off → templates"} />
            <KV k={<span className="flex items-center gap-2"><StatusDot tone="info" /> Market data</span>} v="DEMO corpus" />
          </Panel>
          <Panel title="Labels">
            <ul className="space-y-1.5 text-[12px] text-ink-2">
              <li><b className="text-s7">DEMO</b> — fictional seeded data (posts, companies, creators, conversions).</li>
              <li><b className="text-warning">SIMULATED</b> — a payment that would have happened; no funds moved, no IDs or hashes.</li>
              <li><b className="text-s1">TESTNET</b> — real Circle Gateway / Arc Testnet activity with verifiable IDs.</li>
              <li><b className="text-good">LIVE</b> — real public data from providers.</li>
            </ul>
          </Panel>
          <Panel title="Make the payments real">
            <ol className="list-decimal space-y-1 pl-4 text-[12px] text-ink-2">
              <li>Set Circle credentials (or a testnet key) — see README.</li>
              <li>Fund the wallet at faucet.circle.com (Arc Testnet).</li>
              <li><code className="num">npm run wallet:deposit</code> to fund Gateway.</li>
              <li>Set <code className="num">SIGNALS_SELLER_ADDRESS</code> and run <code className="num">npm run dev</code>.</li>
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}
