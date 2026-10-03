import { toMicro, fmtUsdc } from "../util/money";
import { categoryFor, type FinancialAction } from "./actions";

/**
 * Deterministic policy engine. Pure: the caller loads the state, this decides.
 * Financial autonomy lives here — not in a prompt.
 *
 *   AI → structured action → Zod → evaluatePolicy → ALLOW | APPROVAL_REQUIRED | DENY
 *
 * DENY rules can never be overridden by approval. APPROVAL rules are waived only when a
 * founder has explicitly approved this exact decision (and the action is re-evaluated then).
 */

export type Verdict = "ALLOW" | "APPROVAL_REQUIRED" | "DENY";

export interface PolicyConfig {
  maxTransactionMicro: number;
  dailySpendMicro: number;
  kolApprovalThresholdMicro: number;
  bountyApprovalThresholdMicro: number;
  hardCeilingMicro: number;
  autonomousCategories: string[];
  approvalCategories: string[];
  forbiddenActions: string[];
  approvedServiceHosts: string[];
  allowedTokens: string[];
  allowedChains: string[];
}

export interface PolicyState {
  walletConfigured: boolean;
  walletFrozen: boolean;
  /** Settled + in-flight spend today (UTC). Bridges excluded — they move, not spend. */
  spentTodayMicro: number;
  missionBudgetMicro: number;
  /** Settled + in-flight + approved-but-unsent spend for the mission. */
  missionCommittedMicro: number;
  missionActive: boolean;
  categoryAllocatedMicro: number;
  categoryCommittedMicro: number;
  /** For purchase_service: whether the service is in the discovered catalog. */
  serviceKnown?: boolean;
  /** For reallocate_budget: unspent budget of each source experiment. */
  experimentRemainingMicro?: Record<string, number>;
}

export interface PolicyCheck {
  rule: string;
  passed: boolean;
  severity: "deny" | "approval";
  detail: string;
}

export interface PolicyResult {
  verdict: Verdict;
  checks: PolicyCheck[];
  amountMicro: number;
  category: string;
}

export const DEFAULT_POLICY: PolicyConfig = {
  maxTransactionMicro: toMicro(10),
  dailySpendMicro: toMicro(50),
  kolApprovalThresholdMicro: toMicro(100),
  bountyApprovalThresholdMicro: toMicro(25),
  hardCeilingMicro: toMicro(500),
  autonomousCategories: ["research", "services", "bounty", "content"],
  approvalCategories: ["kol", "community", "treasury"],
  forbiddenActions: ["mass_unsolicited_messaging", "automated_dm", "automated_cold_email", "automated_mentions"],
  approvedServiceHosts: ["*"],
  allowedTokens: ["USDC"],
  allowedChains: ["Arc_Testnet", "Base_Sepolia"],
};

function amountOf(action: FinancialAction): number {
  if (action.action === "reallocate_budget") return action.moves.reduce((s, m) => s + toMicro(m.amount), 0);
  return toMicro(action.amount);
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return "";
  }
}

export function evaluatePolicy(
  action: FinancialAction,
  policy: PolicyConfig,
  state: PolicyState,
  opts: { founderApproved?: boolean } = {},
): PolicyResult {
  const checks: PolicyCheck[] = [];
  const amount = amountOf(action);
  const category = categoryFor(action);
  const add = (rule: string, passed: boolean, severity: PolicyCheck["severity"], detail: string) =>
    checks.push({ rule, passed, severity, detail });

  // Reallocation moves budget between experiments; it never moves funds on-chain.
  if (action.action === "reallocate_budget") {
    add("MISSION_ACTIVE", state.missionActive, "deny", state.missionActive ? "Mission is active" : "Mission is not active");
    const rem = state.experimentRemainingMicro ?? {};
    const bySource = new Map<string, number>();
    for (const m of action.moves) bySource.set(m.fromExperimentId, (bySource.get(m.fromExperimentId) ?? 0) + toMicro(m.amount));
    for (const [src, amt] of bySource) {
      const ok = (rem[src] ?? 0) >= amt;
      add("SOURCE_HAS_UNSPENT_BUDGET", ok, "deny", `Move ${fmtUsdc(amt)} from experiment with ${fmtUsdc(rem[src] ?? 0)} unspent`);
    }
    const selfMove = action.moves.some((m) => m.fromExperimentId === m.toExperimentId);
    add("DISTINCT_EXPERIMENTS", !selfMove, "deny", selfMove ? "Cannot move budget to the same experiment" : "Source and target differ");
    // Large reallocations within the mission still need a human to look at them.
    const big = amount > policy.dailySpendMicro;
    add("REALLOCATION_SIZE", !big, "approval", big ? `${fmtUsdc(amount)} exceeds daily limit ${fmtUsdc(policy.dailySpendMicro)} — founder review` : `${fmtUsdc(amount)} within daily limit`);
    return finish(checks, amount, category, opts);
  }

  // ── DENY rules: never overridable ──
  add("WALLET_CONFIGURED", state.walletConfigured, "deny", state.walletConfigured ? "Agent wallet is configured" : "No agent wallet configured");
  add("WALLET_NOT_FROZEN", !state.walletFrozen, "deny", state.walletFrozen ? "Founder kill switch is on" : "Wallet active");
  add("ALLOWED_TOKENS", policy.allowedTokens.includes(action.currency), "deny", `${action.currency} ${policy.allowedTokens.includes(action.currency) ? "is" : "is not"} an allowed token`);

  const chains = action.action === "bridge_funds" ? [action.fromChain, action.toChain] : [action.chain];
  const badChain = chains.find((c) => !policy.allowedChains.includes(c));
  add("ALLOWED_CHAINS", !badChain, "deny", badChain ? `${badChain} is not an allowed chain` : `${chains.join(" → ")} allowed`);

  const kind = action.action === "send_payment" ? action.purpose : action.action;
  const forbidden = policy.forbiddenActions.includes(kind);
  add("FORBIDDEN_ACTIONS", !forbidden, "deny", forbidden ? `${kind} is forbidden by policy` : `${kind} is not forbidden`);

  const overCeiling = amount > policy.hardCeilingMicro;
  add("HARD_CEILING", !overCeiling, "deny", `${fmtUsdc(amount)} ${overCeiling ? ">" : "≤"} hard ceiling ${fmtUsdc(policy.hardCeilingMicro)}`);

  add("MISSION_ACTIVE", state.missionActive, "deny", state.missionActive ? "Mission is active" : "Mission is not active");

  if (action.action !== "bridge_funds") {
    const after = state.missionCommittedMicro + amount;
    const over = after > state.missionBudgetMicro;
    add("MISSION_BUDGET", !over, "deny", `${fmtUsdc(after)} committed of ${fmtUsdc(state.missionBudgetMicro)} mission budget${over ? " — would exceed" : ""}`);
  }

  const known = policy.autonomousCategories.includes(category) || policy.approvalCategories.includes(category);
  add("APPROVED_CATEGORIES", known, "deny", known ? `Category "${category}" is permitted` : `Category "${category}" is not permitted by policy`);

  // ── APPROVAL rules: a founder can approve past these ──
  const needsApprovalCategory = policy.approvalCategories.includes(category);
  add("CATEGORY_REQUIRES_APPROVAL", !needsApprovalCategory, "approval", needsApprovalCategory ? `"${category}" spend always requires founder approval` : `"${category}" may be spent autonomously`);

  const overTx = amount > policy.maxTransactionMicro;
  add("MAX_TRANSACTION", !overTx, "approval", `${fmtUsdc(amount)} ${overTx ? ">" : "≤"} autonomous limit ${fmtUsdc(policy.maxTransactionMicro)}`);

  if (action.action !== "bridge_funds") {
    const afterDay = state.spentTodayMicro + amount;
    const overDay = afterDay > policy.dailySpendMicro;
    add("DAILY_SPEND", !overDay, "approval", `${fmtUsdc(afterDay)} today of ${fmtUsdc(policy.dailySpendMicro)} daily limit`);

    const afterCat = state.categoryCommittedMicro + amount;
    const overCat = afterCat > state.categoryAllocatedMicro;
    add("CATEGORY_BUDGET", !overCat, "approval", `${fmtUsdc(afterCat)} of ${fmtUsdc(state.categoryAllocatedMicro)} allocated to "${category}"`);
  }

  if (action.action === "send_payment" && action.purpose === "kol_payment") {
    const over = amount > policy.kolApprovalThresholdMicro;
    add("KOL_APPROVAL_THRESHOLD", !over, "approval", `${fmtUsdc(amount)} ${over ? ">" : "≤"} KOL threshold ${fmtUsdc(policy.kolApprovalThresholdMicro)}`);
  }
  if (action.action === "send_payment" && action.purpose === "developer_bounty") {
    const over = amount > policy.bountyApprovalThresholdMicro;
    add("BOUNTY_APPROVAL_THRESHOLD", !over, "approval", `${fmtUsdc(amount)} ${over ? ">" : "≤"} bounty threshold ${fmtUsdc(policy.bountyApprovalThresholdMicro)}`);
  }

  if (action.action === "purchase_service") {
    const host = hostOf(action.resourceUrl);
    const listed = policy.approvedServiceHosts.includes(host) || (policy.approvedServiceHosts.includes("*") && !!state.serviceKnown);
    add("APPROVED_SERVICES", listed, "approval", listed ? `${host} is an approved service` : `${host} is not on the approved service list`);
  }

  return finish(checks, amount, category, opts);
}

function finish(checks: PolicyCheck[], amountMicro: number, category: string, opts: { founderApproved?: boolean }): PolicyResult {
  const denied = checks.some((c) => !c.passed && c.severity === "deny");
  const needsApproval = checks.some((c) => !c.passed && c.severity === "approval");
  let verdict: Verdict = denied ? "DENY" : needsApproval ? "APPROVAL_REQUIRED" : "ALLOW";
  if (verdict === "APPROVAL_REQUIRED" && opts.founderApproved) verdict = "ALLOW";
  return { verdict, checks, amountMicro, category };
}
