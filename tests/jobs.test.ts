import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import type { DB } from "@/server/db/client";

process.env.PGLITE_DIR = "memory://";

let db: DB;
let s: typeof import("@/server/db/schema");
let q: typeof import("@/server/jobs/queue");

beforeAll(async () => {
  const client = await import("@/server/db/client");
  db = await client.getDb();
  s = client.schema;
  q = await import("@/server/jobs/queue");
});

describe("job queue (real Postgres via PGlite)", () => {
  it("dedupes, claims atomically, retries with backoff and fails after maxAttempts", async () => {
    const a = await q.enqueue(db, { kind: "cleanup", dedupeKey: "k1", maxAttempts: 2 });
    const dup = await q.enqueue(db, { kind: "cleanup", dedupeKey: "k1" });
    expect(a).not.toBeNull();
    expect(dup).toBeNull();

    const j1 = await q.claimNext(db, "w1");
    expect(j1?.id).toBe(a!.id);
    expect(j1?.status).toBe("running");
    expect(await q.claimNext(db, "w2")).toBeNull(); // nothing else due

    await q.failJob(db, j1!, "boom");
    const [after1] = await db.select().from(s.jobs).where(eq(s.jobs.id, a!.id));
    expect(after1.status).toBe("queued");
    expect(after1.runAt.getTime()).toBeGreaterThan(Date.now()); // backed off
    expect(await q.claimNext(db, "w1")).toBeNull(); // not due yet

    await db.update(s.jobs).set({ runAt: new Date(Date.now() - 1000) }).where(eq(s.jobs.id, a!.id));
    const j2 = await q.claimNext(db, "w1");
    expect(j2?.attempts).toBe(2);
    await q.failJob(db, j2!, "boom again");
    const [after2] = await db.select().from(s.jobs).where(eq(s.jobs.id, a!.id));
    expect(after2.status).toBe("failed");
  });

  it("recovers jobs whose lease expired", async () => {
    const j = await q.enqueue(db, { kind: "cleanup", dedupeKey: "k2" });
    await db.update(s.jobs).set({ status: "running", lockedUntil: new Date(Date.now() - 1000) }).where(eq(s.jobs.id, j!.id));
    const claimed = await q.claimNext(db, "w3");
    expect(claimed?.id).toBe(j!.id);
    await q.completeJob(db, j!.id, { ok: true });
    const [done] = await db.select().from(s.jobs).where(eq(s.jobs.id, j!.id));
    expect(done.status).toBe("done");
  });
});
