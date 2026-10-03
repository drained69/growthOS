/**
 * DEMO enrichment fixtures for the fictional demo companies/creators. Served by the bundled
 * signals seller only when asked about these demo entities, and always tagged dataMode: DEMO.
 * The x402 payment for them is still real when a testnet wallet is configured.
 */

export interface EnrichmentSignal {
  signalType: "funding" | "hiring" | "initiative" | "tech_adoption" | "partnership" | "launch";
  summary: string;
  sourceUrl: string;
  observedAt: string; // ISO
  confidence: number;
}

const daysAgoIso = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export function demoCompanyIntel(name: string): { company: string; dataMode: "DEMO"; signals: EnrichmentSignal[]; headcount?: string } | null {
  const key = name.toLowerCase();
  if (key === "acme labs" || key === "acmelabs" || key === "acme-labs")
    return {
      company: "Acme Labs",
      dataMode: "DEMO",
      headcount: "35-50",
      signals: [
        { signalType: "funding", summary: "Closed a $12M Series A led by a payments-focused fund (DEMO)", sourceUrl: "/demo/source/acme-funding", observedAt: daysAgoIso(9), confidence: 0.9 },
        { signalType: "hiring", summary: "Two open roles: Smart Contract Engineer, Payments Infrastructure Engineer (DEMO)", sourceUrl: "/demo/source/acme-jobs", observedAt: daysAgoIso(4), confidence: 0.95 },
        { signalType: "tech_adoption", summary: "Public repo added an x402 client dependency 2 days ago (DEMO)", sourceUrl: "/demo/source/acme-repo", observedAt: daysAgoIso(2), confidence: 0.85 },
      ],
    };
  if (key === "northwind agents" || key === "northwind-agents")
    return {
      company: "Northwind Agents",
      dataMode: "DEMO",
      headcount: "8-12",
      signals: [{ signalType: "launch", summary: "Shipped an autonomous procurement agent in private beta (DEMO)", sourceUrl: "/demo/source/northwind-launch", observedAt: daysAgoIso(5), confidence: 0.8 }],
    };
  if (key === "kestrel pay" || key === "kestrel-pay")
    return {
      company: "Kestrel Pay",
      dataMode: "DEMO",
      headcount: "20-30",
      signals: [{ signalType: "initiative", summary: "Roadmap lists machine-to-machine payments for Q1 (DEMO)", sourceUrl: "/demo/source/kestrel-roadmap", observedAt: daysAgoIso(12), confidence: 0.7 }],
    };
  return null;
}

export function demoCreatorAudience(handle: string): { handle: string; dataMode: "DEMO"; icpShare: number; developerShare: number; botLikelihood: number; notes: string } | null {
  const h = handle.toLowerCase().replace(/^@/, "");
  const table: Record<string, { icpShare: number; developerShare: number; botLikelihood: number; notes: string }> = {
    ada_ships: { icpShare: 0.91, developerShare: 0.84, botLikelihood: 0.03, notes: "Audience concentrated in TypeScript / agent developers (DEMO)" },
    priya_builds: { icpShare: 0.88, developerShare: 0.9, botLikelihood: 0.02, notes: "Mostly infra engineers; high reply depth (DEMO)" },
    marcus_onchain: { icpShare: 0.22, developerShare: 0.12, botLikelihood: 0.41, notes: "Trader-heavy audience; engagement pattern suggests inflated reach (DEMO)" },
  };
  return table[h] ? { handle: h, dataMode: "DEMO", ...table[h] } : null;
}
