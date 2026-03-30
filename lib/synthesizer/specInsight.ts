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
  /** Allowed material options from the library */
  available_materials: Array<{ id: string; name: string }>;
  /** Human-readable material name */
  material_name?: string;
  /** Calculated cost of goods sold in USD */
  cogs_usd: number;
  /** Designer's target MSRP in USD */
  target_msrp: number;
  /** Margin buffer in USD after COGS ceiling is applied */
  margin_buffer?: number;
  /** True when the margin gate passes */
  margin_pass: boolean;
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
// SYSTEM PROMPT (v7.0)
// ─────────────────────────────────────────────

export const SPEC_STUDIO_PROMPT_V7 = `ROLE
You are a product, merch, and production director making a call on whether a fashion spec should move forward.

This is decision intelligence, not descriptive commentary.
You must judge viability, name the real pressure point, and recommend the next move.

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
Your job is to synthesize around it, sharpen it, and make the call more useful.
Treat pulse telemetry as supporting evidence.
Use it to strengthen implication and confidence, but do not simply restate pulse labels back to the user unless absolutely necessary.

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
- headline must address whether the material is the right carrier for the collection direction — not just whether it is feasible.
- core_tension must name the specific material behavior tension: drape vs structure, cost vs surface quality, lead time vs availability. Name the material by name.
- execution_levers must be actionable at the material selection stage: what to look for in this material, what to avoid, what the surface story should do.
- alternative_path must name a specific different material (not a category) and state exactly what it preserves and what it costs.
- Any material named in alternative_path must come from the allowed materials list provided in the user message.

When current_step is "construction":
Focus question: does the build complexity match what the concept needs to read correctly, and can it land on time?
- headline must address the relationship between construction choice and the collection read — is the complexity earning its cost in the finished piece?
- core_tension must name the specific construction tension: what the build is adding vs what the timeline can absorb. Use the actual timmbers (available_timeline_weeks, required_timeline_weeks, timeline_gap_weeks).
- execution_levers must be actionable at the construction stage: where to concentrate complexity, what to simplify, which details earn their place.
- alternative_path must name a specific construction tier change and state what is preserved in the read and what weeks or cost it recovers.

When current_step is "execution":
Focus question: given everything locked, is this piece viable and what is the single most important thing to get right?
- headline must deliver a verdict on the full spec — not restate the tension, resolve it.
- core_tension must name the binding constraint: the one variable that, if it slips, collapses the viability. Name it specifically.
- execution_levers must be the three most critical production decisions between now and delivery. Each must be actionable by a design and production team today.
- alternative_path at execution step: only include if there is a genuinely actionab path that recovers viability. If the spec is viable, set alternative_path.title to null.

When current_step is null or unrecognized:
Default to construction step behavior.

HIDDEN REASONING
Before writing, determine:
1. Is the build actually viable, or only superficially coherent?
2. What is the non-obvious tension created by the interaction of role, carrier, burden, margin, and calendar?
3. Is the current burden justified for this piece role?
4. What move protects the idea with less operational drag?

Do not print this reasoning.

OUTPUT
Return valid JSON only. No markdown. No extra keys.

{
  "feasibility_stance": "strong" | "viable" | "viable_with_constraints" | "strained" | "not_recommended",
  "headline": "string",
  "core_tension": "string",
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
    "description": "string"
  }
}

FIELD RULES
- headline: one crisp hero line for the rail. Make a call.
- core_tension: name the real interaction that is creating pressure now.
- feasibility_breakdown: reflect the actual build state, not a softened summary.
- decision.reason: explain why the recommended direction is the right operational move.
- execution_levers: exactly 3 concise, precise, actionable moves.
- alternative_path.title: max 8 words. Name the path, not the problem.
  Good: "Preserve the read, reduce the build"
  Bad: "Consider a simpler construction approach"

- alternative_path.description: 2–3 sentences max. Must do all three:
  1. Name the specific thing to remove or downgrade (material,
     construction tier, or finish detail — not a category).
  2. State what is preserved by making that change (the silhouette
     read, the proportion, the surface story).
  3. State the concrete outcome (margin recovered, weeks saved,
     complexity tier reached).
  If feasibility_stance is "strained" or "not_recommended", a design
  and production team must be able to act on this description without
  asking a follow-up question. If they would need to ask "but which
  specific detail?", rewrite it until they would not.
  Do not restate the problem. Do not use: "consider", "you might",
  "it may be worth", "think about". State the path directly.
  If decision.direction is "swap_material", name one exact allowed material.

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
  const cogsTarget = bb.target_msrp > 0 ? bb.target_msrp * (1 - targetMargin) : 0;
  const marginGap = bb.cogs_usd - cogsTarget;
  const marginBuffer = bb.margin_buffer ?? Math.round((cogsTarget - bb.cogs_usd) * 100) / 100;

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
      cogs_target: Math.round(cogsTarget * 100) / 100,
      margin_buffer: marginBuffer,
      margin_gap: Math.round(marginGap * 100) / 100,
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
    rail.core_tension,
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
    isNonEmptyString(record.core_tension) &&
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
    target_msrp: bb.target_msrp,
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
