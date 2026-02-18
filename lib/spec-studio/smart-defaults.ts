import type { ConstructionTier } from '@/lib/types/spec-studio';

// Maps category ID to recommended default construction tier
export const SMART_DEFAULTS: Record<string, ConstructionTier> = {
  outerwear: 'high',
  tops: 'low',
  bottoms: 'moderate',
  dresses: 'moderate',
  knitwear: 'moderate',
};

// Descriptions shown in tooltips
export const CONSTRUCTION_INFO: Record<ConstructionTier, {
  label: string;
  description: string;
  multiplier: number;
}> = {
  low: {
    label: 'Low',
    description: 'Single-layer construction, minimal details (e.g., basic tee)',
    multiplier: 1.2,
  },
  moderate: {
    label: 'Moderate',
    description: 'Multi-panel, standard seaming (e.g., shirt dress)',
    multiplier: 1.8,
  },
  high: {
    label: 'High',
    description: 'Complex tailoring, linings, hardware (e.g., trench coat)',
    multiplier: 2.5,
  },
};

/**
 * Check if user's construction choice conflicts with category expectations.
 * Returns a warning message if there's a mismatch, null otherwise.
 */
export function getOverrideWarning(
  categoryId: string,
  categoryName: string,
  selectedTier: ConstructionTier,
  defaultTier: ConstructionTier
): string | null {
  // Only warn on significant downgrades
  const tierRank: Record<ConstructionTier, number> = {
    low: 0,
    moderate: 1,
    high: 2,
  };

  const downgrade = tierRank[defaultTier] - tierRank[selectedTier];

  if (downgrade >= 2) {
    // e.g., Outerwear (default: high) → Low
    return `Low complexity may not be feasible for structured ${categoryName.toLowerCase()}. Consider Moderate or High.`;
  }

  if (downgrade === 1 && defaultTier === 'high') {
    // e.g., Outerwear (default: high) → Moderate — soft nudge
    return `Most ${categoryName.toLowerCase()} benefits from High construction. Moderate is viable for simpler pieces.`;
  }

  return null;
}
