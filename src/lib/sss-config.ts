/**
 * sss-config.ts
 * Say–Stay–Strive scoring types and pure calculation logic.
 * ⚠️  ADMIN-ONLY — must NEVER be imported inside survey-flow components.
 * The employee-facing Question interface has no SSS fields whatsoever.
 */

export type SssDimension = "say" | "stay" | "strive";

export interface SssQuestionMapping {
  id: string;
  questionId: string;   // e.g. "D2", "A7"
  dimension: SssDimension;
  weight: number;        // multiplier (default 1.0)
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SssScoreResult {
  say: number | null;
  stay: number | null;
  strive: number | null;
  overall: number | null;
}

export interface SssAggregateResult {
  say: number | null;
  stay: number | null;
  strive: number | null;
  overall: number | null;
  respondents: number;
}

export const SSS_DIMENSION_META = {
  say: {
    labelTh: "SAY",
    labelEn: "SAY",
    descTh: "พูดถึงองค์กรในทางบวก",
    descEn: "Positive advocacy for the organization",
    color: "emerald" as const,
    emoji: "💬",
  },
  stay: {
    labelTh: "STAY",
    labelEn: "STAY",
    descTh: "ตั้งใจอยู่กับองค์กร",
    descEn: "Intent to remain with the organization",
    color: "blue" as const,
    emoji: "🏠",
  },
  strive: {
    labelTh: "STRIVE",
    labelEn: "STRIVE",
    descTh: "มุ่งมั่นทำงานอย่างเต็มที่",
    descEn: "Discretionary effort and motivation",
    color: "amber" as const,
    emoji: "🚀",
  },
} as const;

/**
 * Normalize a single_select choice value (a/b/c/d) to numeric.
 * "คำนวณเหมือนเดิม" — a=4, b=3, c=2, d=1
 */
export function normalizeAnswer(raw: number | string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return raw;
  const choiceMap: Record<string, number> = { a: 4, b: 3, c: 2, d: 1 };
  const lower = String(raw).toLowerCase().trim();
  if (lower in choiceMap) return choiceMap[lower];
  const n = Number(raw);
  return isNaN(n) ? null : n;
}

/**
 * Pure SSS score calculator.
 * answers: { [questionId]: rawValue }  — only numeric/choice values matter
 * mappings: active SSS configuration (from admin)
 * Returns scores as 0–100 percentage (weighted).
 */
export function calculateSssFromAnswers(
  answers: Record<string, number | string | null | undefined>,
  mappings: SssQuestionMapping[],
  maxRating = 5
): SssScoreResult {
  const buckets: Record<SssDimension, { sum: number; maxSum: number }> = {
    say:    { sum: 0, maxSum: 0 },
    stay:   { sum: 0, maxSum: 0 },
    strive: { sum: 0, maxSum: 0 },
  };

  for (const m of mappings) {
    if (!m.isActive) continue;
    const raw = answers[m.questionId];
    const value = normalizeAnswer(raw);
    if (value === null) continue;

    // Determine max for this question type
    // single_select choices: a=4 is max → maxRating = 4
    // rating/NPS: maxRating = 5 (or 10 for NPS, but we normalize separately)
    const effectiveMax = typeof raw === "string" && /^[a-d]$/i.test(String(raw).trim()) ? 4 : maxRating;

    buckets[m.dimension].sum    += value * m.weight;
    buckets[m.dimension].maxSum += effectiveMax * m.weight;
  }

  const toScore = (b: { sum: number; maxSum: number }): number | null =>
    b.maxSum > 0 ? Math.round((b.sum / b.maxSum) * 100) : null;

  const say    = toScore(buckets.say);
  const stay   = toScore(buckets.stay);
  const strive = toScore(buckets.strive);
  const valid  = [say, stay, strive].filter((v): v is number => v !== null);
  const overall = valid.length > 0
    ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
    : null;

  return { say, stay, strive, overall };
}

/**
 * Aggregate SSS scores from multiple response results.
 */
export function aggregateSssScores(results: SssScoreResult[]): SssAggregateResult {
  const valid = results.filter(r => r.overall !== null);
  if (valid.length === 0) return { say: null, stay: null, strive: null, overall: null, respondents: 0 };

  const avg = (key: keyof Omit<SssScoreResult, "overall">) => {
    const vals = valid.map(r => r[key]).filter((v): v is number => v !== null);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };

  const overallVals = valid.map(r => r.overall).filter((v): v is number => v !== null);
  const overall = overallVals.length > 0
    ? Math.round(overallVals.reduce((a, b) => a + b, 0) / overallVals.length)
    : null;

  return {
    say: avg("say"),
    stay: avg("stay"),
    strive: avg("strive"),
    overall,
    respondents: valid.length,
  };
}

/** Score → grade label */
export function scoreToGrade(score: number | null): { label: string; color: string } {
  if (score === null) return { label: "N/A", color: "slate" };
  if (score >= 80) return { label: "Highly Engaged", color: "emerald" };
  if (score >= 65) return { label: "Engaged", color: "green" };
  if (score >= 50) return { label: "Moderate", color: "amber" };
  if (score >= 35) return { label: "At Risk", color: "orange" };
  return { label: "Disengaged", color: "rose" };
}
