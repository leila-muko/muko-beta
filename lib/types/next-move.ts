export interface SpecSuggestion {
  id: string;                    // e.g., "complexity-moderate"
  label: string;                 // e.g., "Reduce complexity to Moderate"
  kind: "material" | "complexity" | "upgrade-material" | "upgrade-complexity";
  sub?: string;                  // Impact note
  before: { label: string; cogs: number };
  after: { label: string; projectedCogs: number; saving: number };
  action: () => void;
  undoAction: () => void;
}

export interface ConceptNextMoveItem {
  label: string;
  rationale: string;
  type?: 'chip' | 'silhouette_swap' | 'palette_swap';
}
