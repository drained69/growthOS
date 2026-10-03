import { requireProject } from "@/lib/auth/current";
import { buildGraph } from "@/lib/growth/graph";
import { PageHeader } from "@/components/ui";
import { GrowthGraph } from "@/components/growth-graph";

export default async function Graph() {
  const { project, db } = await requireProject();
  const g = await buildGraph(db, project.id);
  return (
    <div>
      <PageHeader title="Growth Graph" sub="The intelligence foundation: every discovered entity connects back to the product, and forward to the money and results it led to." />
      <GrowthGraph nodes={g.nodes} edges={g.edges} />
    </div>
  );
}
