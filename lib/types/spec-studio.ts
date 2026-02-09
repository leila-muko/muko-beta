// ============================================
// Spec Studio Types
// ============================================

export type ConstructionTier = 'low' | 'moderate' | 'high';

export interface Material {
  id: string;
  name: string;
  cost_per_yard: number;
  lead_time_weeks: number;
  complexity_tier: string;
  properties: string[];
  hand_feel: string;
  weight: string;
}

export interface Silhouette {
  id: string;
  name: string;
  yardage: number;
}

export interface Category {
  id: string;
  name: string;
  subcategories: string[];
  defaultConstruction: ConstructionTier;
  silhouettes: Silhouette[];
}

export interface SpecStudioState {
  categoryId: string;
  subcategory: string;
  targetMSRP: number;
  materialId: string;
  silhouetteId: string;
  constructionTier: ConstructionTier;
  constructionOverride: boolean;
  lined: boolean;
}

// Concept context passed from Step 2
export interface ConceptContext {
  aestheticName: string;
  aestheticMatchedId: string;
  identityScore: number;
  resonanceScore: number;
  moodboardImages: string[];
  recommendedPalette: PaletteColor[];
}

export interface PaletteColor {
  hex: string;
  name: string;
}
