"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema as s } from "@/server/db/client";
import { audit } from "@/server/db/helpers";
import { sessionCookieOptions, SESSION_COOKIE, PROJECT_COOKIE } from "@/server/auth/session";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { currentUser } from "@/server/auth/current";
import { seedDemo, DEMO_EMAIL } from "@/server/demo/seed";
import { acceptInvite } from "@/server/domain/workspace/members";
import { newId } from "@/server/lib/ids";
import { fail, limited, startSession, type ActionResult } from "@/server/actions/_common";

const Creds = z.object({ email: z.string().email("Enter a valid email").max(200), password: z.string().min(8, "Password must be at least 8 characters").max(200), name: z.string().max(100).optional() });

function safeNext(n: FormDataEntryValue | null): string {
  const v = typeof n === "string" ? n : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/app";
}

export async function loginAction(_: unknown, form: FormData): Promise<ActionResult> {
  let next = "/app";
  try {
    await limited("login", 8, 0.1);
    const c = Creds.parse({ email: form.get("email"), password: form.get("password") });
    const db = await getDb();
    const [u] = await db.select().from(s.users).where(eq(s.users.email, c.email.toLowerCase()));
    if (!u || u.isGuest || !verifyPassword(c.password, u.passwordHash)) return { ok: false, error: "Invalid email or password" };
    await startSession(u.id);
    await db.update(s.users).set({ lastLoginAt: new Date() }).where(eq(s.users.id, u.id));
    await audit(db, { actorType: "user", actorId: u.id, action: "auth.login" });
    const invite = form.get("invite");
    if (typeof invite === "string" && invite) {
      const pid = await acceptInvite(db, { token: invite, userId: u.id, userEmail: u.email });
      (await cookies()).set(PROJECT_COOKIE, pid, sessionCookieOptions);
    }
    next = safeNext(form.get("next"));
  } catch (e) {
    return fail(e);
  }
  redirect(next);
}

export async function signupAction(_: unknown, form: FormData): Promise<ActionResult> {
  let next = "/onboarding";
  try {
    await limited("signup", 5, 0.05);
    const c = Creds.parse({ email: form.get("email"), password: form.get("password"), name: form.get("name") || undefined });
    const db = await getDb();
    const email = c.email.toLowerCase();
    if (email === DEMO_EMAIL || email.endsWith("@guest.growthos.local")) return { ok: false, error: "That address is reserved" };
    const [exists] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, email));
    if (exists) return { ok: false, error: "An account with this email exists — sign in instead" };
    const [u] = await db.insert(s.users).values({ id: newId(), email, name: c.name || email.split("@")[0], passwordHash: hashPassword(c.password), lastLoginAt: new Date() }).returning();
    await startSession(u.id);
    await audit(db, { actorType: "user", actorId: u.id, action: "auth.signup" });
    const invite = form.get("invite");
    if (typeof invite === "string" && invite) {
      const pid = await acceptInvite(db, { token: invite, userId: u.id, userEmail: u.email });
      (await cookies()).set(PROJECT_COOKIE, pid, sessionCookieOptions);
      next = "/app";
    }
  } catch (e) {
    return fail(e);
  }
  redirect(next);
}

/**
 * Demo: a signed-in user gets a demo workspace added to their account; an anonymous visitor
 * gets a private guest account (expires after 7 days) — visitors never share demo state.
 */
export async function enterDemoAction(): Promise<void> {
  await limited("demo", 6, 0.05);
  const db = await getDb();
  let user = await currentUser();
  if (!user) {
    const id = newId();
    const [g] = await db.insert(s.users).values({ id, email: `guest-${id.slice(0, 12)}@guest.growthos.local`, name: "Guest", passwordHash: "!", isGuest: true, lastLoginAt: new Date() }).returning();
    user = { id: g.id, email: g.email, name: g.name, isGuest: true };
    await startSession(g.id);
  }
  const [existing] = await db.select({ id: s.projects.id }).from(s.memberships).innerJoin(s.projects, eq(s.memberships.projectId, s.projects.id)).where(and(eq(s.memberships.userId, user.id), eq(s.projects.dataMode, "DEMO")));
  const projectId = existing?.id ?? (await seedDemo(db, { ownerId: user.id }));
  (await cookies()).set(PROJECT_COOKIE, projectId, sessionCookieOptions);
  redirect("/app/demo");
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(PROJECT_COOKIE);
  redirect("/");
}

export async function switchProjectAction(projectId: string): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const db = await getDb();
  const [m] = await db.select().from(s.memberships).where(and(eq(s.memberships.projectId, projectId), eq(s.memberships.userId, user.id)));
  if (!m) throw new Error("You are not a member of that workspace");
  (await cookies()).set(PROJECT_COOKIE, projectId, sessionCookieOptions);
  redirect("/app");
}
