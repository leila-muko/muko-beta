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
  target_msrp: number | null;
  /** True when margin gate passes */
  margin_pass: boolean | null;
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
  target_margin: number | null;
  /** Key piece context from Concept Studio */
  keyPiece?: { item: string; type: string; signal: string };
  /** Both resolved redirects */
  resolved_redirects: ResolvedRedirects;
  /** Concept insight thread — title and market gap bullet from Concept Studio */
  concept_thread?: { title: string; market_gap: string } | null;
  /** Customer profile description from brand onboarding */
  customer_profile: string | null;
  /** Reference brands from brand onboarding — used as competitive positioning anchors */
  reference_brands: string[];
  /** Excluded brands from brand onboarding — used as tone constraint */
  excluded_brands: string[];
  /** Brand price tier (e.g. "Contemporary", "Bridge", "Luxury") */
  price_tier: string;
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
  costGatePassed: boolean | null;
  considerations: Array<{ title: string; detail: string; dimension: 'identity' | 'resonance' | 'execution' }>;
  actions: Array<{ title: string; detail: string; tags: string[] }>;
  redirect: { label: string; savings?: string; detail: string; redirectMaterialId?: string } | null;
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
  const effectiveTargetMsrp = bb.target_msrp != null && bb.target_msrp > 0 ? bb.target_msrp : null;
  const ceiling = effectiveTargetMsrp != null ? Math.round(effectiveTargetMsrp * (1 - TARGET_MARGIN)) : 0;
  const headroom = ceiling - bb.cogs_usd;

  // Radar sub-scores
  const brandFit = bb.identity_score;
  const demand   = bb.resonance_score;
  const saturation = Math.min(95, Math.max(20,
    Math.round((1 - ((bb.aesthetic_context.saturation_score ?? 50) / 100)) * 100)
  ));
  const marginScore = ceiling > 0
    ? Math.min(95, Math.max(20, Math.round(bb.margin_pass === true
        ? 72 + (headroom / ceiling) * 30
        : 55 - ((bb.cogs_usd - ceiling) / ceiling) * 40)))
    : 70;
  const costScore = ceiling > 0
    ? Math.min(95, Math.max(20, Math.round(bb.margin_pass === true
        ? 75 + (headroom / ceiling) * 25
        : 55 - ((bb.cogs_usd - ceiling) / ceiling) * 40)))
    : 70;
  const timelineScore = Math.min(95, Math.max(30,
    Math.round(100 - (bb.timeline_weeks - 8) * 3)
  ));
  const projectedMargin = effectiveTargetMsrp != null
    ? Math.round(((effectiveTargetMsrp - bb.cogs_usd) / effectiveTargetMsrp) * 1000) / 10
    : 0;

  // Considerations — derived from real signals
  const considerations: ReportComputedData['considerations'] = [];

  if (bb.margin_pass === false && bb.target_msrp != null && bb.target_msrp > 0) {
    const gap = Math.abs(Math.round(bb.cogs_usd - ceiling));
    considerations.push({
      title: 'Cost ceiling exceeded',
      detail: `COGS of $${bb.cogs_usd.toFixed(0)} exceeds the $${ceiling} ceiling for your $${bb.target_msrp} MSRP at ${Math.round(TARGET_MARGIN * 100)}% margin. A $${gap}/unit reduction is needed.`,
      dimension: 'execution',
    });
  } else if (bb.margin_pass === null) {
    considerations.push({
      title: 'Cost viability not assessed',
      detail: 'Set a target retail price for this piece to unlock cost viability analysis.',
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

  if (bb.aesthetic_context.saturation_score != null && bb.aesthetic_context.saturation_score > 60) {
    const satPct = bb.aesthetic_context.saturation_score;
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

  if (considerations.length < 3 && bb.identity_score < 65) {
    considerations.push({
      title: 'Identity alignment worth reviewing',
      detail: 'Brand alignment has room to sharpen. Tightening the aesthetic angle or adding a differentiating execution lever would strengthen the position before committing.',
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

  // Actions — signal-driven, actionable only (max 2).
  // Rules:
  //   - seen_in[] is market presence data, not a competitor list — never used here.
  //   - Resonance is a read-only market signal — excluded from actionable picks.
  //   - Only Identity and Execution generate dimension actions.
  const actions: ReportComputedData['actions'] = [];

  if (bb.identity_score < 60) {
    actions.push({
      title: 'Revisit aesthetic direction',
      detail: `Identity at ${bb.identity_score} signals tension with brand DNA. Consider adjusting the aesthetic angle before committing to production.`,
      tags: ['Identity'],
    });
  }

  if (actions.length < 2 && bb.execution_score < 60) {
    actions.push({
      title: 'Simplify before committing',
      detail: 'The current construction approach leaves limited room for delays. Reducing complexity or material lead time before locking the spec protects the delivery window.',
      tags: ['Execution'],
    });
  }

  if (actions.length === 0 && bb.identity_score >= 60 && bb.execution_score >= 60 && bb.resonance_score < 50) {
    actions.push({
      title: 'Time this carefully',
      detail: 'Market saturation is elevated. The direction is sound — sequence the launch to avoid peak crowding.',
      tags: ['Resonance'],
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: 'Protect the margin story',
      detail: `All signals are healthy. As you develop the spec, watch construction decisions that could compress the ${projectedMargin}% margin.`,
      tags: ['Execution'],
    });
  }

  // Key redirect card
  let redirect: ReportComputedData['redirect'] = null;
  if (bb.margin_pass === false && bb.resolved_redirects.cost_reduction) {
    const altName = titleCase(bb.resolved_redirects.cost_reduction.material_id);
    redirect = {
      label: `Switch material to ${altName}`,
      savings: 'reduces COGS below ceiling',
      detail: bb.resolved_redirects.cost_reduction.reason,
      redirectMaterialId: bb.resolved_redirects.cost_reduction.material_id,
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
  if (bb.identity_score < 60 || bb.resonance_score < 60 || bb.margin_pass === false) {
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

export const STANDARD_REPORT_PROMPT_V4 = `PROMPT VERSION: 4.1 — ${new Date().toISOString()}

You are the final strategic voice in a fashion decision intelligence pipeline — a senior creative strategist, merchandiser, and production lead writing with the precision of a Vogue Business analysis opener and the authority of an internal brand strategy memo.

The designer has moved through Concept Studio and Spec Studio.
When concept_thread is present in the input, your headline and strategic_frame must advance from the position already established there — not restate it, not contradict it. The concept_thread is the premise; your report is the resolution.

If concept_thread is absent, establish the position yourself from the available signals.

BRAND REASONING LAYER
Apply these rules before writing a single word of output:

1. SUBJECT vs COMPETITOR — brand.name is the subject of this analysis, not a market player. If brand.name appears in seen_in[] or market references, treat it as validation of the direction, not as a competitor to position against. Never frame brand.name as something to outrun.

2. REFERENCE BRANDS AS ANCHORS — if brand.reference_brands is present, use those names specifically when describing market position and competitive territory. They are more useful than generic market players because they represent the designer's own competitive frame of reference.

3. CUSTOMER GROUNDING — if brand.customer is present, ground every commercial claim in her behavior. Replace "the consumer" with a specific behavioral description tied to her profile. Ask: would she buy this? What makes her choose it over what she already buys?

4. NEVER-BE CONSTRAINT — if brand.never_be_brands is present, treat those brands as a hard constraint on framing and angle. If a never-be brand owns a particular positioning angle, do not suggest the analyzed brand pursue that angle — even if the commercial logic is sound.

5. BRAND NAME IN OUTPUT — brand.name must appear by its actual name in either the headline or strategic_frame. Never use "YOUR brand" or "the brand" as a placeholder in the final output. Replace the placeholder with the actual brand name from brand.name before returning.

6. CONCEPT THREAD — If concept_thread.established_position is present, your headline must resolve or advance that position. If concept_thread.market_gap_identified is present, your whats_working or recommendation must reference or close that gap.

HIDDEN REASONING (DO NOT PRINT)
Before writing, internally derive:
1. Strategic Tension — which of these tensions defines this opportunity: Identity vs Trend, Signal vs Saturation, Craft vs Margin, Intentional Imperfection vs Poor Execution, Cultural Edge vs Commercial Safety, Longevity vs Moment
2. Cultural Shift — what changed in consumer desire that makes this direction relevant now
3. Brand Permission — why YOUR brand specifically can claim this position given their keywords and scores
4. Commercial Constraint — the binding margin, timeline, or construction limit
   target_margin: the brand's margin floor (use this when referencing whether cost pressure is severe or marginal)
5. Primary Risk — the single dimension most likely to collapse this opportunity
6. Opposition Pass — draft the counter-argument a skeptical merchant would make; refine the output to remove weak claims

Do not print this reasoning. Use it to sharpen every sentence.

PERSONALIZATION RULE
Write as if you know this designer's collection. Every sentence must feel earned by the data provided.
If brand.name is present in the input, use it directly — write "Reformation" not "YOUR brand", "the brand", or "this brand".
If brand.name is absent, use "the brand" as a neutral placeholder.
Ground every commercial claim in the customer profile when provided. Replace "the consumer" with a behavioral description tied to her profile.
If a sentence could apply to any collection without these exact inputs, rewrite it.

COHERENCE RULES (NON-NEGOTIABLE)
These govern the structural integrity of the output. Apply them after drafting, before returning.

1. ZERO REPETITION — Every claim must appear exactly once across the entire output. If a claim appears in strategic_frame, it cannot reappear in whats_working or tension_to_watch. If a claim appears in whats_working, it cannot reappear in recommendation. Before returning, scan for repeated ideas and rewrite to eliminate them.

2. STRUCTURE CONTRACT:
   - headline: One verdict sentence. Format: "[Aesthetic] is [trajectory] — [the specific implication for the brand]." Never include score numbers. The headline orients — it does not warn or recap.
   - strategic_frame: Market context in 2–3 sentences. Sets up why this moment matters. Claims made here may NOT reappear in any other field. Maximum 60 words. Do not exceed this.
   - whats_working: Exactly 2 items. Each adds new information not already stated in strategic_frame. Labels should surface specific claims, not generic headers like "Identity is aligned."
   - tension_to_watch: Exactly 1 item when a genuine production, material, or timing risk exists. If all gates passed, timeline is healthy, and execution is not flagging — output a single item beginning with "HOLDING — " that names what is keeping the spec on track and what to preserve. Example: "HOLDING — EXECUTION CLARITY — Low construction at healthy cost buffer means the only risk is over-engineering what doesn't need it." Do not invent a risk to fill this field.
   - recommendation: 2 sentences maximum. The concrete next step. Must not repeat tension_to_watch wording.

3. HEADLINE RULE — Never include score numbers in the headline. The headline is a strategic verdict, not a scorecard readout.
   Wrong: "Identity at 86, Resonance at 80, and an overall 82 signal strong alignment."
   Right: "Heritage Hand is landing well for [brand] — the window is open but construction complexity is the variable to control."

OUTPUT FORMAT
Return JSON only. No markdown. No preamble. No extra keys.
JSON.parse() must work directly.

{
  "headline": "string",
  "strategic_frame": "string",
  "whats_working": ["string", "string"],
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

Positive example:
{
  "headline": "Heritage Hand is landing well for [brand] — the construction path is clear and the material is doing its job.",
  "strategic_frame": "The craft-provenance lane at contemporary price is still open. This spec is positioned correctly to claim it.",
  "whats_working": [
    "BRAND ALIGNMENT — Material surface and construction tier are both executing the Heritage Hand direction without requiring the consumer to be told what they're looking at.",
    "MARGIN VS ROLE — For a hero piece, cost buffer is healthy enough to absorb one targeted material upgrade without touching the margin floor."
  ],
  "tension_to_watch": ["HOLDING — EXECUTION CLARITY — Low construction and healthy timeline mean the only risk is adding complexity that dilutes the surface read the direction depends on."],
  "recommendation": "Lock material now and specify yarn weight in the brief — surface character is the proof point for this direction and it needs to be decided before sampling.",
  "confidence": 0.88,
  "source_trace": {
    "aesthetic_id": "heritage-hand",
    "material_ids": ["wool-merino"],
    "redirect_used": null,
    "key_inputs_used": ["construction_tier", "cost_buffer", "identity_score"]
  }
}

FIELD RULES

headline
One sentence. Strategic verdict only.
Format exactly: "[Aesthetic] is [trajectory] for [brand.name] — [one specific implication]."
If concept_thread is present: the implication must directly answer or advance the established_position.
HARD PROHIBITION: No numbers, no scores, no dimension names (Identity/Resonance/Execution) in the headline. If your headline contains a number or a dimension name, rewrite it.

strategic_frame: MAXIMUM 40 WORDS. One or two sentences only. If you write more than 40 words, you have failed. Count your words before outputting.

whats_working
Exactly 2 bullets. Each starts with an all-caps label, then " — ", then a specific sentence.
Labels must come from exactly these options (choose the 2 most relevant):
"BRAND ALIGNMENT", "DEMAND SIGNAL", "MARGIN VS ROLE", "COMPLEXITY FIT", "MARKET GAP", "TIMING WINDOW"

Each bullet must add information not already stated in strategic_frame.
Labels should surface a specific claim — not generic headers like "Identity is aligned."
Sentences must be specific — use numbers from the data when available.
Each bullet: 15–25 words.

Examples:
"MARGIN VS ROLE — For a hero piece, there is room to invest further in materials without eroding the floor."
"DEMAND SIGNAL — Market pull for this direction is not yet commoditized at YOUR price tier."

HARD PROHIBITION: Do not mention brand.name or any brand from reference_brands or seen_in in whats_working. Market validation should reference consumer behavior or category momentum — not named brands.

tension_to_watch
EXACTLY ONE string. One sentence. Same label format.
Labels: "SATURATION RISK", "EXECUTION FRAGILITY", "TIMING WINDOW", "COMPETITIVE ADJACENCY", "COST PRESSURE", "HOLDING"
Must name a specific material, construction decision, or timing risk — not a dimension score, not a brand name, not advice about competitive positioning.
HARD PROHIBITION: Do not mention brand.name, reference_brands, or seen_in brands in tension_to_watch.

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
• whats_working contains exactly 2 strings.
• tension_to_watch contains exactly 1 string.
• Each whats_working bullet starts with a valid all-caps label followed by " — ".
• tension_to_watch bullet starts with a valid all-caps label followed by " — ".
• headline contains no score numbers.
• No claim in strategic_frame is repeated in whats_working, tension_to_watch, or recommendation.
• No claim in whats_working is repeated in recommendation.
• "YOUR brand" does not appear anywhere in the output — replaced with the actual brand name.
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
- Use the actual brand name from brand.name when available. Never use "YOUR brand" or "the brand" as a placeholder when the real name is known.

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
  const effectiveTargetMsrp = bb.target_msrp != null && bb.target_msrp > 0 ? bb.target_msrp : null;
  const cogsTarget = effectiveTargetMsrp != null ? effectiveTargetMsrp * (1 - TARGET_MARGIN) : 0;
  const marginGap = effectiveTargetMsrp != null
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
  if (bb.margin_pass === false && bb.resolved_redirects.cost_reduction) {
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
      price_tier: bb.price_tier,
      customer: bb.customer_profile ?? undefined,
      reference_brands: bb.reference_brands.length > 0 ? bb.reference_brands : undefined,
      never_be_brands: bb.excluded_brands.length > 0 ? bb.excluded_brands : undefined,
      target_margin: TARGET_MARGIN,
      tension_context: bb.tension_context ?? undefined,
    },
    key_piece: bb.keyPiece
      ? `${bb.keyPiece.item} (${bb.keyPiece.type}) — signal: ${bb.keyPiece.signal}`
      : undefined,
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
    ...(bb.concept_thread ? {
      concept_thread: {
        established_position: bb.concept_thread.title,
        market_gap_identified: bb.concept_thread.market_gap,
      },
    } : {}),
    scores: {
      identity: bb.identity_score,
      resonance: bb.resonance_score,
      execution: bb.execution_score,
      final: bb.overall_score,
    },
    gates: effectiveTargetMsrp == null
      ? {
          cost_passed: null,
          cogs_actual: bb.cogs_usd,
          cogs_target: null,
          margin_gap: null,
          target_margin: bb.target_margin != null ? `${Math.round(bb.target_margin * 100)}%` : null,
          cost_viability: 'not assessed — no target retail price set for this piece.',
        }
      : {
          cost_passed: bb.margin_pass,
          cogs_actual: bb.cogs_usd,
          cogs_target: Math.round(cogsTarget * 100) / 100,
          margin_gap: marginGap,
          target_margin: bb.target_margin != null ? `${Math.round(bb.target_margin * 100)}%` : null,
        },
    market_data: {
      saturation_score: bb.aesthetic_context.saturation_score ?? null,
      saturation_basis: bb.aesthetic_context.saturation_basis ?? undefined,
      trend_velocity: bb.aesthetic_context.trend_velocity ?? null,
      lead_time_weeks: bb.timeline_weeks,
      cost_per_yard: null,
      seen_in: bb.aesthetic_context.seen_in.filter(brand =>
        !bb.reference_brands.includes(brand) &&
        !bb.excluded_brands.includes(brand) &&
        brand !== bb.brand_name
      ),
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

// Call 1 response shape — narrative fields only
interface NarrativeOutput {
  headline: string;
  strategic_frame: string;
  whats_working: string[];
  tension_to_watch: string[];
  recommendation: string;
}

// Call 2 response shape — metadata fields only
interface MetadataOutput {
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

function parseNarrativeOutput(raw: string): NarrativeOutput | null {
  try {
    let text = stripFences(raw);
    text = text
      .replace(/\u2014/g, '\\u2014')   // em dash → JSON unicode escape (preserves in parsed values)
      .replace(/\u2013/g, '\\u2013')   // en dash → JSON unicode escape
      .replace(/[\u2018\u2019]/g, "'") // smart quotes to straight
      .replace(/[\u201C\u201D]/g, '"');// smart double quotes to straight
    text = text.replace(/  +/g, ' \u2014 ');  // double spaces → em dash separator
    try {
      const parsed = JSON.parse(text) as NarrativeOutput;
      if (!parsed.headline || !parsed.strategic_frame) return null;
      return parsed;
    } catch {
      // Try to extract partial fields via regex (truncated JSON)
      const headline = text.match(/"headline"\s*:\s*"([^"]+)"/)?.[1];
      const strategic_frame = text.match(/"strategic_frame"\s*:\s*"([^"]+)"/)?.[1];
      const recommendation = text.match(/"recommendation"\s*:\s*"([^"]+)"/)?.[1];

      // Extract array items from whats_working and tension_to_watch sections,
      // even if the JSON is truncated mid-array. After sanitization, em dashes
      // appear as the literal escape sequence \\u2014 in the raw text.
      function extractArrayItems(sectionKey: string): string[] {
        const sectionMatch = text.match(new RegExp(`"${sectionKey}"\\s*:\\s*\\[([\\s\\S]*?)(?:\\]|$)`));
        if (!sectionMatch) return [];
        const items = [...sectionMatch[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)];
        return items.map(m =>
          m[1]
            .replace(/\\u2014/g, '\u2014')
            .replace(/\\u2013/g, '\u2013')
        );
      }

      if (headline && strategic_frame) {
        return {
          headline,
          strategic_frame,
          whats_working: extractArrayItems('whats_working'),
          tension_to_watch: extractArrayItems('tension_to_watch'),
          recommendation: recommendation ?? '',
        } as NarrativeOutput;
      }
      return null;
    }
  } catch {
    return null;
  }
}

function parseMetadataOutput(raw: string): MetadataOutput | null {
  try {
    const parsed = JSON.parse(stripFences(raw)) as MetadataOutput;
    if (typeof parsed.confidence !== 'number') return null;
    if (!parsed.source_trace) return null;
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
  if (bb.margin_pass === false && bb.resolved_redirects.cost_reduction) {
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

function buildDefaultTrace(bb: ReportBlackboard): MetadataOutput['source_trace'] {
  return {
    aesthetic_id: bb.aesthetic_matched_id,
    material_ids: [bb.material_id],
    redirect_used: bb.resolved_redirects.cost_reduction?.material_id ?? null,
    key_inputs_used: ['identity_score', 'resonance_score', 'execution_score', 'material_id'],
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

    console.log('REPORT PROMPT FIRST 200 CHARS:', STANDARD_REPORT_PROMPT_V4.substring(0, 200));
    console.log('REPORT USER MESSAGE:', JSON.stringify(userPrompt).substring(0, 300));

    // ── CALL 1: Narrative (creative, high-token) ──────────────────────────
    const callNarrative = () => client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1400,
      temperature: 0.4,
      system: STANDARD_REPORT_PROMPT_V4,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let narrativeResponse = await callNarrative();
    const rawNarrative = narrativeResponse.content[0];
    if (!rawNarrative || rawNarrative.type !== 'text' || !rawNarrative.text?.trim()) {
      throw new Error('Empty or non-text response from narrative API call');
    }

    // The SDK may deliver the response bytes interpreted as Latin-1, producing
    // mojibake strings (e.g. â€" instead of —). Re-encode through UTF-8 to fix.
    const rawNarrativeText = stripFences(
      Buffer.from(rawNarrative.text, 'latin1').toString('utf8')
    );
    console.log('CALL 1 RAW:', rawNarrativeText.substring(0, 2000));

    let narrativeParsed = parseNarrativeOutput(rawNarrativeText);
    if (!narrativeParsed) {
      console.warn('[ReportNarrative] Call 1: Invalid JSON, retrying once');
      narrativeResponse = await callNarrative();
      const rawRetry = narrativeResponse.content[0];
      if (!rawRetry || rawRetry.type !== 'text' || !rawRetry.text?.trim()) {
        throw new Error('Empty or non-text response from narrative API call on retry');
      }
      const rawRetryText = stripFences(
        Buffer.from(rawRetry.text, 'latin1').toString('utf8')
      );
      console.log('CALL 1 RETRY RAW:', rawRetryText.substring(0, 2000));
      narrativeParsed = parseNarrativeOutput(rawRetryText);
      if (!narrativeParsed) throw new Error('Call 1 JSON parse failed after retry');
    }

    const metaParsed = {
      confidence: 0.7,
      source_trace: buildDefaultTrace(blackboard),
    };

    // ── MERGE + BRAND NAME REPLACEMENT + MAP ─────────────────────────────
    const merged = { ...narrativeParsed, ...metaParsed };

    const brandName = blackboard.brand_name;
    if (brandName) {
      const r = (s: string) => s.replace(/YOUR brand/g, brandName);
      merged.headline = r(merged.headline);
      merged.strategic_frame = r(merged.strategic_frame);
      merged.recommendation = r(merged.recommendation);
      merged.whats_working = merged.whats_working.map(r);
      merged.tension_to_watch = merged.tension_to_watch.map(r);
    }

    const data: InsightData = {
      // statements[0] = headline, statements[1] = strategic_frame, statements[2] = recommendation
      statements: [merged.headline, merged.strategic_frame, merged.recommendation],
      // edit[] = What's Working labeled bullets
      edit: merged.whats_working.slice(0, 3),
      // secondary[] = Tension to Watch labeled bullets
      secondary: merged.tension_to_watch.slice(0, 2),
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
