import type { Material } from '@/lib/types/spec-studio';

export interface MaterialAlternative {
  material: Material;
  sharedProperties: string[];
  costSaving: number; // per yard
}

// ─── Silhouette-material conflict map ────────────────────────────────────────
// Keys are normalised silhouette tokens. Values are material IDs to exclude.

const SILHOUETTE_MATERIAL_CONFLICTS: Record<string, string[]> = {
  relaxed:    ['leather', 'vegan-leather'],
  asymmetric: ['leather', 'vegan-leather', 'recycled-polyester', 'linen'],
  structured: ['jersey', 'recycled-polyester'],
  draped:     ['denim-conventional', 'denim-raw-selvedge'],
};

/**
 * Normalises a concept-silhouette display value to a conflict-map key.
 * Returns undefined when no conflicts are defined for that silhouette.
 */
function normaliseSilhouette(silhouette: string | undefined): string | undefined {
  if (!silhouette) return undefined;
  const s = silhouette.toLowerCase();
  if (s.includes('relax') || s.includes('slouch')) return 'relaxed';
  if (s.includes('asymm'))                           return 'asymmetric';
  if (s.includes('struct') || s.includes('tailor'))  return 'structured';
  if (s.includes('drape') || s.includes('draped'))   return 'draped';
  return undefined;
}

/**
 * Returns a human-readable warning reason when the given material conflicts
 * with the given silhouette, or null when there is no conflict.
 */
export function checkSelectedMaterialConflict(
  material: Material,
  conceptSilhouette: string | undefined,
): { warning: boolean; reason: string } | null {
  const key = normaliseSilhouette(conceptSilhouette);
  if (!key) return null;
  const conflicts = SILHOUETTE_MATERIAL_CONFLICTS[key];
  if (!conflicts?.includes(material.id)) return null;
  return {
    warning: true,
    reason: `${material.name} may not suit ${conceptSilhouette?.toLowerCase()} construction — consider a material with more drape or give.`,
  };
}

/**
 * Derives a "properties" list for a material using the actual JSON fields:
 * sustainability_flags, drape_quality, fiber_type, redirect_compatible.
 */
function getProperties(m: Material & Record<string, unknown>): string[] {
  const props: string[] = [];
  const flags = m['sustainability_flags'] as string[] | undefined;
  if (Array.isArray(flags)) props.push(...flags);
  if (m['drape_quality']) props.push(String(m['drape_quality']));
  if (m['fiber_type']) props.push(String(m['fiber_type']));
  return props;
}

/**
 * Returns true if candidate is explicitly listed in selected material's redirect_compatible,
 * or if they share at least minSharedProperties derived properties.
 */
function isCompatible(
  selected: Material & Record<string, unknown>,
  candidate: Material & Record<string, unknown>,
  minShared: number
): boolean {
  const redirectCompat = selected['redirect_compatible'] as string[] | undefined;
  if (Array.isArray(redirectCompat) && redirectCompat.includes(candidate.id)) {
    return true;
  }
  const selectedProps = getProperties(selected);
  const candidateProps = getProperties(candidate);
  const shared = candidateProps.filter(p => selectedProps.includes(p));
  return shared.length >= minShared;
}

/**
 * Finds the best cheaper alternative material that shares properties
 * with the selected material. Returns null if no good alternative exists.
 *
 * @param conceptSilhouette - Optional concept-stage silhouette. When provided,
 *   candidates that conflict with that silhouette are excluded from the pool.
 */
export function findAlternativeMaterial(
  selectedMaterial: Material,
  allMaterials: Material[],
  minSharedProperties: number = 1,
  conceptSilhouette?: string,
): Material | null {
  const sel = selectedMaterial as Material & Record<string, unknown>;
  const silhouetteKey = normaliseSilhouette(conceptSilhouette);
  const conflicted = silhouetteKey ? (SILHOUETTE_MATERIAL_CONFLICTS[silhouetteKey] ?? []) : [];

  const alternatives = allMaterials
    .filter(m => {
      if (m.id === sel.id) return false;
      if (m.cost_per_yard >= sel.cost_per_yard) return false;
      if (conflicted.includes(m.id)) return false;
      return isCompatible(sel, m as Material & Record<string, unknown>, minSharedProperties);
    })
    .map(m => {
      const candidateProps = getProperties(m as Material & Record<string, unknown>);
      const selectedProps = getProperties(sel);
      return {
        material: m,
        sharedProperties: candidateProps.filter(p => selectedProps.includes(p)),
        costSaving: sel.cost_per_yard - m.cost_per_yard,
      };
    })
    .sort((a, b) => {
      if (b.sharedProperties.length !== a.sharedProperties.length) {
        return b.sharedProperties.length - a.sharedProperties.length;
      }
      return b.costSaving - a.costSaving;
    });

  return alternatives.length > 0 ? alternatives[0].material : null;
}

/**
 * Finds the best *more expensive* upgrade material that shares properties
 * with the selected material and stays within the given COGS ceiling.
 * Returns null if no viable upgrade exists.
 *
 * @param conceptSilhouette - Optional concept-stage silhouette. When provided,
 *   candidates that conflict with that silhouette are excluded from the pool.
 */
export function findUpgradeMaterial(
  selectedMaterial: Material,
  allMaterials: Material[],
  yardage: number,
  currentCOGS: number,
  ceiling: number,
  minSharedProperties: number = 1,
  conceptSilhouette?: string,
): Material | null {
  const sel = selectedMaterial as Material & Record<string, unknown>;
  const headroom = ceiling - currentCOGS;
  if (headroom <= 0) return null;

  const silhouetteKey = normaliseSilhouette(conceptSilhouette);
  const conflicted = silhouetteKey ? (SILHOUETTE_MATERIAL_CONFLICTS[silhouetteKey] ?? []) : [];

  const upgrades = allMaterials
    .filter(m => {
      if (m.id === sel.id) return false;
      if (m.cost_per_yard <= sel.cost_per_yard) return false;
      if (conflicted.includes(m.id)) return false;
      // Must fit within remaining headroom
      const extraCost = (m.cost_per_yard - sel.cost_per_yard) * yardage;
      if (extraCost > headroom) return false;
      return isCompatible(sel, m as Material & Record<string, unknown>, minSharedProperties);
    })
    .sort((a, b) => {
      // Prefer the most premium option that still fits
      return b.cost_per_yard - a.cost_per_yard;
    });

  return upgrades.length > 0 ? upgrades[0] : null;
}

/**
 * Gets all cheaper alternatives with shared properties, sorted by relevance
 */
export function findAllAlternatives(
  selectedMaterial: Material,
  allMaterials: Material[]
): MaterialAlternative[] {
  const sel = selectedMaterial as Material & Record<string, unknown>;
  const selectedProps = getProperties(sel);

  return allMaterials
    .filter(m => {
      if (m.id === sel.id) return false;
      if (m.cost_per_yard >= sel.cost_per_yard) return false;
      return isCompatible(sel, m as Material & Record<string, unknown>, 1);
    })
    .map(m => ({
      material: m,
      sharedProperties: getProperties(m as Material & Record<string, unknown>).filter(
        p => selectedProps.includes(p)
      ),
      costSaving: sel.cost_per_yard - m.cost_per_yard,
    }))
    .sort((a, b) => b.sharedProperties.length - a.sharedProperties.length);
}
