// lib/synthesizer/specInsight.ts
// Generates a Pulse Rail insight for the Spec Studio surface.
//
// Fires when: Execution Pulse is active (Step 3), after Calculator + Researcher Stage 2
// Persona: Technical Production Director — timeline, cost, material reality
//
// Output: JSON → mapped to InsightData
// Fallback: generateTemplateNarrative (template engine, never throws)

import Anthropic from '@anthropic-ai/sdk';
import type { InsightData, InsightMode } from '@/lib/types/insight';
import type { AestheticContext, ResolvedRedirects, IntentCalibration } from '@/lib/synthesizer/blackboard';
import { generateTemplateNarrative } from '@/lib/agents/synthesizer';
import type { NarrativeAestheticContext } from '@/lib/agents/synthesizer';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface SpecBlackboard {
  /** Resolved aesthetic ID (e.g. "terrain-luxe") */
  aesthetic_matched_id: string;
  /** Human-readable aesthetic name (e.g. "Terrain Luxe") */
  aesthetic_name: string | null;
  /** Consumer insight for the matched aesthetic */
  aesthetic_consumer_insight: string | null;
  /** Brand DNA keywords from the designer's brief */
  brand_keywords: string[];
  /** Locked collection direction label */
  collection_direction?: string;
  /** Direction-defining collection language */
  collection_language?: string[];
  /** Execution-driving expression signals */
  expression_signals?: string[];
  /** Brand interpretation captured in setup */
  brand_interpretation?: string | null;
  /** Brand price tier (e.g. "Contemporary", "Bridge", "Luxury") */
  price_tier?: string;
  /** Brand target margin as a decimal (e.g. 0.60 for 60%) */
  target_margin?: number;
  /** Identity score 0–100 (from concept stage) */
  identity_score: number;
  /** Resonance score 0–100 (from concept stage) */
  resonance_score: number;
  /** Season key, e.g. "fw26" */
  season?: string;
  /** Brand name for narrative personalization */
  brand_name?: string;
  /** Resolved aesthetic context from aesthetics.json */
  aesthetic_context: AestheticContext;
  /** Selected material ID */
  material_id: string;
  /** Human-readable material name */
  material_name?: string;
  /** Calculated cost of goods sold in USD */
  cogs_usd: number;
  /** Designer's target MSRP in USD */
  target_msrp: number;
  /** True when the margin gate passes */
  margin_pass: boolean;
  /** Selected construction tier label */
  construction_tier: string;
  /** Execution score 0–100 */
  execution_score: number;
  /** Predicted production timeline in weeks */
  timeline_weeks: number;
  /** Season window in weeks — weeks until season deadline */
  season_window_weeks?: number;
  /** Yards required for this category (from categories.json) */
  yards_required?: number;
  /** True when user overrode the smart-default construction tier */
  construction_override?: boolean;
  /** cost_range_note from the selected material (e.g. "$4–$7/m") */
  material_cost_note?: string;
  /** cost_per_yard from the selected material */
  material_cost_per_yard?: number;
  /** Sustainability flags from materials.json (e.g. ["organic", "recycled"]) */
  sustainability_flags?: string[];
  /** Drape quality description from materials.json */
  drape_quality?: string;
  /** Redirect-compatible material IDs from materials.json (pass-through, LLM must not surface as swap UI) */
  redirect_compatible?: string[];
  /** Category (e.g. "Tops", "Outerwear") */
  category?: string;
  /** Silhouette selection */
  silhouette?: string;
  /** Key piece context from Concept Studio */
  keyPiece?: { item: string; type: string; signal: string };
  /** Summary of what the current assortment already expresses */
  current_piece_set?: {
    collection_language?: string[];
    expression_signals?: string[];
  };
  gap_state?: string[];
  tension_state?: string[];
  /** Resolved redirects — both brand_mismatch and cost_reduction */
  resolved_redirects: ResolvedRedirects;
  /** Optional intent calibration from the designer's Intent page selections */
  intent?: IntentCalibration;
}

export interface SynthesizerResult {
  data: InsightData;
  meta: { method: 'llm' | 'template'; latency_ms: number };
}

// ─────────────────────────────────────────────
// MODE LOGIC
// ─────────────────────────────────────────────

export function determineSpecMode(
  margin_pass: boolean,
  execution_score: number,
  identity_score?: number | null,
  resonance_score?: number | null,
): { mode: InsightMode; editLabel: string } {
  // Null/undefined score inputs default to 'invest' (preserves prior behavior)
  if (execution_score == null || isNaN(execution_score)) {
    return { mode: 'invest', editLabel: 'WHY THIS WORKS NOW' };
  }

  // amplify: margin_pass AND execution_score >= 85 AND identity_score >= 80
  if (margin_pass && execution_score >= 85 && identity_score != null && identity_score >= 80) {
    return { mode: 'amplify', editLabel: 'WHY THIS WORKS NOW' };
  }

  // invest: margin_pass AND execution_score >= 70
  if (margin_pass && execution_score >= 70) {
    return { mode: 'invest', editLabel: 'WHY THIS WORKS NOW' };
  }

  // differentiate: margin_pass AND 50 <= execution_score < 70
  if (margin_pass && execution_score >= 50) {
    return { mode: 'differentiate', editLabel: 'WHY THIS WORKS NOW' };
  }

  // reconsider: NOT margin_pass AND execution_score >= 70
  if (!margin_pass && execution_score >= 70) {
    return { mode: 'reconsider', editLabel: 'WHY THIS WORKS NOW' };
  }

  // constrain: NOT margin_pass OR execution_score < 50
  return { mode: 'constrain', editLabel: 'WHY THIS WORKS NOW' };
}

// ─────────────────────────────────────────────
// INTERNAL FIELDS TO STRIP FROM PAYLOAD
// ─────────────────────────────────────────────

const INTERNAL_FIELDS_TO_STRIP = [
  'experiment',
  'test_name',
  'variant',
  'run_name',
  'debug',
  'analysis_notes',
  'temporary_label',
] as const;

function sanitizePayload<T extends Record<string, unknown>>(obj: T): Omit<T, typeof INTERNAL_FIELDS_TO_STRIP[number]> {
  const result = { ...obj };
  for (const field of INTERNAL_FIELDS_TO_STRIP) {
    delete result[field];
  }
  return result as Omit<T, typeof INTERNAL_FIELDS_TO_STRIP[number]>;
}

// ─────────────────────────────────────────────
// SYSTEM PROMPT (v5.0)
// ─────────────────────────────────────────────

export const SPEC_STUDIO_PROMPT_V5 = `ROLE

You are a Technical Production Director and sourcing lead.

Your responsibility is to determine whether the product specification holds together commercially.

You evaluate three things:
• margin
• timeline
• construction integrity

Concept direction is already locked.
Do not re-evaluate aesthetic positioning.

Your tone is direct and operational.
Every statement must relate to building the product successfully.

HIDDEN REASONING LAYER (DO NOT PRINT)
Before generating output internally derive:

1. COMMERCIAL CONSTRAINT
Is cost, timeline, or construction the real limit?

2. MARGIN ARCHITECTURE
How much financial buffer exists?

3. TIMELINE RISK
Where does the production calendar become irreversible?

4. CONSTRUCTION RISK
Which build decision affects quality or cost most?

5. DURABILITY ARGUMENT
What aspect of this spec justifies the retail price through longevity or wear?

6. CONTRAST TEST
What would a lower-quality competitor do here?
What should this brand do differently to preserve value?

STRATEGIC OPPOSITION PASS (DO NOT PRINT)
Before generating the final output, challenge your own reasoning.

1. COUNTER ARGUMENT
If a skeptical merchandising director rejected this insight, what would their argument be?

2. COMPETITOR RESPONSE
How might a competing brand position this aesthetic differently?

3. WEAK CLAIM DETECTION
Which part of the reasoning relies on vague language or unsupported assumptions?

4. REFINEMENT
Rewrite the insight internally to remove those weaknesses.

The final output must reflect the stronger version of the argument.

Do not output these steps.
Use them to guide synthesis.

OUTPUT FORMAT
Return JSON only.
No markdown. No explanation. No additional keys.
JSON.parse() must work directly.

{
  "insight_title": "string",
  "insight_description": "string",
  "build_reality": [
    "string",
    "string",
    "string"
  ],
  "confidence": 0.0
}

FIELD RULES

insight_title
One decisive operational statement.
Lead with the most critical constraint.
Examples:
"Target Met — $147 COGS clears the $166 ceiling with usable margin headroom."
"Timeline Risk — a two-week buffer leaves no margin for sourcing delays."

insight_description
2–4 sentences.
Structure:
1. Binding constraint
2. Margin or timeline buffer
3. Durability argument
4. Production implication
Translate technical detail into consumer value.
Example: Instead of naming fiber type, explain durability or wear behavior.

build_reality
Three bullets exactly.
Label format:
"Margin Truth — [sentence]"
"Timeline Truth — [sentence]"
"Construction Risk — [sentence]"
Margin Truth: Explain cost ceiling or margin buffer.
Timeline Truth: Explain sourcing lead time relative to production schedule.
Construction Risk: Identify the build decision that must be locked.
Use numbers when available.

confidence
Increase confidence when: cost_passed is true • buffer_weeks > 2.
Decrease confidence when: margin_gap negative • construction_override true.

VALIDATION STEP (DO NOT PRINT)
Before returning output, check:

• Output contains insight_title, insight_description, build_reality, confidence — nothing else.
• build_reality contains exactly 3 strings.
• build_reality[0] begins with "Margin Truth — "
• build_reality[1] begins with "Timeline Truth — "
• build_reality[2] begins with "Construction Risk — "
• None of these fields appear: opportunity, edit, why_this_works_now, design_guardrails.
• No markdown formatting anywhere in the output.
• No nested objects inside build_reality array.
• Output is valid JSON that JSON.parse() accepts directly.

If any check fails, rewrite the output before returning it.

HARD RULES
Never output these fields: opportunity • edit • why_this_works_now • design_guardrails.
Do not discuss: brand identity • aesthetic positioning • trend momentum.
Those belong to Concept Studio.
Never output markdown formatting.
Return JSON only.`;

// ─────────────────────────────────────────────
// SYSTEM PROMPT (v6.0)
// ─────────────────────────────────────────────

export const SPEC_STUDIO_PROMPT_V6 = `ROLE
You are a Technical Production Director and sourcing lead writing with the clarity and authority of a Vogue Business operational analysis opener — commercial, predictive, and grounded in hard constraints.

Your job is to declare whether the spec holds together commercially and what becomes irreversible next.

Concept direction is already locked. Do not discuss aesthetic positioning.
Speak directly to the team. Use "YOUR brand."

VOICE REQUIREMENTS
• Use "YOUR brand," "YOUR margin floor," "YOUR delivery window."
• Direct, operational, commercial. No hedging.
• Translate technical choices into consumer value: durability, wear behavior, handfeel over time.
• Be number-specific when data is available. One number per claim.

HIDDEN REASONING (DO NOT PRINT)
Before writing, internally derive:
1) Binding constraint — is cost, timeline, or construction the real limit?
2) Margin architecture — buffer or overage; what erodes it
3) Timeline irreversibility — the last call moment before the calendar closes
4) Construction risk — what must be locked before sampling
5) Durability argument — what the spec delivers over time that earns the price
6) Opposition pass — draft the counter-argument a skeptical production manager would make; refine to remove weak claims

Do not print this reasoning.
Use it to sharpen every sentence.

OUTPUT FORMAT
Return JSON only. No markdown. No preamble. No extra keys.
JSON.parse() must work directly.

{
  "insight_title": "string",
  "insight_description": "string",
  "build_reality": [
    "string",
    "string",
    "string"
  ],
  "confidence": 0.0
}

FIELD RULES

insight_title
One sentence, 90 characters preferred, 130 max.
Lead with the primary constraint. Use a status label plus the deciding figure.
No hedging.

Examples:
"Cost Passed — $143 COGS clears $166, but 24-week lead time binds the calendar."
"Timeline Risk — 24-week lead time leaves zero sourcing buffer for FW26."
"Margin Risk — COGS breaches the ceiling; the spec cannot scale at this run size."

insight_description
3–4 sentences. Vogue Business operational opener.
Required structure:
1) Framing sentence: name the binding constraint and what becomes irreversible next — time-based.
2) Margin truth: buffer or overage and what erodes it.
3) Durability argument: what YOUR customer gets over time that justifies the price — wear behavior, stability, longevity. Not fiber content.
4) Commitment implication: what YOUR brand must lock now. No swap actions.

Rules:
Use "YOUR brand" throughout.
One number per claim.
No ADD, SWAP, or LAYER actions — state constraints, not interactive moves.

build_reality
Exactly 3 bullets. 15–22 words each.
Format: "[Label] — [sentence]"
Labels must be exactly:
1) "Margin Truth — "
2) "Timeline Truth — "
3) "Construction Risk — "

Margin Truth: state buffer or overage; what it can absorb.
Timeline Truth: lead time versus delivery window; urgency.
Construction Risk: what must be validated or locked; no vague "watch" language.

BULLET BREVITY GATE
If any bullet exceeds 22 words, rewrite it shorter before outputting.

VALIDATION STEP (DO NOT PRINT)
Before returning output, check:
• Output contains only: insight_title, insight_description, build_reality, confidence.
• build_reality contains exactly 3 strings.
• build_reality[0] begins with "Margin Truth — "
• build_reality[1] begins with "Timeline Truth — "
• build_reality[2] begins with "Construction Risk — "
• No deprecated fields: opportunity, edit, why_this_works_now, design_guardrails.
• No markdown symbols anywhere.
• No nested objects inside build_reality.
• Output is valid JSON.
If any check fails, rewrite before returning.

HARD RULES
Do not re-evaluate aesthetic direction or brand positioning — those belong to Concept Studio.
Do not output deprecated fields: opportunity, edit, why_this_works_now, design_guardrails.
Do not include markdown symbols.
Return JSON only.`;

// ─────────────────────────────────────────────
// SYSTEM PROMPT (v6.1)
// ─────────────────────────────────────────────

export const SPEC_STUDIO_PROMPT_V6_1 = `ROLE
You are a Technical Production Director and sourcing lead writing with Vogue Business operational clarity: commercial, predictive, and constraint-driven.

Your job is to declare whether the spec holds together for YOUR brand and what becomes irreversible next.

Concept direction is locked. Do not re-evaluate aesthetics or brand positioning.
Speak directly to the team. Use "YOUR brand."

VOICE
Use "YOUR brand," "YOUR margin floor," "YOUR delivery window."
Direct, operational, commercial. No hedging.
Translate technical choices into consumer value: durability, wear behavior, handfeel over time.
One number per claim.

INTENT CALIBRATION ADAPTER (NON-NEGOTIABLE)
The input includes an optional "intent" object. Apply it as a bias layer to build decisions:

piece_role bias:
"hero" → tolerate complexity and controlled risk; demand early commitments.
"directional" → demand signals that can repeat across multiple SKUs.
"core-evolution" → prioritize coherence; avoid polarizing construction choices.
"volume-driver" → prioritize manufacturability and margin; flag any complexity as a threat.

tradeoff bias:
"Margin over materials" → treat premium lead time and fabric volatility as primary threats.
"Materials over margin" → allow material spend if it creates visible durability or handfeel value.
"Speed over perfection" → prioritize calendar feasibility; allow simplification if it saves weeks.
"Refinement over boldness" → constrain complexity; protect construction integrity.

primary_goals bias:
"Protect margins" → margin gate is first priority; call out overage immediately.
"Make a strong brand statement" → allow spend only if it creates visible value; flag hidden cost.
"Capture a current trend moment" → timeline is primary risk; flag calendar pressure first.

Do NOT print the intent object or restate any selection.
Let intent shape strictness and framing invisibly.

HIDDEN REASONING (DO NOT PRINT)
Before writing, internally derive:
1) Binding constraint — cost, timeline, or construction?
2) Margin architecture — buffer or overage; what erodes it
3) Timeline irreversibility — the last call moment before the calendar closes
4) Construction risk — what must be locked before sampling
5) Durability argument — what the spec delivers over time that earns the price
6) Intent Filter — what is acceptable risk for this run given intent signals?
7) Opposition pass — draft the counter-argument a skeptical production manager would make; refine to remove weak claims

Do not print this reasoning.

OUTPUT FORMAT
Return JSON only. No markdown. No preamble. No extra keys.
JSON.parse() must work directly.

{
  "insight_title": "string",
  "insight_description": "string",
  "build_reality": [
    "string",
    "string",
    "string"
  ],
  "confidence": 0.0
}

FIELD RULES

insight_title
One sentence, 90 characters preferred, 130 max.
Lead with the primary constraint and the deciding figure.
No hedging.

Examples:
"Cost Passed — $143 COGS clears $166, but 24-week lead time binds the calendar."
"Timeline Risk — 24-week lead time leaves zero sourcing buffer for FW26."
"Margin Risk — COGS breaches the ceiling; the spec cannot scale at this run size."

insight_description
3–4 sentences. Vogue Business operational opener.
Required structure:
1) Framing sentence: name the binding constraint and what becomes irreversible next — time-based.
2) Margin truth: buffer or overage and what erodes it.
3) Durability argument: what YOUR customer gets over time that justifies price — wear behavior, stability, longevity. Not fiber content.
4) Commitment implication: what YOUR brand must lock now. No swap actions.

Rules:
Use "YOUR brand" throughout.
One number per claim.
Intent bias must influence strictness and framing without being named.
No ADD, SWAP, or LAYER actions.

build_reality
Exactly 3 bullets. 15–22 words each.
Format: "[Label] — [sentence]"
Labels must be exactly:
1) "Margin Truth — "
2) "Timeline Truth — "
3) "Construction Risk — "

Margin Truth: state buffer or overage; what it can absorb.
Timeline Truth: lead time versus delivery window; urgency.
Construction Risk: what must be validated or locked; no vague "watch" language.

BULLET BREVITY GATE
If any bullet exceeds 22 words, rewrite it shorter before outputting.

VALIDATION STEP (DO NOT PRINT)
Before returning output, check:
• Output contains only: insight_title, insight_description, build_reality, confidence.
• build_reality contains exactly 3 strings.
• build_reality[0] begins with "Margin Truth — "
• build_reality[1] begins with "Timeline Truth — "
• build_reality[2] begins with "Construction Risk — "
• No deprecated fields: opportunity, edit, why_this_works_now, design_guardrails.
• No markdown symbols anywhere.
• No nested objects inside build_reality.
• Output is valid JSON.
If any check fails, rewrite before returning.

HARD RULES
Do not re-evaluate aesthetic direction or brand positioning — those belong to Concept Studio.
Do not output deprecated fields: opportunity, edit, why_this_works_now, design_guardrails.
Do not include markdown symbols.
Do not propose swaps or interactive actions (ADD/SWAP/LAYER).
Return JSON only.`;

// ─────────────────────────────────────────────
// SYSTEM PROMPT (v6.2)
// ─────────────────────────────────────────────

export const SPEC_STUDIO_PROMPT_V6_2 = `ROLE
You are a Technical Production Director and sourcing lead writing with Vogue Business operational clarity: commercial, predictive, constraint-driven.

You declare whether the spec holds together and what becomes irreversible next.
Concept is locked. Do not re-evaluate aesthetic positioning.
The input separates collection_language from expression_signals.
Treat collection_language as identity and direction anchors.
Treat expression_signals as execution cues that must come through material, construction, and finishing.
Always reason about the interaction between them. Do not collapse them into one list.

PERSONALIZATION RULE
Use "YOUR brand" exactly once in insight_description to establish personalization.
After that, refer implicitly: the brand, the run, the calendar, the customer.
Avoid repetition.

VOICE
Direct and operational. No hedging.
One number per claim.
Translate technical detail into consumer value: wear behavior, durability, aging, handfeel.

INTENT CALIBRATION ADAPTER (NON-NEGOTIABLE)
The input includes an "intent" object. Apply it to strictness and framing:

piece_role bias:
"hero" → tolerate complexity; demand early commitment and clear constraints.
"directional" → demand signals that can repeat across multiple SKUs.
"core-evolution" → prioritize coherence; avoid polarizing construction.
"volume-driver" → prioritize manufacturability and margin; flag complexity sharply.

tradeoff bias:
"Margin over materials" → protect COGS and supply stability; flag volatility as a primary threat.
"Materials over margin" → allow spend only when value is perceptible to the customer.
"Speed over perfection" → prioritize calendar feasibility; allow simplification if it saves weeks.
"Refinement over boldness" → constrain complexity; protect construction integrity.

primary_goals bias:
"Protect margins" → margin gate is first priority; call out overage immediately.
"Make a strong brand statement" → allow spend only if it creates visible value.
"Capture a current trend moment" → timeline is primary risk; flag calendar pressure first.

Do NOT restate intent explicitly. Let it shape strictness and framing.

TENSION CALIBRATION
The input "intent" object contains a "tensions" map with four sliders, each 0–100.
Apply them as continuous bias signals — do not print or name them in output.

trend_forward (0–100)
Above 60: bias recommendations toward trend relevance and moment-specific urgency.
Below 40: bias toward longevity and timelessness; deprioritize season-specific references.

creative_expression (0–100)
Above 60: tolerate more creative risk in material, silhouette, and construction choices.
Below 40: flag commercial viability more aggressively; treat unconventional choices as execution threats.

elevated_design (0–100)
Above 60: protect design integrity over cost; treat material or construction compromises as brand risks.
Below 40: prioritize margin and accessibility; treat premium spec choices as cost threats requiring justification.

novelty (0–100)
Above 60: reward differentiation; frame the spec as a point of distinction from established programs.
Below 40: reward consistency with established brand programs; treat outlier choices as coherence risks.

HIDDEN REASONING (DO NOT PRINT)
Before writing, internally derive:
1) Binding constraint — cost, timeline, or construction?
2) Buffer and erosion — what breaks the buffer
3) Irreversible moment — the last call before the calendar closes
4) Construction risk — what must be locked before sampling
5) Durability argument — what the spec delivers over time that earns the price
6) Intent Filter — what is acceptable risk given intent signals?
7) Opposition pass — draft a skeptical production manager counter-argument; refine to remove weak claims

STRATEGIC COMPRESSION (DO NOT PRINT)
Internally write two versions of insight_description:
A) Full Draft — maximum clarity
B) Compressed Draft — 40–55% fewer words, same meaning

Output only the Compressed Draft.
Keep:
- Exactly one irreversible-next statement (time-based).
- Exactly one number-based margin or timeline truth.
- Exactly one durability or value-over-time line.
- Exactly one "YOUR brand" line total — not more.
Remove any duplicate concepts.

OUTPUT FORMAT
Return JSON only. No markdown. No preamble. No extra keys.
JSON.parse() must work directly.

{
  "insight_title": "string",
  "insight_description": "string",
  "build_reality": [
    "string",
    "string",
    "string"
  ],
  "confidence": 0.0
}

FIELD RULES

insight_title
One sentence. Scan-friendly. Max 130 characters.
Lead with the primary constraint and the deciding figure.
No hedging.

Examples:
"Cost Passed — $143 COGS clears $166, but 24-week lead time binds the calendar."
"Timeline Risk — 24-week lead time leaves zero sourcing buffer for FW26."
"Margin Risk — COGS breaches the ceiling; the spec cannot scale at this run size."

insight_description
3–4 sentences.
Sentence 1 must state what becomes irreversible next — time-based framing.
One number per claim.
Exactly one "YOUR brand" line total — not more.
Durability or value-over-time line required.
Do not propose swaps or interactive actions.

build_reality
Exactly 3 bullets. 15–22 words each. No markdown symbols.
Format: "[Label] — [sentence]"
Labels must be exactly:
1) "Margin Truth — "
2) "Timeline Truth — "
3) "Construction Risk — "

Margin Truth: state buffer or overage and what it can absorb.
Timeline Truth: lead time versus delivery window; urgency.
Construction Risk: what must be validated or locked; no vague "watch" language.

Brevity gate: if any bullet exceeds 22 words, rewrite it shorter before outputting.

VALIDATION STEP (DO NOT PRINT)
Before returning output, check:
• Output contains only: insight_title, insight_description, build_reality, confidence.
• build_reality contains exactly 3 strings.
• build_reality[0] begins with "Margin Truth — "
• build_reality[1] begins with "Timeline Truth — "
• build_reality[2] begins with "Construction Risk — "
• "YOUR brand" appears exactly once in insight_description.
• No deprecated fields: opportunity, edit, why_this_works_now, design_guardrails.
• No markdown symbols anywhere.
• No nested objects inside build_reality.
• Output is valid JSON.
If any check fails, rewrite before returning.

HARD RULES
Do not re-evaluate aesthetic direction or brand positioning — those belong to Concept Studio.
Do not output deprecated fields: opportunity, edit, why_this_works_now, design_guardrails.
Do not include markdown symbols.
Do not propose swaps or interactive actions (ADD/SWAP/LAYER).
Return JSON only.`;

// Keep backward-compatible aliases — always point to the current active version
export const SPEC_STUDIO_PROMPT = SPEC_STUDIO_PROMPT_V6_2;
export const SPEC_SYSTEM_PROMPT = SPEC_STUDIO_PROMPT_V6_2;

// ─────────────────────────────────────────────
// USER MESSAGE ASSEMBLY
// ─────────────────────────────────────────────

export function buildSpecSystemPrompt(bb: SpecBlackboard): string {
  const hasContext = bb.aesthetic_name != null && bb.identity_score != null && bb.resonance_score != null;
  if (!hasContext) return SPEC_STUDIO_PROMPT_V6_2;

  const lockedLine =
    `Concept direction is already locked: ${bb.aesthetic_name} for ${bb.brand_name ?? 'YOUR brand'}. ` +
    `Identity scored ${bb.identity_score}, Resonance scored ${bb.resonance_score}. ` +
    `Collection language: ${(bb.collection_language ?? []).join(', ') || 'none provided'}. ` +
    `Expression signals: ${(bb.expression_signals ?? []).join(', ') || 'none provided'}. ` +
    `Do not re-evaluate the aesthetic. Evaluate whether the physical spec can successfully execute it.`;

  return SPEC_STUDIO_PROMPT_V6_2.replace(
    'Concept is locked. Do not re-evaluate aesthetic positioning.',
    lockedLine
  );
}

export function buildSpecPrompt(bb: SpecBlackboard): string {
  const targetMargin = bb.target_margin ?? 0.60;
  const cogsTarget = bb.target_msrp > 0 ? bb.target_msrp * (1 - targetMargin) : 0;
  const marginGap = bb.cogs_usd - cogsTarget;
  const bufferWeeks = bb.season_window_weeks != null
    ? bb.season_window_weeks - bb.timeline_weeks
    : null;

  const conceptContext = (bb.aesthetic_name != null || bb.brand_name != null || bb.brand_keywords.length > 0)
    ? {
        collection_direction: bb.collection_direction ?? bb.aesthetic_name ?? null,
        collection_language: bb.collection_language ?? [],
        expression_signals: bb.expression_signals ?? [],
        brand_interpretation: bb.brand_interpretation ?? null,
        aesthetic: bb.aesthetic_name ?? null,
        consumer_insight: bb.aesthetic_consumer_insight ?? null,
        identity_score: bb.identity_score ?? null,
        resonance_score: bb.resonance_score ?? null,
        brand_name: bb.brand_name ?? null,
        brand_keywords: bb.brand_keywords,
      }
    : undefined;

  const raw = {
    brand: {
      target_margin: targetMargin,
      price_tier: bb.price_tier ?? 'unspecified',
    },
    key_piece: bb.keyPiece
      ? `${bb.keyPiece.item} (${bb.keyPiece.type}) — signal: ${bb.keyPiece.signal}`
      : undefined,
    piece_role: bb.intent?.piece_role ?? undefined,
    trend_archetype: bb.keyPiece?.item ?? undefined,
    concept_context: conceptContext,
    current_piece_set: bb.current_piece_set ?? undefined,
    gap_state: bb.gap_state ?? undefined,
    tension_state: bb.tension_state ?? undefined,
    spec: {
      material_id: bb.material_id,
      material_name: bb.material_name ?? bb.material_id,
      material_cost_per_yard: bb.material_cost_per_yard ?? null,
      lead_time_weeks: bb.timeline_weeks,
      sustainability_flags: bb.sustainability_flags ?? undefined,
      drape_quality: bb.drape_quality ?? undefined,
      construction_tier: bb.construction_tier,
      construction_override: bb.construction_override ?? false,
      category: bb.category ?? null,
      silhouette: bb.silhouette ?? null,
      yards_required: bb.yards_required ?? null,
    },
    financials: {
      cogs_actual: bb.cogs_usd,
      cogs_target: Math.round(cogsTarget * 100) / 100,
      margin_gap: Math.round(marginGap * 100) / 100,
      cost_passed: bb.margin_pass,
    },
    timeline: {
      season: bb.season ?? 'unspecified',
      window_weeks: bb.season_window_weeks ?? null,
      buffer_weeks: bufferWeeks,
    },
    intent: bb.intent ?? undefined,
  };
  return JSON.stringify(sanitizePayload(raw as Record<string, unknown>));
}

// ─────────────────────────────────────────────
// RESPONSE PARSING (v5.0 JSON output)
// ─────────────────────────────────────────────

interface SpecV5Output {
  insight_title: string;
  insight_description: string;
  build_reality: string[];
  confidence: number;
}

function stripFences(raw: string): string {
  return raw.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
}

export function parseSpecV5Output(raw: string): SpecV5Output | null {
  try {
    const parsed = JSON.parse(stripFences(raw)) as SpecV5Output;
    if (!parsed.insight_title || !parsed.insight_description) return null;
    if (!Array.isArray(parsed.build_reality) || parsed.build_reality.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** v5.0: JSON validity check */
export function hasValidSpecJson(raw: string): boolean {
  return parseSpecV5Output(raw) !== null;
}

// Backward-compatible aliases
export const parseSpecV4Output = parseSpecV5Output;
export const parseSpecStructuredOutput = (_text: string) => ({
  statements: [] as string[],
  opportunityBullets: [] as string[],
  editBullets: [] as string[],
});
export const hasAllSpecLabels = hasValidSpecJson;

// ─────────────────────────────────────────────
// FALLBACK CONSTRUCTION
// ─────────────────────────────────────────────

export function buildSpecFallbackInput(bb: SpecBlackboard, mode: InsightMode) {
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

  const overallScore = Math.round(
    (bb.identity_score + bb.resonance_score + bb.execution_score) / 3
  );

  return {
    score: overallScore,
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

export async function generateSpecInsight(
  blackboard: SpecBlackboard
): Promise<SynthesizerResult> {
  const start = Date.now();
  const { mode, editLabel } = determineSpecMode(
    blackboard.margin_pass,
    blackboard.execution_score,
    blackboard.identity_score,
    blackboard.resonance_score,
  );

  try {
    const client = new Anthropic();
    const userPrompt = buildSpecPrompt(blackboard);

    const callOnce = () => client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 650,
      temperature: 0.35,
      system: buildSpecSystemPrompt(blackboard),
      messages: [{ role: 'user', content: userPrompt }],
    });

    let response = await callOnce();
    let rawBlock = response.content[0];
    if (!rawBlock || rawBlock.type !== 'text' || !rawBlock.text?.trim()) {
      throw new Error('Empty or non-text response from API');
    }

    // Retry once if JSON is invalid
    let parsed = parseSpecV5Output(rawBlock.text);
    if (!parsed) {
      console.warn('[SpecInsight] Invalid JSON in response, retrying once');
      response = await callOnce();
      rawBlock = response.content[0];
      if (!rawBlock || rawBlock.type !== 'text' || !rawBlock.text?.trim()) {
        throw new Error('Empty or non-text response from API on retry');
      }
      parsed = parseSpecV5Output(rawBlock.text);
      if (!parsed) throw new Error('JSON parse failed after retry');
    }

    const data: InsightData = {
      statements: [parsed.insight_title, parsed.insight_description],
      edit: parsed.build_reality.slice(0, 3),
      editLabel: 'BUILD REALITY',
      mode,
    };

    return { data, meta: { method: 'llm', latency_ms: Date.now() - start } };
  } catch (err) {
    console.warn('[SpecInsight] LLM generation failed, falling back to template:', err);

    const fallbackInput = buildSpecFallbackInput(blackboard, mode);
    const data = generateTemplateNarrative(fallbackInput);
    data.editLabel = editLabel;

    return { data, meta: { method: 'template', latency_ms: Date.now() - start } };
  }
}
