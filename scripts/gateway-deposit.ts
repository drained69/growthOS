/**
 * Deposit wallet USDC into Circle Gateway so x402 nanopayments can be paid by signature.
 * (USDC sitting in the wallet is not spendable by x402 — see the organizer's example README.)
 *
 *   npm run wallet:deposit -- 1      → deposit 1 USDC on Arc Testnet
 */
import { GatewayClient, CHAIN_CONFIGS } from "@circle-fin/x402-batching/client";
import { parseUnits, type Hex } from "viem";
import { walletMode } from "../src/lib/payments/config";

const amount = process.argv[2] ?? "1";
const mode = walletMode();
const arc = CHAIN_CONFIGS.arcTestnet;

if (mode === "local_testnet") {
  const client = new GatewayClient({ chain: "arcTestnet", privateKey: process.env.AGENT_PRIVATE_KEY as Hex });
  console.log(`Depositing ${amount} USDC from ${client.address} into GatewayWallet ${arc.gatewayWallet}…`);
  const r = await client.deposit(amount);
  console.log(`approve: ${r.approvalTxHash ?? "(allowance already sufficient)"}\ndeposit: ${r.depositTxHash}`);
  console.log(`${arc.chain.blockExplorers?.default.url}/tx/${r.depositTxHash}`);
  const b = await client.getBalances();
  console.log(`Gateway available: ${b.gateway.formattedAvailable} USDC · wallet: ${b.wallet.formatted} USDC`);
} else if (mode === "circle_dcw") {
  const { initiateDeveloperControlledWalletsClient } = await import("@circle-fin/developer-controlled-wallets");
  const client = initiateDeveloperControlledWalletsClient({ apiKey: process.env.CIRCLE_API_KEY!, entitySecret: process.env.CIRCLE_ENTITY_SECRET! });
  const walletId = process.env.CIRCLE_WALLET_ID!;
  const atomic = parseUnits(amount, 6).toString();
  const run = async (sig: string, params: string[], contract: string) => {
    const tx = await client.createContractExecutionTransaction({ walletId, contractAddress: contract, abiFunctionSignature: sig, abiParameters: params, fee: { type: "level", config: { feeLevel: "MEDIUM" } } });
    const id = tx.data?.id;
    if (!id) throw new Error(`${sig}: no transaction id`);
    for (let i = 0; i < 60; i++) {
      const t = await client.getTransaction({ id });
      const st = t.data?.transaction?.state;
      if (st === "COMPLETE" || st === "CONFIRMED") return t.data?.transaction?.txHash;
      if (st === "FAILED" || st === "CANCELLED" || st === "DENIED") throw new Error(`${sig}: ${st}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error(`${sig}: timed out`);
  };
  console.log(`approve(GatewayWallet, ${amount} USDC)…`);
  console.log(" tx", await run("approve(address,uint256)", [arc.gatewayWallet, atomic], arc.usdc));
  console.log(`deposit(USDC, ${amount})…`);
  console.log(" tx", await run("deposit(address,uint256)", [arc.usdc, atomic], arc.gatewayWallet));
  console.log("Done. Gateway credits Arc deposits in about a second.");
} else {
  console.error("No wallet configured. Run npm run wallet:setup first (see README).");
  process.exit(1);
}
