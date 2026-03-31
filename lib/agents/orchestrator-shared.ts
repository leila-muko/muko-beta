import type { IntentCalibration } from '@/lib/synthesizer/blackboard';

export const AGENT_VERSIONS = {
  orchestrator: '1.0.0',
  calculator:   '1.0.0',
  researcher:   '1.0.0',
  critic:       '1.0.0',
  synthesizer:  '1.0.0',
} as const;

export interface AnalysisInput {
  aesthetic_input:   string;
  material_id:       string;
  silhouette:        string;
  construction_tier: 'low' | 'moderate' | 'high';
  category:          string;
  target_msrp:       number | null;
  season:            string;
  collection_name:   string;
  timeline_weeks:    number;
  lined?:            boolean;
}

export interface BrandProfile {
  id:               string | null;
  brand_name:       string;
  keywords:         string[];
  customer_profile: string | null;
  price_tier:       'Contemporary' | 'Bridge' | 'Luxury';
  target_margin:    number;
  tension_context:  string | null;
  accepts_conflicts?:   boolean;
  brand_description?:   string | null;
  reference_brands?:    string[];
  excluded_brands?:     string[];
  excluded_aesthetics?: string[];
}

export interface SessionState {
  collectionName:    string;
  season:            string;
  selectedAesthetic: string | null;
  selectedElements:  string[];
  category:          string | null;
  targetMSRP:        number | null;
  materialId:        string | null;
  silhouette:        string | null;
  constructionTier:  'low' | 'moderate' | 'high' | null;
  timelineWeeks:     number | null;
  collectionRole:    'hero' | 'directional' | 'core-evolution' | 'volume-driver' | null;
  [key: string]: unknown;
}

export interface RedirectObject {
  type:       string;
  suggestion: string;
  reason:     string;
}

export interface AgentError {
  agent:   string;
  message: string;
}

export interface AnalysisResult {
  score:              number;
  dimensions: {
    identity:   number;
    resonance:  number;
    execution:  number;
  };
  gates_passed: {
    cost:           boolean | null;
    sustainability: null;
  };
  narrative:          string;
  redirect:           RedirectObject | null;
  agent_versions:     typeof AGENT_VERSIONS;
  aesthetic_matched_id: string | null;
  errors:             AgentError[];
  analysis_id:        string | null;
}

export interface PipelineBlackboard {
  input:                AnalysisInput;
  brand:                BrandProfile;
  session:              SessionState;
  aesthetic_matched_id: string | null;
  is_proxy_match:       boolean;
  aesthetic_keywords:   string[];
  saturation_score:     number;
  trend_velocity:       string;
  category_saturation:  number;
  category_velocity:    string;
  identity_score:           number;
  tension_flags:            string[];
  critic_conflict_detected: boolean;
  critic_conflict_ids:      string[];
  critic_llm_used:          boolean;
  critic_reasoning:         string;
  resonance_score:      number;
  execution_score:      number;
  timeline_buffer:      number;
  cogs:                 number;
  gate_passed:          boolean | null;
  cogs_delta:           number;
  final_score:          number;
  redirect:             RedirectObject | null;
  narrative:            string;
}

export function buildAnalysisRow(
  bb:     PipelineBlackboard,
  result: AnalysisResult,
  userId: string | null,
): Record<string, unknown> {
  if (!userId) {
    throw new Error('Cannot build analysis row without a user_id.');
  }

  const intent        = bb.session.intent as IntentCalibration | undefined;
  const existingId    = (bb.session.savedAnalysisId as string | null | undefined) ?? null;
  // parent_analysis_id removed — branching deferred to Phase 2
  const collAesthetic = (bb.session.collectionAesthetic as string | null | undefined) ?? null;
  const aestheticInfl = (bb.session.aestheticInflection as string | null | undefined)
    ?? (bb.session.directionInterpretationText as string | null | undefined)
    ?? null;
  const selectedKeyPiece = bb.session.selectedKeyPiece as { item?: string | null } | null | undefined;
  const pieceBuildContext = bb.session.pieceBuildContext as {
    adaptedTitle?: string | null;
    originalLabel?: string | null;
    expression?: string | null;
  } | null | undefined;
  const selectedPieceImage = bb.session.selectedPieceImage;
  const directionInterpretationChips =
    ((bb.session.directionInterpretationChips as string[] | null | undefined) ?? []).filter(Boolean);
  const chipSelection = (bb.session.chipSelection as { directionId?: string; activatedChips?: unknown[] } | null | undefined) ?? null;
  const savedPieceName =
    selectedKeyPiece?.item?.trim()
    || pieceBuildContext?.adaptedTitle?.trim()
    || pieceBuildContext?.originalLabel?.trim()
    || bb.input.category?.trim()
    || null;
  const savedPieceExpression = pieceBuildContext?.expression?.trim() || null;

  const row: Record<string, unknown> = {
    user_id:          userId,
    brand_profile_id: bb.brand.id,
    season:          bb.input.season,
    collection_name: bb.input.collection_name,
    collection_role: bb.session.collectionRole ?? null,
    category:    bb.input.category?.toLowerCase()?.trim(),
    target_msrp: (bb.input.target_msrp && bb.input.target_msrp > 0)
      ? bb.input.target_msrp
      : null,
    aesthetic_input:      bb.input.aesthetic_input,
    aesthetic_matched_id: result.aesthetic_matched_id ?? bb.input.aesthetic_input?.toLowerCase()?.replace(/\s+/g, '-'),
    collection_aesthetic: collAesthetic,
    aesthetic_inflection: aestheticInfl,
    mood_board_images:    [],
    material_id:                bb.input.material_id,
    silhouette:                 bb.input.silhouette,
    construction_tier:          bb.input.construction_tier,
    construction_tier_override: false,
    timeline_weeks:             bb.input.timeline_weeks,
    piece_name: savedPieceName,
    score: result.score,
    dimensions: {
      identity:  result.dimensions.identity,
      resonance: result.dimensions.resonance,
      execution: result.dimensions.execution,
    },
    gates_passed: {
      cost:           result.gates_passed.cost,
      sustainability: null,
    },
    narrative: result.narrative,
    redirects: result.redirect ? [result.redirect] : [],
    data_version:   process.env.NEXT_PUBLIC_DATA_VERSION ?? 'unknown',
    agent_versions: {
      ...result.agent_versions,
      collection_role: bb.session.collectionRole ?? null,
      saved_piece_name: savedPieceName,
      saved_piece_expression: savedPieceExpression,
      selected_piece_image: selectedPieceImage ? JSON.stringify(selectedPieceImage) : null,
      direction_interpretation_chips: JSON.stringify(directionInterpretationChips),
      chip_selection: chipSelection ? JSON.stringify(chipSelection) : null,
    },
    intent_success_goals:    intent?.primary_goals ?? [],
    intent_tradeoff:         intent?.tradeoff ?? null,
    intent_tension_trend:    intent?.tension_sliders?.trend_forward ?? null,
    intent_tension_creative: intent?.tension_sliders?.creative_expression ?? null,
    intent_tension_elevated: intent?.tension_sliders?.elevated_design ?? null,
    intent_tension_novelty:  intent?.tension_sliders?.novelty ?? null,
    // parent_analysis_id removed — branching deferred to Phase 2
  };

  if (existingId) row.id = existingId;

  return row;
}
