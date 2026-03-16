// lib/agents/orchestrator.ts
// Muko Master Orchestrator — v1.0.0
//
// PURPOSE: Ties all five agents together in a sequential pipeline and persists
// the full result to Supabase. Each agent call is wrapped in try/catch so a
// single failure degrades gracefully without aborting the run.
//
// PIPELINE:
//   researcher.findAestheticMatch  →  aesthetic_matched_id, keywords, saturation, velocity
//   researcher.findCategoryTrend   →  category_saturation, category_velocity
//   critic.scoreIdentity           →  identity_score, tension_flags
//   researcher.scoreResonance      →  resonance_score
//   calculator.scoreExecution      →  execution_score, timeline_buffer
//   calculator.calculateCOGS       →  cogs
//   calculator.checkMarginGate     →  gate_passed, cogs_delta
//   finalScore                     →  weighted blend + margin penalty
//   redirects.selectRedirect       →  redirect object | null
//   synthesizer.generateNarrative  →  narrative string
//   persist                        →  Supabase `analyses` row

import { createClient } from '@/lib/supabase/server';
import type { IntentCalibration } from '@/lib/synthesizer/blackboard';
import { generateReportNarrative } from '@/lib/synthesizer/reportNarrative';
import type { ReportBlackboard } from '@/lib/synthesizer/reportNarrative';
import { resolveAestheticContext } from '@/lib/synthesizer/assemble';
import { matchAestheticId } from '@/lib/agents/matchAesthetic';
import { findAestheticMatch, getResonanceScore } from '@/lib/agents/researcher';
import type { Aesthetic } from '@/lib/agents/researcher';
import { checkBrandAlignment } from '@/lib/agents/critic';
import { selectRedirect } from '@/lib/agents/redirects';
import { calculateCOGS, checkExecutionFeasibility, applyRoleModifiers } from '@/lib/spec-studio/calculator';
import { calculateMukoScore } from '@/lib/scoring/calculateMukoScore';
import materialsRaw from '@/data/materials.json';
import categoriesRaw from '@/data/categories.json';

// ─── Agent version manifest ───────────────────────────────────────────────────
// Bump the relevant string manually when you ship logic changes to an agent.

export const AGENT_VERSIONS = {
  orchestrator: '1.0.0',
  calculator:   '1.0.0',
  researcher:   '1.0.0',
  critic:       '1.0.0',
  synthesizer:  '1.0.0',
} as const;

// ─── Public types ─────────────────────────────────────────────────────────────

export interface AnalysisInput {
  aesthetic_input:   string;
  material_id:       string;
  silhouette:        string;
  construction_tier: 'low' | 'moderate' | 'high';
  category:          string;
  target_msrp:       number;
  season:            string;
  collection_name:   string;
  timeline_weeks:    number;
  lined?:            boolean;
}

export interface BrandProfile {
  id:               string | null;
  brand_name:       string;
  keywords:         string[];
  customer_profile: string | null;
  price_tier:       'Contemporary' | 'Bridge' | 'Luxury';
  target_margin:    number;
  tension_context:  string | null;
  accepts_conflicts?:   boolean;
  // v1.1 Critic fields — populated once DB migration adds these columns
  brand_description?:   string | null;
  reference_brands?:    string[];
  excluded_brands?:     string[];
  excluded_aesthetics?: string[];
}

/** Minimal Zustand blackboard shape the orchestrator needs for narrative generation. */
export interface SessionState {
  collectionName:    string;
  season:            string;
  selectedAesthetic: string | null;
  selectedElements:  string[];
  category:          string | null;
  targetMSRP:        number | null;
  materialId:        string | null;
  silhouette:        string | null;
  constructionTier:  'low' | 'moderate' | 'high' | null;
  timelineWeeks:     number | null;
  collectionRole:    'hero' | 'directional' | 'core-evolution' | 'volume-driver' | null;
  [key: string]: unknown; // open for future fields without breaking the type
}

export interface AnalysisResult {
  score:              number;
  dimensions: {
    identity:   number;
    resonance:  number;
    execution:  number;
  };
  gates_passed: {
    cost:           boolean;
    sustainability: null;
  };
  narrative:          string;
  redirect:           RedirectObject | null;
  agent_versions:     typeof AGENT_VERSIONS;
  aesthetic_matched_id: string | null;
  errors:             AgentError[];
  /** Supabase row id set after a successful persist; null if persist failed or was skipped. */
  analysis_id:        string | null;
}

export interface RedirectObject {
  type:       string;
  suggestion: string;
  reason:     string;
}

export interface AgentError {
  agent:   string;
  message: string;
}

// ─── Internal pipeline blackboard ─────────────────────────────────────────────
// Accumulated as each stage completes.  Passed to synthesizer at the end.

export interface PipelineBlackboard {
  input:                AnalysisInput;
  brand:                BrandProfile;
  session:              SessionState;

  // Step 1 — aesthetic match
  aesthetic_matched_id: string | null;
  is_proxy_match:       boolean;
  aesthetic_keywords:   string[];
  saturation_score:     number;
  trend_velocity:       string;

  // Step 2 — category trend
  category_saturation:  number;
  category_velocity:    string;

  // Step 3 — identity
  identity_score:           number;
  tension_flags:            string[];
  critic_conflict_detected: boolean;
  critic_conflict_ids:      string[];
  critic_llm_used:          boolean;
  critic_reasoning:         string;

  // Step 4 — resonance
  resonance_score:      number;

  // Step 5 — execution
  execution_score:      number;
  timeline_buffer:      number;

  // Step 6 — COGS
  cogs:                 number;

  // Step 7 — margin gate
  gate_passed:          boolean;
  cogs_delta:           number;

  // Step 8 — final score
  final_score:          number;

  // Step 9 — redirect
  redirect:             RedirectObject | null;

  // Step 10 — narrative
  narrative:            string;
}

// ─── STUB AGENTS ──────────────────────────────────────────────────────────────
// Each stub returns hard-coded fixture data so the pipeline is fully testable.
// Replace the body of each function with real logic when that agent is ready.

const researcher = {
  async findCategoryTrend(_category: string): Promise<{
    category_saturation: number;
    category_velocity:   string;
  }> {
    // STUB — replace with category trend lookup from market data
    return {
      category_saturation: 38,
      category_velocity:   'rising',
    };
  },
};

// Lookup maps — keyed by id for O(1) access in pipeline steps
const MATERIALS_MAP: Record<string, Record<string, unknown>> = Object.fromEntries(
  (materialsRaw as Record<string, unknown>[]).map(m => [(m as { id: string }).id, m])
);
const CATEGORIES_MAP: Record<string, Record<string, unknown>> = Object.fromEntries(
  (categoriesRaw as { categories: Record<string, unknown>[] }).categories.map(
    c => [(c as { id: string }).id, c]
  )
);

// Numeric execution score mapped from feasibility traffic-light status
const EXEC_SCORE: Record<'green' | 'yellow' | 'red', number> = {
  green:  85,
  yellow: 60,
  red:    30,
};

const calculator = {
  checkMarginGate(
    cogs:          number,
    target_msrp:   number,
    target_margin: number
  ): {
    gate_passed: boolean;
    cogs_delta:  number;
  } {
    const ceiling   = target_msrp * (1 - target_margin);
    const delta     = cogs - ceiling;
    return {
      gate_passed: delta <= 0,
      cogs_delta:  Math.round(delta),
    };
  },
};

const redirects = {
  selectRedirect(
    material_id:          string,
    aesthetic_matched_id: string | null,
    gate_passed:          boolean,
    identity_score:       number,
    execution_score:      number,
    brand:                BrandProfile
  ): RedirectObject | null {
    const r = selectRedirect(
      material_id,
      aesthetic_matched_id,
      gate_passed,
      identity_score,
      execution_score,
      brand
    );
    if (!r) return null;
    return { type: r.type, suggestion: r.target_material_id, reason: r.reason };
  },
};


// ─── Row builder (exported) ───────────────────────────────────────────────────
// Pure data transformation — no Supabase calls. Can be imported by client
// components that handle their own DB connection.

export function buildAnalysisRow(
  bb:     PipelineBlackboard,
  result: AnalysisResult,
  userId: string | null,
): Record<string, unknown> {
  const intent        = bb.session.intent as IntentCalibration | undefined;
  const existingId    = (bb.session.savedAnalysisId as string | null | undefined) ?? null;
  const parentId      = (bb.session.parentAnalysisId as string | null | undefined) ?? null;
  const collAesthetic = (bb.session.collectionAesthetic as string | null | undefined) ?? null;
  const aestheticInfl = (bb.session.aestheticInflection as string | null | undefined)
    ?? (bb.session.directionInterpretationText as string | null | undefined)
    ?? null;

  const row: Record<string, unknown> = {
    // identity
    user_id:          userId,
    brand_profile_id: bb.brand.id,

    // collection context
    season:          bb.input.season,
    collection_name: bb.input.collection_name,
    collection_role: bb.session.collectionRole ?? null,

    // product specs
    category:    bb.input.category,
    target_msrp: bb.input.target_msrp,

    // aesthetic inputs
    aesthetic_input:      bb.input.aesthetic_input,
    aesthetic_matched_id: result.aesthetic_matched_id,
    collection_aesthetic: collAesthetic,
    aesthetic_inflection: aestheticInfl,
    mood_board_images:    [],

    // material specs
    material_id:                bb.input.material_id,
    silhouette:                 bb.input.silhouette,
    construction_tier:          bb.input.construction_tier,
    construction_tier_override: false,
    timeline_weeks:             bb.input.timeline_weeks,

    // results
    score: result.score,
    dimensions: {
      identity:  result.dimensions.identity,
      resonance: result.dimensions.resonance,
      execution: result.dimensions.execution,
    },
    gates_passed: {
      cost:           result.gates_passed.cost,
      sustainability: null,
    },
    narrative: result.narrative,
    redirects: result.redirect ? [result.redirect] : [],

    // versioning
    data_version:   process.env.NEXT_PUBLIC_DATA_VERSION ?? 'unknown',
    agent_versions: result.agent_versions,

    // intent calibration
    intent_success_goals:    intent?.primary_goals ?? [],
    intent_tradeoff:         intent?.tradeoff ?? null,
    intent_tension_trend:    intent?.tension_sliders?.trend_forward ?? null,
    intent_tension_creative: intent?.tension_sliders?.creative_expression ?? null,
    intent_tension_elevated: intent?.tension_sliders?.elevated_design ?? null,
    intent_tension_novelty:  intent?.tension_sliders?.novelty ?? null,

    // branching
    parent_analysis_id: parentId,
  };

  // Include id only when updating an existing row — lets upsert update instead of insert
  if (existingId) row.id = existingId;

  return row;
}

// ─── Persist to Supabase ──────────────────────────────────────────────────────

async function persistAnalysis(
  bb:        PipelineBlackboard,
  result:    AnalysisResult,
  errors:    AgentError[]
): Promise<string | null> {
  try {
    const supabase = await createClient();

    // Authenticated user — required for RLS; gracefully null if unavailable
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    const row = buildAnalysisRow(bb, result, userId);

    const { data, error } = await supabase
      .from('analyses')
      .upsert(row, { onConflict: 'id' })
      .select('id')
      .single();

    if (error) {
      console.error('[Orchestrator] Supabase persist failed:', {
        code:    error.code,
        message: error.message,
        details: error.details,
        hint:    error.hint,
      });
      return null;
    }

    return (data as { id: string }).id;
  } catch (err) {
    console.error('[Orchestrator] Persist threw unexpectedly:', err);
    return null;
  }
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

/**
 * Runs the full Muko analysis pipeline end-to-end.
 *
 * Error contract:
 *   - Each agent call is wrapped in try/catch.
 *   - Failures are collected in `errors[]`; pipeline continues with null/degraded values.
 *   - A score is always returned if at least identity, resonance, and execution resolve.
 *   - Persist failure is non-fatal — result is still returned to the caller.
 *
 * @param input        — spec-level inputs from the session wizard
 * @param brandProfile — brand DNA from Supabase / onboarding store
 * @param session      — full Zustand blackboard snapshot (for narrative context)
 * @returns            AnalysisResult always; errors[] will be empty on a clean run
 */
export async function runAnalysis(
  input:        AnalysisInput,
  brandProfile: BrandProfile,
  session:      SessionState
): Promise<AnalysisResult> {

  const errors: AgentError[] = [];
  let matchedAesthetic: Aesthetic | null = null;

  // Initialise blackboard with safe defaults so downstream stages always have a value.
  const bb: PipelineBlackboard = {
    input,
    brand:                brandProfile,
    session,

    aesthetic_matched_id: null,
    is_proxy_match:       false,
    aesthetic_keywords:   [],
    saturation_score:     50,
    trend_velocity:       'stable',

    category_saturation:  50,
    category_velocity:    'stable',

    identity_score:           50,
    tension_flags:            [],
    critic_conflict_detected: false,
    critic_conflict_ids:      [],
    critic_llm_used:          false,
    critic_reasoning:         '',

    resonance_score:      50,

    execution_score:      50,
    timeline_buffer:      0,

    cogs:                 0,

    gate_passed:          true,
    cogs_delta:           0,

    final_score:          50,

    redirect:             null,
    narrative:            '',
  };

  // ── Step 1: Aesthetic match ──────────────────────────────────────────────────
  try {
    const llm_matched_id = await matchAestheticId(input.aesthetic_input);
    const matchResult = findAestheticMatch(llm_matched_id, input.aesthetic_input);
    matchedAesthetic            = matchResult.matched;
    bb.aesthetic_matched_id     = matchResult.matched?.id ?? null;
    bb.is_proxy_match           = matchResult.is_proxy;
    bb.aesthetic_keywords       = matchResult.matched?.keywords ?? [];
    bb.saturation_score         = matchResult.matched?.saturation_score ?? 50;
    bb.trend_velocity           = matchResult.matched?.trend_velocity ?? 'stable';
  } catch (err) {
    errors.push({ agent: 'researcher.findAestheticMatch', message: String(err) });
    console.error('[Orchestrator] researcher.findAestheticMatch failed:', err);
  }

  // ── Step 2: Category trend ───────────────────────────────────────────────────
  try {
    const trend = await researcher.findCategoryTrend(input.category);
    bb.category_saturation = trend.category_saturation;
    bb.category_velocity   = trend.category_velocity;
  } catch (err) {
    errors.push({ agent: 'researcher.findCategoryTrend', message: String(err) });
    console.error('[Orchestrator] researcher.findCategoryTrend failed:', err);
  }

  // ── Step 3: Identity score ───────────────────────────────────────────────────
  try {
    const criticInput = {
      aesthetic_id:       bb.aesthetic_matched_id ?? undefined,
      aesthetic_keywords: bb.aesthetic_keywords,
      aesthetic_name:     matchedAesthetic?.name ?? input.aesthetic_input,
      brand: {
        id:                  brandProfile.id ?? '',
        keywords:            brandProfile.keywords,
        tension_context:     brandProfile.tension_context,
        accepts_conflicts:   brandProfile.accepts_conflicts ?? false,
        price_tier:          brandProfile.price_tier,
        target_margin:       brandProfile.target_margin,
        brand_description:   brandProfile.brand_description ?? null,
        reference_brands:    brandProfile.reference_brands ?? [],
        excluded_brands:     brandProfile.excluded_brands ?? [],
        excluded_aesthetics: brandProfile.excluded_aesthetics ?? [],
      },
    };
    const criticResult = await checkBrandAlignment(criticInput);
    bb.identity_score           = criticResult.alignment_score;
    bb.tension_flags            = criticResult.conflict_ids;
    bb.critic_conflict_detected = criticResult.conflict_detected;
    bb.critic_conflict_ids      = criticResult.conflict_ids;
    bb.critic_llm_used          = criticResult.llm_used;
    bb.critic_reasoning         = criticResult.reasoning;
  } catch (err) {
    errors.push({ agent: 'critic.checkBrandAlignment', message: String(err) });
    console.error('[Orchestrator] critic.checkBrandAlignment failed:', err);
  }

  // ── Step 4: Resonance score ──────────────────────────────────────────────────
  try {
    bb.resonance_score = matchedAesthetic
      ? getResonanceScore(matchedAesthetic)
      : Math.max(0, (100 - bb.saturation_score) - (bb.trend_velocity === 'declining' ? 15 : 0));
  } catch (err) {
    errors.push({ agent: 'researcher.scoreResonance', message: String(err) });
    console.error('[Orchestrator] researcher.scoreResonance failed:', err);
  }

  // Material lookup — shared by Steps 5 (execution) and 6 (COGS)
  const resolvedMaterial = MATERIALS_MAP[input.material_id] ?? null;
  if (!resolvedMaterial) {
    console.warn('[CALCULATOR] material not found:', input.material_id);
  }

  // ── Step 5: Execution score ──────────────────────────────────────────────────
  try {
    const exec = checkExecutionFeasibility({
      construction_tier: input.construction_tier,
      material: (resolvedMaterial as { lead_time_weeks: number } | null) ?? { lead_time_weeks: 12 },
      timeline_weeks: input.timeline_weeks,
    });
    bb.execution_score = EXEC_SCORE[exec.status];
    bb.timeline_buffer = exec.timeline_gap;
  } catch (err) {
    errors.push({ agent: 'calculator.scoreExecution', message: String(err) });
    console.error('[Orchestrator] calculator.scoreExecution failed:', err);
  }

  // ── Step 6: COGS calculation ─────────────────────────────────────────────────
  try {
    if (!resolvedMaterial) {
      console.warn('[CALCULATOR] skipping COGS — material not found:', input.material_id);
      // bb.cogs stays at 0 (safe default); pipeline continues
    } else {
      const categoryForCOGS = CATEGORIES_MAP[input.category] as { yards_required?: number } | undefined;
      const yardage = categoryForCOGS?.yards_required ?? 2.0;
      const cogsBreakdown = calculateCOGS(
        resolvedMaterial as unknown as Parameters<typeof calculateCOGS>[0],
        yardage,
        input.construction_tier,
        input.lined ?? false,
        input.target_msrp,
        brandProfile.target_margin,
      );
      bb.cogs = cogsBreakdown.totalCOGS;
    }
  } catch (err) {
    errors.push({ agent: 'calculator.calculateCOGS', message: String(err) });
    console.error('[Orchestrator] calculator.calculateCOGS failed:', err);
  }

  // ── Step 7: Margin gate ──────────────────────────────────────────────────────
  try {
    const gate = calculator.checkMarginGate(
      bb.cogs,
      input.target_msrp,
      brandProfile.target_margin
    );
    bb.gate_passed = gate.gate_passed;
    bb.cogs_delta  = gate.cogs_delta;
  } catch (err) {
    errors.push({ agent: 'calculator.checkMarginGate', message: String(err) });
    console.error('[Orchestrator] calculator.checkMarginGate failed:', err);
  }

  // ── Step 8: Final score ──────────────────────────────────────────────────────
  // (identity × 0.35) + (resonance × 0.35) + (execution × 0.30)
  // If gate_passed is false → multiply by 0.70, then round.
  // Then apply collection-role modifiers if a role is set.
  try {
    const blended = calculateMukoScore(
      {
        identity_score:  bb.identity_score,
        resonance_score: bb.resonance_score,
        execution_score: bb.execution_score,
      },
      { margin_gate_passed: bb.gate_passed }
    );
    bb.final_score = session.collectionRole
      ? applyRoleModifiers(
          blended,
          session.collectionRole,
          { cost: bb.gate_passed },
          input.construction_tier
        )
      : blended;
  } catch (err) {
    errors.push({ agent: 'orchestrator.calculateMukoScore', message: String(err) });
    console.error('[Orchestrator] calculateMukoScore failed:', err);
  }

  // ── Step 9: Redirect selection ───────────────────────────────────────────────
  try {
    bb.redirect = redirects.selectRedirect(
      input.material_id,
      bb.aesthetic_matched_id,
      bb.gate_passed,
      bb.identity_score,
      bb.execution_score,
      brandProfile
    );
  } catch (err) {
    errors.push({ agent: 'redirects.selectRedirect', message: String(err) });
    console.error('[Orchestrator] redirects.selectRedirect failed:', err);
  }

  // ── Step 10: Narrative generation ───────────────────────────────────────────
  try {
    const aestheticContext = resolveAestheticContext(
      bb.aesthetic_matched_id ?? '',
      input.season
    );
    const reportBlackboard: ReportBlackboard = {
      aesthetic_matched_id: bb.aesthetic_matched_id ?? '',
      is_proxy_match: bb.is_proxy_match,
      brand_keywords: brandProfile.keywords,
      identity_score: bb.identity_score,
      resonance_score: bb.resonance_score,
      execution_score: bb.execution_score,
      overall_score: bb.final_score,
      season: input.season,
      brand_name: brandProfile.brand_name,
      tension_context: brandProfile.tension_context ?? undefined,
      aesthetic_context: aestheticContext,
      material_id: input.material_id,
      cogs_usd: bb.cogs,
      target_msrp: input.target_msrp,
      margin_pass: bb.gate_passed,
      construction_tier: input.construction_tier,
      timeline_weeks: input.timeline_weeks,
      category: input.category,
      silhouette: input.silhouette,
      target_margin: brandProfile.target_margin,
      collection_role: session.collectionRole ?? null,
      customer_profile: brandProfile.customer_profile,
      reference_brands: brandProfile.reference_brands ?? [],
      excluded_brands: brandProfile.excluded_brands ?? [],
      price_tier: brandProfile.price_tier,
      resolved_redirects: {
        brand_mismatch: bb.redirect?.type === 'aesthetic'
          ? { suggestion: bb.redirect.suggestion, reason: bb.redirect.reason }
          : null,
        cost_reduction: bb.redirect?.type === 'material'
          ? { material_id: bb.redirect.suggestion, reason: bb.redirect.reason }
          : null,
      },
    };
    const synthesisResult = await generateReportNarrative(reportBlackboard);
    bb.narrative = synthesisResult.data.statements.join('\n\n');
  } catch (err) {
    errors.push({ agent: 'synthesizer.generateNarrative', message: String(err) });
    console.error('[Orchestrator] synthesizer.generateNarrative failed:', err);
    bb.narrative = ''; // safe empty — UI should handle gracefully
  }

  // ── Assemble result ──────────────────────────────────────────────────────────
  const result: AnalysisResult = {
    score: bb.final_score,
    dimensions: {
      identity:   bb.identity_score,
      resonance:  bb.resonance_score,
      execution:  bb.execution_score,
    },
    gates_passed: {
      cost:           bb.gate_passed,
      sustainability: null,
    },
    narrative:            bb.narrative,
    redirect:             bb.redirect,
    agent_versions:       AGENT_VERSIONS,
    aesthetic_matched_id: bb.aesthetic_matched_id,
    errors,
    analysis_id:          null, // set below after persist
  };

  // ── Persist (non-fatal) ──────────────────────────────────────────────────────
  const persistedId = await persistAnalysis(bb, result, errors);
  result.analysis_id = persistedId;

  return result;
}
