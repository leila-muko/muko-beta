import type { ConstructionTier } from '@/lib/types/spec-studio';

// Maps category ID to recommended default construction tier
export const SMART_DEFAULTS: Record<string, ConstructionTier> = {
  outerwear: 'high',
  tops: 'low',
  bottoms: 'moderate',
  dresses: 'moderate',
  knitwear: 'moderate',
};

// Silhouette + category overrides for smart complexity defaults
const SILHOUETTE_CATEGORY_OVERRIDES: Record<string, Record<string, ConstructionTier>> = {
  outerwear: {
    structured: 'high',
    relaxed: 'moderate',
    oversized: 'high',
    straight: 'moderate',
  },
  tops: {
    structured: 'moderate',
    oversized: 'low',
  },
  dresses: {
    structured: 'high',
    oversized: 'moderate',
  },
};

export interface SubcategoryEntry {
  id: string;
  name: string;
  base_yardage: number;
  complexity_affinity: 'low' | 'moderate' | 'high';
}

const SUBCATEGORY_ID_NORMALIZATION: Record<string, string> = {
  trench: 'trench',
  blazer: 'blazer',
  bomber: 'bomber',
  jacket: 'trucker',
  coat: 'overcoat',
  overcoat: 'overcoat',
  puffer: 'puffer',
  parka: 'anorak',
  raincoat: 'anorak',
  tshirt: 'tshirt',
  't-shirt': 'tshirt',
  tank: 'tank',
  blouse: 'blouse',
  shirt: 'shirt',
  top: 'shirt',
  tunic: 'tunic',
  'corset-top': 'crop_top',
  vest: 'crop_top',
  trouser: 'trouser',
  'straight-pant': 'trouser',
  'wide-leg': 'wide_leg',
  'wide-leg-pant': 'wide_leg',
  'wide-leg-pants': 'wide_leg',
  'wide-leg-trouser': 'wide_leg',
  'wide-leg-trousers': 'wide_leg',
  cargo: 'cargo',
  jogger: 'jogger',
  shorts: 'shorts',
  skirt: 'skirt_midi',
  'mini-skirt': 'skirt_mini',
  'maxi-skirt': 'skirt_maxi',
  'midi-dress': 'midi_dress',
  dress: 'midi_dress',
  'mini-dress': 'mini_dress',
  'maxi-dress': 'maxi_dress',
  'shirt-dress': 'shirt_dress',
  'slip-dress': 'slip_dress',
  'wrap-dress': 'wrap_dress',
  'column-dress': 'maxi_dress',
  'babydoll-dress': 'mini_dress',
  sundress: 'mini_dress',
  sweater: 'sweater',
  'knit-sweater': 'sweater',
  cardigan: 'cardigan',
  hoodie: 'hoodie',
  pullover: 'pullover',
  turtleneck: 'turtleneck',
  'knit-vest': 'knit_vest',
  'knit-polo': 'knit_polo',
  cape: 'cape',
};

export function normalizeSpecSubcategoryId(subcategoryId?: string | null): string | undefined {
  if (!subcategoryId) return undefined;
  return SUBCATEGORY_ID_NORMALIZATION[subcategoryId] ?? subcategoryId;
}

/**
 * Get smart default complexity using subcategory complexity_affinity as base,
 * with silhouette as a modifier. Silhouette can push complexity up but not down.
 */
export function getSmartDefault(
  categoryId: string,
  conceptSilhouette?: string,
  subcategoryAffinity?: 'low' | 'moderate' | 'high'
): ConstructionTier {
  // Use subcategory affinity as base if available, otherwise fall back to category default
  const base: ConstructionTier = subcategoryAffinity ?? SMART_DEFAULTS[categoryId] ?? 'moderate';

  if (!conceptSilhouette) return base;

  // Silhouette can push complexity up but not down
  if (conceptSilhouette === 'structured' && base !== 'high') {
    return 'high'; // structured always demands more construction
  }
  if (conceptSilhouette === 'oversized' && base === 'low') {
    return 'moderate'; // oversized on simple garments adds some complexity
  }

  // Also check category-specific overrides as a fallback
  const override = SILHOUETTE_CATEGORY_OVERRIDES[categoryId]?.[conceptSilhouette];
  if (override) {
    // Only apply override if it's higher than the base
    const tierRank: Record<ConstructionTier, number> = { low: 0, moderate: 1, high: 2 };
    if (tierRank[override] > tierRank[base]) return override;
  }

  return base;
}

export function getSmartDefaultForSubcategory(
  categoryId: string,
  conceptSilhouette?: string,
  subcategoryId?: string | null,
  subcategories?: SubcategoryEntry[]
): ConstructionTier {
  const normalizedSubcategoryId = normalizeSpecSubcategoryId(subcategoryId);
  const affinity = normalizedSubcategoryId
    ? subcategories?.find((entry) => entry.id === normalizedSubcategoryId)?.complexity_affinity
    : undefined;
  return getSmartDefault(categoryId, conceptSilhouette, affinity);
}

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
