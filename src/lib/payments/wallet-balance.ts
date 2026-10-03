import { createPublicClient, http, erc20Abi, type Address } from "viem";
import { ARC } from "./config";

/** On-chain USDC (ERC-20 interface, 6 decimals) held by an address on Arc Testnet. */
export async function arcUsdcBalanceMicro(address: string): Promise<number> {
  const client = createPublicClient({ transport: http(ARC.rpcUrl) });
  const bal = await client.readContract({ address: ARC.usdc as Address, abi: erc20Abi, functionName: "balanceOf", args: [address as Address] });
  return Number(bal);
}
