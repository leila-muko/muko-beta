export const GENERIC_STRATEGY_SUMMARY = "Define your collection stance";

export function sanitizeContextBarSummary(summary?: string | null) {
  const trimmed = summary?.trim();
  if (!trimmed || trimmed === GENERIC_STRATEGY_SUMMARY) return null;
  return trimmed;
}
