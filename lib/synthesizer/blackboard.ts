// lib/synthesizer/blackboard.ts
// Muko Synthesizer Blackboard — Pre-LLM context assembly
//
// PURPOSE: Resolve all deterministic inputs (including redirects) before
// passing context to the narrative engine or LLM. No model calls here.
//
// REDIRECT RESOLUTION:
//   brand_mismatch  → redirects.brand_mismatch[aestheticId][conflictingBrandKeyword]
//   cost_reduction  → redirects.material_alternatives[materialId][0] (first item only, beta)

import redirectsRaw from '@/data/redirects.json';
import aestheticsRaw from '@/data/aesthetics.json';
import materialsRaw from '@/data/materials.json';
import type { NarrativeInput } from '@/lib/agents/synthesizer';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface BlackboardInput {
  /** The matched aesthetic's ID (e.g. "terrain-luxe") */
  aestheticId: string;
  /**
   * First brand DNA keyword that triggered a Critic conflict.
   * Pass null if the Critic returned conflict_detected: false.
   */
  conflictingBrandKeyword: string | null;
  /** The selected material's ID (e.g. "organic-cotton") */
  materialId: string;
  /** From ScoreGates — drives whether cost_reduction is resolved */
  marginGatePassed: boolean;
  /** Full narrative input, passed through unchanged */
  narrativeInput: NarrativeInput;
}

export interface ResolvedRedirect {
  suggestion?: string;
  material_id?: string;
  reason: string;
}

export interface ResolvedRedirects {
  brand_mismatch: { suggestion: string; reason: string } | null;
  cost_reduction: { material_id: string; reason: string } | null;
}

export interface IntentCalibration {
  primary_goals: string[];
  tradeoff: string;
  piece_role: string;
  tension_sliders: {
    /** 0–100: 0 = timeless, 100 = trend-forward */
    trend_forward: number;
    /** 0–100: 0 = commercial safety, 100 = creative expression */
    creative_expression: number;
    /** 0–100: 0 = accessible price, 100 = elevated design */
    elevated_design: number;
    /** 0–100: 0 = continuity, 100 = novelty */
    novelty: number;
  };
}

export interface AestheticContext {
  consumer_insight: string;
  risk_factors: string[];
  seen_in: string[];
  adjacent_directions: string[];
  seasonal_relevance: string;
  saturation_score?: number;
  /** Sourcing logic behind the saturation_score (e.g. "Tracked across 4 collections SS25-FW25") */
  saturation_basis?: string;
  trend_velocity?: string;
}

export interface Blackboard {
  narrativeInput: NarrativeInput;
  resolved_redirects: ResolvedRedirects;
  aesthetic_context: AestheticContext;
  is_proxy_match: boolean;
}

// ─────────────────────────────────────────────
// INTERNAL: typed redirect data
// ─────────────────────────────────────────────

interface BrandMismatchEntry {
  suggestion: string;
  reason: string;
}

interface MaterialAlternative {
  material_id: string;
  reason: string;
}

const redirects = redirectsRaw as unknown as {
  brand_mismatch: Record<string, Record<string, BrandMismatchEntry>>;
  material_alternatives: Record<string, MaterialAlternative[]>;
};

interface AestheticEntry {
  id: string;
  consumer_insight?: string;
  risk_factors?: string[];
  seen_in?: string[];
  adjacent_directions?: string[];
  seasonal_relevance?: string | Record<string, number>;
  saturation_score?: number;
  saturation_basis?: string;
  trend_velocity?: string;
}

const aesthetics = aestheticsRaw as unknown as AestheticEntry[];

interface MaterialCostEntry {
  id: string;
  cost_per_yard: number;
}
const materialCosts = materialsRaw as unknown as MaterialCostEntry[];

// ─────────────────────────────────────────────
// RESOLUTION HELPERS
// ─────────────────────────────────────────────

function resolveBrandMismatch(
  aestheticId: string,
  conflictingBrandKeyword: string | null
): ResolvedRedirects['brand_mismatch'] {
  if (!conflictingBrandKeyword) return null;

  const byAesthetic = redirects.brand_mismatch[aestheticId];
  if (!byAesthetic) {
    console.warn(
      `[Blackboard] brand_mismatch lookup failed — no entry for aesthetic "${aestheticId}". ` +
        `Critic flagged conflict on keyword "${conflictingBrandKeyword}".`
    );
    return null;
  }

  // Try exact key first, then case-insensitive fallback
  const entry =
    byAesthetic[conflictingBrandKeyword] ??
    byAesthetic[
      Object.keys(byAesthetic).find(
        k => k.toLowerCase() === conflictingBrandKeyword.toLowerCase()
      ) ?? ''
    ];

  if (!entry) {
    console.warn(
      `[Blackboard] brand_mismatch lookup failed — aesthetic "${aestheticId}" exists ` +
        `but has no entry for keyword "${conflictingBrandKeyword}".`
    );
    return null;
  }

  return { suggestion: entry.suggestion, reason: entry.reason };
}

function resolveCostReduction(
  materialId: string,
  marginGatePassed: boolean
): ResolvedRedirects['cost_reduction'] {
  if (marginGatePassed) return null;

  const alternatives = redirects.material_alternatives[materialId];
  if (!alternatives || alternatives.length === 0) {
    console.warn(
      `[Blackboard] cost_reduction lookup failed — no material_alternatives entry for ` +
        `material "${materialId}" (margin gate failed).`
    );
    return null;
  }

  // A cost_reduction redirect must only surface cheaper materials.
  // Some redirect lists include upgrades or lateral swaps — never surface
  // one that increases cost, regardless of what redirects.json contains.
  const selectedCost =
    materialCosts.find(m => m.id === materialId)?.cost_per_yard ?? Infinity;

  const cheaperAlternatives = alternatives.filter(alt => {
    const altCost = materialCosts.find(m => m.id === alt.material_id)?.cost_per_yard;
    return altCost !== undefined && altCost < selectedCost;
  });

  if (cheaperAlternatives.length === 0) {
    console.warn(
      `[Blackboard] cost_reduction has no cheaper alternatives for "${materialId}" ` +
        `(selected cost_per_yard: ${selectedCost}).`
    );
    return null;
  }

  const first = cheaperAlternatives[0];
  return { material_id: first.material_id, reason: first.reason };
}

function resolveAestheticContext(
  aestheticId: string
): { context: AestheticContext; isProxy: boolean } {
  // Direct match first
  const entry = aesthetics.find(a => a.id === aestheticId);
  let isProxy = false;

  // Fallback: resolve through brand_mismatch proxy if direct match missing
  if (!entry) {
    isProxy = true;
    const byAesthetic = redirects.brand_mismatch[aestheticId];
    if (byAesthetic) {
      // The proxy aesthetic may have a suggestion pointing to another id;
      // try to resolve it from the first entry's suggestion field
      const firstRedirect = Object.values(byAesthetic)[0] as BrandMismatchEntry | undefined;
      if (firstRedirect?.suggestion) {
        // suggestion is a free-text phrase, not an id — just log and fall through
      }
    }
    console.warn(
      `[Blackboard] aesthetic_context lookup — no entry for "${aestheticId}", returning empty context.`
    );
  }

  const seasonal = entry?.seasonal_relevance;
  const seasonalStr =
    typeof seasonal === 'string'
      ? seasonal
      : seasonal != null
        ? JSON.stringify(seasonal)
        : '';

  return {
    context: {
      consumer_insight: entry?.consumer_insight ?? '',
      risk_factors: entry?.risk_factors ?? [],
      seen_in: entry?.seen_in ?? [],
      adjacent_directions: entry?.adjacent_directions ?? [],
      seasonal_relevance: seasonalStr,
      saturation_score: entry?.saturation_score,
      saturation_basis: entry?.saturation_basis,
      trend_velocity: entry?.trend_velocity,
    },
    isProxy,
  };
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────

/**
 * Assembles the Synthesizer Blackboard.
 *
 * Resolves brand_mismatch and cost_reduction redirects deterministically
 * at build time so the narrative engine receives structured, resolved data
 * rather than raw JSON lookups.
 *
 * Never throws — lookup failures return null and emit console.warn.
 */
export function buildBlackboard(input: BlackboardInput): Blackboard {
  const {
    aestheticId,
    conflictingBrandKeyword,
    materialId,
    marginGatePassed,
    narrativeInput,
  } = input;

  const resolved_redirects: ResolvedRedirects = {
    brand_mismatch: resolveBrandMismatch(aestheticId, conflictingBrandKeyword),
    cost_reduction: resolveCostReduction(materialId, marginGatePassed),
  };

  const { context: aesthetic_context, isProxy: is_proxy_match } =
    resolveAestheticContext(aestheticId);

  return {
    narrativeInput,
    resolved_redirects,
    aesthetic_context,
    is_proxy_match,
  };
}
