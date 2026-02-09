import type { Material } from '@/types/spec-studio';

export interface MaterialAlternative {
  material: Material;
  sharedProperties: string[];
  costSaving: number; // per yard
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
  const alternatives = allMaterials
    .filter(m => {
      if (m.id === selectedMaterial.id) return false;
      if (m.cost_per_yard >= selectedMaterial.cost_per_yard) return false;

      const shared = m.properties.filter(p =>
        selectedMaterial.properties.includes(p)
      );
      return shared.length >= minSharedProperties;
    })
    .map(m => ({
      material: m,
      sharedProperties: m.properties.filter(p =>
        selectedMaterial.properties.includes(p)
      ),
      costSaving: selectedMaterial.cost_per_yard - m.cost_per_yard,
    }))
    // Sort by: most shared properties first, then biggest cost saving
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
  return allMaterials
    .filter(m => {
      if (m.id === selectedMaterial.id) return false;
      if (m.cost_per_yard >= selectedMaterial.cost_per_yard) return false;
      const shared = m.properties.filter(p =>
        selectedMaterial.properties.includes(p)
      );
      return shared.length >= 1;
    })
    .map(m => ({
      material: m,
      sharedProperties: m.properties.filter(p =>
        selectedMaterial.properties.includes(p)
      ),
      costSaving: selectedMaterial.cost_per_yard - m.cost_per_yard,
    }))
    .sort((a, b) => b.sharedProperties.length - a.sharedProperties.length);
}
