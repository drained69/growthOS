import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { createPublicKey, verify } from "node:crypto";
import { getDb, schema as s } from "@/lib/db/client";
import { audit } from "@/lib/db/helpers";
import { transition } from "@/lib/agent/ledger";
import { writeReceipt } from "@/lib/agent/decisions";

export const dynamic = "force-dynamic";

const keyCache = new Map<string, string>();

/** Circle signs notifications with ECDSA; the public key is fetched by key id from Circle's API. */
async function circlePublicKey(keyId: string): Promise<string> {
  if (keyCache.has(keyId)) return keyCache.get(keyId)!;
  const r = await fetch(`https://api.circle.com/v2/notifications/publicKey/${encodeURIComponent(keyId)}`, { headers: { Authorization: `Bearer ${process.env.CIRCLE_API_KEY}` }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`public key fetch ${r.status}`);
  const j = (await r.json()) as { data: { publicKey: string } };
  keyCache.set(keyId, j.data.publicKey);
  return j.data.publicKey;
}

export async function POST(req: Request) {
  const raw = await req.text();
  // Circle sends a HEAD/empty probe when registering the endpoint.
  if (!raw) return NextResponse.json({ ok: true });
  const sig = req.headers.get("x-circle-signature");
  const keyId = req.headers.get("x-circle-key-id");
  if (!sig || !keyId || !process.env.CIRCLE_API_KEY) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const pub = createPublicKey({ key: Buffer.from(await circlePublicKey(keyId), "base64"), format: "der", type: "spki" });
    if (!verify("sha256", Buffer.from(raw), pub, Buffer.from(sig, "base64"))) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  } catch (e) {
    return NextResponse.json({ error: `verification failed: ${(e as Error).message}` }, { status: 401 });
  }
  const evt = JSON.parse(raw) as { notificationType?: string; notification?: { txHash?: string; state?: string } };
  const db = await getDb();
  await audit(db, { actorType: "webhook", actorId: "circle", action: `circle.${evt.notificationType ?? "unknown"}`, data: { state: evt.notification?.state, txHash: evt.notification?.txHash } });
  const hash = evt.notification?.txHash;
  if (hash && evt.notification?.state) {
    const [tx] = await db.select().from(s.transactions).where(and(eq(s.transactions.txHash, hash), eq(s.transactions.state, "SUBMITTED")));
    if (tx && ["COMPLETE", "CONFIRMED"].includes(evt.notification.state)) await transition(db, tx.id, "SETTLED", {}, `Circle webhook: ${evt.notification.state}`);
    if (tx && ["FAILED", "DENIED", "CANCELLED"].includes(evt.notification.state)) await transition(db, tx.id, "FAILED", { error: `Circle: ${evt.notification.state}` });
    if (tx) await writeReceipt(db, tx.decisionId);
  }
  return NextResponse.json({ ok: true });
}
