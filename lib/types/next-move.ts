export interface SpecSuggestion {
  id: string;                    // e.g., "complexity-moderate"
  label: string;                 // e.g., "Reduce complexity to Moderate"
  kind: "material" | "complexity" | "upgrade-material" | "upgrade-complexity" | "warning";
  sub?: string;                  // Impact note
  before: { label: string; cogs: number };
  after: { label: string; projectedCogs: number; saving: number };
  action: () => void;
  undoAction: () => void;
  /** True when the current material conflicts with the selected concept silhouette */
  materialSilhouetteWarning?: boolean;
  /** Human-readable explanation of the silhouette-material conflict */
  warningReason?: string;
}

export interface ConceptNextMoveItem {
  label: string;
  rationale: string;
  type?: 'chip' | 'silhouette_swap' | 'palette_swap';
}
