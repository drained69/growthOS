import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { recoverTypedDataAddress, type Hex } from "viem";
import { quote, pay } from "../src/server/integrations/circle/x402";
import { ARC } from "../src/server/integrations/circle/config";
import type { AgentSigner } from "../src/server/integrations/circle/signer";

/**
 * Offline x402 round-trip against a mock seller that speaks the same wire format as
 * Circle's createGatewayMiddleware (PAYMENT-REQUIRED / Payment-Signature / PAYMENT-RESPONSE).
 * The buyer signs with Circle's BatchEvmScheme; the mock recovers the EIP-712 signer.
 */
const SELLER = "0x933a2405f84c224be1ef373ba16e992e1f459682";
let server: Server;
let base = "";
let lastRecovered: string | null = null;
let price = "10000";

beforeAll(async () => {
  server = createServer(async (req, res) => {
    const sig = req.headers["payment-signature"] as string | undefined;
    const requirement = { scheme: "exact", network: ARC.caip2, asset: ARC.usdc, amount: price, payTo: SELLER, maxTimeoutSeconds: 345600, extra: { name: "GatewayWalletBatched", version: "1", verifyingContract: ARC.gatewayWallet } };
    if (!sig) {
      const pr = { x402Version: 2, resource: { url: req.url, description: "test data", mimeType: "application/json" }, accepts: [requirement] };
      res.writeHead(402, { "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(pr)).toString("base64"), "Content-Type": "application/json" });
      return res.end("{}");
    }
    const payload = JSON.parse(Buffer.from(sig, "base64").toString()) as { payload: { signature: Hex; authorization: { from: Hex; to: Hex; value: string; validAfter: string; validBefore: string; nonce: Hex } } };
    const a = payload.payload.authorization;
    lastRecovered = await recoverTypedDataAddress({
      domain: { name: "GatewayWalletBatched", version: "1", chainId: ARC.chainId, verifyingContract: ARC.gatewayWallet as Hex },
      types: { TransferWithAuthorization: [
        { name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" },
      ] },
      primaryType: "TransferWithAuthorization",
      message: { from: a.from, to: a.to, value: BigInt(a.value), validAfter: BigInt(a.validAfter), validBefore: BigInt(a.validBefore), nonce: a.nonce },
      signature: payload.payload.signature,
    });
    const settle = { success: true, transaction: "11111111-2222-3333-4444-555555555555", network: ARC.caip2, payer: a.from };
    res.writeHead(200, { "PAYMENT-RESPONSE": Buffer.from(JSON.stringify(settle)).toString("base64"), "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, to: a.to, value: a.value }));
  });
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

function testSigner(): AgentSigner {
  const acct = privateKeyToAccount(generatePrivateKey());
  return { address: acct.address, kind: "local_testnet", signTypedData: (p) => acct.signTypedData(p as Parameters<typeof acct.signTypedData>[0]) };
}

describe("x402 buyer (quote → policy → pay)", () => {
  it("parses the seller's 402 quote", async () => {
    const q = await quote(`${base}/v1/company-intel?company=Acme`);
    expect(q.kind).toBe("quote");
    if (q.kind !== "quote") return;
    expect(q.quote.amountMicro).toBe(10_000);
    expect(q.quote.payTo.toLowerCase()).toBe(SELLER);
  });

  it("signs a TransferWithAuthorization the seller can recover, and returns the settlement id", async () => {
    const signer = testSigner();
    const q = await quote(`${base}/x`);
    if (q.kind !== "quote") throw new Error("no quote");
    const r = await pay(q.quote, signer, { maxAmountMicro: 10_000 });
    expect(r.settlementId).toBe("11111111-2222-3333-4444-555555555555");
    expect(lastRecovered?.toLowerCase()).toBe(signer.address.toLowerCase());
    expect((r.data as { to: string }).to.toLowerCase()).toBe(SELLER);
  });

  it("refuses to pay more than was authorized", async () => {
    price = "50000";
    const q = await quote(`${base}/x`);
    if (q.kind !== "quote") throw new Error("no quote");
    await expect(pay(q.quote, testSigner(), { maxAmountMicro: 10_000 })).rejects.toThrow(/exceeds/);
    price = "10000";
  });
});
