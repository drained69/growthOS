import type { Address, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { walletMode } from "./config";

/** Shape required by Circle's BatchEvmScheme (x402-batching). */
export interface AgentSigner {
  address: Address;
  kind: "circle_dcw" | "local_testnet";
  signTypedData(params: {
    domain: { name: string; version: string; chainId: number; verifyingContract: Address };
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  }): Promise<Hex>;
}

const jsonSafe = (v: unknown): unknown =>
  typeof v === "bigint" ? v.toString() : Array.isArray(v) ? v.map(jsonSafe) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, jsonSafe(x)])) : v;

async function circleSigner(): Promise<AgentSigner> {
  const { initiateDeveloperControlledWalletsClient } = await import("@circle-fin/developer-controlled-wallets");
  const client = initiateDeveloperControlledWalletsClient({ apiKey: process.env.CIRCLE_API_KEY!, entitySecret: process.env.CIRCLE_ENTITY_SECRET! });
  const walletId = process.env.CIRCLE_WALLET_ID!;
  return {
    address: process.env.CIRCLE_WALLET_ADDRESS as Address,
    kind: "circle_dcw",
    async signTypedData({ domain, types, primaryType, message }) {
      // Circle expects the full EIP-712 document, including the EIP712Domain type.
      const data = JSON.stringify(
        jsonSafe({
          types: {
            EIP712Domain: [
              { name: "name", type: "string" },
              { name: "version", type: "string" },
              { name: "chainId", type: "uint256" },
              { name: "verifyingContract", type: "address" },
            ],
            ...types,
          },
          domain,
          primaryType,
          message,
        }),
      );
      const res = await client.signTypedData({ walletId, data, memo: "GrowthOS x402 payment authorization" });
      const sig = res.data?.signature;
      if (!sig) throw new Error("Circle signTypedData returned no signature");
      return sig as Hex;
    },
  };
}

function localSigner(): AgentSigner {
  const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as Hex);
  return {
    address: account.address,
    kind: "local_testnet",
    signTypedData: (p) => account.signTypedData(p as Parameters<typeof account.signTypedData>[0]),
  };
}

/** Returns the agent's signer, or null when no wallet is configured. Never exposes key material. */
export async function getAgentSigner(): Promise<AgentSigner | null> {
  const mode = walletMode();
  if (mode === "circle_dcw") return circleSigner();
  if (mode === "local_testnet") return localSigner();
  return null;
}

export function agentAddress(): string | null {
  const mode = walletMode();
  if (mode === "circle_dcw") return process.env.CIRCLE_WALLET_ADDRESS!;
  if (mode === "local_testnet") return privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as Hex).address;
  return null;
}
