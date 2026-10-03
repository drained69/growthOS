/**
 * Create the GrowthOS agent wallet.
 *
 *   npm run wallet:setup            → Circle developer-controlled EOA wallet on ARC-TESTNET
 *                                     (needs CIRCLE_API_KEY + CIRCLE_ENTITY_SECRET)
 *   npm run wallet:setup -- --entity-secret   → generate + register an entity secret first
 *   npm run wallet:setup -- --local → generate a throwaway TESTNET private key instead
 *
 * Prints the values to put in .env. Nothing is written to disk except Circle's recovery
 * file (when registering an entity secret) — keep it safe and out of git.
 */
import { randomBytes } from "node:crypto";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const args = process.argv.slice(2);

if (args.includes("--local")) {
  const pk = generatePrivateKey();
  console.log("Generated an Arc Testnet key (TESTNET ONLY — never fund it with real assets):\n");
  console.log(`AGENT_PRIVATE_KEY=${pk}`);
  console.log(`# address: ${privateKeyToAccount(pk).address}`);
  console.log("\nFund it with testnet USDC at https://faucet.circle.com (Arc Testnet), then run: npm run wallet:deposit -- 1");
  process.exit(0);
}

const apiKey = process.env.CIRCLE_API_KEY;
if (!apiKey) {
  console.error("Set CIRCLE_API_KEY (TEST_API_KEY:…) from https://console.circle.com first, or use --local for a testnet key.");
  process.exit(1);
}

const dcw = await import("@circle-fin/developer-controlled-wallets");

if (args.includes("--entity-secret")) {
  // An entity secret is 32 random bytes, hex-encoded (the SDK's generateEntitySecret only prints one).
  const entitySecret = randomBytes(32).toString("hex");
  await dcw.registerEntitySecretCiphertext({ apiKey, entitySecret, recoveryFileDownloadPath: "." });
  console.log(`CIRCLE_ENTITY_SECRET=${entitySecret}`);
  console.log("Registered with Circle. Recovery file saved in this directory — back it up and keep it out of git.");
  process.exit(0);
}

const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
if (!entitySecret) {
  console.error("Set CIRCLE_ENTITY_SECRET, or run with --entity-secret to create and register one.");
  process.exit(1);
}
const client = dcw.initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
const set = await client.createWalletSet({ name: "GrowthOS agent" });
const walletSetId = set.data?.walletSet?.id;
if (!walletSetId) throw new Error("Wallet set creation returned no id");
// EOA so x402 EIP-712 signatures verify with plain ecrecover (Gateway batching).
const w = await client.createWallets({ walletSetId, blockchains: ["ARC-TESTNET"], count: 1, accountType: "EOA" });
const wallet = w.data?.wallets?.[0];
if (!wallet) throw new Error("Wallet creation returned no wallet");
console.log("Circle developer-controlled wallet created on ARC-TESTNET:\n");
console.log(`CIRCLE_WALLET_ID=${wallet.id}`);
console.log(`CIRCLE_WALLET_ADDRESS=${wallet.address}`);
console.log("\nFund it at https://faucet.circle.com (Arc Testnet), then run: npm run wallet:deposit -- 1");
