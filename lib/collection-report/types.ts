export type CollectionPieceRole = 'hero' | 'core' | 'support';
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
}

export interface CollectionDistributionItem {
  label: string;
  count: number;
  percentage: number;
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
  collection_health: {
    role_balance: CollectionHealthDetail;
    complexity_load: CollectionHealthDetail;
    silhouette_diversity: CollectionHealthDetail;
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
}
