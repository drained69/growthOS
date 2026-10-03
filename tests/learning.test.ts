import { describe, it, expect } from "vitest";
import { evaluateExperiments, planReallocation, growthEfficiency, type ExperimentPerformance } from "@/lib/growth/learning";
import { toMicro } from "@/lib/util/money";

const exp = (id: string, spent: number, conv: number, budget = 150): ExperimentPerformance => ({
  experimentId: id,
  number: Number(id.slice(1)),
  title: id,
  channel: "kol",
  status: "running",
  budgetMicro: toMicro(budget),
  spentMicro: toMicro(spent),
  conversions: conv,
  visits: conv * 5,
  successTarget: 5,
  stopMaxCpaMicro: toMicro(30),
  stopAfterSpendMicro: toMicro(75),
});

describe("learning engine (spec example)", () => {
  // KOL A: 150 spent / 4 → 37.50 ; KOL B: 100 / 21 → 4.76 ; content: 31 / 14 → 2.21
  const perf = [exp("e1", 150, 4, 200), exp("e2", 100, 21, 150), exp("e3", 31, 14, 60)];
  const f = evaluateExperiments(perf);
  it("stops KOL A and scales the cheap channels", () => {
    expect(f.find((x) => x.experimentId === "e1")!.verdict).toBe("STOP");
    expect(f.find((x) => x.experimentId === "e3")!.verdict).toBe("SCALE");
    expect(f.find((x) => x.experimentId === "e1")!.cpaMicro).toBe(toMicro(37.5));
  });
  it("moves only unspent budget from losers to winners", () => {
    const moves = planReallocation(perf, f);
    const total = moves.filter((m) => m.fromExperimentId === "e1").reduce((s, m) => s + m.amountMicro, 0);
    expect(total).toBe(toMicro(50)); // 200 budget − 150 spent
    expect(moves.every((m) => m.toExperimentId !== "e1")).toBe(true);
  });
  it("computes growth efficiency", () => {
    expect(growthEfficiency({ goal: 100, achieved: 84, budgetMicro: toMicro(500), spentMicro: toMicro(327), experiments: 12, successful: 7 })).toBeGreaterThan(70);
  });
});
