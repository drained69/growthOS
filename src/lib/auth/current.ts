import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema as s } from "../db/client";
import { PROJECT_COOKIE, SESSION_COOKIE, verifySessionToken } from "./session";

export async function currentUser() {
  const jar = await cookies();
  const sess = verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!sess) return null;
  const db = await getDb();
  const [u] = await db.select({ id: s.users.id, email: s.users.email, name: s.users.name }).from(s.users).where(eq(s.users.id, sess.uid));
  return u ?? null;
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

/** The project in scope. Always re-checked against ownership — the cookie is only a preference. */
export async function currentProject(userId: string) {
  const db = await getDb();
  const jar = await cookies();
  const pref = jar.get(PROJECT_COOKIE)?.value;
  if (pref) {
    const [p] = await db.select().from(s.projects).where(and(eq(s.projects.id, pref), eq(s.projects.ownerId, userId)));
    if (p) return p;
  }
  const [first] = await db.select().from(s.projects).where(eq(s.projects.ownerId, userId)).orderBy(asc(s.projects.createdAt));
  return first ?? null;
}

/** For /app pages: user + project with completed onboarding, or redirect. */
export async function requireProject() {
  const user = await requireUser();
  const project = await currentProject(user.id);
  if (!project) redirect("/onboarding");
  if (project.onboardingStep < 5) redirect("/onboarding");
  return { user, project, db: await getDb() };
}

export async function userProjects(userId: string) {
  const db = await getDb();
  return db.select({ id: s.projects.id, name: s.projects.name, dataMode: s.projects.dataMode }).from(s.projects).where(eq(s.projects.ownerId, userId));
}
