// /lib/agents/critic.ts
// Muko Critic Agent — Hybrid Brand Alignment Scoring
// Agent Version: 1.0.0
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

import { callClaude, parseJSONResponse } from '@/lib/claude/client';
import conflictData from '@/data/conflicts.json';

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
}

export interface CriticInput {
  aesthetic_keywords: string[];
  aesthetic_name: string;
  brand: BrandProfile;
}

export interface CriticResult {
  alignment_score: number;         // 0-100
  status: PulseStatus;             // green/yellow/red
  message: string;                 // 1-sentence display message for the pulse pill
  overlap_count: number;           // number of shared keywords
  conflict_detected: boolean;      // whether a conflict pair was triggered
  conflict_ids: string[];          // which conflict pairs fired (for audit)
  llm_used: boolean;               // whether LLM tier was invoked
  reasoning: string;               // internal reasoning (for logging/debugging)
  agent_version: string;           // traceability
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

export const CRITIC_AGENT_VERSION = '1.0.0';

// Score thresholds
const SCORE_GREEN_MIN = 70;
const SCORE_YELLOW_MIN = 40;

// Overlap scoring
const SCORE_HIGH_OVERLAP = 90;    // 3+ keyword matches
const SCORE_MED_OVERLAP = 75;     // 2 keyword matches
const SCORE_LOW_OVERLAP = 60;     // 1 keyword match
const SCORE_NO_OVERLAP = 40;      // 0 matches, no conflict
const SCORE_HARD_CONFLICT = 25;   // hard conflict, no tension context
const SCORE_SOFT_CONFLICT = 45;   // soft conflict, no tension context

// Fallback when LLM fails
const FALLBACK_RESULT: LLMVibeResult = {
  alignment_score: 50,
  status: 'yellow',
  message: 'Brand alignment needs review',
};

// ─────────────────────────────────────────────
// MAIN FUNCTION: checkBrandAlignment()
// ─────────────────────────────────────────────

/**
 * Scores aesthetic-brand alignment using a two-tier hybrid approach.
 *
 * @param input - aesthetic keywords, aesthetic name, and full brand profile
 * @returns CriticResult with score, status, message, and audit metadata
 */
export async function checkBrandAlignment(input: CriticInput): Promise<CriticResult> {
  const { aesthetic_keywords, aesthetic_name, brand } = input;

  // Normalize keywords to lowercase for consistent matching
  const aestheticKws = aesthetic_keywords.map(k => k.toLowerCase().trim());
  const brandKws = brand.keywords.map(k => k.toLowerCase().trim());
  const conflicts: ConflictPair[] = conflictData.conflict_pairs as ConflictPair[];

  // ── STEP 1A: KEYWORD OVERLAP ──
  const overlappingKeywords = aestheticKws.filter(k => brandKws.includes(k));
  const overlapCount = overlappingKeywords.length;

  // ── STEP 1B: CONFLICT DETECTION ──
  const triggeredConflicts = detectConflicts(aestheticKws, brandKws, conflicts);
  const conflictDetected = triggeredConflicts.length > 0;
  const hardConflictDetected = triggeredConflicts.some(c => c.severity === 'hard');

  // ── ROUTING LOGIC ──

  // ROUTE A: Conflict exists + brand has tension_context → LLM (brand may intend this tension)
  if (conflictDetected && brand.tension_context) {
    const llmResult = await runLLMVibeCheck({
      aesthetic_keywords,
      aesthetic_name,
      brand_keywords: brand.keywords,
      tension_context: brand.tension_context,
      conflict_descriptions: triggeredConflicts.map(c => c.description),
    });

    return buildResult({
      score: llmResult.alignment_score,
      status: llmResult.status,
      message: llmResult.message,
      overlapCount,
      conflictDetected,
      conflictIds: triggeredConflicts.map(c => c.id),
      llmUsed: true,
      reasoning: `Conflict detected (${triggeredConflicts.map(c => c.id).join(', ')}), brand has tension_context: "${brand.tension_context}". Routed to LLM for nuanced interpretation.`,
    });
  }

  // ROUTE B: Hard conflict, no tension context → hard fail, deterministic
  if (hardConflictDetected && !brand.tension_context) {
    return buildResult({
      score: SCORE_HARD_CONFLICT,
      status: 'red',
      message: buildConflictMessage(triggeredConflicts, brand.keywords),
      overlapCount,
      conflictDetected: true,
      conflictIds: triggeredConflicts.map(c => c.id),
      llmUsed: false,
      reasoning: `Hard conflict detected: ${triggeredConflicts.map(c => `${c.keyword_a}↔${c.keyword_b}`).join(', ')}. No tension_context found. Applying hard fail.`,
    });
  }

  // ROUTE C: Soft conflict only, no tension context → penalized yellow, deterministic
  if (conflictDetected && !hardConflictDetected && !brand.tension_context) {
    return buildResult({
      score: SCORE_SOFT_CONFLICT,
      status: 'yellow',
      message: `Some tension detected — ${buildConflictMessage(triggeredConflicts, brand.keywords)}`,
      overlapCount,
      conflictDetected: true,
      conflictIds: triggeredConflicts.map(c => c.id),
      llmUsed: false,
      reasoning: `Soft conflict only: ${triggeredConflicts.map(c => `${c.keyword_a}↔${c.keyword_b}`).join(', ')}. No tension_context. Scoring as soft tension (yellow).`,
    });
  }

  // ROUTE D: Zero overlap AND zero conflict → ambiguous, route to LLM
  if (overlapCount === 0 && !conflictDetected) {
    const llmResult = await runLLMVibeCheck({
      aesthetic_keywords,
      aesthetic_name,
      brand_keywords: brand.keywords,
      tension_context: null,
      conflict_descriptions: [],
    });

    return buildResult({
      score: llmResult.alignment_score,
      status: llmResult.status,
      message: llmResult.message,
      overlapCount,
      conflictDetected: false,
      conflictIds: [],
      llmUsed: true,
      reasoning: `Zero keyword overlap, zero conflict. Cannot score deterministically. Routed to LLM for semantic vibe assessment.`,
    });
  }

  // ROUTE E: Standard keyword scoring → deterministic
  const { score, status, message } = scoreByOverlap(overlapCount, overlappingKeywords);

  return buildResult({
    score,
    status,
    message,
    overlapCount,
    conflictDetected: false,
    conflictIds: [],
    llmUsed: false,
    reasoning: `${overlapCount} keyword overlap(s): [${overlappingKeywords.join(', ')}]. Scored deterministically.`,
  });
}

// ─────────────────────────────────────────────
// TIER 2: LLM VIBE CHECK
// ─────────────────────────────────────────────

interface LLMVibeCheckInput {
  aesthetic_keywords: string[];
  aesthetic_name: string;
  brand_keywords: string[];
  tension_context: string | null;
  conflict_descriptions: string[];
}

/**
 * Calls Claude to semantically assess aesthetic-brand alignment.
 * Used when keyword logic alone is insufficient for a confident score.
 */
async function runLLMVibeCheck(input: LLMVibeCheckInput): Promise<LLMVibeResult> {
  const {
    aesthetic_keywords,
    aesthetic_name,
    brand_keywords,
    tension_context,
    conflict_descriptions,
  } = input;

  const systemPrompt = `You are a senior fashion brand strategist with 15+ years of experience at houses like The Row, Toteme, and Reformation. You evaluate whether aesthetic directions fit a brand's identity with precision and nuance. You understand that fashion brands often hold intentional tensions (e.g., accessible-luxe, timeless-trendy) and you score for how well the brand can EXECUTE the aesthetic, not just whether the keywords match perfectly.

You always return valid JSON. No preamble. No markdown. No explanation outside the JSON.`;

  const userMessage = `
Evaluate the brand alignment for this analysis:

AESTHETIC DIRECTION: "${aesthetic_name}"
Aesthetic keywords: [${aesthetic_keywords.join(', ')}]

BRAND PROFILE:
Brand keywords: [${brand_keywords.join(', ')}]
${tension_context ? `Brand's stated tension context: "${tension_context}"
(This means the brand intentionally holds this tension — factor this into your scoring)` : ''}
${conflict_descriptions.length > 0 ? `Detected keyword tensions: ${conflict_descriptions.join('; ')}` : ''}

TASK:
Score how well this aesthetic aligns with this brand's identity. Consider:
1. Semantic and conceptual overlap beyond exact keyword matches
2. Whether the brand's tension_context resolves any detected conflicts
3. Whether the aesthetic can authentically be executed within this brand's world
4. Market positioning fit (implied by the brand keywords)

Return ONLY this JSON object:
{
  "alignment_score": <integer 0-100>,
  "status": "<green|yellow|red>",
  "message": "<one concise sentence explaining the alignment, written for a Design Director — specific, not generic>",
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
      temperature: 0.2, // Very low — we want consistency on scoring
    });

    const parsed = parseJSONResponse<LLMVibeResult & { reasoning?: string }>(raw);

    // Validate parsed result
    if (
      typeof parsed.alignment_score !== 'number' ||
      !['green', 'yellow', 'red'].includes(parsed.status) ||
      typeof parsed.message !== 'string'
    ) {
      throw new Error('LLM response failed validation schema check');
    }

    // Clamp score to 0-100
    parsed.alignment_score = Math.max(0, Math.min(100, parsed.alignment_score));

    // Ensure status matches score (guard against LLM inconsistency)
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

/**
 * Detects which conflict pairs are triggered between two keyword sets.
 */
function detectConflicts(
  aestheticKws: string[],
  brandKws: string[],
  conflicts: ConflictPair[]
): ConflictPair[] {
  return conflicts.filter(c => {
    const aLower = c.keyword_a.toLowerCase();
    const bLower = c.keyword_b.toLowerCase();
    return (
      (aestheticKws.includes(aLower) && brandKws.includes(bLower)) ||
      (aestheticKws.includes(bLower) && brandKws.includes(aLower))
    );
  });
}

/**
 * Deterministic scoring based on keyword overlap count.
 */
function scoreByOverlap(
  overlapCount: number,
  overlappingKeywords: string[]
): { score: number; status: PulseStatus; message: string } {
  if (overlapCount >= 3) {
    return {
      score: SCORE_HIGH_OVERLAP,
      status: 'green',
      message: `Strong alignment — ${overlapCount} shared brand signals`,
    };
  }
  if (overlapCount === 2) {
    return {
      score: SCORE_MED_OVERLAP,
      status: 'green',
      message: `Good alignment — connects through ${overlappingKeywords.join(' and ')}`,
    };
  }
  if (overlapCount === 1) {
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

/**
 * Builds a human-readable conflict message for the Pulse pill.
 */
function buildConflictMessage(conflicts: ConflictPair[], brandKeywords: string[]): string {
  if (conflicts.length === 0) return 'Potential tension detected';

  const first = conflicts[0];
  const brandWord = brandKeywords
    .map(k => k.toLowerCase())
    .find(k => k === first.keyword_a.toLowerCase() || k === first.keyword_b.toLowerCase());

  return `Conflicts with brand's ${brandWord || 'core'} identity`;
}

/**
 * Derives PulseStatus from a numeric score.
 * Single source of truth for score → status mapping.
 */
function scoreToStatus(score: number): PulseStatus {
  if (score >= SCORE_GREEN_MIN) return 'green';
  if (score >= SCORE_YELLOW_MIN) return 'yellow';
  return 'red';
}

/**
 * Builds the final CriticResult object.
 */
function buildResult(params: {
  score: number;
  status: PulseStatus;
  message: string;
  overlapCount: number;
  conflictDetected: boolean;
  conflictIds: string[];
  llmUsed: boolean;
  reasoning: string;
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
  };
}
