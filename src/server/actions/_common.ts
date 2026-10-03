import { cookies, headers } from "next/headers";
import { getDb } from "@/server/db/client";
import { currentProject, currentUser } from "@/server/auth/current";
import { can, type Permission } from "@/server/auth/access";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/server/auth/session";
import { rateLimit, clientIp } from "@/server/security/ratelimit";

/** Uniform result for server actions consumed by client components. */
export type ActionResult<T = unknown> = { ok: true; data?: T; log?: { agent: string; message: string }[]; message?: string } | { ok: false; error: string };

export class ActionError extends Error {}

/** Every workspace action starts here: signed-in user, current workspace, and the permission it needs. */
export async function guard(permission: Permission) {
  const user = await currentUser();
  if (!user) throw new ActionError("You are signed out — sign in again.");
  const cur = await currentProject(user.id);
  if (!cur) throw new ActionError("No workspace selected.");
  if (!can(cur.role, permission)) throw new ActionError(`Your role (${cur.role}) cannot do this.`);
  return { user, project: cur.project, role: cur.role, db: await getDb() };
}

export async function limited(key: string, capacity = 10, refillPerSec = 0.2) {
  const ip = clientIp(await headers());
  const r = rateLimit(`${key}:${ip}`, { capacity, refillPerSec });
  if (!r.ok) throw new ActionError(`Too many requests — retry in ${r.retryAfter}s.`);
}

export function fail(e: unknown): ActionResult<never> {
  const msg = e instanceof Error ? e.message : String(e);
  // Zod errors are verbose; surface the first issue only.
  const zod = msg.startsWith("[") ? (JSON.parse(msg) as { message: string; path: string[] }[])[0] : null;
  return { ok: false, error: zod ? `${zod.path.join(".") || "input"}: ${zod.message}` : msg };
}

export async function startSession(userId: string) {
  (await cookies()).set(SESSION_COOKIE, createSessionToken(userId), sessionCookieOptions);
}

export type LogLine = { agent: string; message: string };
export function collector() {
  const log: LogLine[] = [];
  return { log, push: (agent: string, message: string) => log.push({ agent, message }) };
}
