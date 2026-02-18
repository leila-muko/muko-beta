import type { Material } from '@/lib/types/spec-studio';

export interface MaterialAlternative {
  material: Material;
  sharedProperties: string[];
  costSaving: number; // per yard
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
 */
export function findAlternativeMaterial(
  selectedMaterial: Material,
  allMaterials: Material[],
  minSharedProperties: number = 1
): Material | null {
  const sel = selectedMaterial as Material & Record<string, unknown>;

  const alternatives = allMaterials
    .filter(m => {
      if (m.id === sel.id) return false;
      if (m.cost_per_yard >= sel.cost_per_yard) return false;
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
