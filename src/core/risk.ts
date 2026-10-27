// ─── FairShift Quit-Risk Scoring ────────────────────────────────────
// Transparent, explainable scoring — not a black box.
// Score 0-100 with reasons array explaining each factor contribution.

import { QuitRiskResult } from './types';

const DEFAULT_WEIGHTS: Record<string, number> = {
  overtime: 25,
  missedDays: 20,
  mood: 25,
  hazards: 15,
  payDisputes: 15,
};

/**
 * Compute a quit-risk score from worker welfare signals.
 *
 * Each factor is scored 0–1 and multiplied by its weight.
 * The total is the sum of all weighted factor scores (0–100).
 *
 * Factor scoring:
 * - **overtime**: ratio of this week's OT to a reference maximum (600 min = 10h).
 *   Rising trend (this week > last week) adds 20% boost.
 * - **missedDays**: scaled 0-1 using min(missedCheckIns / 5, 1).
 * - **mood**: inverted scale: (3 - teamMoodAvg) / 2 → 1.0 if mood=1, 0 if mood=3.
 * - **hazards**: min(unresolvedHazards / 3, 1).
 * - **payDisputes**: min(payDisputes / 2, 1).
 */
export function computeQuitRisk(params: {
  overtimeMinThisWeek: number;
  overtimeMinLastWeek: number;
  missedCheckIns: number;
  teamMoodAvg: number; // 1-3
  unresolvedHazards: number;
  payDisputes: number;
  weights?: Record<string, number>;
}): QuitRiskResult {
  const w = { ...DEFAULT_WEIGHTS, ...(params.weights ?? {}) };
  const reasons: QuitRiskResult['reasons'] = [];

  // 1. Overtime factor
  const OT_MAX_REF = 600; // 10 hours in minutes as "bad" reference
  let otValue = Math.min(params.overtimeMinThisWeek / OT_MAX_REF, 1);
  // Rising trend bonus: if this week > last week, boost by 20%
  if (params.overtimeMinThisWeek > params.overtimeMinLastWeek && params.overtimeMinLastWeek >= 0) {
    otValue = Math.min(otValue * 1.2, 1);
  }
  reasons.push({
    factor: 'overtime',
    weight: w.overtime,
    value: round2(otValue),
    detail:
      `OT this week: ${params.overtimeMinThisWeek}min, last week: ${params.overtimeMinLastWeek}min` +
      (params.overtimeMinThisWeek > params.overtimeMinLastWeek ? ' (rising trend)' : ''),
  });

  // 2. Missed check-ins
  const missedValue = Math.min(params.missedCheckIns / 5, 1);
  reasons.push({
    factor: 'missedDays',
    weight: w.missedDays,
    value: round2(missedValue),
    detail: `${params.missedCheckIns} missed check-ins (threshold: 5)`,
  });

  // 3. Team mood (inverted: low mood = high risk)
  const moodClamped = Math.max(1, Math.min(3, params.teamMoodAvg));
  const moodValue = (3 - moodClamped) / 2;
  reasons.push({
    factor: 'mood',
    weight: w.mood,
    value: round2(moodValue),
    detail: `Team mood avg: ${params.teamMoodAvg}/3 → risk factor ${round2(moodValue)}`,
  });

  // 4. Unresolved hazards
  const hazardValue = Math.min(params.unresolvedHazards / 3, 1);
  reasons.push({
    factor: 'hazards',
    weight: w.hazards,
    value: round2(hazardValue),
    detail: `${params.unresolvedHazards} unresolved hazards (threshold: 3)`,
  });

  // 5. Pay disputes
  const payValue = Math.min(params.payDisputes / 2, 1);
  reasons.push({
    factor: 'payDisputes',
    weight: w.payDisputes,
    value: round2(payValue),
    detail: `${params.payDisputes} pay disputes (threshold: 2)`,
  });

  // Total score
  let score = 0;
  for (const r of reasons) {
    score += r.value * r.weight;
  }
  score = Math.round(Math.min(100, Math.max(0, score)));

  return { score, reasons };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
