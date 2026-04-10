export type CollectionPieceRole = 'hero' | 'volume-driver' | 'core-evolution' | 'directional';
export type CollectionComplexity = 'high' | 'medium' | 'low';
export type CollectionPieceStatus = 'strong' | 'watch' | 'revise';
export type CollectionReportSource = 'synthesizer' | 'fallback';

export interface CollectionScoreDetail {
  score: number;
  explanation: string;
}

export interface CollectionHealthDetail {
  score: number;
  label: string;
  interpretation: string;
  basis?: string;
}

export interface CollectionRisk {
  title: string;
  detail: string;
  why_this_matters?: string;
}

export interface CollectionDistributionItem {
  label: string;
  count: number;
  percentage: number;
}

export interface AssortmentIntelligence {
  collection_state: string;
  collection_read: string;
  supporting_line: string;
  muko_insight: string;
  collection_insight: string;
  next_action?: string;
  breakdown: string[];
  recommended_actions: string[];
  watchlist: string[];
  diagnostics?: {
    collectionStage: 'early' | 'developing' | 'built';
    roleBalanceStatus: 'missing_core' | 'missing_hero' | 'missing_support' | 'balanced';
    complexityRisk: 'front_loaded_high' | 'balanced' | 'too_safe';
    coverage: 'narrow' | 'moderate' | 'broad';
    viabilitySignal: 'fragile' | 'building' | 'stable';
    complexitySummary: string;
  };
}

export interface CollectionReportPieceSummaryItem {
  id: string;
  piece_name: string;
  category: string;
  role: CollectionPieceRole;
  complexity: CollectionComplexity;
  direction_tag: string;
  material: string;
  score: number;
  status?: CollectionPieceStatus;
  execution_notes?: string | string[] | null;
  construction?: 'low' | 'moderate' | 'high' | null;
  margin_passed?: boolean | null;
  cogs?: number | null;
  msrp?: number | null;
  flagged_conflicts?: string[] | null;
}

export interface CollectionReportPayload {
  header: {
    title: string;
    collection_name: string;
    season: string;
    generated_at: string;
    piece_count: number;
    version_label?: string | null;
  };
  collection_thesis: string;
  narrative?: string | null;
  overview: {
    total_pieces: number;
    role_distribution: CollectionDistributionItem[];
    complexity_distribution: CollectionDistributionItem[];
    category_distribution: CollectionDistributionItem[];
    silhouette_note: string;
    top_materials: string[];
  };
  scores: {
    identity: CollectionScoreDetail;
    resonance: CollectionScoreDetail;
    execution: CollectionScoreDetail;
  };
  muko_insight: {
    working: string[];
    watch: string[];
    recommendations: string[];
  };
  brand?: CollectionReportBrandInput | null;
  intent?: CollectionReportIntentInput | null;
  ppw_descriptions?: {
    protect?: string | null;
    push?: string | null;
    watch?: string | null;
  } | null;
  assortment_intelligence: AssortmentIntelligence;
  collection_health: {
    role_balance: CollectionHealthDetail;
    complexity_load: CollectionHealthDetail;
    silhouette_diversity?: CollectionHealthDetail;
    redundancy_risk?: CollectionHealthDetail;
  };
  piece_summary: CollectionReportPieceSummaryItem[];
  key_risks: CollectionRisk[];
  next_steps: {
    immediate_actions: string[];
    decision_points: string[];
  };
  overall_read: string;
  overall_read_detail?: string;
  meta: {
    source: CollectionReportSource;
    snapshot_id?: string | null;
  };
}

export interface CollectionReportBrandInput {
  brand_name?: string | null;
  keywords?: string[] | null;
  customer_profile?: string | null;
  price_tier?: string | null;
  tension_context?: string | null;
  reference_brands?: string[] | null;
}

export interface CollectionReportIntentInput {
  primary_goals?: string[] | null;
  tradeoff?: string | null;
  collection_role?: string | null;
  tension_sliders?: {
    trend_forward?: number | null;
    creative_expression?: number | null;
    elevated_design?: number | null;
    novelty?: number | null;
  } | null;
}

export interface CollectionReportResponse {
  collection_report: CollectionReportPayload;
}

export interface CollectionReportInputPiece {
  id: string;
  piece_name?: string | null;
  category?: string | null;
  role?: CollectionPieceRole | null;
  complexity?: CollectionComplexity | null;
  direction_tag?: string | null;
  material?: string | null;
  silhouette?: string | null;
  score?: number | null;
  status?: CollectionPieceStatus | null;
  dimensions?: {
    identity?: number | null;
    resonance?: number | null;
    execution?: number | null;
  } | null;
  margin_passed?: boolean | null;
  // Extended fields for synthesizer prompt
  cogs?: number | null;
  msrp?: number | null;
  construction?: 'low' | 'moderate' | 'high' | null;
  flagged_conflicts?: string[] | null;
  execution_notes?: string | string[] | null;
  saved_piece_expression?: string | null;
  collection_language?: string[] | null;
  intent_success_goals?: string[] | null;
}

export interface CollectionReportInput {
  collection_name: string;
  season: string;
  generated_at?: string;
  version_label?: string | null;
  snapshot_id?: string | null;
  pieces: CollectionReportInputPiece[];
  brand?: CollectionReportBrandInput | null;
  intent?: CollectionReportIntentInput | null;
  // Extended fields for synthesizer prompt
  collection_aesthetic?: string | null;
  aesthetic_inflection?: string | null;
  collection_silhouette?: string | null;
  collection_brief?: string | null;
}
