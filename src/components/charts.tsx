import { cx } from "./ui";

/**
 * Inline-SVG chart primitives. Marks follow the dataviz spec: thin marks, rounded data-ends
 * anchored at the baseline, 2px surface gaps between adjacent fills, recessive axes,
 * hover tooltips (<title>) on every mark, text in ink tokens — never the series color.
 */

/** Categorical slots in fixed order (validated palette). Color follows the entity, never rank. */
export const BUDGET_COLORS: Record<string, string> = {
  research: "var(--color-s1)",
  services: "var(--color-s2)",
  kol: "var(--color-s3)",
  bounty: "var(--color-s4)",
  content: "var(--color-s5)",
  community: "var(--color-s7)",
  treasury: "var(--color-ink-4)",
};

export function Sparkline({ values, width = 120, height = 28, label }: { values: number[]; width?: number; height?: number; label?: string }) {
  if (!values.length) return null;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const pts = values.map((v, i) => [i * step, height - 2 - (v / max) * (height - 4)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label ?? "trend"} className="overflow-visible">
      <path d={`${d} L${width},${height} L0,${height} Z`} fill="var(--color-s1)" opacity={0.12} />
      <path d={d} fill="none" stroke="var(--color-s1)" strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill="var(--color-s1)" />
      {pts.map(([x, y], i) => (
        <rect key={i} x={x - step / 2} y={0} width={step} height={height} fill="transparent">
          <title>{`${label ? label + " · " : ""}${values.length - 1 - i}d ago: ${values[i]}`}</title>
        </rect>
      ))}
    </svg>
  );
}

/** Daily column chart (e.g. 14-day volume). Rounded tops anchored to the baseline. */
export function Columns({ values, labels, height = 64, highlightFrom }: { values: number[]; labels?: string[]; height?: number; highlightFrom?: number }) {
  const max = Math.max(1, ...values);
  const w = 100 / values.length;
  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" role="img" aria-label="volume by day">
      <line x1={0} x2={100} y1={height - 0.5} y2={height - 0.5} stroke="var(--color-line-strong)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
      {values.map((v, i) => {
        const h = (v / max) * (height - 4);
        const recent = highlightFrom != null && i >= highlightFrom;
        return (
          <rect key={i} x={i * w + w * 0.14} width={w * 0.72} y={height - h} height={Math.max(h, v ? 1 : 0)} rx={1} fill={recent ? "var(--color-s1)" : "var(--color-ink-4)"}>
            <title>{`${labels?.[i] ?? `day ${i + 1}`}: ${v}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

/** Stacked horizontal bar for budget allocation; legend always present (≥2 series). */
export function StackedBar({ parts, total, height = 10 }: { parts: { key: string; label: string; value: number; display: string }[]; total: number; height?: number }) {
  const sum = Math.max(total, parts.reduce((s, p) => s + p.value, 0), 1);
  return (
    <div>
      <div className="flex w-full gap-[2px] overflow-hidden rounded-[3px]" style={{ height }}>
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <div key={p.key} className="h-full first:rounded-l-[3px] last:rounded-r-[3px]" style={{ width: `${(p.value / sum) * 100}%`, background: BUDGET_COLORS[p.key] ?? "var(--color-ink-3)" }} title={`${p.label}: ${p.display}`} />
          ))}
        {sum > parts.reduce((s, p) => s + p.value, 0) && <div className="h-full flex-1 bg-surface-3" title="Unallocated" />}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {parts.map((p) => (
          <div key={p.key} className="flex items-center gap-1.5 text-[11.5px]">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: BUDGET_COLORS[p.key] ?? "var(--color-ink-3)" }} />
            <span className="text-ink-2">{p.label}</span>
            <span className="num text-ink">{p.display}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Progress toward a goal with a pace marker (where we should be by now). */
export function GoalProgress({ achieved, goal, pace }: { achieved: number; goal: number; pace?: number }) {
  const pct = Math.min(100, (achieved / Math.max(1, goal)) * 100);
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-3" title={`${achieved} of ${goal}${pace != null ? ` · on-pace target ${Math.round(pace)}` : ""}`}>
      <div className="absolute inset-y-0 left-0 rounded-full bg-s1" style={{ width: `${pct}%` }} />
      {pace != null && <div className="absolute inset-y-[-2px] w-[2px] bg-ink" style={{ left: `${Math.min(100, (pace / Math.max(1, goal)) * 100)}%` }} />}
    </div>
  );
}

/** Ranked horizontal bars — e.g. CPA by experiment. Single hue; values labelled. */
export function BarList({ rows, format, className }: { rows: { label: string; value: number; sub?: string; tone?: "good" | "bad" }[]; format: (v: number) => string; className?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className={cx("space-y-1.5", className)}>
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3" title={`${r.label}: ${format(r.value)}`}>
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[12px] text-ink-2">{r.label}</span>
              {r.sub && <span className="shrink-0 text-[10.5px] text-ink-3">{r.sub}</span>}
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div className={cx("h-full rounded-full", r.tone === "bad" ? "bg-serious" : r.tone === "good" ? "bg-good" : "bg-s1")} style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
          </div>
          <span className="num text-[12px] text-ink">{format(r.value)}</span>
        </div>
      ))}
    </div>
  );
}
