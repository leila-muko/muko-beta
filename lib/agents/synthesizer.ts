// lib/agents/synthesizer.ts
// Muko Synthesizer Agent — Template Narrative Engine
//
// PURPOSE: Fallback narrative when LLM generation is unavailable.
// Solid enough that a Design Director would not notice the difference in a pinch.
//
// Three score tiers, five modes, all templates grounded in live aesthetic data:
// seen_in, consumer_insight, risk_factors, seasonal_relevance, adjacent_directions.

import type { InsightData, InsightMode } from '@/lib/types/insight';
import type { CommitmentSignal, DecisionGuidance } from '@/lib/types/insight';
import type { ScoreDimensions, ScoreGates } from '@/lib/scoring/types';

// ─────────────────────────────────────────────
// PUBLIC TYPES
// ─────────────────────────────────────────────

/**
 * Subset of the aesthetic JSON entry the narrative engine needs.
 * Callers are responsible for pulling from aesthetics.json.
 */
export interface NarrativeAestheticContext {
  id: string;
  name: string;
  seen_in: string[];
  consumer_insight: string;
  risk_factors: string[];
  /** Record of season key (e.g. "ss26", "fw26") → relevance score 1–5 */
  seasonal_relevance: Record<string, number>;
  /** Ordered list of adjacent aesthetic IDs (e.g. "quiet-structure") */
  adjacent_directions: string[];
}

export interface NarrativeInput {
  /** Overall Muko score 0–100 */
  score: number;
  dimensions: ScoreDimensions;
  gates: ScoreGates;
  mode: InsightMode;
  aesthetic: NarrativeAestheticContext;
  /** cost_range_note from the selected material in materials.json */
  materialCostNote?: string;
  /** Used to say "the brand" or the actual brand name */
  brandName?: string;
  /** Season key matching seasonal_relevance keys, e.g. "ss26", "fw26" */
  season?: string;
}

// ─────────────────────────────────────────────
// INTERNAL CONTEXT — assembled once, passed to range builders
// ─────────────────────────────────────────────

interface NarrativeCtx {
  score: number;
  dimensions: ScoreDimensions;
  mode: InsightMode;
  aesthetic: NarrativeAestheticContext;
  brand: string;
  sLabel: string;
  timing: string;
  risk: string;
  market: string;
  ranked: Array<{ key: string; label: string; score: number }>;
  strongest: { key: string; label: string; score: number };
  weakest: { key: string; label: string; score: number };
  adjacent: string | null;
  costFailed: boolean;
  materialCostNote: string | undefined;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function toSeasonLabel(season?: string): string {
  if (!season) return 'the current window';
  return season.toUpperCase();
}

function toTimingPhrase(relevance: number, label: string): string {
  if (relevance >= 5) return `${label} is the right window — this aesthetic is at its market peak`;
  if (relevance >= 4) return `timing into ${label} is solid`;
  if (relevance >= 3) return `${label} is a workable window, not this aesthetic's peak cycle`;
  if (relevance >= 2) return `${label} timing is soft — this aesthetic peaks in a different cycle`;
  return `${label} is off-cycle for this direction`;
}

function toRiskFactor(factors: string[], costFailed: boolean): string {
  if (factors.length === 0) return 'margin pressure at this price tier';
  if (costFailed) {
    const match = factors.find(f => /cost|cogs|price|margin/i.test(f));
    if (match) return match;
  }
  return factors[0];
}

function rankDimensions(d: ScoreDimensions): Array<{ key: string; label: string; score: number }> {
  return [
    { key: 'identity', label: 'Identity', score: d.identity_score },
    { key: 'resonance', label: 'Resonance', score: d.resonance_score },
    { key: 'execution', label: 'Execution', score: d.execution_score },
  ].sort((a, b) => b.score - a.score);
}

function toPairLabel(seen: string[]): string {
  if (seen.length === 0) return 'the leading market players';
  if (seen.length === 1) return seen[0];
  return `${seen[0]} and ${seen[1]}`;
}

function toAdjacentLabel(id: string): string {
  return id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Lowercase the first character of a string */
function lc(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Uppercase the first character of a string */
function uc(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Pull the first sentence from a longer string */
function firstSentence(s: string): string {
  return s.split('.')[0].trim();
}

function isOpportunityMode(mode: InsightMode): boolean {
  return mode === 'amplify' || mode === 'invest';
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────

/**
 * Generates template-based InsightData from scored dimensions + aesthetic context.
 *
 * Three score tiers drive tone and structure:
 *   HIGH  (75+)  — Confident and forward. Affirm + one tension to watch.
 *   MOD   (50–74)— Calm and diagnostic. Name the trade-off, one direction.
 *   LOW   (<50)  — Direct. What the score reflects, one concrete redirect.
 *
 * Mode adjusts tone within each tier:
 *   amplify / invest → THE OPPORTUNITY framing, build outward
 *   differentiate / constrain → THE EDIT framing, sharpen and hold
 *   reconsider → redirect-aware across all tiers
 */
export function generateTemplateNarrative(input: NarrativeInput): InsightData {
  const { score, dimensions, gates, mode, aesthetic, materialCostNote, brandName, season } = input;

  const sLabel = toSeasonLabel(season);
  const sKey = (season ?? '').toLowerCase();
  const sRelevance = aesthetic.seasonal_relevance[sKey] ?? 3;
  const ranked = rankDimensions(dimensions);

  const ctx: NarrativeCtx = {
    score,
    dimensions,
    mode,
    aesthetic,
    brand: brandName ?? 'the brand',
    sLabel,
    timing: toTimingPhrase(sRelevance, sLabel),
    risk: toRiskFactor(aesthetic.risk_factors, gates.margin_gate_passed === false),
    market: toPairLabel(aesthetic.seen_in),
    ranked,
    strongest: ranked[0],
    weakest: ranked[ranked.length - 1],
    adjacent:
      aesthetic.adjacent_directions.length > 0
        ? toAdjacentLabel(aesthetic.adjacent_directions[0])
        : null,
    costFailed: gates.margin_gate_passed === false,
    materialCostNote,
  };

  const editLabel = isOpportunityMode(mode) ? 'THE OPPORTUNITY' : 'THE EDIT';
  let statements: string[];
  let opportunity: string[];
  let edit: string[];

  if (score >= 75) {
    [statements, opportunity, edit] = buildHigh(ctx);
  } else if (score >= 50) {
    [statements, opportunity, edit] = buildModerate(ctx);
  } else {
    [statements, opportunity, edit] = buildLow(ctx);
  }

  const isPrimaryOpportunity = isOpportunityMode(mode);

  return {
    statements,
    edit: isPrimaryOpportunity ? opportunity : edit,
    editLabel,
    secondary: isPrimaryOpportunity ? edit : opportunity,
    secondaryLabel: isPrimaryOpportunity ? 'THE EDIT' : 'THE OPPORTUNITY',
    mode,
  };
}

export function buildTemplateDecisionGuidance(args: {
  aestheticName: string;
  mode: InsightMode;
  identityScore: number;
  resonanceScore: number;
  executionLevers: string[];
}): DecisionGuidance {
  const { aestheticName, mode, identityScore, resonanceScore, executionLevers } = args;

  let commitmentSignal: CommitmentSignal;
  if (identityScore >= 82 && resonanceScore >= 72) {
    commitmentSignal = 'Increase Investment';
  } else if (mode === 'amplify') {
    commitmentSignal = 'Hero Expression';
  } else if (identityScore >= 70) {
    commitmentSignal = 'Maintain Exposure';
  } else if (mode === 'reconsider') {
    commitmentSignal = 'Reduce Exposure';
  } else {
    commitmentSignal = 'Controlled Test';
  }

  const recommendedDirectionBySignal: Record<CommitmentSignal, string> = {
    'Increase Investment': `Increase assortment weight behind ${aestheticName} while the direction still reads differentiated in-market.`,
    'Hero Expression': `Anchor ${aestheticName} through one disciplined hero expression within the assortment.`,
    'Controlled Test': `Introduce ${aestheticName} through a tightly controlled piece-level test that protects assortment clarity.`,
    'Maintain Exposure': `Maintain exposure to ${aestheticName} through selective reinforcement rather than wider rollout.`,
    'Reduce Exposure': `Reduce exposure to ${aestheticName} unless the line can deliver a sharper point of view.`,
  };

  return {
    recommended_direction: recommendedDirectionBySignal[commitmentSignal],
    commitment_signal: commitmentSignal,
    execution_levers: executionLevers.slice(0, 4),
  };
}

// ─────────────────────────────────────────────
// HIGH (75+)
// Tone: Confident, forward. Affirm + one tension.
// Structure: What's aligned → market timing → one thing to watch.
// ─────────────────────────────────────────────

function buildHigh(ctx: NarrativeCtx): [string[], string[], string[]] {
  const { score, dimensions, mode, aesthetic, brand, sLabel, timing, risk, market, strongest, weakest, adjacent } = ctx;

  let s1: string;
  let s3: string;
  let opportunity: string[];
  let edit: string[];

  // s2 is the same across all modes — market timing is the factual anchor
  const s2 = `${market} are running adjacent territory for ${sLabel}, confirming a live consumer appetite for this direction. ${uc(timing)}.`;

  if (mode === 'amplify') {
    s1 = `${aesthetic.name} is landing well for ${brand} — Identity at ${dimensions.identity_score}, Resonance at ${dimensions.resonance_score}, and an overall ${score} signal a design that's aligned and market-ready.`;
    s3 = `The one pressure point worth holding: ${lc(risk)}. Execution at ${dimensions.execution_score} gives room to absorb it — watch construction decisions that could drift the margin story.`;
    opportunity = [
      `${strongest.label} is aligned and the timing is with you — ${sLabel} is a workable window to push further, not play safe.`,
      `${market} are running adjacent territory, not the same lane. First-mover distance is still available.`,
      `${uc(firstSentence(lc(aesthetic.consumer_insight)))} — the consumer case is intact and ascending.`,
    ];
    edit = [
      `Avoid constructions that drift the margin story — Execution at ${dimensions.execution_score} gives room but not unlimited room.`,
      `${lc(risk)} is the pressure point. Watch it as the spec develops.`,
      `Avoid referencing ${market} too directly — the brief should articulate what this version isn't.`,
    ];
  } else if (mode === 'differentiate') {
    s1 = `${aesthetic.name} reads cleanly inside ${brand}'s world — Identity at ${dimensions.identity_score} and Resonance at ${dimensions.resonance_score} confirm the foundation is sound. The differentiation question is how specific the execution gets.`;
    s3 = `${weakest.label} at ${weakest.score} is the sharpening point. ${market} are working this aesthetic at scale — the brand's signature lives in the specific decisions they're not making.`;
    opportunity = [
      `${strongest.label} at ${strongest.score} is a strong foundation — the differentiation work starts from a position of strength.`,
      `${market} are already validating the consumer appetite. The window exists; the question is what ${brand} does that they don't.`,
      `${uc(firstSentence(lc(aesthetic.consumer_insight)))} — this insight is the signal to build the brand's specific angle around.`,
    ];
    edit = [
      `Reference ${market} as competitive markers, not inspiration — the brief should articulate what this version isn't.`,
      `${weakest.label} at ${weakest.score} is where ${brand}'s signature either lands or gets lost. Tighten the specific constructions here.`,
      `Avoid diluting ${strongest.label} at ${strongest.score} — everything downstream should build from it.`,
    ];
  } else if (mode === 'reconsider') {
    s1 = `${aesthetic.name} is scoring well for ${brand} — Identity at ${dimensions.identity_score} and Resonance at ${dimensions.resonance_score} are both above threshold. The metrics support this direction.`;
    s3 = adjacent
      ? `If the direction is still under review, ${adjacent} works the same consumer profile with less market saturation — a closer first-mover position.`
      : `The risk of a pivot here is losing timing advantage in a window that's reading well. The score supports moving forward.`;
    opportunity = [
      `${strongest.label} at ${strongest.score} is the hardest alignment signal to rebuild on a pivot — it's working now.`,
      `${uc(timing)} — the market window is aligned with this direction.`,
      `${uc(firstSentence(lc(aesthetic.consumer_insight)))} — the consumer case is solid and the score reflects it.`,
    ];
    edit = [
      `The commercial case is solid. If there is tension, it is in execution — not in the direction itself.`,
      adjacent
        ? `${adjacent} is the available redirect if the concern is specifically about market differentiation.`
        : `Avoid a full pivot before isolating the specific lever pulling ${weakest.label} to ${weakest.score}.`,
      `${weakest.label} at ${weakest.score} is the most actionable tension — address it directly rather than reconsidering the whole direction.`,
    ];
  } else if (mode === 'invest') {
    s1 = `${aesthetic.name} is holding at ${score} — material and construction decisions are supporting the identity rather than working against it. Identity ${dimensions.identity_score}, Resonance ${dimensions.resonance_score}.`;
    s3 = `Execution at ${dimensions.execution_score} confirms the production window supports committing to the full construction spec. ${uc(lc(risk))} is the one cost exposure to confirm before locking.`;
    opportunity = [
      `The margin gate is clear — the score supports committing to the full construction tier, not hedging to the one below it.`,
      `${strongest.label} at ${strongest.score} is the commercial story. The investment case is grounded in a live consumer signal.`,
      `${uc(timing)} — the timing window is aligned with this spec, which strengthens the investment logic.`,
    ];
    edit = [
      `Avoid the construction tier below what the score supports — that's where margin protection becomes margin erosion.`,
      `${lc(risk)} is the remaining cost exposure. Confirm sourcing terms before full commitment.`,
      `${weakest.label} at ${weakest.score} is the watch point. Confirm it holds as construction decisions get locked.`,
    ];
  } else {
    // constrain
    s1 = `${aesthetic.name} is well-positioned at ${score}. ${strongest.label} at ${strongest.score} is working and that's the dimension to protect as the spec develops.`;
    s3 = `${weakest.label} at ${weakest.score} is the constraint boundary. Hold to the executions that earned the Identity score rather than expanding the direction.`;
    opportunity = [
      `${strongest.label} at ${strongest.score} is the asset — the brief is strong because of this signal, not despite the constraints.`,
      `${uc(timing)} — holding the direction through this window is the right read.`,
      `${market} are over-investing in this aesthetic. Restraint is a differentiation signal in this moment.`,
    ];
    edit = [
      `Hold construction complexity at the level that earned the ${score}. Any additions need to justify against the Execution score, not just the brief.`,
      `Avoid decisions that dilute ${strongest.label} at ${strongest.score} — protect what's working.`,
      `${weakest.label} at ${weakest.score} is the constraint boundary. Expanding beyond it risks the Identity alignment.`,
    ];
  }

  return [[s1, s2, s3], opportunity, edit];
}

// ─────────────────────────────────────────────
// MODERATE (50–74)
// Tone: Calm, diagnostic. A consultant naming trade-offs, not marking errors.
// Structure: What's strong → what's creating drag → one concrete direction.
// ─────────────────────────────────────────────

function buildModerate(ctx: NarrativeCtx): [string[], string[], string[]] {
  const { score, dimensions, mode, aesthetic, brand, sLabel, timing, risk, market, strongest, weakest, adjacent, costFailed, materialCostNote } = ctx;

  const s1 = `${aesthetic.name} has a solid foundation for ${brand} — ${strongest.label} at ${strongest.score} is contributing, and the ${score} overall reflects a direction that's commercially viable with focused execution.`;

  let s2: string;
  if (costFailed && materialCostNote) {
    s2 = `${weakest.label} at ${weakest.score} is creating the most drag, and the cost gate is amplifying it — material at ${materialCostNote} is pushing COGS past the margin threshold.`;
  } else if (costFailed) {
    s2 = `${weakest.label} at ${weakest.score} is where the design is losing ground, and the cost gate is compounding the impact. ${uc(lc(risk))}.`;
  } else {
    s2 = `${weakest.label} at ${weakest.score} is where the design is losing ground — ${lc(risk)}.`;
  }

  let s3: string;
  let opportunity: string[];
  let edit: string[];

  if (mode === 'amplify' || mode === 'invest') {
    s3 = `The path to a stronger score runs through ${weakest.label}. The aesthetic signals are right — the gap is closeable without changing direction.`;
    opportunity = [
      `${strongest.label} at ${strongest.score} is the foundation — the consumer case is intact and the direction is right.`,
      `${uc(firstSentence(lc(aesthetic.consumer_insight)))} — this consumer signal is working in your favour.`,
      `${market} are the current market proof. Getting ${strongest.label} ahead of their position is the specific opportunity.`,
    ];
    edit = [
      `${weakest.label} is the addressable gap — focus on the specific decisions that move this number.`,
      `Avoid broadening the direction before closing the ${weakest.label} gap — the issue is execution, not the aesthetic.`,
      `${lc(risk)} is what the score is reflecting. Isolate it before expanding the spec.`,
    ];
  } else if (mode === 'reconsider') {
    s3 = adjacent
      ? `${adjacent} works the same consumer moment with a tighter alignment profile — worth comparing the two before the next milestone.`
      : `The drag on ${weakest.label} is the primary addressable issue. Resolving it directly is faster than reconsidering the full direction.`;
    opportunity = [
      `${strongest.label} at ${strongest.score} is the anchor — this dimension is working and would be preserved through a focused fix.`,
      `${uc(timing)} — the market window is still open, which means there is time to close the gap rather than pivot.`,
      adjacent
        ? `${adjacent} is worth a comparison — same consumer moment, tighter alignment profile.`
        : `${uc(firstSentence(lc(aesthetic.consumer_insight)))} — the consumer case is intact even if the ${weakest.label} gap needs closing.`,
    ];
    edit = [
      adjacent
        ? `${adjacent} is the most natural redirect — same timing window, closer alignment profile.`
        : `Avoid reconsidering the full direction before isolating the ${weakest.label} decisions specifically.`,
      `The ${score} reflects a real trade-off, not a fundamental misalignment — identify the two or three decisions driving ${weakest.label} down.`,
      `${weakest.label} at ${weakest.score} is the drag point. Resolve it before triggering a wider review.`,
    ];
  } else {
    // differentiate or constrain
    s3 = adjacent
      ? `${adjacent} offers a sharper brand angle on the same consumer — the ${score} doesn't require a pivot, but it rewards precision.`
      : `The ${score} is a signal to tighten, not to rebuild. Apply pressure to ${weakest.label} before the direction drifts.`;
    opportunity = [
      `${strongest.label} at ${strongest.score} is the story — it's working and it's the brand's differentiating signal in this aesthetic.`,
      `${uc(timing)} — the timing window is still open, which means the ${score} is improvable before delivery.`,
      adjacent
        ? `${adjacent} is the adjacent angle if more precision is needed — same consumer, sharper brand fit.`
        : `${uc(firstSentence(lc(aesthetic.consumer_insight)))} — the consumer logic is sound, the constraint is in execution.`,
    ];
    edit = [
      `${weakest.label} at ${weakest.score} — address the specific decisions pulling this down rather than adjusting the whole direction.`,
      `Avoid additions that don't reinforce ${strongest.label} at ${strongest.score}. That's where the score lives.`,
      adjacent
        ? `${adjacent} sharpens the brand angle if more differentiation is needed — same consumer fit, tighter execution focus.`
        : `Hold the constructions that earned the Identity alignment. Edit what's creating ${weakest.label} pressure.`,
    ];
  }

  return [[s1, s2, s3], opportunity, edit];
}

// ─────────────────────────────────────────────
// LOW (<50)
// Tone: Direct but not punishing. Frame around what to do, not what went wrong.
// Structure: What the score reflects → why it matters commercially → one redirect.
// ─────────────────────────────────────────────

function buildLow(ctx: NarrativeCtx): [string[], string[], string[]] {
  const { score, dimensions, mode, aesthetic, brand, strongest, weakest, adjacent } = ctx;

  let s1: string;
  if (weakest.key === 'identity') {
    s1 = `The ${score} reflects a gap between ${aesthetic.name} and ${brand}'s established signals — Identity at ${dimensions.identity_score} means the aesthetic isn't reading inside the brand's world yet.`;
  } else if (weakest.key === 'resonance') {
    s1 = `The ${score} is being driven down by market timing — Resonance at ${dimensions.resonance_score} signals that ${aesthetic.name} is entering a saturated or off-cycle moment.`;
  } else {
    s1 = `The ${score} reflects a production constraint before a creative one — Execution at ${dimensions.execution_score} means the current spec isn't viable within the delivery window.`;
  }

  const consumerOpen = firstSentence(lc(aesthetic.consumer_insight));
  const s2 = `${uc(consumerOpen)} — that consumer is reachable. ${aesthetic.name} at the current spec is creating the barrier, not the direction itself.`;

  let s3: string;
  if (adjacent) {
    s3 =
      mode === 'reconsider'
        ? `${adjacent} addresses the same consumer moment with a fundamentally stronger alignment profile for ${brand}. This is the specific redirect worth reviewing before the next development milestone.`
        : `${adjacent} is the clearest redirect — same consumer signal, tighter fit to ${brand}'s execution range and identity.`;
  } else {
    s3 = `Identify the two or three specific decisions pulling ${weakest.label} to ${weakest.score} — those are the repair points. Rebuilding the direction before isolating them loses more time than it saves.`;
  }

  const opportunity: string[] = [
    `${strongest.label} at ${strongest.score} is the thing to preserve through any rework — it's the one dimension that's holding.`,
    adjacent
      ? `${adjacent} keeps ${strongest.label} intact while resolving the ${weakest.label} problem — the consumer case transfers.`
      : `${uc(firstSentence(lc(aesthetic.consumer_insight)))} — the consumer signal is intact, the spec is the barrier.`,
    `The concept signal is intact. ${weakest.label} is the specific constraint — isolating it keeps the review focused.`,
  ];

  const edit: string[] = [
    `${weakest.label} at ${weakest.score} is the constraint. Identify the specific executions pulling it down before rebuilding the direction.`,
    adjacent
      ? `Avoid reconstructing the brief from scratch — ${adjacent} is the redirect that preserves the commercial logic.`
      : `${weakest.label} is the one dimension to address. The brief itself does not need to change.`,
    `The brief needs to address why ${aesthetic.name} is creating ${'AEIOUaeiou'.includes(weakest.label[0]) ? 'an' : 'a'} ${weakest.label} problem for ${brand} specifically. That answer shapes what comes next.`,
  ];

  return [[s1, s2, s3], opportunity, edit];
}
