import { getDb } from "../src/server/db/client";
import { seedDemo, DEMO_EMAIL, DEMO_PASSWORD } from "../src/server/demo/seed";

const db = await getDb();
const id = await seedDemo(db, { reset: true });
console.log(`Demo project ${id} seeded. Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD} (or use "Enter demo")`);
process.exit(0);
