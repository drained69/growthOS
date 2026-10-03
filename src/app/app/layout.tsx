import { requireProject } from "@/server/auth/current";
import { can } from "@/server/auth/access";
import { shellData } from "@/server/queries/shell";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, project, role, db } = await requireProject();
  const { shell, notices } = await shellData(db, user, project, role);
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-line bg-surface md:block">
        <Sidebar {...shell} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar shell={shell} notices={notices} canOperate={can(role, "operate")} />
        <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
