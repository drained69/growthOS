"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { GraphEdge, GraphNode, NodeType } from "@/lib/growth/graph";

const COLUMNS: NodeType[][] = [["product"], ["narrative", "competitor", "community"], ["customer", "kol"], ["opportunity"], ["experiment"], ["spend"], ["result"], ["learning"]];
const COLUMN_LABEL = ["Product", "Market", "Customers & KOLs", "Opportunities", "Experiments", "Spend", "Results", "Learning"];
/** Node colour encodes type (fixed categorical order); labels stay in ink. */
const TYPE_COLOR: Record<NodeType, string> = {
  product: "var(--color-ink)",
  narrative: "var(--color-s7)",
  competitor: "var(--color-s2)",
  community: "var(--color-ink-4)",
  customer: "var(--color-s1)",
  kol: "var(--color-s3)",
  opportunity: "var(--color-s4)",
  experiment: "var(--color-s5)",
  spend: "var(--color-s2)",
  result: "var(--color-good)",
  learning: "var(--color-s7)",
};

export function GrowthGraph({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const [sel, setSel] = useState<string | null>(null);
  const colW = 148;
  const rowH = 46;
  const layout = useMemo(() => {
    const pos = new Map<string, { x: number; y: number; col: number }>();
    let maxRows = 1;
    COLUMNS.forEach((types, col) => {
      const ns = nodes.filter((n) => types.includes(n.type));
      maxRows = Math.max(maxRows, ns.length);
      ns.forEach((n, i) => pos.set(n.id, { x: 20 + col * colW, y: 40 + i * rowH, col }));
    });
    // Vertically centre each column.
    const h = 40 + maxRows * rowH;
    COLUMNS.forEach((types) => {
      const ns = nodes.filter((n) => types.includes(n.type));
      const off = (h - 40 - ns.length * rowH) / 2;
      ns.forEach((n) => {
        const p = pos.get(n.id)!;
        p.y += off;
      });
    });
    return { pos, h: h + 10, w: 20 + COLUMNS.length * colW };
  }, [nodes]);
  const connected = useMemo(() => {
    if (!sel) return null;
    const set = new Set([sel]);
    // Walk both directions so a click shows the full chain product → … → learning.
    let grew = true;
    while (grew) {
      grew = false;
      for (const e of edges) {
        if (set.has(e.from) && !set.has(e.to) && (e.from === sel || isDownstream(e.from))) (set.add(e.to), (grew = true));
        if (set.has(e.to) && !set.has(e.from) && (e.to === sel || isUpstream(e.to))) (set.add(e.from), (grew = true));
      }
    }
    function isDownstream(id: string) {
      return (layout.pos.get(id)?.col ?? 0) >= (layout.pos.get(sel!)?.col ?? 0);
    }
    function isUpstream(id: string) {
      return (layout.pos.get(id)?.col ?? 0) <= (layout.pos.get(sel!)?.col ?? 0);
    }
    return set;
  }, [sel, edges, layout]);
  const selected = nodes.find((n) => n.id === sel);
  return (
    <div className="grid gap-3 2xl:grid-cols-[1fr_280px]">
      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <svg width={layout.w} height={layout.h} role="img" aria-label="Growth graph">
          {COLUMN_LABEL.map((l, i) => (
            <text key={l} x={20 + i * colW} y={20} fill="var(--color-ink-3)" fontSize={10} letterSpacing="0.08em">
              {l.toUpperCase()}
            </text>
          ))}
          {edges.map((e, i) => {
            const a = layout.pos.get(e.from);
            const b = layout.pos.get(e.to);
            if (!a || !b) return null;
            const x1 = a.x + 128;
            const y1 = a.y + 15;
            const x2 = b.x;
            const y2 = b.y + 15;
            const on = !connected || (connected.has(e.from) && connected.has(e.to));
            const mx = (x1 + x2) / 2;
            return <path key={i} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke={on ? "var(--color-line-strong)" : "var(--color-line)"} strokeOpacity={on ? 1 : 0.35} strokeWidth={on && connected ? 1.5 : 1} />;
          })}
          {nodes.map((n) => {
            const p = layout.pos.get(n.id);
            if (!p) return null;
            const dim = connected && !connected.has(n.id);
            return (
              <g key={n.id} transform={`translate(${p.x},${p.y})`} opacity={dim ? 0.3 : 1} className="cursor-pointer" onClick={() => setSel(sel === n.id ? null : n.id)}>
                <rect width={128} height={30} rx={4} fill={sel === n.id ? "var(--color-surface-3)" : "var(--color-surface-2)"} stroke={sel === n.id ? "var(--color-s1)" : "var(--color-line-strong)"} />
                <rect x={0} y={0} width={3} height={30} rx={1.5} fill={TYPE_COLOR[n.type]} />
                <text x={10} y={13} fill="var(--color-ink)" fontSize={11} fontWeight={500}>
                  {n.label.length > 18 ? n.label.slice(0, 17) + "…" : n.label}
                </text>
                <text x={10} y={25} fill="var(--color-ink-3)" fontSize={9.5}>
                  {(n.sub ?? n.type).slice(0, 24)}
                </text>
                <title>{`${n.type}: ${n.label}${n.sub ? ` — ${n.sub}` : ""}`}</title>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="rounded-md border border-line bg-surface p-3.5">
        <div className="label mb-2">Inspector</div>
        {selected ? (
          <div>
            <div className="text-[11px] uppercase tracking-wide" style={{ color: TYPE_COLOR[selected.type] }}>
              {selected.type}
            </div>
            <div className="mt-0.5 text-[15px] font-semibold">{selected.label}</div>
            {selected.sub && <div className="text-[12px] text-ink-3">{selected.sub}</div>}
            {selected.mode && <div className="mt-1 text-[11px] text-s7">{selected.mode}</div>}
            <div className="mt-2 text-[12px] text-ink-2">
              {connected ? connected.size - 1 : 0} connected node(s) highlighted along the chain.
            </div>
            {selected.href && (
              <Link href={selected.href} className="mt-3 inline-block text-[12px] text-s1 hover:underline">
                Inspect evidence →
              </Link>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-ink-3">Click any node to trace it from product → market → opportunity → experiment → spend → result → learning, and open its evidence.</p>
        )}
        <div className="mt-4 space-y-1 border-t border-line pt-3">
          {(Object.keys(TYPE_COLOR) as NodeType[]).map((t) => (
            <div key={t} className="flex items-center gap-2 text-[11px] text-ink-2">
              <span className="h-2 w-2 rounded-sm" style={{ background: TYPE_COLOR[t] }} /> {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
