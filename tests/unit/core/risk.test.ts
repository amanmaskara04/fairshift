import { describe, expect, it } from "vitest";
import { computeQuitRisk } from "@/core/risk";

const calm = {
  overtimeMinThisWeek: 0,
  overtimeMinLastWeek: 0,
  missedCheckIns: 0,
  teamMoodAvg: 3,
  unresolvedHazards: 0,
  payDisputes: 0,
};

describe("computeQuitRisk", () => {
  it("scores 0 for a happy, rested worker", () => {
    expect(computeQuitRisk(calm).score).toBe(0);
  });

  it("scores 100 when every signal is at its maximum", () => {
    const result = computeQuitRisk({
      overtimeMinThisWeek: 900,
      overtimeMinLastWeek: 100,
      missedCheckIns: 9,
      teamMoodAvg: 1,
      unresolvedHazards: 5,
      payDisputes: 4,
    });
    expect(result.score).toBe(100);
  });

  it("explains every factor", () => {
    const result = computeQuitRisk({ ...calm, missedCheckIns: 3 });
    expect(result.reasons.map((r) => r.factor)).toEqual(["overtime", "missedDays", "mood", "hazards", "payDisputes"]);
    expect(result.reasons.find((r) => r.factor === "missedDays")?.value).toBe(0.6);
    expect(result.score).toBe(12); // 0.6 × 20
  });

  it("boosts overtime when the trend is rising", () => {
    const flat = computeQuitRisk({ ...calm, overtimeMinThisWeek: 300, overtimeMinLastWeek: 300 });
    const rising = computeQuitRisk({ ...calm, overtimeMinThisWeek: 300, overtimeMinLastWeek: 60 });
    expect(rising.score).toBeGreaterThan(flat.score);
    expect(rising.reasons[0].detail).toContain("rising");
  });

  it("clamps out-of-range mood and accepts custom weights", () => {
    const result = computeQuitRisk({ ...calm, teamMoodAvg: 0, weights: { mood: 50 } });
    expect(result.reasons.find((r) => r.factor === "mood")).toMatchObject({ value: 1, weight: 50 });
    expect(result.score).toBe(50);
  });
});
