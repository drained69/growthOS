import { walletMode, CHAINS, txExplorerUrl } from "./config";
import { agentAddress } from "./signer";
import { toMicro } from "../util/money";

/**
 * Arc App Kit — used where it solves a GrowthOS problem:
 *  SEND            approved creator/bounty/partner payments
 *  BRIDGE          move budget to the chain a payment must land on (e.g. a Base bounty)
 *  UNIFIED BALANCE one chain-abstracted view of operating capital
 * The kit, adapter and keys live server-side only.
 */

type Kit = InstanceType<(typeof import("@circle-fin/app-kit"))["AppKit"]>;
let kitP: Promise<Kit> | null = null;

async function kit(): Promise<Kit> {
  kitP ??= import("@circle-fin/app-kit").then((m) => new m.AppKit());
  return kitP;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAdapter = any;
let adapterP: Promise<AnyAdapter> | null = null;

async function adapter(): Promise<AnyAdapter> {
  adapterP ??= (async () => {
    const mode = walletMode();
    if (mode === "circle_dcw") {
      const { createCircleWalletsAdapter } = await import("@circle-fin/adapter-circle-wallets");
      return createCircleWalletsAdapter({ apiKey: process.env.CIRCLE_API_KEY!, entitySecret: process.env.CIRCLE_ENTITY_SECRET! });
    }
    if (mode === "local_testnet") {
      const { createViemAdapterFromPrivateKey } = await import("@circle-fin/adapter-viem-v2");
      return createViemAdapterFromPrivateKey({ privateKey: process.env.AGENT_PRIVATE_KEY! });
    }
    throw new Error("No agent wallet configured");
  })();
  return adapterP;
}

/** Circle-custodied wallets are addressed explicitly ("developer-controlled addressing"). */
async function ctx(chain: string) {
  const a = await adapter();
  return walletMode() === "circle_dcw" ? { adapter: a, chain, address: agentAddress()! } : { adapter: a, chain };
}

export interface ChainTxResult {
  state: "pending" | "success" | "error" | "noop";
  txHash: string | null;
  explorerUrl: string | null;
  steps: { name: string; state: string; txHash?: string; explorerUrl?: string }[];
}

export async function appKitSend(p: { chain: string; to: string; amount: string }): Promise<ChainTxResult> {
  const k = await kit();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const step = await k.send({ from: (await ctx(p.chain)) as any, to: p.to, amount: p.amount, token: "USDC" });
  return {
    state: step.state,
    txHash: step.txHash ?? null,
    explorerUrl: step.explorerUrl ?? (step.txHash ? txExplorerUrl(p.chain, step.txHash) : null),
    steps: [{ name: step.name, state: step.state, txHash: step.txHash, explorerUrl: step.explorerUrl }],
  };
}

export async function appKitBridge(p: { fromChain: string; toChain: string; amount: string }): Promise<ChainTxResult> {
  const k = await kit();
  const res = await k.bridge({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (await ctx(p.fromChain)) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    to: (await ctx(p.toChain)) as any,
    amount: p.amount,
  });
  const last = [...res.steps].reverse().find((s) => s.txHash);
  return {
    state: res.state,
    txHash: last?.txHash ?? null,
    explorerUrl: last?.explorerUrl ?? null,
    steps: res.steps.map((s) => ({ name: s.name, state: s.state, txHash: s.txHash, explorerUrl: s.explorerUrl })),
  };
}

export interface UnifiedBalance {
  totalMicro: number;
  byChain: { chain: string; label: string; micro: number }[];
  source: "app_kit_unified_balance";
}

/** Read-only, address-based query — needs no signing capability. */
export async function unifiedBalance(address: string): Promise<UnifiedBalance> {
  const k = await kit();
  const chains = ["Arc_Testnet", "Base_Sepolia", "Arbitrum_Sepolia"];
  const res = await k.unifiedBalance.getBalances({
    token: "USDC",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sources: { address, chains: chains as any },
    networkType: "testnet",
  });
  const byChain = res.breakdown.flatMap((b) => b.breakdown.map((c) => ({ chain: String(c.chain), label: CHAINS[String(c.chain)]?.label ?? String(c.chain), micro: toMicro(c.confirmedBalance) })));
  return { totalMicro: toMicro(res.totalConfirmedBalance), byChain, source: "app_kit_unified_balance" };
}
