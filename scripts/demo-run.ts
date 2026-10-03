import { eq } from "drizzle-orm";
import { getDb, schema as s } from "../src/server/db/client";
import { runDemoStep, DEMO_STEPS } from "../src/server/demo/script";
import { ensureDemoUser } from "../src/server/demo/seed";

/** Runs the guided demo headlessly — useful for CI and for checking the loop end to end. */
const db = await getDb();
const userId = await ensureDemoUser(db);
const [p] = await db.select().from(s.projects).where(eq(s.projects.dataMode, "DEMO"));
for (const st of DEMO_STEPS) {
  const r = await runDemoStep(db, p.id, st.step, userId);
  console.log(`\n== ${r.step}. ${r.title}`);
  for (const l of r.log) console.log(`  [${l.agent}] ${l.message}`);
}
process.exit(0);
