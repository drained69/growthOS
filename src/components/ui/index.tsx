import Link from "next/link";
import type { ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Panel({ title, right, children, className, pad = true, id }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; pad?: boolean; id?: string }) {
  return (
    <section id={id} className={cx("rounded-md border border-line bg-surface", className)}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2">
          <div className="label">{title}</div>
          <div className="flex items-center gap-2 text-[11px] text-ink-3">{right}</div>
        </header>
      )}
      <div className={pad ? "p-3.5" : ""}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, sub, right, crumbs }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; crumbs?: { label: string; href: string }[] }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {crumbs && (
          <div className="mb-1 flex items-center gap-1.5 text-[11px] text-ink-3">
            {crumbs.map((c, i) => (
              <span key={c.href} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-ink-4">/</span>}
                <Link href={c.href} className="hover:text-ink">
                  {c.label}
                </Link>
              </span>
            ))}
          </div>
        )}
        <h1 className="text-[19px] font-semibold tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-0.5 max-w-3xl text-[12.5px] text-ink-3">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "warn" | "bad" }) {
  return (
    <div className="min-w-0">
      <div className="label">{label}</div>
      <div className={cx("num mt-1 text-[22px] font-medium leading-none", tone === "good" && "text-good", tone === "warn" && "text-warning", tone === "bad" && "text-critical")}>{value}</div>
      {sub && <div className="mt-1 truncate text-[11px] text-ink-3">{sub}</div>}
    </div>
  );
}

const MODE_STYLE: Record<string, string> = {
  DEMO: "border-s7/50 text-s7 bg-s7/10",
  SIMULATED: "border-warning/50 text-warning bg-warning/10",
  TESTNET: "border-s1/50 text-s1 bg-s1/10",
  LIVE: "border-good/50 text-good bg-good/10",
};

/** Provenance label. Every user-visible record carries one. */
export function ModeBadge({ mode, className }: { mode: string | null | undefined; className?: string }) {
  if (!mode) return null;
  return <span className={cx("num inline-flex items-center rounded-[3px] border px-1 py-px text-[9.5px] font-medium tracking-wider", MODE_STYLE[mode] ?? "border-line text-ink-3", className)}>{mode}</span>;
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "info" | "accent"; className?: string }) {
  const t = {
    neutral: "border-line-strong text-ink-2",
    good: "border-good/40 text-good",
    warn: "border-warning/40 text-warning",
    bad: "border-critical/50 text-critical",
    info: "border-s1/40 text-s1",
    accent: "border-s7/40 text-s7",
  }[tone];
  return <span className={cx("inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-px text-[10.5px] font-medium", t, className)}>{children}</span>;
}

export function StatusDot({ tone, pulse }: { tone: "good" | "warn" | "bad" | "idle" | "info"; pulse?: boolean }) {
  const c = { good: "bg-good", warn: "bg-warning", bad: "bg-critical", idle: "bg-ink-4", info: "bg-s1" }[tone];
  return <span className={cx("inline-block h-1.5 w-1.5 rounded-full", c, pulse && "pulse")} />;
}

const VERDICT_TONE: Record<string, "good" | "warn" | "bad" | "neutral"> = { ALLOW: "good", APPROVAL_REQUIRED: "warn", DENY: "bad" };
export function VerdictBadge({ verdict }: { verdict: string | null | undefined }) {
  if (!verdict) return <span className="text-ink-4">—</span>;
  return <Badge tone={VERDICT_TONE[verdict] ?? "neutral"}>{verdict === "APPROVAL_REQUIRED" ? "APPROVAL" : verdict}</Badge>;
}

const STATE_TONE: Record<string, "good" | "warn" | "bad" | "info" | "neutral" | "accent"> = {
  SETTLED: "good",
  SUBMITTED: "info",
  EXECUTING: "info",
  AUTHORIZED: "info",
  AWAITING_APPROVAL: "warn",
  SIMULATED: "warn",
  FAILED: "bad",
  DENIED: "bad",
  REJECTED: "bad",
  PROPOSED: "neutral",
};
export function TxState({ state }: { state: string }) {
  return <Badge tone={STATE_TONE[state] ?? "neutral"}>{state}</Badge>;
}

/** Horizontal score bar 0-100 with value. Single sequential hue; text stays in ink. */
export function ScoreBar({ value, label, width = "w-full", showValue = true }: { value: number; label?: string; width?: string; showValue?: boolean }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cx("flex items-center gap-2", width)} title={label ? `${label}: ${v}/100` : `${v}/100`}>
      {label && <span className="w-36 shrink-0 truncate text-[11.5px] text-ink-2">{label}</span>}
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
        <div className="absolute inset-y-0 left-0 rounded-full bg-s1" style={{ width: `${v}%` }} />
      </div>
      {showValue && <span className="num w-7 text-right text-[11.5px] text-ink">{v}</span>}
    </div>
  );
}

export function Confidence({ value, compact }: { value: number; compact?: boolean }) {
  const pct = Math.round(value * 100);
  const tone = pct >= 80 ? "bg-good" : pct >= 60 ? "bg-s1" : "bg-ink-4";
  return (
    <div className="flex items-center gap-1.5" title={`Agent confidence ${pct}% (commit threshold 80%)`}>
      <div className={cx("relative h-1.5 overflow-hidden rounded-full bg-surface-3", compact ? "w-12" : "w-20")}>
        <div className={cx("absolute inset-y-0 left-0 rounded-full", tone)} style={{ width: `${pct}%` }} />
        <div className="absolute inset-y-0 w-px bg-ink-3" style={{ left: "80%" }} />
      </div>
      <span className="num text-[11.5px] text-ink">{pct}%</span>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-line px-4 py-8 text-center">
      <div className="text-[13px] text-ink-2">{title}</div>
      {children && <div className="mt-1.5 text-[12px] text-ink-3">{children}</div>}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[12.5px] [&_td]:border-b [&_td]:border-line [&_td]:px-3 [&_td]:py-2 [&_th]:border-b [&_th]:border-line [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-[10.5px] [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-[0.07em] [&_th]:text-ink-3 [&_tr:last-child_td]:border-b-0 [&_tbody_tr:hover]:bg-surface-2">
        {children}
      </table>
    </div>
  );
}

export function EvidenceItem({ e }: { e: { sourceUrl: string; sourceTitle?: string | null; excerpt: string; provider: string; signalType: string; observedAt: Date; classifiedBy: string; dataMode: string } }) {
  const external = e.sourceUrl.startsWith("http");
  return (
    <li className="group rounded border border-line bg-bg/40 px-2.5 py-2">
      <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-ink-3">
        <span className="num uppercase text-ink-2">{e.provider}</span>
        <span>·</span>
        <span>{e.signalType.replace(/_/g, " ")}</span>
        <span>·</span>
        <span className="num">{e.observedAt.toISOString().slice(0, 10)}</span>
        {e.classifiedBy === "x402" && <Badge tone="info">PAID · x402</Badge>}
        <ModeBadge mode={e.dataMode} />
      </div>
      <p className="mt-1 text-[12.5px] leading-snug text-ink">{e.excerpt}</p>
      <a href={e.sourceUrl} target={external ? "_blank" : undefined} rel="noreferrer" className="mt-1 inline-block max-w-full truncate text-[11px] text-s1 hover:underline">
        {e.sourceTitle ?? e.sourceUrl} {external ? "↗" : ""}
      </a>
    </li>
  );
}

export function KV({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 last:border-b-0">
      <span className="text-[11.5px] text-ink-3">{k}</span>
      <span className="text-right text-[12.5px] text-ink">{v}</span>
    </div>
  );
}

export function Btn({ children, variant = "default", className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "danger" | "ghost" }) {
  const v = {
    default: "border-line-strong bg-surface-2 text-ink hover:bg-surface-3",
    primary: "border-s1 bg-s1 text-white hover:bg-s1/90",
    danger: "border-critical/60 text-critical hover:bg-critical/10",
    ghost: "border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink",
  }[variant];
  return (
    <button {...rest} className={cx("inline-flex h-7 items-center gap-1.5 rounded border px-2.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50", v, className)}>
      {children}
    </button>
  );
}

export function LinkBtn({ href, children, variant = "default", className }: { href: string; children: ReactNode; variant?: "default" | "primary" | "ghost"; className?: string }) {
  const v = { default: "border-line-strong bg-surface-2 text-ink hover:bg-surface-3", primary: "border-s1 bg-s1 text-white hover:bg-s1/90", ghost: "border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink" }[variant];
  return (
    <Link href={href} className={cx("inline-flex h-7 items-center gap-1.5 rounded border px-2.5 text-[12px] font-medium transition-colors", v, className)}>
      {children}
    </Link>
  );
}

export function Velocity({ pct }: { pct: number }) {
  const up = pct > 0;
  return <span className={cx("num text-[12px]", up ? "text-good" : pct < 0 ? "text-serious" : "text-ink-3")}>{up ? "▲" : pct < 0 ? "▼" : "•"} {up ? "+" : ""}{pct}%</span>;
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-s1 hover:underline">
      {children} ↗
    </a>
  );
}

export function shortHash(h?: string | null, n = 6) {
  if (!h) return "—";
  return h.length > 2 * n + 2 ? `${h.slice(0, n + 2)}…${h.slice(-n)}` : h;
}
