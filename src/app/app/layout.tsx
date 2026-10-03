import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { requireProject, userProjects } from "@/server/auth/current";
import { schema as s } from "@/server/db/client";
import { walletMode } from "@/server/integrations/circle/config";
import { claudeEnabled } from "@/server/integrations/llm/claude";
import { SideNav } from "@/components/layout/side-nav";
import { ModeBadge, StatusDot } from "@/components/ui";
import { ProjectSwitcher, CycleButton } from "@/components/layout/shell-client";
import { logoutAction } from "@/server/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, project, db } = await requireProject();
  const [pending] = await db.select({ n: sql<number>`count(*)::int` }).from(s.approvals).where(and(eq(s.approvals.projectId, project.id), eq(s.approvals.status, "pending")));
  const [mission] = await db.select().from(s.missions).where(and(eq(s.missions.projectId, project.id), eq(s.missions.status, "active")));
  const [wallet] = await db.select().from(s.wallets).where(eq(s.wallets.projectId, project.id));
  const projects = await userProjects(user.id);
  const mode = walletMode();
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <Link href="/app" className="flex h-11 items-center gap-2 border-b border-line px-4">
          <span className="grid h-5 w-5 place-items-center rounded-[4px] bg-s1 text-[10px] font-bold text-white">G</span>
          <span className="text-[13px] font-semibold tracking-tight">GrowthOS</span>
        </Link>
        <div className="flex-1 overflow-y-auto">
          <SideNav pendingApprovals={pending?.n ?? 0} />
        </div>
        <div className="space-y-1.5 border-t border-line px-4 py-3 text-[11px] text-ink-3">
          <div className="flex items-center gap-2">
            <StatusDot tone={wallet?.frozen ? "bad" : mode === "unconfigured" ? "warn" : "good"} pulse={mode !== "unconfigured" && !wallet?.frozen} />
            <span>{wallet?.frozen ? "Wallet frozen" : mode === "circle_dcw" ? "Circle wallet · Arc" : mode === "local_testnet" ? "Testnet key · Arc" : "No wallet — simulation"}</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot tone={claudeEnabled() ? "good" : "idle"} />
            <span>{claudeEnabled() ? "Claude enabled" : "Claude off — heuristics"}</span>
          </div>
          <form action={logoutAction}>
            <button className="mt-1 text-ink-3 hover:text-ink">Sign out · {user.email}</button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-11 items-center justify-between gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <ProjectSwitcher projects={projects} current={project.id} />
            <ModeBadge mode={project.dataMode} />
            {mission && (
              <Link href="/app/missions" className="hidden truncate text-[12px] text-ink-3 hover:text-ink sm:block">
                Mission: <span className="text-ink-2">{mission.name}</span>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/onboarding?new=1" className="hidden text-[12px] text-ink-3 hover:text-ink sm:block">
              + New project
            </Link>
            <CycleButton />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 md:px-6">{children}</main>
      </div>
    </div>
  );
}
