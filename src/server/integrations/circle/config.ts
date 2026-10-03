import { CHAIN_CONFIGS } from "@circle-fin/x402-batching/client";

/**
 * Network constants come from Circle's own SDK (CHAIN_CONFIGS), not hand-copied.
 * GrowthOS is testnet-only in this build.
 */
const arc = CHAIN_CONFIGS.arcTestnet;

export const ARC = {
  name: "Arc Testnet",
  chainId: arc.chain.id, // 5042002
  caip2: `eip155:${arc.chain.id}`,
  gatewayDomain: arc.domain, // 26
  usdc: arc.usdc,
  gatewayWallet: arc.gatewayWallet,
  gatewayMinter: arc.gatewayMinter,
  rpcUrl: process.env.ARC_TESTNET_RPC ?? arc.rpcUrl ?? "https://rpc.testnet.arc.network",
  explorer: arc.chain.blockExplorers?.default.url ?? "https://testnet.arcscan.app",
  appKitChain: "Arc_Testnet" as const,
  circleBlockchain: "ARC-TESTNET" as const,
};

export const GATEWAY_API = process.env.GATEWAY_API_URL ?? "https://gateway-api-testnet.circle.com";
export const DISCOVERY_API = process.env.CIRCLE_DISCOVERY_URL ?? "https://api.circle.com/v2/x402/discovery/resources";

/** App Kit chain id → Circle Wallets blockchain id → explorer, for chains GrowthOS may use. */
export const CHAINS: Record<string, { label: string; circle: string; explorer: string; caip2: string; rpc: string }> = {
  Arc_Testnet: { label: "Arc Testnet", circle: "ARC-TESTNET", explorer: "https://testnet.arcscan.app", caip2: "eip155:5042002", rpc: process.env.ARC_TESTNET_RPC ?? "https://rpc.testnet.arc.network" },
  Base_Sepolia: { label: "Base Sepolia", circle: "BASE-SEPOLIA", explorer: "https://sepolia.basescan.org", caip2: "eip155:84532", rpc: "https://sepolia.base.org" },
  Arbitrum_Sepolia: { label: "Arbitrum Sepolia", circle: "ARB-SEPOLIA", explorer: "https://sepolia.arbiscan.io", caip2: "eip155:421614", rpc: "https://sepolia-rollup.arbitrum.io/rpc" },
  Ethereum_Sepolia: { label: "Ethereum Sepolia", circle: "ETH-SEPOLIA", explorer: "https://sepolia.etherscan.io", caip2: "eip155:11155111", rpc: "https://ethereum-sepolia-rpc.publicnode.com" },
};

export const txExplorerUrl = (chain: string, hash: string) => `${CHAINS[chain]?.explorer ?? ARC.explorer}/tx/${hash}`;
export const addressExplorerUrl = (chain: string, addr: string) => `${CHAINS[chain]?.explorer ?? ARC.explorer}/address/${addr}`;

export type WalletProvider = "circle_dcw" | "local_testnet" | "unconfigured";

/**
 * What this deployment can provision for a workspace:
 *  - circle: Circle developer-controlled wallets. Keys live in Circle's custody; GrowthOS holds only
 *    the API key + entity secret, server-side. Each workspace gets its own EOA on ARC-TESTNET.
 *  - local: a single server-side testnet key (the organizer example's model). Development only;
 *    refused unless GROWTHOS_NETWORK=testnet. Never sent to the browser or the LLM.
 */
export function platformCustody(): "circle" | "local" | null {
  if (process.env.CIRCLE_API_KEY && process.env.CIRCLE_ENTITY_SECRET) return "circle";
  if (process.env.AGENT_PRIVATE_KEY && (process.env.GROWTHOS_NETWORK ?? "testnet") === "testnet") return "local";
  return null;
}
