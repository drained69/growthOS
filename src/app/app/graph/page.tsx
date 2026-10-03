import { Network } from "lucide-react";
import { requireProject } from "@/server/auth/current";
import { buildGraph } from "@/server/domain/growth/graph";
import { EmptyState, LinkButton, ModeBadge, PageHeader } from "@/components/ui";
import { GrowthGraph } from "@/components/features/graph/growth-graph";

export default async function Graph() {
  const { project, db } = await requireProject();
  const g = await buildGraph(db, project.id);
  return (
    <div className="space-y-4">
      <PageHeader
        title="Growth graph"
        description="Every discovered entity connects back to the product, and forward to the money and results it led to."
        meta={
          <>
            <ModeBadge mode={project.dataMode} />
            <span>
              <span className="num text-ink-2">{g.nodes.length}</span> nodes · <span className="num text-ink-2">{g.edges.length}</span> links
            </span>
          </>
        }
      />
      {g.nodes.length > 1 ? (
        <GrowthGraph nodes={g.nodes} edges={g.edges} />
      ) : (
        <EmptyState
          icon={<Network />}
          title="The graph is still empty"
          description="Nodes appear as scans discover narratives, customers and creators, and grow as experiments spend and record results."
          action={
            <LinkButton href="/app/discover" variant="primary">
              Open Discover
            </LinkButton>
          }
        />
      )}
    </div>
  );
}
