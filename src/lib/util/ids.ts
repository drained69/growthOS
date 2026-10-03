import { randomUUID, randomBytes, createHash } from "node:crypto";

export const newId = () => randomUUID();

/** URL-safe short code for referral links (no ambiguous characters). */
export function shortCode(len = 8): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Deterministic JSON (sorted keys) so digests are stable. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(",")}}`;
}
