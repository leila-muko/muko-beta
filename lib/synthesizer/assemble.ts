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
import type { SpecBlackboard } from '@/lib/synthesizer/specInsight';
import type { ReportBlackboard } from '@/lib/synthesizer/reportNarrative';
import type { AestheticContext, ResolvedRedirects, IntentCalibration } from '@/lib/synthesizer/blackboard';
import type { InsightMode } from '@/lib/types/insight';

// ─── Internal types ────────────────────────────────────────────────────────────

interface AestheticEntry {
  id: string;
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

const aesthetics = aestheticsRaw as unknown as AestheticEntry[];
const materials = materialsRaw as unknown as MaterialEntry[];
const redirectsData = redirectsRaw as unknown as {
  material_alternatives?: Record<string, MaterialAlternativeEntry[]>;
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
  marginGatePassed: boolean
): ResolvedRedirects['cost_reduction'] {
  if (marginGatePassed) return null;
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
  /** Optional intent calibration from the Intent page */
  intent?: IntentCalibration;
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
    is_proxy_match: false, // No Critic agent in session layer
    brand_keywords: input.brandKeywords,
    identity_score: input.identity_score,
    resonance_score: input.resonance_score,
    season: seasonKey,
    brand_name: input.collectionName || undefined,
    aesthetic_context: aestheticContext,
    resolved_redirects: {
      brand_mismatch: null,
    },
    intent: input.intent,
  };
}

// ─── Spec blackboard ───────────────────────────────────────────────────────────

export interface SpecBlackboardInput {
  aestheticSlug: string;
  brandKeywords: string[];
  identity_score: number;
  resonance_score: number;
  execution_score: number;
  materialId: string;
  cogs_usd: number;
  target_msrp: number;
  margin_pass: boolean;
  construction_tier: string;
  timeline_weeks: number;
  season: string;
  collectionName: string;
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

  return {
    aesthetic_matched_id: input.aestheticSlug,
    brand_keywords: input.brandKeywords,
    identity_score: input.identity_score,
    resonance_score: input.resonance_score,
    execution_score: input.execution_score,
    season: seasonKey,
    brand_name: input.collectionName || undefined,
    aesthetic_context: aestheticContext,
    material_id: input.materialId,
    material_name: getMaterialName(input.materialId),
    cogs_usd: input.cogs_usd,
    target_msrp: input.target_msrp,
    margin_pass: input.margin_pass,
    construction_tier: input.construction_tier,
    timeline_weeks: input.timeline_weeks,
    material_cost_note: getMaterialCostNote(input.materialId),
    resolved_redirects: {
      brand_mismatch: null,
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
  target_msrp: number;
  margin_pass: boolean;
  construction_tier: string;
  timeline_weeks: number;
  season: string;
  collectionName: string;
  collection_role?: 'hero' | 'directional' | 'core-evolution' | 'volume-driver' | null;
  intent_mode?: InsightMode;
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
    is_proxy_match: false,
    brand_keywords: input.brandKeywords,
    identity_score: input.identity_score,
    resonance_score: input.resonance_score,
    execution_score: input.execution_score,
    overall_score: input.overall_score,
    season: seasonKey,
    brand_name: input.collectionName || undefined,
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
    resolved_redirects: {
      brand_mismatch: null,
      cost_reduction: costReduction,
    },
  };
}
