// /lib/agents/critic.ts
// Muko Critic Agent — Hybrid Brand Alignment Scoring
// Agent Version: 1.1.0
//
// PURPOSE: Scores how well an aesthetic direction aligns with a brand's identity.
// Powers the Identity Pulse in Concept Studio (Step 2).
//
// TWO-TIER LOGIC:
//   Tier 1: Keyword matching (fast, free, deterministic) — handles ~80% of cases
//   Tier 2: LLM vibe check (semantic, nuanced) — fires only when needed
//
// WHEN LLM FIRES:
//   1. Conflict detected AND brand has tension_context (needs nuanced interpretation)
//   2. Zero keyword overlap AND zero conflict (ambiguous, can't score without reasoning)
//
// NEW IN v1.1.0:
//   - excluded_brands penalty (-20 per brand match in seen_in[], cap -40)
//   - reference_brands boost (+10 per brand match in seen_in[], cap +20)
//   - brand_description passed to LLM for richer semantic context
//   - keyword_weights: Silhouette/Form 0.5, Mood/Attitude 0.3, Surface/Material 0.2

import { callClaude, parseJSONResponse } from '@/lib/claude/client';
import conflictData from '@/data/conflicts.json';
import aestheticsRaw from '@/data/aesthetics.json';
import keywordsData from '@/data/keywords.json';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type PulseStatus = 'green' | 'yellow' | 'red';

export interface BrandProfile {
  id: string;
  keywords: string[];
  tension_context: string | null;
  accepts_conflicts: boolean;
  price_tier: 'Contemporary' | 'Bridge' | 'Luxury';
  target_margin: number;
  // v1.1 additions
  brand_description?: string | null;
  reference_brands?: string[];
  excluded_brands?: string[];
  excluded_aesthetics?: string[];
}

export interface CriticInput {
  aesthetic_id?: string;         // e.g. "terrain-luxe" — used for exclusion check
  aesthetic_keywords: string[];
  aesthetic_name: string;
  brand: BrandProfile;
}

export interface CriticResult {
  alignment_score: number;         // 0-100
  status: PulseStatus;             // green/yellow/red
  message: string;                 // 1-sentence display message for the pulse pill
  overlap_count: number;           // number of shared keywords (weighted)
  conflict_detected: boolean;      // whether a conflict pair was triggered
  conflict_ids: string[];          // which conflict pairs fired (for audit)
  llm_used: boolean;               // whether LLM tier was invoked
  reasoning: string;               // internal reasoning (for logging/debugging)
  agent_version: string;           // traceability
  flag?: 'excluded_by_brand' | null; // v1.1: set when aesthetic is in excluded_aesthetics
}

interface ConflictPair {
  id: string;
  keyword_a: string;
  keyword_b: string;
  tension_type: string;
  severity: 'hard' | 'soft';
  description: string;
}

interface LLMVibeResult {
  alignment_score: number;
  status: PulseStatus;
  message: string;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

export const CRITIC_AGENT_VERSION = '1.1.0';

// Score thresholds
const SCORE_GREEN_MIN = 70;
const SCORE_YELLOW_MIN = 40;

// Overlap scoring (based on weighted overlap, not raw count)
const SCORE_HIGH_OVERLAP = 90;    // weighted ≥ 1.5
const SCORE_MED_OVERLAP = 75;     // weighted ≥ 0.8
const SCORE_LOW_OVERLAP = 60;     // weighted > 0
const SCORE_NO_OVERLAP = 40;      // 0 weighted overlap, no conflict
const SCORE_HARD_CONFLICT = 25;   // hard conflict, no tension context
const SCORE_SOFT_CONFLICT = 45;   // soft conflict, no tension context

// Tension keyword penalty (from aesthetic's tension_keywords[] vs brand DNA)
const TENSION_PENALTY_PER_HIT = 20;
const TENSION_PENALTY_MAX = 40;

// v1.1: Excluded / reference brand adjustments
const EXCLUDED_BRAND_PENALTY_PER_HIT = 20;
const EXCLUDED_BRAND_PENALTY_MAX = 40;
const REFERENCE_BRAND_BOOST_PER_HIT = 10;
const REFERENCE_BRAND_BOOST_MAX = 20;

// Fallback when LLM fails
const FALLBACK_RESULT: LLMVibeResult = {
  alignment_score: 50,
  status: 'yellow',
  message: 'Brand alignment needs review',
};

// ─────────────────────────────────────────────
// KEYWORD WEIGHT MAP (v1.1)
// ─────────────────────────────────────────────

const KEYWORD_WEIGHTS: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (const kw of (keywordsData.silhouette_form ?? [])) {
    map[kw.toLowerCase()] = 0.5;
  }
  for (const kw of (keywordsData.mood_attitude ?? [])) {
    map[kw.toLowerCase()] = 0.3;
  }
  for (const kw of (keywordsData.surface_material ?? [])) {
    map[kw.toLowerCase()] = 0.2;
  }
  return map;
})();

/**
 * Returns weighted overlap count for a set of overlapping keywords.
 * Keywords not in KEYWORD_WEIGHTS default to a weight of 0.3 (mood-tier).
 */
function weightedOverlap(overlappingKeywords: string[]): number {
  return overlappingKeywords.reduce((sum, kw) => {
    return sum + (KEYWORD_WEIGHTS[kw.toLowerCase()] ?? 0.3);
  }, 0);
}

// ─────────────────────────────────────────────
// TENSION KEYWORD LOOKUP
// ─────────────────────────────────────────────

interface AestheticEntry {
  id: string;
  name: string;
  tension_keywords?: string[];
  seen_in?: string[];
}

const aesthetics = aestheticsRaw as unknown as AestheticEntry[];

function computeTensionPenalty(aestheticName: string, brandKws: string[]): number {
  const entry = aesthetics.find(
    (a) =>
      a.name.toLowerCase() === aestheticName.toLowerCase() ||
      a.id === aestheticName.toLowerCase().replace(/\s+/g, '-')
  );
  if (!entry?.tension_keywords?.length) return 0;

  const tensionKws = entry.tension_keywords.map((k) => k.toLowerCase().trim());
  const hits = brandKws.filter((k) => tensionKws.includes(k.toLowerCase().trim())).length;
  if (hits === 0) return 0;

  return Math.min(hits * TENSION_PENALTY_PER_HIT, TENSION_PENALTY_MAX);
}

// ─────────────────────────────────────────────
// v1.1: BRAND REFERENCE SIGNALS
// ─────────────────────────────────────────────

/**
 * Cross-references brand's excluded_brands[] against aesthetic's seen_in[].
 * Returns the penalty to apply (0 if no match).
 */
function computeExcludedBrandPenalty(
  aestheticName: string,
  excludedBrands: string[]
): number {
  if (!excludedBrands.length) return 0;

  const entry = aesthetics.find(
    (a) =>
      a.name.toLowerCase() === aestheticName.toLowerCase() ||
      a.id === aestheticName.toLowerCase().replace(/\s+/g, '-')
  );
  if (!entry?.seen_in?.length) return 0;

  const seenInLower = entry.seen_in.map((b) => b.toLowerCase().trim());
  const hits = excludedBrands.filter((b) =>
    seenInLower.includes(b.toLowerCase().trim())
  ).length;

  if (hits === 0) return 0;
  return Math.min(hits * EXCLUDED_BRAND_PENALTY_PER_HIT, EXCLUDED_BRAND_PENALTY_MAX);
}

/**
 * Cross-references brand's reference_brands[] against aesthetic's seen_in[].
 * Returns the boost to apply (0 if no match).
 */
function computeReferenceBrandBoost(
  aestheticName: string,
  referenceBrands: string[]
): number {
  if (!referenceBrands.length) return 0;

  const entry = aesthetics.find(
    (a) =>
      a.name.toLowerCase() === aestheticName.toLowerCase() ||
      a.id === aestheticName.toLowerCase().replace(/\s+/g, '-')
  );
  if (!entry?.seen_in?.length) return 0;

  const seenInLower = entry.seen_in.map((b) => b.toLowerCase().trim());
  const hits = referenceBrands.filter((b) =>
    seenInLower.includes(b.toLowerCase().trim())
  ).length;

  if (hits === 0) return 0;
  return Math.min(hits * REFERENCE_BRAND_BOOST_PER_HIT, REFERENCE_BRAND_BOOST_MAX);
}

// ─────────────────────────────────────────────
// MAIN FUNCTION: checkBrandAlignment()
// ─────────────────────────────────────────────

/**
 * Scores aesthetic-brand alignment using a two-tier hybrid approach.
 *
 * @param input - aesthetic keywords, aesthetic name, optional aesthetic_id, and full brand profile
 * @returns CriticResult with score, status, message, and audit metadata
 */
export async function checkBrandAlignment(input: CriticInput): Promise<CriticResult> {
  const { aesthetic_keywords, aesthetic_name, brand } = input;

  // Normalize keywords to lowercase for consistent matching
  const aestheticKws = aesthetic_keywords.map((k) => k.toLowerCase().trim());
  const brandKws = brand.keywords.map((k) => k.toLowerCase().trim());
  const conflicts: ConflictPair[] = conflictData.conflict_pairs as ConflictPair[];

  // ── STEP 1A: WEIGHTED KEYWORD OVERLAP ──
  const overlappingKeywords = aestheticKws.filter((k) => brandKws.includes(k));
  const overlapCount = overlappingKeywords.length;
  const weightedOverlapScore = weightedOverlap(overlappingKeywords);

  // ── STEP 1B: CONFLICT DETECTION ──
  const triggeredConflicts = detectConflicts(aestheticKws, brandKws, conflicts);
  const conflictDetected = triggeredConflicts.length > 0;
  const hardConflictDetected = triggeredConflicts.some((c) => c.severity === 'hard');

  // ── v1.1: BRAND REFERENCE SIGNALS ────────────────────────────────────
  const excludedBrandPenalty = computeExcludedBrandPenalty(
    aesthetic_name,
    brand.excluded_brands ?? []
  );
  const referenceBrandBoost = computeReferenceBrandBoost(
    aesthetic_name,
    brand.reference_brands ?? []
  );

  const brandReferenceReasoning: string[] = [];
  if (excludedBrandPenalty > 0) {
    brandReferenceReasoning.push(
      `Brand exclusion penalty: -${excludedBrandPenalty} (excluded brand(s) seen in this aesthetic's seen_in[]).`
    );
  }
  if (referenceBrandBoost > 0) {
    brandReferenceReasoning.push(
      `Reference brand boost: +${referenceBrandBoost} (admired brand(s) seen in this aesthetic's seen_in[]).`
    );
  }

  // ── ROUTING LOGIC ──

  // ROUTE A: Conflict exists + brand has tension_context → LLM
  if (conflictDetected && brand.tension_context) {
    const llmResult = await runLLMVibeCheck({
      aesthetic_keywords,
      aesthetic_name,
      brand_keywords: brand.keywords,
      brand_description: brand.brand_description ?? null,
      reference_brands: brand.reference_brands ?? [],
      tension_context: brand.tension_context,
      conflict_descriptions: triggeredConflicts.map((c) => c.description),
    });

    const adjustedScore = Math.max(
      0,
      Math.min(100, llmResult.alignment_score - excludedBrandPenalty + referenceBrandBoost)
    );

    return buildResult({
      score: adjustedScore,
      status: scoreToStatus(adjustedScore),
      message: llmResult.message,
      overlapCount,
      conflictDetected,
      conflictIds: triggeredConflicts.map((c) => c.id),
      llmUsed: true,
      reasoning: `Conflict detected (${triggeredConflicts.map((c) => c.id).join(', ')}), brand has tension_context: "${brand.tension_context}". Routed to LLM. ${brandReferenceReasoning.join(' ')}`,
    });
  }

  // ROUTE B: Hard conflict, no tension context → hard fail, deterministic
  if (hardConflictDetected && !brand.tension_context) {
    const penalizedScore = Math.max(
      0,
      SCORE_HARD_CONFLICT - excludedBrandPenalty + referenceBrandBoost
    );
    return buildResult({
      score: penalizedScore,
      status: 'red',
      message: buildConflictMessage(triggeredConflicts, brand.keywords),
      overlapCount,
      conflictDetected: true,
      conflictIds: triggeredConflicts.map((c) => c.id),
      llmUsed: false,
      reasoning: `Hard conflict detected: ${triggeredConflicts.map((c) => `${c.keyword_a}↔${c.keyword_b}`).join(', ')}. No tension_context. ${brandReferenceReasoning.join(' ')}`,
    });
  }

  // ROUTE C: Soft conflict only, no tension context → penalized yellow, deterministic
  if (conflictDetected && !hardConflictDetected && !brand.tension_context) {
    const penalizedScore = Math.max(
      0,
      Math.min(100, SCORE_SOFT_CONFLICT - excludedBrandPenalty + referenceBrandBoost)
    );
    return buildResult({
      score: penalizedScore,
      status: scoreToStatus(penalizedScore),
      message: `Some tension detected — ${buildConflictMessage(triggeredConflicts, brand.keywords)}`,
      overlapCount,
      conflictDetected: true,
      conflictIds: triggeredConflicts.map((c) => c.id),
      llmUsed: false,
      reasoning: `Soft conflict only: ${triggeredConflicts.map((c) => `${c.keyword_a}↔${c.keyword_b}`).join(', ')}. No tension_context. ${brandReferenceReasoning.join(' ')}`,
    });
  }

  // Tension penalty: applies in Routes D and E only.
  const tensionPenalty = computeTensionPenalty(aesthetic_name, brandKws);

  // ROUTE D: Zero weighted overlap AND zero conflict → ambiguous, route to LLM
  if (weightedOverlapScore === 0 && !conflictDetected) {
    const llmResult = await runLLMVibeCheck({
      aesthetic_keywords,
      aesthetic_name,
      brand_keywords: brand.keywords,
      brand_description: brand.brand_description ?? null,
      reference_brands: brand.reference_brands ?? [],
      tension_context: null,
      conflict_descriptions: [],
    });

    const penalizedScore = Math.max(
      0,
      Math.min(
        100,
        llmResult.alignment_score - tensionPenalty - excludedBrandPenalty + referenceBrandBoost
      )
    );
    const tensionReasoning =
      tensionPenalty > 0
        ? ` Tension penalty: -${tensionPenalty}.`
        : '';

    return buildResult({
      score: penalizedScore,
      status: scoreToStatus(penalizedScore),
      message: llmResult.message,
      overlapCount,
      conflictDetected: false,
      conflictIds: [],
      llmUsed: true,
      reasoning: `Zero keyword overlap, zero conflict. Routed to LLM.${tensionReasoning} ${brandReferenceReasoning.join(' ')}`,
    });
  }

  // ROUTE E: Standard weighted keyword scoring → deterministic
  const { score, status, message } = scoreByWeightedOverlap(
    weightedOverlapScore,
    overlappingKeywords
  );
  const penalizedScore = Math.max(
    0,
    Math.min(100, score - tensionPenalty - excludedBrandPenalty + referenceBrandBoost)
  );
  const tensionReasoning =
    tensionPenalty > 0
      ? ` Tension penalty: -${tensionPenalty}.`
      : '';

  return buildResult({
    score: penalizedScore,
    status: scoreToStatus(penalizedScore),
    message,
    overlapCount,
    conflictDetected: false,
    conflictIds: [],
    llmUsed: false,
    reasoning: `Weighted overlap: ${weightedOverlapScore.toFixed(2)} from [${overlappingKeywords.join(', ')}]. Scored deterministically.${tensionReasoning} ${brandReferenceReasoning.join(' ')}`,
  });
}

// ─────────────────────────────────────────────
// TIER 2: LLM VIBE CHECK
// ─────────────────────────────────────────────

interface LLMVibeCheckInput {
  aesthetic_keywords: string[];
  aesthetic_name: string;
  brand_keywords: string[];
  brand_description: string | null;  // v1.1
  reference_brands?: string[];       // v1.1
  tension_context: string | null;
  conflict_descriptions: string[];
}

async function runLLMVibeCheck(input: LLMVibeCheckInput): Promise<LLMVibeResult> {
  const {
    aesthetic_keywords,
    aesthetic_name,
    brand_keywords,
    brand_description,
    reference_brands,
    tension_context,
    conflict_descriptions,
  } = input;

  const systemPrompt = `You are a senior fashion brand strategist with 15+ years of experience at houses like The Row, Toteme, and Reformation. You evaluate whether aesthetic directions fit a brand's identity with precision and nuance. You understand that fashion brands often hold intentional tensions (e.g., accessible-luxe, timeless-trendy) and you score for how well the brand can EXECUTE the aesthetic, not just whether the keywords match perfectly.

You always return valid JSON. No preamble. No markdown. No explanation outside the JSON.

NEVER return generic messages like "Brand alignment confirmed", "Strong alignment", or "Good fit". The message must always name specific keywords, qualities, or aesthetic traits that explain the score.
Examples of good messages:
- "Connects through sustainable and feminine — both core to this brand's identity"
- "Strong overlap on Timeless and Minimalist, though Rustic creates minor tension"
- "Artisanal and Ethical directly mirror this brand's craft-forward positioning"`;

  const userMessage = `
Evaluate the brand alignment for this analysis:

AESTHETIC DIRECTION: "${aesthetic_name}"
Aesthetic keywords: [${aesthetic_keywords.join(', ')}]

BRAND PROFILE:
Brand keywords: [${brand_keywords.join(', ')}]
${brand_description ? `Brand description: "${brand_description}"\n` : ''}${reference_brands?.length ? `Admired reference brands (use to infer aesthetic sensibility): ${reference_brands.join(', ')}\n` : ''}${tension_context ? `Brand's stated tension context: "${tension_context}"\n(This means the brand intentionally holds this tension — factor this into your scoring)` : ''}
${conflict_descriptions.length > 0 ? `Detected keyword tensions: ${conflict_descriptions.join('; ')}` : ''}

TASK:
Score how well this aesthetic aligns with this brand's identity. Consider:
1. Semantic and conceptual overlap beyond exact keyword matches
2. Whether the brand's tension_context resolves any detected conflicts
3. Whether the aesthetic can authentically be executed within this brand's world
4. Market positioning fit (implied by the brand keywords)
5. Use the brand description and reference brands as qualitative signal for aesthetic sensibility — infer what these brands share aesthetically and whether this aesthetic fits that world.

Return ONLY this JSON object:
{
  "alignment_score": <integer 0-100>,
  "status": "<green|yellow|red>",
  "message": "<one specific sentence naming the 1-2 keywords or qualities that drive the alignment or tension — never generic phrases like 'Brand alignment confirmed' or 'Strong fit'. Always name what specifically connects or conflicts.>",
  "reasoning": "<2-3 sentences of internal reasoning — what drove the score>"
}

Scoring guide:
- 70-100 → green: Clear alignment, aesthetic fits naturally
- 40-69 → yellow: Possible but needs thoughtful execution
- 0-39 → red: Meaningful tension or mismatch that would undermine the brand
`;

  try {
    const raw = await callClaude(userMessage, {
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 400,
      systemPrompt,
      temperature: 0,
    });

    const parsed = parseJSONResponse<LLMVibeResult & { reasoning?: string }>(raw);

    if (
      typeof parsed.alignment_score !== 'number' ||
      !['green', 'yellow', 'red'].includes(parsed.status) ||
      typeof parsed.message !== 'string'
    ) {
      throw new Error('LLM response failed validation schema check');
    }

    parsed.alignment_score = Math.max(0, Math.min(100, parsed.alignment_score));
    parsed.status = scoreToStatus(parsed.alignment_score);

    return {
      alignment_score: parsed.alignment_score,
      status: parsed.status,
      message: parsed.message,
    };
  } catch (error) {
    console.error('[CriticAgent] LLM vibe check failed, using fallback:', error);
    return FALLBACK_RESULT;
  }
}

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────

function detectConflicts(
  aestheticKws: string[],
  brandKws: string[],
  conflicts: ConflictPair[]
): ConflictPair[] {
  return conflicts.filter((c) => {
    const aLower = c.keyword_a.toLowerCase();
    const bLower = c.keyword_b.toLowerCase();
    return (
      (aestheticKws.includes(aLower) && brandKws.includes(bLower)) ||
      (aestheticKws.includes(bLower) && brandKws.includes(aLower))
    );
  });
}

/**
 * Deterministic scoring based on weighted keyword overlap.
 * Thresholds adjusted to weighted scale:
 *   ≥ 1.5 → high (≈ 3 mood keywords or 2 form keywords)
 *   ≥ 0.8 → medium
 *   > 0   → low
 */
function scoreByWeightedOverlap(
  weightedScore: number,
  overlappingKeywords: string[]
): { score: number; status: PulseStatus; message: string } {
  if (weightedScore >= 1.5) {
    return {
      score: SCORE_HIGH_OVERLAP,
      status: 'green',
      message: `Strong alignment — ${overlappingKeywords.length} shared brand signals`,
    };
  }
  if (weightedScore >= 0.8) {
    return {
      score: SCORE_MED_OVERLAP,
      status: 'green',
      message: `Good alignment — connects through ${overlappingKeywords.slice(0, 2).join(' and ')}`,
    };
  }
  if (weightedScore > 0) {
    return {
      score: SCORE_LOW_OVERLAP,
      status: 'yellow',
      message: `Moderate alignment — one touchpoint: ${overlappingKeywords[0]}`,
    };
  }
  return {
    score: SCORE_NO_OVERLAP,
    status: 'yellow',
    message: 'Unclear connection to brand identity',
  };
}

function buildConflictMessage(conflicts: ConflictPair[], brandKeywords: string[]): string {
  if (conflicts.length === 0) return 'Potential tension detected';

  const first = conflicts[0];
  const brandWord = brandKeywords
    .map((k) => k.toLowerCase())
    .find(
      (k) =>
        k === first.keyword_a.toLowerCase() || k === first.keyword_b.toLowerCase()
    );

  return `Conflicts with brand's ${brandWord || 'core'} identity`;
}

function scoreToStatus(score: number): PulseStatus {
  if (score >= SCORE_GREEN_MIN) return 'green';
  if (score >= SCORE_YELLOW_MIN) return 'yellow';
  return 'red';
}

function buildResult(params: {
  score: number;
  status: PulseStatus;
  message: string;
  overlapCount: number;
  conflictDetected: boolean;
  conflictIds: string[];
  llmUsed: boolean;
  reasoning: string;
  flag?: 'excluded_by_brand' | null;
}): CriticResult {
  return {
    alignment_score: params.score,
    status: params.status,
    message: params.message,
    overlap_count: params.overlapCount,
    conflict_detected: params.conflictDetected,
    conflict_ids: params.conflictIds,
    llm_used: params.llmUsed,
    reasoning: params.reasoning,
    agent_version: CRITIC_AGENT_VERSION,
    flag: params.flag ?? null,
  };
}
