export interface BrandProfile {
    id: string;
    user_id: string;
    brand_name: string;
    keywords: string[];
    customer_profile: string | null;
    price_tier: 'Contemporary' | 'Bridge' | 'Luxury' | 'Accessible';
    target_margin: number;
    tension_context: string | null;
    accepts_conflicts: boolean;
    created_at: string;
    updated_at: string;
  }
  
  export interface Analysis {
    id: string;
    user_id: string;
    brand_profile_id: string | null;
    parent_analysis_id: string | null;
    
    // Session context
    season: string;
    collection_name: string | null;
    
    // Product specs
    category: string | null;
    target_msrp: number | null;
    
    // Aesthetic inputs
    aesthetic_input: string | null;
    aesthetic_matched_id: string | null;
    mood_board_images: string[];
    
    // Material specs
    material_id: string | null;
    silhouette: string | null;
    construction_tier: 'low' | 'moderate' | 'high' | null;
    construction_tier_override: boolean;
    timeline_weeks: number | null;
    
    // Analysis results
    score: number | null;
    dimensions: {
      identity?: number;
      resonance?: number;
      execution?: number;
    };
    gates_passed: {
      cost?: boolean;
      sustainability?: boolean | null;
    };
    narrative: string | null;
    redirects: Array<{
      type: string;
      suggestion: string;
      reason: string;
    }>;
    
    // Versioning
    data_version: string | null;
    agent_versions: {
      orchestrator?: string;
      calculator?: string;
      researcher?: string;
      critic?: string;
      synthesizer?: string;
    };
    
    created_at: string;
    updated_at: string;
  }
  
  export interface SavedCollection {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    analysis_ids: string[];
    created_at: string;
    updated_at: string;
  }