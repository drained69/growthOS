"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema as s } from "@/server/db/client";
import { audit } from "@/server/db/helpers";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE, PROJECT_COOKIE } from "@/server/auth/session";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { currentProject, currentUser } from "@/server/auth/current";
import { rateLimit, clientIp } from "@/server/security/ratelimit";
import { seedDemo, DEMO_EMAIL } from "@/server/demo/seed";
import { runDemoStep, type DemoStepResult } from "@/server/demo/script";
import { runCycle } from "@/server/domain/agent/operator";
import { resolveApproval, refreshSettlements } from "@/server/domain/agent/execute";
import { purchaseCompanyIntel } from "@/server/domain/agent/purchase";
import { createExperimentFromOpportunity, launchExperiment } from "@/server/domain/growth/experiments";
import { runLearning } from "@/server/domain/growth/learning-run";
import { generateKolBrief } from "@/server/domain/growth/kol-brief";
import { buildDailyBrief } from "@/server/domain/growth/brief";
import { analyzeProduct, proposeIcp, ProductProfileSchema } from "@/server/domain/intel/product-analyst";
import { DEFAULT_POLICY } from "@/server/domain/agent/policy";
import { newId } from "@/server/lib/ids";
import { randomBytes } from "node:crypto";
import { toMicro } from "@/lib/money";
import { DAY_MS } from "@/lib/time";
import { walletMode } from "@/server/integrations/circle/config";
import { agentAddress } from "@/server/integrations/circle/signer";

export type ActionResult<T = unknown> = { ok: true; data?: T; log?: { agent: string; message: string }[]; message?: string } | { ok: false; error: string };

async function guard() {
  const user = await currentUser();
  if (!user) throw new Error("Not signed in");
  const project = await currentProject(user.id);
  if (!project) throw new Error("No project");
  return { user, project, db: await getDb() };
}

async function limited(key: string, capacity = 10, refillPerSec = 0.2) {
  const ip = clientIp(await headers());
  const r = rateLimit(`${key}:${ip}`, { capacity, refillPerSec });
  if (!r.ok) throw new Error(`Rate limited — retry in ${r.retryAfter}s`);
}

function fail(e: unknown): ActionResult<never> {
  return { ok: false, error: (e as Error).message ?? String(e) };
}

// ───────────────────────── auth ─────────────────────────

const Creds = z.object({ email: z.string().email().max(200), password: z.string().min(8).max(200), name: z.string().max(100).optional() });

async function startSession(userId: string) {
  (await cookies()).set(SESSION_COOKIE, createSessionToken(userId), sessionCookieOptions);
}

export async function loginAction(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    await limited("login", 8, 0.1);
    const c = Creds.parse({ email: form.get("email"), password: form.get("password") });
    const db = await getDb();
    const [u] = await db.select().from(s.users).where(eq(s.users.email, c.email.toLowerCase()));
    if (!u || !verifyPassword(c.password, u.passwordHash)) return { ok: false, error: "Invalid email or password" };
    await startSession(u.id);
    await audit(db, { actorType: "user", actorId: u.id, action: "auth.login" });
  } catch (e) {
    return fail(e);
  }
  redirect("/app");
}

export async function signupAction(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    await limited("signup", 5, 0.05);
    const c = Creds.parse({ email: form.get("email"), password: form.get("password"), name: form.get("name") || undefined });
    const db = await getDb();
    const email = c.email.toLowerCase();
    if (email === DEMO_EMAIL) return { ok: false, error: "Reserved address" };
    const [exists] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, email));
    if (exists) return { ok: false, error: "Account already exists — sign in instead" };
    const [u] = await db.insert(s.users).values({ id: newId(), email, name: c.name ?? email.split("@")[0], passwordHash: hashPassword(c.password) }).returning();
    await startSession(u.id);
  } catch (e) {
    return fail(e);
  }
  redirect("/onboarding");
}

export async function enterDemoAction(): Promise<void> {
  await limited("demo", 10, 0.2);
  const db = await getDb();
  const projectId = await seedDemo(db);
  const [p] = await db.select().from(s.projects).where(eq(s.projects.id, projectId));
  await startSession(p.ownerId);
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
  const [p] = await db.select().from(s.projects).where(and(eq(s.projects.id, projectId), eq(s.projects.ownerId, user.id)));
  if (!p) throw new Error("Not your project");
  (await cookies()).set(PROJECT_COOKIE, p.id, sessionCookieOptions);
  redirect("/app");
}

// ───────────────────────── agent ─────────────────────────

export async function runCycleAction(): Promise<ActionResult> {
  try {
    const { project, db, user } = await guard();
    await limited(`cycle:${user.id}`, 3, 1 / 30);
    const r = await runCycle(db, project.id, { trigger: "manual" });
    revalidatePath("/app", "layout");
    return { ok: true, log: r.log, message: `Cycle complete — ${r.log.length} steps` };
  } catch (e) {
    return fail(e);
  }
}

export async function runDemoStepAction(step: number): Promise<ActionResult<DemoStepResult>> {
  try {
    const { project, db, user } = await guard();
    await limited(`demo-step:${user.id}`, 20, 1);
    const r = await runDemoStep(db, project.id, step, user.id);
    revalidatePath("/app", "layout");
    return { ok: true, data: r, log: r.log };
  } catch (e) {
    return fail(e);
  }
}

export async function resetDemoAction(): Promise<ActionResult> {
  try {
    const { project, db } = await guard();
    if (project.dataMode !== "DEMO") return { ok: false, error: "Only the demo project can be reset" };
    const id = await seedDemo(db, { reset: true });
    (await cookies()).set(PROJECT_COOKIE, id, sessionCookieOptions);
    revalidatePath("/app", "layout");
    return { ok: true, message: "Demo reset" };
  } catch (e) {
    return fail(e);
  }
}

export async function resolveApprovalAction(approvalId: string, resolution: "approve" | "reject", amount?: string, note?: string): Promise<ActionResult> {
  try {
    const { project, db, user } = await guard();
    const [ap] = await db.select().from(s.approvals).where(and(eq(s.approvals.id, approvalId), eq(s.approvals.projectId, project.id)));
    if (!ap) return { ok: false, error: "Approval not found" };
    const log: { agent: string; message: string }[] = [];
    const r = await resolveApproval(db, { approvalId, userId: user.id, resolution, modifiedAmount: amount || undefined, note, log: (agent, message) => log.push({ agent, message }) });
    revalidatePath("/app", "layout");
    return { ok: true, data: r, log, message: `Approval ${r.status}` };
  } catch (e) {
    return fail(e);
  }
}

export async function purchaseIntelAction(companyId: string): Promise<ActionResult> {
  try {
    const { project, db } = await guard();
    const [c] = await db.select().from(s.companies).where(and(eq(s.companies.id, companyId), eq(s.companies.projectId, project.id)));
    if (!c) return { ok: false, error: "Company not found" };
    const log: { agent: string; message: string }[] = [];
    const r = await purchaseCompanyIntel(db, { projectId: project.id, companyId, log: (agent, message) => log.push({ agent, message }) });
    revalidatePath("/app", "layout");
    return { ok: true, data: r, log, message: r.message };
  } catch (e) {
    return fail(e);
  }
}

export async function createExperimentAction(opportunityId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const { project, db } = await guard();
    const [o] = await db.select().from(s.opportunities).where(and(eq(s.opportunities.id, opportunityId), eq(s.opportunities.projectId, project.id)));
    if (!o) return { ok: false, error: "Opportunity not found" };
    const log: { agent: string; message: string }[] = [];
    const exp = await createExperimentFromOpportunity(db, { projectId: project.id, opportunityId, log: (agent, message) => log.push({ agent, message }) });
    revalidatePath("/app", "layout");
    return { ok: true, data: { id: exp.id }, log };
  } catch (e) {
    return fail(e);
  }
}

export async function launchExperimentAction(experimentId: string, tranche: "first" | "second" = "first"): Promise<ActionResult> {
  try {
    const { project, db } = await guard();
    const [x] = await db.select().from(s.experiments).where(and(eq(s.experiments.id, experimentId), eq(s.experiments.projectId, project.id)));
    if (!x) return { ok: false, error: "Experiment not found" };
    const log: { agent: string; message: string }[] = [];
    const r = await launchExperiment(db, { projectId: project.id, experimentId, tranche, log: (agent, message) => log.push({ agent, message }) });
    revalidatePath("/app", "layout");
    return { ok: true, data: r, log, message: `${r.verdict} → ${r.state}` };
  } catch (e) {
    return fail(e);
  }
}

export async function dismissOpportunityAction(opportunityId: string): Promise<ActionResult> {
  try {
    const { project, db, user } = await guard();
    await db.update(s.opportunities).set({ status: "dismissed", updatedAt: new Date() }).where(and(eq(s.opportunities.id, opportunityId), eq(s.opportunities.projectId, project.id)));
    await audit(db, { projectId: project.id, actorType: "user", actorId: user.id, action: "opportunity.dismiss", target: opportunityId });
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function runLearningAction(): Promise<ActionResult> {
  try {
    const { project, db } = await guard();
    const [m] = await db.select().from(s.missions).where(and(eq(s.missions.projectId, project.id), eq(s.missions.status, "active")));
    if (!m) return { ok: false, error: "No active mission" };
    const log: { agent: string; message: string }[] = [];
    await runLearning(db, { projectId: project.id, missionId: m.id, log: (agent, message) => log.push({ agent, message }) });
    revalidatePath("/app", "layout");
    return { ok: true, log };
  } catch (e) {
    return fail(e);
  }
}

export async function refreshSettlementsAction(): Promise<ActionResult> {
  try {
    const { project, db } = await guard();
    const r = await refreshSettlements(db, project.id);
    revalidatePath("/app", "layout");
    return { ok: true, message: `Checked ${r.checked}, updated ${r.updated}${r.errors.length ? ` — ${r.errors.join("; ")}` : ""}` };
  } catch (e) {
    return fail(e);
  }
}

export async function generateBriefAction(kolId: string, experimentId?: string): Promise<ActionResult> {
  try {
    const { project, db } = await guard();
    const [k] = await db.select().from(s.kols).where(and(eq(s.kols.id, kolId), eq(s.kols.projectId, project.id)));
    if (!k) return { ok: false, error: "KOL not found" };
    await generateKolBrief(db, kolId, experimentId);
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function rebuildDailyBriefAction(): Promise<ActionResult> {
  try {
    const { project, db } = await guard();
    await buildDailyBrief(db, project.id);
    revalidatePath("/app/brief");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ───────────────────────── settings ─────────────────────────

const PolicyForm = z.object({
  maxTransaction: z.string(),
  dailySpend: z.string(),
  kolThreshold: z.string(),
  bountyThreshold: z.string(),
  hardCeiling: z.string(),
  autonomous: z.array(z.string()),
  approval: z.array(z.string()),
  chains: z.array(z.string()).min(1),
});

export async function updatePolicyAction(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const { project, db, user } = await guard();
    const f = PolicyForm.parse({
      maxTransaction: form.get("maxTransaction"),
      dailySpend: form.get("dailySpend"),
      kolThreshold: form.get("kolThreshold"),
      bountyThreshold: form.get("bountyThreshold"),
      hardCeiling: form.get("hardCeiling"),
      autonomous: form.getAll("autonomous").map(String),
      approval: form.getAll("approval").map(String),
      chains: form.getAll("chains").map(String),
    });
    const overlap = f.autonomous.filter((c) => f.approval.includes(c));
    if (overlap.length) return { ok: false, error: `A category can't be both autonomous and approval-gated: ${overlap.join(", ")}` };
    const [cur] = await db.select().from(s.policies).where(eq(s.policies.projectId, project.id));
    const vals = {
      maxTransactionMicro: toMicro(f.maxTransaction),
      dailySpendMicro: toMicro(f.dailySpend),
      kolApprovalThresholdMicro: toMicro(f.kolThreshold),
      bountyApprovalThresholdMicro: toMicro(f.bountyThreshold),
      hardCeilingMicro: toMicro(f.hardCeiling),
      autonomousCategories: f.autonomous,
      approvalCategories: f.approval,
      allowedChains: f.chains,
    };
    if (Object.values(vals).some((v) => typeof v === "number" && v < 0)) return { ok: false, error: "Limits must be non-negative" };
    await db.update(s.policies).set({ ...vals, version: (cur?.version ?? 1) + 1, updatedAt: new Date() }).where(eq(s.policies.projectId, project.id));
    await audit(db, { projectId: project.id, actorType: "user", actorId: user.id, action: "policy.update", data: vals as Record<string, unknown> });
    revalidatePath("/app", "layout");
    return { ok: true, message: "Policy saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleFreezeAction(): Promise<ActionResult> {
  try {
    const { project, db, user } = await guard();
    const [w] = await db.select().from(s.wallets).where(eq(s.wallets.projectId, project.id));
    if (!w) return { ok: false, error: "No wallet record" };
    await db.update(s.wallets).set({ frozen: !w.frozen }).where(eq(s.wallets.id, w.id));
    await audit(db, { projectId: project.id, actorType: "user", actorId: user.id, action: w.frozen ? "wallet.unfreeze" : "wallet.freeze" });
    revalidatePath("/app", "layout");
    return { ok: true, message: w.frozen ? "Spending resumed" : "Kill switch on — all spend denied" };
  } catch (e) {
    return fail(e);
  }
}

export async function saveProfileAction(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const { project, db } = await guard();
    const list = (k: string) => String(form.get(k) ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
    const profile = ProductProfileSchema.parse({
      summary: String(form.get("summary") ?? ""),
      category: String(form.get("category") ?? ""),
      targetUsers: list("targetUsers"),
      competitors: list("competitors"),
      valueProps: list("valueProps"),
      integrations: list("integrations"),
      useCases: list("useCases"),
      pricing: String(form.get("pricing") ?? "") || null,
      terminology: list("terminology"),
      keywords: list("keywords"),
    });
    await db.update(s.productProfiles).set({ ...profile, founderEdited: true, updatedAt: new Date() }).where(eq(s.productProfiles.projectId, project.id));
    revalidatePath("/app", "layout");
    revalidatePath("/onboarding");
    return { ok: true, message: "Profile saved" };
  } catch (e) {
    return fail(e);
  }
}

// ───────────────────────── onboarding ─────────────────────────

const ProductForm = z.object({
  name: z.string().min(1).max(80),
  website: z.string().max(300).optional(),
  docsUrl: z.string().max(300).optional(),
  xHandle: z.string().max(60).optional(),
  githubUrl: z.string().max(300).optional(),
  description: z.string().min(10).max(2000),
});

export async function onboardProductAction(_: unknown, form: FormData): Promise<ActionResult<{ note: string; generatedBy: string }>> {
  try {
    const user = await currentUser();
    if (!user) return { ok: false, error: "Not signed in" };
    await limited(`onboard:${user.id}`, 6, 0.05);
    const opt = (k: string) => (String(form.get(k) ?? "").trim() || undefined);
    const f = ProductForm.parse({ name: form.get("name"), website: opt("website"), docsUrl: opt("docsUrl"), xHandle: opt("xHandle"), githubUrl: opt("githubUrl"), description: form.get("description") });
    const db = await getDb();
    const analysis = await analyzeProduct(f);
    const projectId = newId();
    await db.insert(s.projects).values({ id: projectId, ownerId: user.id, name: f.name, website: f.website ?? null, docsUrl: f.docsUrl ?? null, xHandle: f.xHandle ?? null, githubUrl: f.githubUrl ?? null, description: f.description, webhookSecret: randomBytes(32).toString("hex"), onboardingStep: 2, dataMode: "LIVE" });
    await db.insert(s.productProfiles).values({ id: newId(), projectId, ...analysis.profile, crawledSources: analysis.crawled, generatedBy: analysis.generatedBy });
    (await cookies()).set(PROJECT_COOKIE, projectId, sessionCookieOptions);
    await audit(db, { projectId, actorType: "user", actorId: user.id, action: "project.create" });
    return { ok: true, data: { note: analysis.note, generatedBy: analysis.generatedBy } };
  } catch (e) {
    return fail(e);
  }
}

export async function onboardIcpAction(): Promise<ActionResult> {
  try {
    const { project, db } = await guard();
    const [profile] = await db.select().from(s.productProfiles).where(eq(s.productProfiles.projectId, project.id));
    const r = await proposeIcp(ProductProfileSchema.parse({ ...profile, pricing: profile.pricing }), project.name);
    await db.delete(s.icps).where(eq(s.icps.projectId, project.id));
    await db.insert(s.icps).values(r.icps.map((i) => ({ id: newId(), projectId: project.id, tier: i.tier, title: i.title, description: i.description, companySize: i.companySize, segments: i.segments, signals: i.signals })));
    await db.update(s.projects).set({ onboardingStep: 3 }).where(eq(s.projects.id, project.id));
    revalidatePath("/onboarding");
    return { ok: true, message: r.note };
  } catch (e) {
    return fail(e);
  }
}

export async function saveIcpAction(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const { project, db } = await guard();
    const ids = form.getAll("icpId").map(String);
    for (const id of ids) {
      const list = (k: string) => String(form.get(`${k}:${id}`) ?? "").split(",").map((x) => x.trim()).filter(Boolean);
      await db
        .update(s.icps)
        .set({ title: String(form.get(`title:${id}`) ?? ""), description: String(form.get(`description:${id}`) ?? ""), companySize: String(form.get(`companySize:${id}`) ?? "") || null, segments: list("segments"), signals: list("signals") })
        .where(and(eq(s.icps.id, id), eq(s.icps.projectId, project.id)));
    }
    revalidatePath("/onboarding");
    revalidatePath("/app/settings");
    return { ok: true, message: "ICP saved" };
  } catch (e) {
    return fail(e);
  }
}

const MISSION_TEMPLATES = {
  first_100_devs: { name: "First 100 Developers", goalEvent: "sdk_key_created", goalDescription: "verified SDK users" },
  find_buyers: { name: "Find 20 Buyers", goalEvent: "demo_request", goalDescription: "high-intent qualified companies requesting a demo" },
  own_narrative: { name: "Own the Narrative", goalEvent: "visit", goalDescription: "qualified visits from the target narrative" },
  kol_discovery: { name: "KOL Discovery", goalEvent: "signup", goalDescription: "signups from validated creator campaigns" },
} as const;

const MissionForm = z.object({ template: z.enum(["first_100_devs", "find_buyers", "own_narrative", "kol_discovery"]), goal: z.coerce.number().int().min(1).max(1_000_000), days: z.coerce.number().int().min(1).max(180), budget: z.string().regex(/^\d+(\.\d{1,6})?$/) });

export async function onboardMissionAction(_: unknown, form: FormData): Promise<ActionResult<{ done: boolean }>> {
  try {
    const { project, db } = await guard();
    const f = MissionForm.parse({ template: form.get("template"), goal: form.get("goal"), days: form.get("days"), budget: form.get("budget") });
    const t = MISSION_TEMPLATES[f.template];
    const budget = toMicro(f.budget);
    await db.update(s.missions).set({ status: "paused" }).where(and(eq(s.missions.projectId, project.id), eq(s.missions.status, "active")));
    const missionId = newId();
    await db.insert(s.missions).values({ id: missionId, projectId: project.id, template: f.template, name: t.name, goalDescription: `${f.goal} ${t.goalDescription}`, goalEvent: t.goalEvent, goalTarget: f.goal, budgetMicro: budget, startsAt: new Date(), endsAt: new Date(Date.now() + f.days * DAY_MS), status: "active", dataMode: project.dataMode });
    const split: Record<string, number> = { research: 0.04, services: 0.03, kol: 0.45, bounty: 0.1, content: 0.28, community: 0.1 };
    await db.insert(s.missionBudgets).values(Object.entries(split).map(([category, pct]) => ({ id: newId(), missionId, category, allocatedMicro: Math.floor(budget * pct) })));
    await db.update(s.projects).set({ onboardingStep: Math.max(project.onboardingStep, 4) }).where(eq(s.projects.id, project.id));
    revalidatePath("/onboarding");
    revalidatePath("/app", "layout");
    return { ok: true, data: { done: project.onboardingStep >= 5 } };
  } catch (e) {
    return fail(e);
  }
}

export async function onboardAutonomyAction(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const { project, db } = await guard();
    const num = (k: string, d: number) => toMicro(String(form.get(k) || d));
    const values = {
      ...DEFAULT_POLICY,
      maxTransactionMicro: num("maxTransaction", 10),
      dailySpendMicro: num("dailySpend", 50),
      kolApprovalThresholdMicro: num("kolThreshold", 100),
      bountyApprovalThresholdMicro: num("bountyThreshold", 25),
      hardCeilingMicro: num("hardCeiling", 500),
    };
    await db.insert(s.policies).values({ id: newId(), projectId: project.id, ...values }).onConflictDoUpdate({ target: s.policies.projectId, set: values });
    const mode = walletMode();
    const [w] = await db.select().from(s.wallets).where(eq(s.wallets.projectId, project.id));
    if (!w)
      await db.insert(s.wallets).values({ id: newId(), projectId: project.id, provider: mode, address: agentAddress(), circleWalletId: process.env.CIRCLE_WALLET_ID ?? null, status: mode === "unconfigured" ? "NOT_CONFIGURED" : "ACTIVE", dataMode: mode === "unconfigured" ? "SIMULATED" : "TESTNET" });
    await db.update(s.projects).set({ onboardingStep: 5 }).where(eq(s.projects.id, project.id));
  } catch (e) {
    return fail(e);
  }
  redirect("/app");
}
