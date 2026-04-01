// lib/synthesizer/specInsight.ts
// Generates a Pulse Rail insight for the Spec Studio surface.
//
// Fires when: Execution Pulse is active (Step 3), after Calculator + Researcher Stage 2
// Persona: Technical Production Director — timeline, cost, material reality
//
// Output: JSON → mapped to the live Spec right rail contract
// Fallback: deterministic decision layer using the same schema

import Anthropic from '@anthropic-ai/sdk';
import type { InsightData, InsightMode } from '@/lib/types/insight';
import type { AestheticContext, ResolvedRedirects, IntentCalibration } from '@/lib/synthesizer/blackboard';
import {
  findMaterialMention,
  materialIdsToDisplayList,
} from '@/lib/spec-studio/material-resolver';
import {
  buildFallbackSpecRail,
  mapSpecRailToInsightData,
  type SpecDecisionDiagnostics,
  type SpecRailInsight,
  type SpecStepId,
} from '@/lib/synthesizer/specDecision';

export interface SpecPulseEvidence {
  identity: string;
  commercial_potential: string;
  execution: string;
  saturation: string;
}

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
  /** Previously selected material ID — used to prevent circular Better Path recommendations */
  previous_material_id?: string | null;
  /** Human-readable name of the previously selected material */
  previous_material_name?: string | null;
  /** Allowed material options from the library */
  available_materials: Array<{ id: string; name: string }>;
  /** Human-readable material name */
  material_name?: string;
  /** Calculated cost of goods sold in USD */
  cogs_usd: number;
  /** Designer's target MSRP in USD */
  target_msrp: number | null;
  /** Margin buffer in USD after COGS ceiling is applied */
  margin_buffer?: number;
  /** True when the margin gate passes */
  margin_pass: boolean | null;
  /** Selected construction tier label */
  construction_tier: string;
  /** Execution score 0–100 */
  execution_score: number;
  /** Available development / delivery window in weeks */
  timeline_weeks: number;
  /** Estimated required production weeks once lead time + build complexity are combined */
  required_timeline_weeks?: number;
  /** Positive means remaining buffer; negative means the spec exceeds the available window */
  timeline_gap_weeks?: number;
  /** Yards required for this category (from categories.json) */
  yards_required?: number;
  /** True when user overrode the smart-default construction tier */
  construction_override?: boolean;
  /** Active Spec Studio step when the decision was generated */
  current_step?: SpecStepId;
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
  /** Pulse telemetry passed as evidence, not interpretation */
  pulse?: SpecPulseEvidence;
  /** Deterministic interpreted layer computed client-side before synthesis */
  diagnostics: SpecDecisionDiagnostics;
  /** Resolved redirects — both brand_mismatch and cost_reduction */
  resolved_redirects: ResolvedRedirects;
  /** Optional intent calibration from the designer's Intent page selections */
  intent?: IntentCalibration;
}

export interface SynthesizerResult {
  rail: SpecRailInsight;
  data: InsightData;
  meta: { method: 'llm' | 'template'; latency_ms: number };
}

// ─────────────────────────────────────────────
// MODE LOGIC
// ─────────────────────────────────────────────

export function determineSpecMode(
  margin_pass: boolean | null,
  execution_score: number,
  identity_score?: number | null,
  resonance_score?: number | null,
): { mode: InsightMode; editLabel: string } {
  // Null/undefined score inputs default to 'invest' (preserves prior behavior)
  if (execution_score == null || isNaN(execution_score)) {
    return { mode: 'invest', editLabel: 'WHY THIS WORKS NOW' };
  }

  // amplify: margin_pass AND execution_score >= 85 AND identity_score >= 80
  if (margin_pass === true && execution_score >= 85 && identity_score != null && identity_score >= 80) {
    return { mode: 'amplify', editLabel: 'WHY THIS WORKS NOW' };
  }

  // invest: margin_pass AND execution_score >= 70
  if (margin_pass === true && execution_score >= 70) {
    return { mode: 'invest', editLabel: 'WHY THIS WORKS NOW' };
  }

  // differentiate: margin_pass AND 50 <= execution_score < 70
  if (margin_pass === true && execution_score >= 50) {
    return { mode: 'differentiate', editLabel: 'WHY THIS WORKS NOW' };
  }

  // reconsider: NOT margin_pass AND execution_score >= 70
  if (margin_pass === false && execution_score >= 70) {
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
// SYSTEM PROMPT (v7.0)
// ─────────────────────────────────────────────

export const SPEC_STUDIO_PROMPT_V7 = `ROLE
You are Muko's spec strategist. Your job is to accurately report what the data shows: positive, neutral, or critical.
A strong spec deserves a strong verdict. A clear all-clear is a signal, not a failure to analyze.

This is decision intelligence, not descriptive commentary.
Concept direction is already locked.
Do not re-evaluate trend relevance, taste level, or brand positioning.

The input includes:
- concept context
- piece role
- material behavior
- construction level
- feasibility numbers
- pulse telemetry
- a deterministic diagnostics layer

Treat the diagnostics layer as grounded signal, not optional flavor.
Treat pulse telemetry as supporting evidence.
Use it to strengthen implication and confidence, but do not simply restate pulse labels unless necessary.

REGISTERS
You have four registers available. Use the one the data supports.

All-clear:
- Use when identity is strong, execution is viable, cost is healthy, and no genuine material or construction tension exists.
- feasibility_stance should usually be "viable" or "strong", whichever best matches the diagnostics.
- headline states what is working and why.
- core_tension is null. Do not invent tension to fill the field.
- execution_levers are positive specificity notes: what to get right to preserve what is working.
- alternative_path.title must be "Material selection is working. No swap suggested."

Watch:
- Use when identity/resonance are strong and one execution constraint is manageable.
- feasibility_stance should usually be "viable_with_constraints".
- headline states what is working.
- core_tension names the one constraint precisely in one sentence. Do not amplify it.
- execution_levers address that constraint directly.
- alternative_path offers a genuine swap only if it actually resolves the constraint.

Redirect:
- Use when material, construction, or execution is actively working against the direction.
- feasibility_stance should usually be "strained".
- headline names the misalignment specifically.
- core_tension explains why.
- alternative_path is a concrete, viable swap with a clear reason.

Critical:
- Use when the cost gate failed, timeline is untenable, or identity is fundamentally misaligned.
- feasibility_stance should usually be "not_recommended".
- headline is direct about the failure.
- Every field addresses the specific failure mode.

FALSIFIABILITY RULE
Every sentence must be specific to this piece's data.
If you could swap a sentence into any other piece's read without losing meaning, rewrite it.
"The material carries the direction" with no further specificity is a failure.
"Tencel at low construction carries the drape without adding execution pressure" is a pass.

VOICE
- Calm
- Sharp
- Editorial
- Operationally literate
- Decisive
- Restrained

WRITING RULES
- Every sentence must reflect interaction between variables.
- Do not state generic truths such as "higher complexity increases cost."
- Do not explain the scoring system.
- Do not echo the input back line by line.
- Do not give trend copy, poetic copy, or motivational copy.
- Preserve the same idea when proposing an alternative path. Do not switch aesthetics.
- If the spec is strained, the alternative path must be concrete enough that a design and production team could act on it.
- Never mention internal field names such as next_best_move or best_next_move.

STEP-SPECIFIC FOCUS (NON-NEGOTIABLE)
current_step tells you what decision the designer is actively making.
Calibrate every output field to that decision.

When current_step is "material":
Focus question: does this material carry the concept, and what does it cost?
- headline must address whether the material is the right carrier for the collection direction, not just whether it is feasible.
- core_tension must name the specific material behavior tension only if one genuinely exists. Name the material by name.
- execution_levers must be actionable at the material selection stage: what to preserve, what to verify, and what surface behavior this material must deliver.
- alternative_path must name a specific different material only when a swap is warranted.
- Any material named in alternative_path must come from the allowed materials list provided in the user message.

When current_step is "construction":
Focus question: does the build complexity match what the concept needs to read correctly, and can it land on time?
- headline must address the relationship between construction choice and the collection read.
- core_tension must name the specific construction tension only if one genuinely exists. Use the actual numbers when timeline is the issue.
- execution_levers must be actionable at the construction stage: where to concentrate complexity, what to simplify, and what detail is worth protecting.
- alternative_path must name a specific construction tier change only when a tier change is warranted.

When current_step is "execution":
Focus question: given everything locked, is this piece viable and what is the single most important thing to get right?
- headline must deliver a verdict on the full spec.
- core_tension must name the binding constraint only if one truly exists.
- execution_levers must be the three most important production decisions between now and delivery.
- alternative_path should only redirect if there is a genuinely actionable path that recovers viability.

When current_step is null or unrecognized:
Default to construction step behavior.

OUTPUT
Return valid JSON only. No markdown. No extra keys.

{
  "feasibility_stance": "strong" | "viable" | "viable_with_constraints" | "strained" | "not_recommended",
  "headline": "string",
  "core_tension": "string | null",
  "feasibility_breakdown": {
    "cost": "healthy" | "workable" | "tight" | "negative",
    "timeline": "on_track" | "tight" | "at_risk",
    "complexity": "low" | "moderate" | "high"
  },
  "decision": {
    "direction": "hold" | "simplify" | "reallocate" | "downgrade_construction" | "swap_material" | "refocus_finish",
    "reason": "string"
  },
  "execution_levers": ["string", "string", "string"],
  "alternative_path": {
    "title": "string",
    "description": "string",
    "dimension": "material" | "construction" | "execution",
    "target_tier": "low" | "moderate" | "high" | null,
    "method": "string | null"
  }
}

FIELD RULES
- headline: one crisp hero line for the rail. Make a clear call.
- core_tension: return null if feasibility_stance is "viable" or "strong" and no genuine tension exists. Do not invent tension to fill this field.
- feasibility_breakdown: reflect the actual build state, not a softened summary.
- decision.reason: explain why the recommended direction is the right operational move.
- execution_levers: exactly 3 concise, precise, actionable notes for what to get right given the current selection. These are preservation notes when the spec is working, correction notes when it is not. They must be specific to the current material, construction tier, and category, not generic production advice.
- alternative_path.dimension: classify the recommendation. Use "construction" for a construction method or tier change, "material" for a material swap, and "execution" for all other cases.
- alternative_path.target_tier: only when dimension is "construction". Set to null otherwise.
- alternative_path.method: only when dimension is "construction". Set to null otherwise.
- alternative_path.title: max 8 words. Name the path, not the problem.
- alternative_path.description: 2-3 sentences max. If the current route is working, say so directly and name a fallback only if helpful. If the route is not working, name the specific change, what it preserves, and the concrete operational outcome.
- If decision.direction is "swap_material", name one exact allowed material.

EXAMPLES
Example 1 — All-clear
{
  "feasibility_stance": "viable",
  "headline": "Tencel at low construction is the right call for this direction.",
  "core_tension": null,
  "decision": {
    "direction": "hold",
    "reason": "The material carries the drape the direction needs without adding execution pressure. Cost buffer gives room to move on finishing if the sample asks for it."
  },
  "feasibility_breakdown": {
    "cost": "healthy",
    "timeline": "on_track",
    "complexity": "low"
  },
  "execution_levers": [
    "Confirm fabric weight at sampling: Tencel varies significantly in drape across mills, and this silhouette depends on landing fluid rather than stiff.",
    "Lock colorway at material stage: natural undyed or garment-washed treatments preserve the direction better than a bright uniform dye.",
    "Specify finish treatment in the brief now: this material is easier to correct before sampling than after."
  ],
  "alternative_path": {
    "title": "Material selection is working. No swap suggested.",
    "description": "Tencel is the right material for this direction. If cost pressure increases, Linen is a viable fallback at similar drape with lower cost per yard.",
    "dimension": "material",
    "target_tier": null,
    "method": null
  }
}

Example 2 — Watch
{
  "feasibility_stance": "viable_with_constraints",
  "headline": "The direction is right. Timeline is the only real watch here.",
  "core_tension": "Two weeks of buffer at high construction does not absorb a single production delay. The material and aesthetic are working; this is a calendar question.",
  "decision": {
    "direction": "downgrade_construction",
    "reason": "Identity and resonance are strong. Execution is manageable if sampling starts immediately or the build drops one tier."
  },
  "feasibility_breakdown": {
    "cost": "healthy",
    "timeline": "tight",
    "complexity": "high"
  },
  "execution_levers": [
    "Start sampling this week: one delay eliminates the remaining buffer entirely.",
    "Confirm whether moderate construction preserves the silhouette before locking the factory path.",
    "Pre-select the backup construction tier now so the team is not debating it after the first sample slips."
  ],
  "alternative_path": {
    "title": "Drop to moderate construction",
    "description": "Shifting to moderate recovers timeline without touching the material or the margin. The silhouette stays intact and the calendar pressure eases immediately.",
    "dimension": "construction",
    "target_tier": "moderate",
    "method": "moderate complexity"
  }
}

Example 3 — Redirect
{
  "feasibility_stance": "strained",
  "headline": "Conventional denim can hold the silhouette but cannot carry the sensual drape this direction needs.",
  "core_tension": "Denim's structure and weight resist the fluid movement the concept requires. The silhouette is doing the conceptual work, but the material suppresses the surface behavior that makes the direction legible at point of sale.",
  "decision": {
    "direction": "swap_material",
    "reason": "Cost buffer is healthy and timeline is on track, so there is room to move into a material that earns the collection language without adding pressure."
  },
  "feasibility_breakdown": {
    "cost": "healthy",
    "timeline": "on_track",
    "complexity": "low"
  },
  "execution_levers": [
    "Redirect toward Tencel or Linen only if either is in allowed_materials and actually preserves the intended silhouette for this category.",
    "Confirm drape behavior at sampling regardless of material selected: this direction lives or dies on surface movement.",
    "Lock material before confirming construction tier because the right material may reduce the build burden needed."
  ],
  "alternative_path": {
    "title": "Swap into Tencel",
    "description": "Move from denim into Tencel at the same low construction tier. The silhouette stays intact, the surface story becomes visibly more fluid, and the current buffer absorbs the material premium.",
    "dimension": "material",
    "target_tier": null,
    "method": null
  }
}

VALIDATION
- Use only the enum values provided.
- execution_levers must contain exactly 3 strings.
- Do not return filler such as "monitor closely" or "ensure alignment."
- Do not output markdown or preamble text.
- Ensure JSON.parse() works directly.`;

// Keep backward-compatible aliases — always point to the current active version
export const SPEC_STUDIO_PROMPT = SPEC_STUDIO_PROMPT_V7;
export const SPEC_SYSTEM_PROMPT = SPEC_STUDIO_PROMPT_V7;

// ─────────────────────────────────────────────
// USER MESSAGE ASSEMBLY
// ─────────────────────────────────────────────

export function buildSpecSystemPrompt(bb: SpecBlackboard): string {
  const hasContext = bb.aesthetic_name != null && bb.identity_score != null && bb.resonance_score != null;
  if (!hasContext) return SPEC_STUDIO_PROMPT_V7;

  const lockedLine =
    `Concept direction is already locked: ${bb.aesthetic_name} for ${bb.brand_name ?? 'the brand'}. ` +
    `Identity scored ${bb.identity_score}, Resonance scored ${bb.resonance_score}. ` +
    `Collection language: ${(bb.collection_language ?? []).join(', ') || 'none provided'}. ` +
    `Expression signals: ${(bb.expression_signals ?? []).join(', ') || 'none provided'}. ` +
    `The diagnostics layer already contains a deterministic read on carrier, burden, buffer, timeline, and likely failure mode. Use it as grounded signal, then sharpen the decision.`;

  return `${SPEC_STUDIO_PROMPT_V7}\n\nLOCKED CONTEXT\n${lockedLine}`;
}

export function buildSpecPrompt(bb: SpecBlackboard): string {
  const availableMaterials = Array.isArray(bb.available_materials) ? bb.available_materials : [];
  const targetMargin = bb.target_margin ?? 0.60;
  const effectiveTargetMsrp = bb.target_msrp != null && bb.target_msrp > 0 ? bb.target_msrp : null;
  const cogsTarget = effectiveTargetMsrp != null ? effectiveTargetMsrp * (1 - targetMargin) : 0;
  const marginGap = effectiveTargetMsrp != null ? bb.cogs_usd - cogsTarget : null;
  const marginBuffer = effectiveTargetMsrp != null
    ? (bb.margin_buffer ?? Math.round((cogsTarget - bb.cogs_usd) * 100) / 100)
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
      name: bb.brand_name ?? null,
      target_margin: targetMargin,
      price_tier: bb.price_tier ?? 'unspecified',
    },
    current_step: bb.current_step ?? null,
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
      ...(bb.previous_material_name
        ? { excluded_from_better_path: `The user previously had ${bb.previous_material_name} selected and swapped away from it. Do not recommend ${bb.previous_material_name} as a Better Path suggestion under any circumstances.` }
        : {}),
      allowed_materials: availableMaterials,
      allowed_materials_display: materialIdsToDisplayList(availableMaterials),
      material_cost_per_yard: bb.material_cost_per_yard ?? null,
      available_timeline_weeks: bb.timeline_weeks,
      required_timeline_weeks: bb.required_timeline_weeks ?? null,
      timeline_gap_weeks: bb.timeline_gap_weeks ?? null,
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
      cogs_target: effectiveTargetMsrp != null ? Math.round(cogsTarget * 100) / 100 : null,
      margin_buffer: marginBuffer,
      margin_gap: marginGap != null ? Math.round(marginGap * 100) / 100 : null,
      cost_passed: bb.margin_pass,
    },
    feasibility: {
      season: bb.season ?? 'unspecified',
      cost_status: bb.diagnostics.buffer_status,
      timeline_status: bb.diagnostics.timeline_status,
      complexity: bb.diagnostics.complexity_level,
    },
    pulse: bb.pulse ?? undefined,
    diagnostics: bb.diagnostics,
    intent: bb.intent ?? undefined,
  };
  return JSON.stringify(sanitizePayload(raw as Record<string, unknown>));
}

function railLeaksInternalFieldNames(rail: SpecRailInsight): boolean {
  const content = [
    rail.headline,
    rail.core_tension ?? '',
    rail.decision.reason,
    rail.alternative_path.title,
    rail.alternative_path.description,
    ...rail.execution_levers,
  ].join(' ').toLowerCase();

  return content.includes('next_best_move') || content.includes('best_next_move');
}

function railHasValidMaterialSwap(rail: SpecRailInsight, bb: SpecBlackboard): boolean {
  if (rail.decision.direction !== 'swap_material') return true;
  if (!Array.isArray(bb.available_materials) || bb.available_materials.length === 0) return false;
  const source = `${rail.alternative_path.title} ${rail.alternative_path.description}`;
  const material = findMaterialMention(source, bb.available_materials);
  return Boolean(material && material.id !== bb.material_id);
}

export function validateSpecRailOutput(rail: SpecRailInsight, bb: SpecBlackboard): boolean {
  if (railLeaksInternalFieldNames(rail)) return false;
  if (!railHasValidMaterialSwap(rail, bb)) return false;
  return true;
}

// ─────────────────────────────────────────────
// RESPONSE PARSING (v7.0 JSON output)
// ─────────────────────────────────────────────

function stripFences(raw: string): string {
  return raw.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
}

function extractJsonObject(raw: string): string {
  const stripped = stripFences(raw);
  const firstBrace = stripped.indexOf('{');
  const lastBrace = stripped.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return stripped;
  }
  return stripped.slice(firstBrace, lastBrace + 1);
}

function isEnumValue<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === 'string' && allowed.includes(value as T[number]);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

const FEASIBILITY_STANCES = ['strong', 'viable', 'viable_with_constraints', 'strained', 'not_recommended'] as const;
const BUFFER_STATUSES = ['healthy', 'workable', 'tight', 'negative'] as const;
const TIMELINE_STATUSES = ['on_track', 'tight', 'at_risk'] as const;
const COMPLEXITY_LEVELS = ['low', 'moderate', 'high'] as const;
const DECISION_DIRECTIONS = ['hold', 'simplify', 'reallocate', 'downgrade_construction', 'swap_material', 'refocus_finish'] as const;

function isSpecRailInsight(value: unknown): value is SpecRailInsight {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const breakdown = record.feasibility_breakdown as Record<string, unknown> | undefined;
  const decision = record.decision as Record<string, unknown> | undefined;
  const alternative = record.alternative_path as Record<string, unknown> | undefined;

  return (
    isEnumValue(record.feasibility_stance, FEASIBILITY_STANCES) &&
    isNonEmptyString(record.headline) &&
    (record.core_tension === null || isNonEmptyString(record.core_tension)) &&
    Boolean(breakdown) &&
    isEnumValue(breakdown?.cost, BUFFER_STATUSES) &&
    isEnumValue(breakdown?.timeline, TIMELINE_STATUSES) &&
    isEnumValue(breakdown?.complexity, COMPLEXITY_LEVELS) &&
    Boolean(decision) &&
    isEnumValue(decision?.direction, DECISION_DIRECTIONS) &&
    isNonEmptyString(decision?.reason) &&
    Array.isArray(record.execution_levers) &&
    record.execution_levers.length === 3 &&
    record.execution_levers.every(isNonEmptyString) &&
    Boolean(alternative) &&
    typeof alternative?.title === 'string' &&
    typeof alternative?.description === 'string'
  );
}

export function parseSpecRailOutput(raw: string): SpecRailInsight | null {
  try {
    const parsed = JSON.parse(extractJsonObject(raw)) as unknown;
    return isSpecRailInsight(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function hasValidSpecJson(raw: string): boolean {
  return parseSpecRailOutput(raw) !== null;
}

// Backward-compatible aliases
export const parseSpecV4Output = parseSpecRailOutput;
export const parseSpecStructuredOutput = (_text: string) => ({
  statements: [] as string[],
  opportunityBullets: [] as string[],
  editBullets: [] as string[],
});
export const hasAllSpecLabels = hasValidSpecJson;

// ─────────────────────────────────────────────
// FALLBACK CONSTRUCTION
// ─────────────────────────────────────────────

export function buildSpecFallbackRail(bb: SpecBlackboard): SpecRailInsight {
  return buildFallbackSpecRail({
    material_name: bb.material_name,
    material_id: bb.material_id,
    category: bb.category,
    silhouette: bb.silhouette,
    construction_tier: bb.construction_tier,
    target_msrp: bb.target_msrp != null && bb.target_msrp > 0 ? bb.target_msrp : 0,
    cogs_usd: bb.cogs_usd,
    timeline_weeks: bb.timeline_weeks,
    required_timeline_weeks: bb.required_timeline_weeks,
    timeline_gap_weeks: bb.timeline_gap_weeks,
    brand_name: bb.brand_name,
    keyPiece: bb.keyPiece,
    diagnostics: bb.diagnostics,
    resolved_redirects: {
      cost_reduction: bb.resolved_redirects.cost_reduction,
    },
  });
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────

export async function generateSpecInsight(
  blackboard: SpecBlackboard
): Promise<SynthesizerResult> {
  const start = Date.now();
  const { mode } = determineSpecMode(
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
    let parsed = parseSpecRailOutput(rawBlock.text);
    if (!parsed) {
      console.warn('[SpecInsight] Invalid JSON in response, retrying once');
      response = await callOnce();
      rawBlock = response.content[0];
      if (!rawBlock || rawBlock.type !== 'text' || !rawBlock.text?.trim()) {
        throw new Error('Empty or non-text response from API on retry');
      }
      parsed = parseSpecRailOutput(rawBlock.text);
      if (!parsed) throw new Error('JSON parse failed after retry');
    }

    const data: InsightData = mapSpecRailToInsightData(parsed, mode);

    if (!validateSpecRailOutput(parsed, blackboard)) {
      throw new Error('Spec rail validation failed');
    }

    return { rail: parsed, data, meta: { method: 'llm', latency_ms: Date.now() - start } };
  } catch (err) {
    console.warn('[SpecInsight] LLM generation failed, falling back to deterministic decision layer:', err);

    const rail = buildSpecFallbackRail(blackboard);
    const data = mapSpecRailToInsightData(rail, mode);

    return { rail, data, meta: { method: 'template', latency_ms: Date.now() - start } };
  }
}
