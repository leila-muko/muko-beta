// Maps construction tier label → additional weeks needed for production
export const COMPLEXITY_WEEKS: Record<string, number> = {
  low: 1,
  moderate: 2,
  high: 4,
};

/**
 * Identity Score — brand fit via keyword overlap.
 * Returns 50 when no brand keywords exist (neutral baseline).
 */
export function calculateIdentityScore(
  aestheticKeywords: string[],
  brandKeywords: string[]
): number {
  if (brandKeywords.length === 0) return 50;
  const normalized = brandKeywords.map((b) => b.toLowerCase());
  const overlap = aestheticKeywords.filter((k) =>
    normalized.includes(k.toLowerCase())
  );
  return Math.round((overlap.length / brandKeywords.length) * 100);
}

/**
 * Resonance Score — market opportunity as inverse of saturation.
 * saturation_score 0–100 from aesthetics.json:
 *   emerging (0–30) → high resonance, peak (70–100) → low resonance.
 */
export function calculateResonanceScore(saturation_score: number): number {
  return Math.round(100 - saturation_score);
}

/**
 * Execution Score — timeline feasibility.
 * buffer_weeks < 0  → impossible    → 0–30
 * buffer_weeks 0–2  → tight         → 50–70
 * buffer_weeks 3–5  → manageable    → 65–80
 * buffer_weeks 6+   → comfortable   → 80–100 (capped)
 */
export function calculateExecutionScore(
  material_lead_time_weeks: number,
  construction_complexity_weeks: number, // use COMPLEXITY_WEEKS[tier]
  timeline_weeks: number // derived from season, typically 16–24 weeks out
): number {
  const total_weeks_needed =
    material_lead_time_weeks + construction_complexity_weeks;
  const buffer_weeks = timeline_weeks - total_weeks_needed;

  if (buffer_weeks < 0) return Math.max(0, 30 + buffer_weeks * 10);
  if (buffer_weeks <= 2) return 50 + buffer_weeks * 10;
  if (buffer_weeks <= 5) return 65 + buffer_weeks * 5;
  return Math.min(100, 80 + buffer_weeks);
}
