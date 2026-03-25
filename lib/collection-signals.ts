export function normalizeSignalLabels(labels: string[]): string[] {
  return Array.from(new Set(labels.map((label) => label.trim()).filter(Boolean)));
}

export function getCollectionLanguageLabels(
  directionInterpretationChips: string[],
  directionInterpretationText?: string | null
): string[] {
  const chipLabels = normalizeSignalLabels(directionInterpretationChips);
  if (chipLabels.length > 0) return chipLabels;

  const fallback = directionInterpretationText?.trim();
  return fallback ? [fallback] : [];
}

export function getExpressionSignalLabels(
  chipSelection?: { activatedChips?: Array<{ label: string }> } | null
): string[] {
  return normalizeSignalLabels((chipSelection?.activatedChips ?? []).map((chip) => chip.label));
}
