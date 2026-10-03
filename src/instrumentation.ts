/** Starts the in-process job worker alongside the Node.js server (disable with GROWTHOS_WORKER=off). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.GROWTHOS_WORKER === "off") return;
  const { startWorker } = await import("@/server/jobs/worker");
  startWorker({ intervalMs: Number(process.env.WORKER_INTERVAL_MS) || undefined });
}
