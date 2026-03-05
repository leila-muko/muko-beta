// lib/agents/redirects.ts
// Muko Redirect Selection Agent — v1.0.0
//
// PURPOSE: Given a source material, matched aesthetic, gate/score status, and brand
// profile, returns exactly ONE redirect suggestion or null.
//
// The candidate pool is never exposed to the user — only the selected redirect
// surfaces in the Synthesizer's narrative.
//
// WARRANT LOGIC:
//   execution_score < 60       → null  (Synthesizer handles via construction tier)
//   gate failed                → cost-reduction material redirect (material_alternatives)
//   identity_score < 60        → aesthetic alignment redirect (brand_mismatch)
//   all strong + gate passed   → null

import materialsRaw from '@/data/materials.json';
import redirectsRaw from '@/data/redirects.json';
import type { BrandProfile } from '@/lib/agents/orchestrator';

// ─── Internal data shapes ─────────────────────────────────────────────────────

interface MaterialEntry {
  id:                  string;
  name:                string;
  cost_per_yard:       number;
  functional_class:    string;
  redirect_compatible: string[];
}

interface MaterialAlternativeEntry {
  material_id: string;
  reason:      string;
}

interface BrandMismatchEntry {
  suggestion: string;  // target aesthetic id
  reason:     string;
}

interface RedirectsJson {
  material_alternatives: Record<string, MaterialAlternativeEntry[]>;
  brand_mismatch:        Record<string, Record<string, BrandMismatchEntry>>;
}

// ─── Public return type ───────────────────────────────────────────────────────

export interface MaterialRedirect {
  /** 'material' = swap the fabric; 'aesthetic' = reframe the aesthetic direction */
  type: 'material' | 'aesthetic';

  source_material_id: string;

  /**
   * For type='material': the target material id (e.g. "tencel").
   * For type='aesthetic': the target aesthetic id (e.g. "romantic-analog").
   *   The Synthesizer reads this to name the alternative aesthetic in the narrative.
   */
  target_material_id: string;

  /** Human-readable rationale for the Synthesizer to use or paraphrase. */
  reason: string;

  /** Signed percentage change in cost_per_yard. Negative = cheaper. 0 for aesthetic redirects. */
  cogs_delta_pct: number;

  /**
   * True when the redirect crosses functional classes (e.g. structure → drape).
   * The Synthesizer should flag the silhouette implication in the narrative.
   */
  requires_silhouette_note: boolean;

  /**
   * True when source is leather or vegan-leather.
   * The Synthesizer frames the alternative in terms of surface finish and
   * structural behaviour — not raw fiber content.
   */
  frame_as_surface?: true;
}

// ─── Preprocess data ──────────────────────────────────────────────────────────

const materials = (materialsRaw as unknown as MaterialEntry[]).reduce<
  Record<string, MaterialEntry>
>((acc, m) => {
  acc[m.id] = m;
  return acc;
}, {});

const redirects = redirectsRaw as unknown as RedirectsJson;

const LEATHER_IDS = new Set<string>(['leather', 'vegan-leather']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Signed % change in cost_per_yard relative to source. Negative means cheaper. */
function cogsChangePct(source: MaterialEntry, target: MaterialEntry): number {
  return Math.round(
    ((target.cost_per_yard - source.cost_per_yard) / source.cost_per_yard) * 100
  );
}

/** Attach frame_as_surface when source is leather-family. */
function withLeatherFlag(
  redirect: MaterialRedirect,
  sourceMaterialId: string
): MaterialRedirect {
  if (LEATHER_IDS.has(sourceMaterialId)) {
    return { ...redirect, frame_as_surface: true };
  }
  return redirect;
}

// ─── Cost-reduction redirect (gate failed) ────────────────────────────────────
//
// Reads material_alternatives[sourceMaterialId], filters to known materials,
// preserves functional class where possible, then picks the candidate with the
// largest absolute cost reduction.

function selectCostRedirect(
  sourceMaterialId: string,
  sourceMaterial: MaterialEntry
): MaterialRedirect | null {
  const candidates: MaterialAlternativeEntry[] =
    redirects.material_alternatives[sourceMaterialId] ?? [];

  // Keep only candidates that exist in materials.json
  const valid = candidates.filter(c => materials[c.material_id] != null);
  if (valid.length === 0) return null;

  // Step 3 — functional class preservation
  const sameCandidates = valid.filter(
    c => materials[c.material_id].functional_class === sourceMaterial.functional_class
  );
  const crossingClass = sameCandidates.length === 0;
  const pool = crossingClass ? valid : sameCandidates;

  // Step 4 — rank by biggest margin improvement (lowest cost_per_yard first)
  const ranked = [...pool].sort(
    (a, b) => materials[a.material_id].cost_per_yard - materials[b.material_id].cost_per_yard
  );

  const top    = ranked[0];
  const target = materials[top.material_id];

  const redirect: MaterialRedirect = {
    type:                  'material',
    source_material_id:    sourceMaterialId,
    target_material_id:    top.material_id,
    reason:                top.reason,
    cogs_delta_pct:        cogsChangePct(sourceMaterial, target),
    requires_silhouette_note: crossingClass,
  };

  return withLeatherFlag(redirect, sourceMaterialId);
}

// ─── Aesthetic alignment redirect (identity_score < 60) ──────────────────────
//
// Reads brand_mismatch[aestheticMatchedId], matches the brand's keyword list
// against the consumer-keyword keys in that map (case-insensitive), returns
// the first match's suggested aesthetic.

function selectAestheticRedirect(
  sourceMaterialId: string,
  aestheticMatchedId: string,
  brand: BrandProfile
): MaterialRedirect | null {
  const mismatchMap = redirects.brand_mismatch[aestheticMatchedId];
  if (!mismatchMap) return null;

  const brandKeywordsLower = brand.keywords.map(k => k.toLowerCase());
  const matchedKey = Object.keys(mismatchMap).find(key =>
    brandKeywordsLower.includes(key.toLowerCase())
  );
  if (!matchedKey) return null;

  const entry = mismatchMap[matchedKey];

  const redirect: MaterialRedirect = {
    type:                  'aesthetic',
    source_material_id:    sourceMaterialId,
    target_material_id:    entry.suggestion,  // target aesthetic id
    reason:                entry.reason,
    cogs_delta_pct:        0,
    requires_silhouette_note: false,
  };

  return withLeatherFlag(redirect, sourceMaterialId);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Selects a single redirect suggestion, or null if none is warranted.
 *
 * @param sourceMaterialId   — material selected in Spec Studio
 * @param aestheticMatchedId — aesthetic matched by the Researcher (may be null)
 * @param gatePass           — true if margin gate passed
 * @param identityScore      — 0–100; below 60 triggers aesthetic redirect
 * @param executionScore     — 0–100; below 60 means Synthesizer handles it — return null
 * @param brand              — brand profile from Supabase / onboarding store
 */
export function selectRedirect(
  sourceMaterialId:   string,
  aestheticMatchedId: string | null,
  gatePass:           boolean,
  identityScore:      number,
  executionScore:     number,
  brand:              BrandProfile
): MaterialRedirect | null {

  // ── Step 1: Warrant check ─────────────────────────────────────────────────

  // No problems — no redirect needed.
  if (gatePass && identityScore >= 60) return null;

  // Execution failures are handled by the Synthesizer via construction tier advice —
  // but only suppress when the margin gate also passed. A gate fail always warrants
  // a cost-reduction redirect regardless of execution score.
  if (executionScore < 60 && gatePass) return null;

  const sourceMaterial = materials[sourceMaterialId];
  if (!sourceMaterial) return null;

  // ── Step 2–4: Cost-reduction redirect (margin gate failed) ────────────────
  if (!gatePass) {
    return selectCostRedirect(sourceMaterialId, sourceMaterial);
  }

  // ── Aesthetic alignment redirect (identity weak) ──────────────────────────
  if (identityScore < 60 && aestheticMatchedId) {
    return selectAestheticRedirect(sourceMaterialId, aestheticMatchedId, brand);
  }

  return null;
}
