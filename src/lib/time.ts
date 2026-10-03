export const DAY_MS = 86_400_000;

export const daysAgo = (n: number, from = Date.now()) => new Date(from - n * DAY_MS);

export function relTime(d: Date | string | null | undefined, now = Date.now()): string {
  if (!d) return "—";
  const t = typeof d === "string" ? new Date(d).getTime() : d.getTime();
  const s = Math.round((now - t) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function isoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Start of the current UTC day — the window for DAILY_SPEND. */
export function startOfUtcDay(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
