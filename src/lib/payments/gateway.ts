import { ARC, GATEWAY_API } from "./config";
import { toMicro } from "../util/money";

/** Circle Gateway API reads (same endpoints the organizer's example uses). */

export interface GatewayBalance {
  availableMicro: number;
  raw: unknown;
}

export async function gatewayBalance(depositor: string): Promise<GatewayBalance> {
  const r = await fetch(`${GATEWAY_API}/v1/balances`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "USDC", sources: [{ domain: ARC.gatewayDomain, depositor }] }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`Gateway balance HTTP ${r.status}`);
  const j = (await r.json()) as { balances?: { balance: string; domain: number }[] };
  const bal = j.balances?.find((b) => b.domain === ARC.gatewayDomain)?.balance ?? "0";
  return { availableMicro: toMicro(bal), raw: j };
}

export type SettlementStatus = "received" | "batched" | "confirmed" | "completed" | "failed";

export interface Settlement {
  id: string;
  status: SettlementStatus;
  fromAddress: string;
  toAddress: string;
  amount: string;
  createdAt: string;
  updatedAt: string;
}

export async function getSettlement(id: string): Promise<Settlement> {
  const r = await fetch(`${GATEWAY_API}/v1/x402/transfers/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`Settlement lookup HTTP ${r.status}`);
  return (await r.json()) as Settlement;
}

/**
 * Settlement UUIDs never go on-chain. Like the organizer's example, we find the Gateway
 * submitBatch tx whose timestamp precedes the settlement's completion. Heuristic — labelled as such.
 */
export async function resolveBatchTx(s: Settlement): Promise<string | null> {
  if (s.status !== "completed" && s.status !== "confirmed") return null;
  const r = await fetch(`${ARC.explorer}/api/v2/addresses/${ARC.gatewayWallet}/transactions?filter=to`, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) return null;
  const { items } = (await r.json()) as { items: { hash: string; timestamp: string; method: string | null }[] };
  const updated = new Date(s.updatedAt).getTime();
  return items.find((t) => t.method === "submitBatch" && new Date(t.timestamp).getTime() <= updated + 5_000)?.hash ?? null;
}
