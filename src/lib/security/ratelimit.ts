/**
 * In-memory token bucket per key (IP + route). Adequate for a single-instance deployment;
 * swap for Redis/Upstash behind the same function when running multiple instances.
 */
const buckets = new Map<string, { tokens: number; at: number }>();

export function rateLimit(key: string, opts: { capacity: number; refillPerSec: number }): { ok: boolean; retryAfter: number } {
  const now = Date.now() / 1000;
  const b = buckets.get(key) ?? { tokens: opts.capacity, at: now };
  b.tokens = Math.min(opts.capacity, b.tokens + (now - b.at) * opts.refillPerSec);
  b.at = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return { ok: false, retryAfter: Math.ceil((1 - b.tokens) / opts.refillPerSec) };
  }
  b.tokens -= 1;
  buckets.set(key, b);
  if (buckets.size > 10_000) for (const [k, v] of buckets) if (now - v.at > 3600) buckets.delete(k);
  return { ok: true, retryAfter: 0 };
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() ?? headers.get("x-real-ip") ?? "local";
}
