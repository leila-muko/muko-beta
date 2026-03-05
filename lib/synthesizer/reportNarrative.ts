// lib/synthesizer/reportNarrative.ts
// Generates the 3-paragraph narrative for the Standard Report surface.
//
// Fires when: all agents complete, "Run Muko Analysis" resolves
// Persona: The Verdict — strategic judgment between creative instinct and commercial reality
//
// Output: plain text, 3 paragraphs → statements[0..2]
// edit[]: deterministic guardrails derived from redirects + scores
// Fallback: generateTemplateNarrative (template engine, never throws)

import Anthropic from '@anthropic-ai/sdk';
import type { InsightData, InsightMode } from '@/lib/types/insight';
import type { AestheticContext, ResolvedRedirects } from '@/lib/synthesizer/blackboard';
import { generateTemplateNarrative } from '@/lib/agents/synthesizer';
import type { NarrativeAestheticContext } from '@/lib/agents/synthesizer';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface ReportBlackboard {
  /** Resolved aesthetic ID (e.g. "terrain-luxe") */
  aesthetic_matched_id: string;
  /** True when the aesthetic is a proxy/fallback match */
  is_proxy_match: boolean;
  /** Brand DNA keywords from the designer's brief */
  brand_keywords: string[];
  /** Identity score 0–100 */
  identity_score: number;
  /** Resonance score 0–100 */
  resonance_score: number;
  /** Execution score 0–100 */
  execution_score: number;
  /** Overall Muko score 0–100 */
  overall_score: number;
  /** Season key, e.g. "fw26" */
  season?: string;
  /** Brand name for narrative personalization */
  brand_name?: string;
  /** Tension context string from brand_profiles (e.g. "trend-aware-classics") */
  tension_context?: string;
  /** Resolved aesthetic context from aesthetics.json */
  aesthetic_context: AestheticContext;
  /** Selected material ID */
  material_id: string;
  /** Calculated COGS in USD */
  cogs_usd: number;
  /** Designer's target MSRP in USD */
  target_msrp: number;
  /** True when margin gate passes */
  margin_pass: boolean;
  /** Selected construction tier label */
  construction_tier: string;
  /** Predicted production timeline in weeks */
  timeline_weeks: number;
  /** cost_range_note from the selected material */
  material_cost_note?: string;
  /** Collection role from intent stage */
  collection_role?: 'hero' | 'directional' | 'core-evolution' | 'volume-driver' | null;
  /** The intent mode set by the designer (amplify / differentiate / reconsider / invest / constrain) */
  intent_mode?: InsightMode;
  /** Product category (e.g. "Tops", "Outerwear") */
  category?: string;
  /** Silhouette selection */
  silhouette?: string;
  /** Human-readable material name */
  material_name?: string;
  /** Brand target margin as a decimal (e.g. 0.60) */
  target_margin?: number;
  /** Both resolved redirects */
  resolved_redirects: ResolvedRedirects;
}

export interface SynthesizerResult {
  data: InsightData;
  meta: { method: 'llm' | 'template'; latency_ms: number };
}

// ─────────────────────────────────────────────
// COMPUTED REPORT DATA (deterministic)
// Derived entirely from the blackboard — no LLM.
// ─────────────────────────────────────────────

export interface ReportComputedData {
  overallScore: number;
  /** Brand alignment sub-score (= identity_score) */
  brandFit: number;
  /** Market demand sub-score (= resonance_score) */
  demand: number;
  /** Whitespace score: inverted saturation_score */
  saturation: number;
  /** Margin health score */
  margin: number;
  /** Cost viability score */
  cost: number;
  /** Timeline score: shorter is better */
  timeline: number;
  /** COGS in USD */
  cogs: number;
  /** Max cost ceiling for target margin */
  ceiling: number;
  /** Projected margin % */
  projectedMargin: number;
  /** Target margin decimal (default 0.60) */
  targetMargin: number;
  costGatePassed: boolean;
  considerations: Array<{ title: string; detail: string; dimension: 'identity' | 'resonance' | 'execution' }>;
  actions: Array<{ title: string; detail: string; tags: string[] }>;
  redirect: { label: string; savings?: string; detail: string } | null;
}

export interface ReportSynthesizerResult {
  data: InsightData;
  computed: ReportComputedData;
  meta: { method: 'llm' | 'template'; latency_ms: number };
}

function titleCase(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function computeReportData(bb: ReportBlackboard): ReportComputedData {
  const TARGET_MARGIN = bb.target_margin ?? 0.60;
  const ceiling = bb.target_msrp > 0 ? Math.round(bb.target_msrp * (1 - TARGET_MARGIN)) : 0;
  const headroom = ceiling - bb.cogs_usd;

  // Radar sub-scores
  const brandFit = bb.identity_score;
  const demand   = bb.resonance_score;
  const saturation = Math.min(95, Math.max(20,
    Math.round((1 - (bb.aesthetic_context.saturation_score ?? 0.5)) * 100)
  ));
  const marginScore = ceiling > 0
    ? Math.min(95, Math.max(20, Math.round(bb.margin_pass
        ? 72 + (headroom / ceiling) * 30
        : 55 - ((bb.cogs_usd - ceiling) / ceiling) * 40)))
    : 70;
  const costScore = ceiling > 0
    ? Math.min(95, Math.max(20, Math.round(bb.margin_pass
        ? 75 + (headroom / ceiling) * 25
        : 55 - ((bb.cogs_usd - ceiling) / ceiling) * 40)))
    : 70;
  const timelineScore = Math.min(95, Math.max(30,
    Math.round(100 - (bb.timeline_weeks - 8) * 3)
  ));
  const projectedMargin = bb.target_msrp > 0
    ? Math.round(((bb.target_msrp - bb.cogs_usd) / bb.target_msrp) * 1000) / 10
    : 0;

  // Considerations — derived from real signals
  const considerations: ReportComputedData['considerations'] = [];

  if (!bb.margin_pass && bb.target_msrp > 0) {
    const gap = Math.abs(Math.round(bb.cogs_usd - ceiling));
    considerations.push({
      title: 'Cost ceiling exceeded',
      detail: `COGS of $${bb.cogs_usd.toFixed(0)} exceeds the $${ceiling} ceiling for your $${bb.target_msrp} MSRP at ${Math.round(TARGET_MARGIN * 100)}% margin. A $${gap}/unit reduction is needed.`,
      dimension: 'execution',
    });
  }

  if (bb.timeline_weeks > 18) {
    considerations.push({
      title: `${bb.timeline_weeks}-week production timeline`,
      detail: `${titleCase(bb.construction_tier)} construction at this scale creates scheduling pressure. Confirm sourcing commitments early to protect your season window.`,
      dimension: 'execution',
    });
  } else if (bb.execution_score < 70 && considerations.length === 0) {
    considerations.push({
      title: 'Execution complexity needs attention',
      detail: 'The current construction approach leaves limited buffer in the production timeline. Simplifying one element — material or tier — would reduce this risk.',
      dimension: 'execution',
    });
  }

  if (bb.aesthetic_context.saturation_score != null && bb.aesthetic_context.saturation_score > 0.60) {
    const satPct = Math.round(bb.aesthetic_context.saturation_score * 100);
    considerations.push({
      title: `${titleCase(bb.aesthetic_matched_id)} at ${satPct}% saturation`,
      detail: `Market penetration is elevated. Differentiation through material or silhouette edit will be critical to avoid direct overlap with adjacent market positions.`,
      dimension: 'resonance',
    });
  } else if (bb.resonance_score < 65) {
    considerations.push({
      title: 'Resonance below threshold',
      detail: 'Current market signal for this direction is moderate. Validate consumer appetite before expanding the collection role.',
      dimension: 'resonance',
    });
  }

  if (considerations.length < 3 && bb.identity_score < 75) {
    considerations.push({
      title: 'Identity signal needs sharpening',
      detail: 'Brand alignment is below the target threshold. Tightening the aesthetic direction or adding a differentiating chip would strengthen the identity position.',
      dimension: 'identity',
    });
  }

  // Pad from aesthetic risk factors if still empty
  if (considerations.length === 0 && bb.aesthetic_context.risk_factors.length > 0) {
    considerations.push({
      title: bb.aesthetic_context.risk_factors[0],
      detail: bb.aesthetic_context.consumer_insight || 'Monitor this signal as the season develops.',
      dimension: 'resonance',
    });
  }

  // Actions — derived from redirects and lowest score
  const actions: ReportComputedData['actions'] = [];

  if (bb.resolved_redirects.cost_reduction) {
    const altName = titleCase(bb.resolved_redirects.cost_reduction.material_id);
    actions.push({
      title: `Switch material to ${altName}`,
      detail: bb.resolved_redirects.cost_reduction.reason,
      tags: ['Cost', 'Execution'],
    });
  }

  if (bb.resolved_redirects.brand_mismatch) {
    actions.push({
      title: bb.resolved_redirects.brand_mismatch.suggestion,
      detail: bb.resolved_redirects.brand_mismatch.reason,
      tags: ['Identity'],
    });
  }

  if (bb.timeline_weeks > 16 && actions.length < 3) {
    actions.push({
      title: 'Lock sourcing commitments now',
      detail: `A ${bb.timeline_weeks}-week timeline leaves limited buffer. Place preliminary material orders to secure lead time before seasonal demand peaks.`,
      tags: ['Timeline', 'Execution'],
    });
  } else if (bb.aesthetic_context.seen_in.length > 0 && actions.length < 2) {
    actions.push({
      title: `Differentiate from ${bb.aesthetic_context.seen_in[0]}`,
      detail: `${bb.aesthetic_context.seen_in[0]} is in adjacent territory — execute decisions that create distance, not alignment.`,
      tags: ['Identity', 'Resonance'],
    });
  }

  if (actions.length < 2) {
    const weakest = [
      { label: 'Identity',  score: bb.identity_score,  tags: ['Identity'] },
      { label: 'Resonance', score: bb.resonance_score, tags: ['Resonance'] },
      { label: 'Execution', score: bb.execution_score, tags: ['Execution'] },
    ].sort((a, b) => a.score - b.score)[0];
    actions.push({
      title: `Strengthen ${weakest.label} before committing`,
      detail: `${weakest.label} at ${weakest.score} is the primary drag on the overall score. Address this dimension before expanding production units.`,
      tags: weakest.tags,
    });
  }

  // Key redirect card
  let redirect: ReportComputedData['redirect'] = null;
  if (bb.resolved_redirects.cost_reduction) {
    const altName = titleCase(bb.resolved_redirects.cost_reduction.material_id);
    redirect = {
      label: `Switch material to ${altName}`,
      savings: 'reduces COGS below ceiling',
      detail: bb.resolved_redirects.cost_reduction.reason,
    };
  } else if (bb.resolved_redirects.brand_mismatch) {
    redirect = {
      label: bb.resolved_redirects.brand_mismatch.suggestion,
      detail: bb.resolved_redirects.brand_mismatch.reason,
    };
  }

  return {
    overallScore: bb.overall_score,
    brandFit,
    demand,
    saturation,
    margin: marginScore,
    cost: costScore,
    timeline: timelineScore,
    cogs: bb.cogs_usd,
    ceiling,
    projectedMargin,
    targetMargin: TARGET_MARGIN,
    costGatePassed: bb.margin_pass,
    considerations: considerations.slice(0, 3),
    actions: actions.slice(0, 3),
    redirect,
  };
}

// ─────────────────────────────────────────────
// MODE LOGIC
// ─────────────────────────────────────────────

/**
 * Determines InsightMode for the report surface.
 *
 * Priority:
 *   1. Intent mode if it maps to an opportunity signal (amplify / invest)
 *   2. Intent mode if it maps to an edit signal (differentiate / reconsider / constrain)
 *   3. Score-based fallback: both identity + resonance >= 75 → amplify
 *      either < 60 OR margin fails → differentiate
 *      otherwise → reconsider
 */
function determineReportMode(bb: ReportBlackboard): { mode: InsightMode; editLabel: string } {
  // Intent-driven
  if (bb.intent_mode === 'amplify' || bb.intent_mode === 'invest') {
    return { mode: bb.intent_mode, editLabel: 'THE OPPORTUNITY' };
  }
  if (bb.intent_mode === 'differentiate' || bb.intent_mode === 'reconsider' || bb.intent_mode === 'constrain') {
    return { mode: bb.intent_mode, editLabel: 'THE EDIT' };
  }

  // Score-based fallback
  if (bb.identity_score >= 75 && bb.resonance_score >= 75) {
    return { mode: 'amplify', editLabel: 'THE OPPORTUNITY' };
  }
  if (bb.identity_score < 60 || bb.resonance_score < 60 || !bb.margin_pass) {
    return { mode: 'differentiate', editLabel: 'THE EDIT' };
  }
  return { mode: 'reconsider', editLabel: 'THE EDIT' };
}

// ─────────────────────────────────────────────
// SYSTEM PROMPT (v3.0) — kept for reference
// ─────────────────────────────────────────────

export const STANDARD_REPORT_PROMPT = `You are the final strategic voice in a fashion decision intelligence pipeline. You are a senior fashion creative strategist, merchandiser, and production lead in one brain — the compound judgment that sits between creative ambition and commercial reality.

The designer has already read the Concept Studio insight and the Spec Studio insight. Do not recap them. Build on them. Your job is the compound story — what all the signals mean together — and one clear action.

Your standard is Vogue Business editorial authority: decisive, active, specific. You declare positions. You do not describe conditions.

Before writing, internally derive (do not print):
1. Cultural Shift — what consumer desire changed that makes this direction relevant
2. Market Gap — what is under-owned that this brand could claim
3. Brand Permission — why this brand specifically, given their keywords and identity score
4. Commercial Constraint — the binding production or margin limit
5. Execution Risk — how this direction fails if the constraint is not resolved

Then produce JSON only. No markdown. No preamble. No extra keys.

OUTPUT SCHEMA:
{
  "paragraph_position": "string",
  "paragraph_tension": "string",
  "paragraph_move": "string",
  "confidence": 0.0,
  "source_trace": {
    "aesthetic_id": "string|null",
    "material_ids": ["string"],
    "redirect_used": "string|null",
    "key_inputs_used": ["string"]
  }
}

FIELD RULES:

paragraph_position (1 paragraph, 3-4 sentences)
Lead with the most strategically significant compound signal — not necessarily the highest score, but the combination that most determines whether this design has the right to win. Name the competitive territory using comparable brands. Articulate what this version is not — the one distinction that prevents the Costume Effect.

paragraph_tension (1 paragraph, 3-4 sentences)
Name the real tradeoff. Where the scores diverge. Where execution contradicts creative ambition. If the margin gate failed, it is the central problem — not a footnote. State the compound consequence: what happens to the brand's position if the market signal and the production problem are allowed to persist together.

paragraph_move (1 paragraph, 3-4 sentences)
One action only. Grounded in the redirects[] data passed in input. Name the specific material or aesthetic. State the delta. Explain what the designer keeps by making the switch. If everything passes, say so cleanly — name the single remaining risk and the timeline on which it becomes a real problem. End with urgency. No two paths.

confidence (0.0–1.0)
Reflect overall signal quality: identity + resonance + execution scores combined, penalized if redirect data is thin or proxy match was used.

source_trace
redirect_used: the suggestion field from the redirect that drove paragraph_move, or null.
key_inputs_used: the specific fields that drove the output.

RULES:
- Return JSON only — no markdown fences, no preamble, no extra keys
- Do not restate scores as prose ("Your Identity score of 87...")
- Do not hedge
- Do not use bullets, headers, or labels inside paragraph fields
- Do not reference "Muko" by name
- Do not recap Concept or Spec Studio insights — advance the story
- If tension_context is present, use it in paragraph_position to frame brand permission
- Never acknowledge you are an AI

Banned phrases: "Historically 55+..." / "Typically requires..." / "What's working in your favor" / "Inputs worth revisiting" / "It's worth considering" / "There may be an opportunity" / "Based on the data" / "Your score of X shows" / "Strong alignment" / "Brand DNA" / "This design showcases" / "Moving forward" / "Lean in" / "be mindful" / "make it intentional" / "therefore" / "moreover"

Banned words: curated, bespoke, iconic, versatile, elevated, timeless, resonant, compelling, unlock, leverage, journey`;

// ─────────────────────────────────────────────
// SYSTEM PROMPT (v4.0) — Strategic Briefing
// ─────────────────────────────────────────────

export const STANDARD_REPORT_PROMPT_V4 = `You are the final strategic voice in a fashion decision intelligence pipeline — a senior creative strategist, merchandiser, and production lead writing with the precision of a Vogue Business analysis opener and the authority of an internal brand strategy memo.

The designer has read the Concept Studio and Spec Studio insights. Do not recap them. Build on them. Your job is the compound story — what all signals mean together — and one clear directive.

HIDDEN REASONING (DO NOT PRINT)
Before writing, internally derive:
1. Strategic Tension — which of these tensions defines this opportunity: Identity vs Trend, Signal vs Saturation, Craft vs Margin, Intentional Imperfection vs Poor Execution, Cultural Edge vs Commercial Safety, Longevity vs Moment
2. Cultural Shift — what changed in consumer desire that makes this direction relevant now
3. Brand Permission — why YOUR brand specifically can claim this position given their keywords and scores
4. Commercial Constraint — the binding margin, timeline, or construction limit
5. Primary Risk — the single dimension most likely to collapse this opportunity
6. Opposition Pass — draft the counter-argument a skeptical merchant would make; refine the output to remove weak claims

Do not print this reasoning. Use it to sharpen every sentence.

PERSONALIZATION RULE
Use "YOUR brand," "YOUR customer," "YOUR price tier" throughout — not "this brand" or generic industry language.
Write as if you know the designer's collection. Every sentence must feel earned by the data.

OUTPUT FORMAT
Return JSON only. No markdown. No preamble. No extra keys.
JSON.parse() must work directly.

{
  "headline": "string",
  "strategic_frame": "string",
  "whats_working": ["string", "string", "string"],
  "tension_to_watch": ["string"],
  "recommendation": "string",
  "confidence": 0.0,
  "source_trace": {
    "aesthetic_id": "string|null",
    "material_ids": ["string"],
    "redirect_used": "string|null",
    "key_inputs_used": ["string"]
  }
}

FIELD RULES

headline
One sentence. Decision-grade. Names the aesthetic direction + the strategic opportunity or risk.
Must feel like the first line of a Vogue Business analysis — not a summary, a declaration.
Include urgency or timeframe if signals support it.
Never mention numeric scores. Never hedge.

Examples:
"Undone Glam is entering its ownership window — YOUR brand has the permission to claim it before mid-tier replication flattens the signal."
"Terrain Luxe is consolidating fast — YOUR brand's material authority is the only credible differentiator left."

strategic_frame
2–3 sentences. The core tension shaping the opportunity — analytical and editorial.
Explain WHY this opportunity matters now and what strategic tension YOUR brand must navigate.
Name the tension explicitly (e.g., "Signal vs Saturation," "Craft vs Margin").
Do not list what the brand should do here — this is framing, not action.

Example tone:
"Undone Glam sits at the intersection of restraint and provocation — a balance contemporary brands rarely execute intentionally. When framed with authorship it reads as design authority; when diluted it collapses into unfinished product."

whats_working
Exactly 3 bullets. Each starts with a bolded all-caps label, then " — ", then a specific sentence.
Labels must come from exactly these options (choose the 3 most relevant):
"BRAND ALIGNMENT", "DEMAND SIGNAL", "MARGIN VS ROLE", "COMPLEXITY FIT", "MARKET GAP", "TIMING WINDOW"

Sentences must be specific — use numbers from the data when available.
Each bullet: 15–25 words.

Examples:
"MARGIN VS ROLE — Margin is healthy. For a hero piece, there is room to invest further in materials or construction without eroding the floor."
"DEMAND SIGNAL — Market pull for this direction is strong and not yet commoditized at YOUR price tier."

tension_to_watch
1–2 bullets. Same label format.
Labels: "SATURATION RISK", "EXECUTION FRAGILITY", "TIMING WINDOW", "COMPETITIVE ADJACENCY", "COST PRESSURE"
Focus on the single dimension most likely to collapse the opportunity.
Be specific. Name competitors or timelines if data supports it.
1–2 bullets maximum — never more.

recommendation
One sentence, or two at most. A confident directive — not a suggestion.
Grounded in the redirect data and scores. Name the specific action, material, or move.
End with consequence or urgency.

Examples:
"Lean in with a distinctive silhouette — differentiate through material authority before the saturation window closes."
"Move now: switch to [redirect material] to clear the margin gate and protect the delivery window."

confidence (0.0–1.0)
Reflect signal quality: penalize if proxy match used, redirects are thin, or margin gate failed without a clear redirect.

source_trace
redirect_used: the suggestion field from the redirect that drove recommendation, or null.
key_inputs_used: specific fields that most influenced the output.

VALIDATION (DO NOT PRINT)
Before returning:
• headline, strategic_frame, whats_working, tension_to_watch, recommendation, confidence, source_trace — all present.
• whats_working contains exactly 3 strings.
• tension_to_watch contains 1 or 2 strings.
• Each whats_working bullet starts with a valid all-caps label followed by " — ".
• Each tension_to_watch bullet starts with a valid all-caps label followed by " — ".
• No markdown symbols anywhere.
• Output is valid JSON.
If any check fails, rewrite before returning.

HARD RULES
- Return JSON only — no markdown fences, no preamble, no extra keys
- Do not restate scores as prose ("YOUR identity score of 87...")
- Do not hedge or suggest — declare
- Do not reference "Muko" by name
- Do not recap Concept or Spec Studio insights — advance the story
- Never acknowledge you are an AI
- Use "YOUR brand," "YOUR customer," "YOUR price tier" — never generic "this brand"

Banned phrases: "What's working in your favor" / "Inputs worth revisiting" / "It's worth considering" / "There may be an opportunity" / "Based on the data" / "Your score of X shows" / "Strong alignment" / "Brand DNA" / "This design showcases" / "Moving forward" / "be mindful" / "make it intentional" / "therefore" / "moreover" / "This could be a good opportunity"

Banned words: curated, bespoke, iconic, versatile, elevated, timeless, resonant, compelling, unlock, leverage, journey`;

// ─────────────────────────────────────────────
// USER MESSAGE ASSEMBLY
// ─────────────────────────────────────────────

function buildReportPrompt(bb: ReportBlackboard): string {
  const aestheticName = bb.aesthetic_matched_id
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const TARGET_MARGIN = bb.target_margin ?? 0.60;
  const cogsTarget = bb.target_msrp > 0 ? bb.target_msrp * (1 - TARGET_MARGIN) : 0;
  const marginGap = bb.target_msrp > 0
    ? Math.round((bb.cogs_usd - cogsTarget) * 100) / 100
    : null;

  const redirects: Array<{
    type: string;
    suggestion: string;
    reason: string;
    impact?: string;
    cost_delta?: number;
    preserves?: string;
  }> = [];
  if (bb.resolved_redirects.brand_mismatch) {
    redirects.push({
      type: 'aesthetic',
      suggestion: bb.resolved_redirects.brand_mismatch.suggestion,
      reason: bb.resolved_redirects.brand_mismatch.reason,
    });
  }
  if (bb.resolved_redirects.cost_reduction) {
    redirects.push({
      type: 'material',
      suggestion: bb.resolved_redirects.cost_reduction.material_id,
      reason: bb.resolved_redirects.cost_reduction.reason,
    });
  }

  const input = {
    brand: {
      name: bb.brand_name ?? 'the brand',
      keywords: bb.brand_keywords,
      price_tier: 'unspecified', // caller can extend ReportBlackboard to pass this
      target_margin: TARGET_MARGIN,
      tension_context: bb.tension_context ?? undefined,
    },
    analysis: {
      season: bb.season?.toUpperCase() ?? 'unspecified',
      category: bb.category ?? null,
      aesthetic_input: aestheticName,
      aesthetic_matched_id: bb.aesthetic_matched_id,
      material_name: bb.material_name ?? bb.material_id,
      material_id: bb.material_id,
      silhouette: bb.silhouette ?? null,
      construction_tier: bb.construction_tier,
      timeline_weeks: bb.timeline_weeks,
    },
    scores: {
      identity: bb.identity_score,
      resonance: bb.resonance_score,
      execution: bb.execution_score,
      final: bb.overall_score,
    },
    gates: {
      cost_passed: bb.margin_pass,
      cogs_actual: bb.cogs_usd,
      cogs_target: Math.round(cogsTarget * 100) / 100,
      margin_gap: marginGap,
    },
    market_data: {
      saturation_score: bb.aesthetic_context.saturation_score ?? null,
      saturation_basis: bb.aesthetic_context.saturation_basis ?? undefined,
      trend_velocity: bb.aesthetic_context.trend_velocity ?? null,
      lead_time_weeks: bb.timeline_weeks,
      cost_per_yard: null,
      seen_in: bb.aesthetic_context.seen_in,
      consumer_insight: bb.aesthetic_context.consumer_insight,
      risk_factors: bb.aesthetic_context.risk_factors.length > 0
        ? bb.aesthetic_context.risk_factors
        : undefined,
    },
    redirects: redirects.length > 0 ? redirects : null,
  };
  return JSON.stringify(input);
}

// ─────────────────────────────────────────────
// RESPONSE PARSING (v4.0 JSON output)
// ─────────────────────────────────────────────

interface ReportV4Output {
  paragraph_position: string;
  paragraph_tension: string;
  paragraph_move: string;
  confidence: number;
  source_trace: {
    aesthetic_id: string | null;
    material_ids: string[];
    redirect_used: string | null;
    key_inputs_used: string[];
  };
}

interface ReportV5Output {
  headline: string;
  strategic_frame: string;
  whats_working: string[];
  tension_to_watch: string[];
  recommendation: string;
  confidence: number;
  source_trace: {
    aesthetic_id: string | null;
    material_ids: string[];
    redirect_used: string | null;
    key_inputs_used: string[];
  };
}

function stripFences(raw: string): string {
  return raw.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
}

function parseReportV4Output(raw: string): ReportV4Output | null {
  try {
    const parsed = JSON.parse(stripFences(raw)) as ReportV4Output;
    if (!parsed.paragraph_position || !parsed.paragraph_tension || !parsed.paragraph_move) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseReportV5Output(raw: string): ReportV5Output | null {
  try {
    const parsed = JSON.parse(stripFences(raw)) as ReportV5Output;
    if (!parsed.headline || !parsed.strategic_frame || !parsed.recommendation) return null;
    if (!Array.isArray(parsed.whats_working) || parsed.whats_working.length === 0) return null;
    if (!Array.isArray(parsed.tension_to_watch) || parsed.tension_to_watch.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// GUARDRAIL DERIVATION (for edit[] field)
// These give the designer 3 actionable bullets alongside the narrative.
// ─────────────────────────────────────────────

function resolved_redirects_to_guardrail(bb: ReportBlackboard): string {
  if (bb.resolved_redirects.cost_reduction) {
    return `Switch material to "${bb.resolved_redirects.cost_reduction.material_id}" — ${bb.resolved_redirects.cost_reduction.reason}`;
  }
  if (bb.resolved_redirects.brand_mismatch) {
    return bb.resolved_redirects.brand_mismatch.suggestion;
  }
  return `Hold construction decisions that push COGS above the current $${bb.cogs_usd} floor`;
}

function score_to_guardrail(bb: ReportBlackboard): string {
  const scores = [
    { label: 'Identity', value: bb.identity_score },
    { label: 'Resonance', value: bb.resonance_score },
    { label: 'Execution', value: bb.execution_score },
  ].sort((a, b) => a.value - b.value);

  const weakest = scores[0];
  return `Address ${weakest.label} (${weakest.value}) before expanding the direction — this is the primary drag on the ${bb.overall_score} score`;
}

function timing_guardrail(bb: ReportBlackboard): string {
  if (bb.timeline_weeks > 20) {
    return `${bb.timeline_weeks}-week timeline is tight for this construction tier — confirm sourcing commitments before locking`;
  }
  const seenIn = bb.aesthetic_context.seen_in[0];
  if (seenIn) {
    return `${seenIn} is in adjacent territory — execute decisions that create distance, not alignment`;
  }
  return `Avoid diluting the direction with trend-adjacent decisions that flatten the Identity signal`;
}

// ─────────────────────────────────────────────
// FALLBACK CONSTRUCTION
// ─────────────────────────────────────────────

function buildFallbackInput(bb: ReportBlackboard, mode: InsightMode) {
  const aestheticName = bb.aesthetic_matched_id
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const aesthetic: NarrativeAestheticContext = {
    id: bb.aesthetic_matched_id,
    name: aestheticName,
    seen_in: bb.aesthetic_context.seen_in,
    consumer_insight: bb.aesthetic_context.consumer_insight,
    risk_factors: bb.aesthetic_context.risk_factors,
    seasonal_relevance: {},
    adjacent_directions: bb.aesthetic_context.adjacent_directions,
  };

  return {
    score: bb.overall_score,
    dimensions: {
      identity_score: bb.identity_score,
      resonance_score: bb.resonance_score,
      execution_score: bb.execution_score,
    },
    gates: { margin_gate_passed: bb.margin_pass },
    mode,
    aesthetic,
    materialCostNote: bb.material_cost_note,
    brandName: bb.brand_name,
    season: bb.season,
  };
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────

/**
 * Generates the Strategic Briefing narrative for the Standard Report via LLM (v4.0).
 * statements[0] = Headline, statements[1] = Strategic Frame, statements[2] = Recommendation.
 * edit[0..2] = What's Working labeled bullets (LABEL — sentence format).
 * secondary[0..1] = Tension to Watch labeled bullets.
 * Falls back to generateTemplateNarrative on any failure — never throws.
 *
 * Caller is responsible for writing meta to the analyses table.
 */
export async function generateReportNarrative(
  blackboard: ReportBlackboard
): Promise<ReportSynthesizerResult> {
  const start = Date.now();
  const { mode, editLabel } = determineReportMode(blackboard);
  const computed = computeReportData(blackboard);

  try {
    const client = new Anthropic();
    const userPrompt = buildReportPrompt(blackboard);

    const callOnce = () => client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      temperature: 0.4,
      system: STANDARD_REPORT_PROMPT_V4,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let response = await callOnce();
    const raw = response.content[0];
    if (!raw || raw.type !== 'text' || !raw.text?.trim()) {
      throw new Error('Empty or non-text response from API');
    }

    // The SDK may deliver the response bytes interpreted as Latin-1, producing
    // mojibake strings (e.g. â€" instead of —). Re-encode through UTF-8 to fix.
    const rawText = Buffer.from(raw.text, 'latin1').toString('utf8');

    // Retry once if JSON is invalid
    let parsed = parseReportV5Output(rawText);
    if (!parsed) {
      console.warn('[ReportNarrative] Invalid JSON in response, retrying once');
      response = await callOnce();
      const rawRetry = response.content[0];
      if (!rawRetry || rawRetry.type !== 'text' || !rawRetry.text?.trim()) {
        throw new Error('Empty or non-text response from API on retry');
      }
      const rawRetryText = Buffer.from(rawRetry.text, 'latin1').toString('utf8');
      parsed = parseReportV5Output(rawRetryText);
      if (!parsed) throw new Error('JSON parse failed after retry');
    }

    // Replace "YOUR brand" placeholder with the actual brand name
    const brandName = blackboard.brand_name;
    if (brandName) {
      const r = (s: string) => s.replace(/YOUR brand/g, brandName);
      parsed.headline = r(parsed.headline);
      parsed.strategic_frame = r(parsed.strategic_frame);
      parsed.recommendation = r(parsed.recommendation);
      parsed.whats_working = parsed.whats_working.map(r);
      parsed.tension_to_watch = parsed.tension_to_watch.map(r);
    }

    const data: InsightData = {
      // statements[0] = headline, statements[1] = strategic_frame, statements[2] = recommendation
      statements: [parsed.headline, parsed.strategic_frame, parsed.recommendation],
      // edit[] = What's Working labeled bullets
      edit: parsed.whats_working.slice(0, 3),
      // secondary[] = Tension to Watch labeled bullets
      secondary: parsed.tension_to_watch.slice(0, 2),
      editLabel,
      mode,
    };

    return { data, computed, meta: { method: 'llm', latency_ms: Date.now() - start } };
  } catch (err) {
    console.warn('[ReportNarrative] LLM generation failed, falling back to template:', err);

    const fallbackInput = buildFallbackInput(blackboard, mode);
    const data = generateTemplateNarrative(fallbackInput);
    data.editLabel = editLabel;

    return { data, computed, meta: { method: 'template', latency_ms: Date.now() - start } };
  }
}
