// lib/synthesizer/assemble.ts
// Client-side helpers that assemble typed blackboards from session state.
// Called by page components; the resulting blackboards are sent to API routes
// which call the synthesizer generators server-side (Anthropic SDK).
//
// SEASONAL RELEVANCE RULES:
//   Session season is 'FW26' or 'SS27' — never 'SS26'.
//   FW26 → "Strong FW26 relevance (X/5)"
//   SS27 → "Strong SS27 relevance (X/5)"
//   Unknown → "SS27: X/5, FW26: X/5"
//
// KNITWEAR COGS NOTE:
//   categories.json uses knit_weight_kg (0.48kg) as a primary cost input for
//   knitwear, but materials.json has no cost_per_kg field. The Calculator
//   falls back to cost_per_yard × yardage for all materials including knitwear.
//   This produces reasonable estimates; no code change needed here.

import aestheticsRaw from '@/data/aesthetics.json';
import materialsRaw from '@/data/materials.json';
import redirectsRaw from '@/data/redirects.json';
import type { ConceptBlackboard } from '@/lib/synthesizer/conceptInsight';
import type { SpecBlackboard, SpecPulseEvidence } from '@/lib/synthesizer/specInsight';
import type { ReportBlackboard } from '@/lib/synthesizer/reportNarrative';
import type { AestheticContext, ResolvedRedirects, IntentCalibration } from '@/lib/synthesizer/blackboard';
import type { SpecDecisionDiagnostics, SpecStepId } from '@/lib/synthesizer/specDecision';
import type { InsightMode } from '@/lib/types/insight';

// ─── Internal types ────────────────────────────────────────────────────────────

interface AestheticEntry {
  id: string;
  name?: string;
  consumer_insight?: string;
  risk_factors?: string[];
  seen_in?: string[];
  adjacent_directions?: string[];
  seasonal_relevance?: { ss27?: number; fw26?: number };
  saturation_score?: number;
  trend_velocity?: string;
}

interface MaterialEntry {
  id: string;
  name?: string;
  cost_range_note?: string;
}

interface MaterialAlternativeEntry {
  material_id: string;
  reason: string;
}

interface BrandMismatchEntry {
  suggestion: string;
  reason: string;
}

const aesthetics = aestheticsRaw as unknown as AestheticEntry[];
const materials = materialsRaw as unknown as MaterialEntry[];
const redirectsData = redirectsRaw as unknown as {
  material_alternatives?: Record<string, MaterialAlternativeEntry[]>;
  brand_mismatch?: Record<string, Record<string, BrandMismatchEntry>>;
};

interface MaterialCostEntry {
  id: string;
  cost_per_yard: number;
}
const materialCosts = materialsRaw as unknown as MaterialCostEntry[];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert aesthetic display name to slug ID (e.g. "Terrain Luxe" → "terrain-luxe"). */
export function toAestheticSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Convert seasonal_relevance object + session season to a human-readable string.
 * Session season is always 'FW26' or 'SS27' — never 'SS26'.
 */
function resolveSeasonalRelevanceStr(
  seasonal: { ss27?: number; fw26?: number } | undefined,
  season: string | null | undefined
): string {
  if (!seasonal) return '';
  const ss27 = seasonal.ss27 ?? 3;
  const fw26 = seasonal.fw26 ?? 3;
  const s = (season ?? '').toUpperCase();
  if (s === 'FW26') return `Strong FW26 relevance (${fw26}/5)`;
  if (s === 'SS27') return `Strong SS27 relevance (${ss27}/5)`;
  // Unknown season — pass both values
  return `SS27: ${ss27}/5, FW26: ${fw26}/5`;
}

/** Resolve AestheticContext from aesthetics.json for a given slug. */
export function resolveAestheticContext(
  aestheticSlug: string,
  season: string | null | undefined
): AestheticContext {
  const entry = aesthetics.find(a => a.id === aestheticSlug);
  return {
    consumer_insight: entry?.consumer_insight ?? '',
    risk_factors: entry?.risk_factors ?? [],
    seen_in: entry?.seen_in ?? [],
    adjacent_directions: entry?.adjacent_directions ?? [],
    seasonal_relevance: resolveSeasonalRelevanceStr(entry?.seasonal_relevance, season),
    saturation_score: entry?.saturation_score,
    trend_velocity: entry?.trend_velocity,
  };
}

/**
 * Resolve cost_reduction redirect from redirects.json.
 * Returns null when margin gate passes or no alternative exists.
 */
function resolveCostReduction(
  materialId: string,
  marginGatePassed: boolean | null
): ResolvedRedirects['cost_reduction'] {
  if (marginGatePassed !== false) return null;
  const alternatives = redirectsData.material_alternatives?.[materialId];
  if (!alternatives || alternatives.length === 0) return null;

  // A cost_reduction redirect must only surface cheaper materials.
  // Filter out any alternatives that cost the same or more than the selected material.
  const selectedCost =
    materialCosts.find(m => m.id === materialId)?.cost_per_yard ?? Infinity;

  const cheaperAlternatives = alternatives.filter(alt => {
    const altCost = materialCosts.find(m => m.id === alt.material_id)?.cost_per_yard;
    return altCost !== undefined && altCost < selectedCost;
  });

  if (cheaperAlternatives.length === 0) return null;

  const first = cheaperAlternatives[0];
  return { material_id: first.material_id, reason: first.reason };
}

/**
 * Return cost_range_note for a material.
 * Especially important for deadstock-fabric ($5–75/yd variable) and
 * leather (converted estimate) so the Synthesizer treats cost figures as
 * estimates rather than precise outputs.
 */
function getMaterialCostNote(materialId: string): string | undefined {
  return (materials.find(m => m.id === materialId) as MaterialEntry | undefined)
    ?.cost_range_note;
}

function getMaterialName(materialId: string): string | undefined {
  return (materials.find(m => m.id === materialId) as MaterialEntry | undefined)?.name;
}

/**
 * Resolve a brand_mismatch redirect by checking whether any brand keyword
 * matches an entry in redirects.brand_mismatch[aestheticSlug].
 * Returns null when there is no conflict or no entry exists.
 */
function resolveBrandMismatch(
  aestheticSlug: string,
  brandKeywords: string[],
): ResolvedRedirects['brand_mismatch'] {
  const byAesthetic = redirectsData.brand_mismatch?.[aestheticSlug];
  if (!byAesthetic) return null;

  for (const keyword of brandKeywords) {
    const entry =
      byAesthetic[keyword] ??
      byAesthetic[
        Object.keys(byAesthetic).find(
          k => k.toLowerCase() === keyword.toLowerCase()
        ) ?? ''
      ];
    if (entry) return { suggestion: entry.suggestion, reason: entry.reason };
  }
  return null;
}

// ─── Concept blackboard ────────────────────────────────────────────────────────

export interface ConceptBlackboardInput {
  /** Raw aesthetic input or display name from session */
  aestheticInput: string;
  /** Aesthetic slug (e.g. "terrain-luxe") */
  aestheticSlug: string;
  /** Brand DNA keywords — refinementModifiers from session store */
  brandKeywords: string[];
  identity_score: number;
  resonance_score: number;
  /** Season from store: 'FW26' | 'SS27' */
  season: string;
  /** Collection name for narrative personalization */
  collectionName: string;
  /** Brand name from brand profile — distinct from collectionName */
  brandName?: string;
  /** Customer profile description from brand onboarding */
  customerProfile?: string | null;
  /** Brand price tier from setup */
  priceTier?: string | null;
  /** Brand target margin from setup */
  targetMargin?: number | null;
  /** Brand tension context from setup */
  tensionContext?: string | null;
  /** Reference brands from brand onboarding */
  referenceBrands?: string[];
  /** Excluded brands from brand onboarding */
  excludedBrands?: string[];
  /** Optional intent calibration from the Intent page */
  intent?: IntentCalibration;
  /** Setup-derived strategy framing summary */
  strategySummary?: string | null;
  /** Expression signals from selected direction chips */
  expressionSignals?: string[];
  /** Brand-specific interpretation captured in setup / concept shaping */
  brandInterpretation?: string | null;
  /** Key pieces identified for the selected concept direction */
  keyPieces?: Array<{ item: string; type?: string; signal?: string }>;
  /** Collection context for collection-aware Decision Guidance */
  collection_context?: ConceptBlackboard['collection_context'];
  /** Whether the aesthetic was a proxy/fallback match rather than exact. */
  isProxyMatch?: boolean;
  /** Chip labels actively selected by the designer in Concept Studio */
  chipSelection?: string[];
}

export function deriveConceptStrategySummary(input: Pick<
  ConceptBlackboardInput,
  | 'strategySummary'
  | 'brandName'
  | 'collectionName'
  | 'priceTier'
  | 'customerProfile'
  | 'tensionContext'
  | 'brandKeywords'
  | 'targetMargin'
  | 'referenceBrands'
>): string | null {
  const explicit = input.strategySummary?.trim();
  if (explicit) return explicit;

  const brandName = input.brandName?.trim() || input.collectionName?.trim() || 'The brand';
  const parts: string[] = [];

  if (input.priceTier?.trim()) parts.push(`${brandName} operates at ${input.priceTier.trim()}.`);
  if (input.customerProfile?.trim()) parts.push(`Core customer: ${input.customerProfile.trim()}.`);
  if (input.tensionContext?.trim()) parts.push(`Strategic tension: ${input.tensionContext.trim()}.`);
  if (input.brandKeywords.length > 0) parts.push(`Brand equities center on ${input.brandKeywords.join(', ')}.`);
  if (typeof input.targetMargin === 'number' && Number.isFinite(input.targetMargin)) {
    parts.push(`Target margin sits around ${Math.round(input.targetMargin * 100)}%.`);
  }
  if ((input.referenceBrands ?? []).length > 0) {
    parts.push(`Reference frame includes ${(input.referenceBrands ?? []).slice(0, 3).join(', ')}.`);
  }

  return parts.length > 0 ? parts.join(' ') : null;
}

/** Returns null when aestheticSlug is missing — callers must guard. */
export function buildConceptBlackboard(
  input: ConceptBlackboardInput
): ConceptBlackboard | null {
  if (!input.aestheticSlug) return null;

  const aestheticContext = resolveAestheticContext(input.aestheticSlug, input.season);
  // Season key passed to generators as lowercase (fw26 / ss27)
  const seasonKey = input.season ? input.season.toLowerCase() : undefined;

  return {
    aesthetic_input: input.aestheticInput || input.aestheticSlug,
    aesthetic_matched_id: input.aestheticSlug,
    is_proxy_match: input.isProxyMatch ?? false,
    brand_keywords: input.brandKeywords,
    price_tier: input.priceTier ?? undefined,
    identity_score: input.identity_score,
    resonance_score: input.resonance_score,
    season: seasonKey,
    brand_name: input.brandName ?? input.collectionName ?? undefined,
    tension_context: input.tensionContext ?? undefined,
    customer_profile: input.customerProfile ?? null,
    reference_brands: input.referenceBrands ?? [],
    excluded_brands: input.excludedBrands ?? [],
    aesthetic_context: aestheticContext,
    resolved_redirects: {
      brand_mismatch: null,
    },
    intent: input.intent,
    strategy_summary: deriveConceptStrategySummary(input),
    expression_signals: input.expressionSignals ?? [],
    brand_interpretation: input.brandInterpretation ?? null,
    key_pieces: input.keyPieces,
    chip_selection: input.chipSelection,
    collection_context: input.collection_context,
  };
}

// ─── Spec blackboard ───────────────────────────────────────────────────────────

export interface SpecBlackboardInput {
  aestheticSlug: string;
  brandKeywords: string[];
  collectionDirection?: string;
  collectionLanguage?: string[];
  expressionSignals?: string[];
  brandInterpretation?: string | null;
  identity_score: number;
  resonance_score: number;
  execution_score: number;
  materialId: string;
  cogs_usd: number;
  target_msrp: number | null;
  targetMargin?: number | null;
  marginBuffer?: number | null;
  margin_pass: boolean | null;
  construction_tier: string;
  /** Available development / delivery window in weeks */
  timeline_weeks: number;
  /** Estimated required weeks once material lead + complexity are combined */
  requiredTimelineWeeks?: number | null;
  /** Positive means buffer remains; negative means the build exceeds the window */
  timelineGapWeeks?: number | null;
  season: string;
  collectionName: string;
  /** Brand name from brand profile — distinct from collectionName */
  brandName?: string;
  /** Concept-stage silhouette (straight / relaxed / structured / oversized) */
  silhouette?: string;
  /** Product category (e.g. "Tops", "Outerwear") */
  category?: string;
  /** Key piece selected in Concept Studio */
  keyPiece?: { item: string; type: string; signal: string };
  /** Summary of what the current assortment already expresses */
  currentPieceSet?: {
    collection_language?: string[];
    expression_signals?: string[];
  };
  gapState?: string[];
  tensionState?: string[];
  pulse?: SpecPulseEvidence;
  currentStep?: SpecStepId;
  constructionOverride?: boolean;
  diagnostics: SpecDecisionDiagnostics;
  /** Material ID the user most recently swapped away from — excludes it from Better Path suggestions */
  previousMaterialId?: string | null;
  /** Optional intent calibration from the Intent page */
  intent?: IntentCalibration;
}

/** Returns null when aestheticSlug or materialId is missing. */
export function buildSpecBlackboard(
  input: SpecBlackboardInput
): SpecBlackboard | null {
  if (!input.aestheticSlug || !input.materialId) return null;

  const aestheticContext = resolveAestheticContext(input.aestheticSlug, input.season);
  const seasonKey = input.season ? input.season.toLowerCase() : undefined;

  const aestheticEntry = (aesthetics as AestheticEntry[]).find(a => a.id === input.aestheticSlug);
  const aestheticName = aestheticEntry?.name ?? null;
  const aestheticConsumerInsight = aestheticEntry?.consumer_insight ?? null;

  return {
    aesthetic_matched_id: input.aestheticSlug,
    aesthetic_name: aestheticName,
    aesthetic_consumer_insight: aestheticConsumerInsight,
    brand_keywords: input.brandKeywords,
    collection_direction: input.collectionDirection ?? aestheticName ?? input.aestheticSlug,
    collection_language: input.collectionLanguage ?? [],
    expression_signals: input.expressionSignals ?? [],
    brand_interpretation: input.brandInterpretation ?? null,
    identity_score: input.identity_score,
    resonance_score: input.resonance_score,
    execution_score: input.execution_score,
    season: seasonKey,
    brand_name: (input.brandName && input.brandName.trim()) ? input.brandName : (input.collectionName || undefined),
    aesthetic_context: aestheticContext,
    material_id: input.materialId,
    previous_material_id: input.previousMaterialId ?? null,
    previous_material_name: input.previousMaterialId
      ? getMaterialName(input.previousMaterialId) ?? null
      : null,
    available_materials: materials
      .filter((material): material is MaterialEntry & { name: string } => Boolean(material.id && material.name))
      .map((material) => ({ id: material.id, name: material.name })),
    material_name: getMaterialName(input.materialId),
    cogs_usd: input.cogs_usd,
    target_msrp: input.target_msrp,
    target_margin: input.targetMargin ?? undefined,
    margin_buffer: input.marginBuffer ?? undefined,
    margin_pass: input.margin_pass,
    construction_tier: input.construction_tier,
    timeline_weeks: input.timeline_weeks,
    required_timeline_weeks: input.requiredTimelineWeeks ?? undefined,
    timeline_gap_weeks: input.timelineGapWeeks ?? undefined,
    current_step: input.currentStep,
    construction_override: input.constructionOverride ?? false,
    diagnostics: input.diagnostics,
    material_cost_note: getMaterialCostNote(input.materialId),
    category: input.category,
    silhouette: input.silhouette,
    keyPiece: input.keyPiece,
    current_piece_set: input.currentPieceSet,
    gap_state: input.gapState ?? [],
    tension_state: input.tensionState ?? [],
    pulse: input.pulse,
    resolved_redirects: {
      brand_mismatch: resolveBrandMismatch(input.aestheticSlug, input.brandKeywords),
      cost_reduction: resolveCostReduction(input.materialId, input.margin_pass),
    },
    intent: input.intent,
  };
}

// ─── Report blackboard ─────────────────────────────────────────────────────────

export interface ReportBlackboardInput {
  aestheticSlug: string;
  brandKeywords: string[];
  identity_score: number;
  resonance_score: number;
  execution_score: number;
  overall_score: number;
  materialId: string;
  cogs_usd: number;
  target_msrp: number | null;
  margin_pass: boolean | null;
  construction_tier: string;
  timeline_weeks: number;
  season: string;
  collectionName: string;
  /** Brand name from brand profile — distinct from collectionName */
  brandName?: string;
  collection_role?: 'hero' | 'directional' | 'core-evolution' | 'volume-driver' | null;
  intent_mode?: InsightMode;
  customerProfile?: string | null;
  referenceBrands?: string[];
  excludedBrands?: string[];
  priceTier?: string;
  /** Key piece selected in Concept Studio */
  keyPiece?: { item: string; type: string; signal: string };
  /** Brand target margin as a decimal (e.g. 0.60), from session or brand profile */
  targetMargin?: number | null;
  /** Concept insight title from session (conceptInsightTitle) */
  conceptInsightTitle?: string | null;
  /** Concept insight positioning bullets from session (conceptInsightPositioning) */
  conceptInsightPositioning?: string[] | null;
  /** Whether the aesthetic was a proxy/fallback match rather than exact. */
  isProxyMatch?: boolean;
}

/** Returns null when aestheticSlug or materialId is missing. */
export function buildReportBlackboard(
  input: ReportBlackboardInput
): ReportBlackboard | null {
  if (!input.aestheticSlug || !input.materialId) return null;

  const aestheticContext = resolveAestheticContext(input.aestheticSlug, input.season);
  const seasonKey = input.season ? input.season.toLowerCase() : undefined;
  const costReduction = resolveCostReduction(input.materialId, input.margin_pass);

  return {
    aesthetic_matched_id: input.aestheticSlug,
    is_proxy_match: input.isProxyMatch ?? false,
    brand_keywords: input.brandKeywords,
    identity_score: input.identity_score,
    resonance_score: input.resonance_score,
    execution_score: input.execution_score,
    overall_score: input.overall_score,
    season: seasonKey,
    brand_name: (input.brandName && input.brandName.trim()) ? input.brandName : undefined,
    aesthetic_context: aestheticContext,
    material_id: input.materialId,
    cogs_usd: input.cogs_usd,
    target_msrp: input.target_msrp,
    margin_pass: input.margin_pass,
    construction_tier: input.construction_tier,
    timeline_weeks: input.timeline_weeks,
    material_cost_note: getMaterialCostNote(input.materialId),
    collection_role: input.collection_role ?? null,
    intent_mode: input.intent_mode,
    customer_profile: input.customerProfile ?? null,
    reference_brands: input.referenceBrands ?? [],
    excluded_brands: input.excludedBrands ?? [],
    price_tier: input.priceTier ?? 'unspecified',
    keyPiece: input.keyPiece,
    target_margin: input.targetMargin ?? null,
    concept_thread: (input.conceptInsightTitle && input.conceptInsightPositioning?.[0])
      ? { title: input.conceptInsightTitle, market_gap: input.conceptInsightPositioning[0] }
      : null,
    resolved_redirects: {
      brand_mismatch: resolveBrandMismatch(input.aestheticSlug, input.brandKeywords),
      cost_reduction: costReduction,
    },
  };
}
