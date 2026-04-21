import type { InsightData, InsightMode } from '@/lib/types/insight';
import type { Material } from '@/lib/types/spec-studio';

export type SpecPrimaryCarrier = 'material' | 'silhouette' | 'construction' | 'finish';
export type SpecBurdenLevel = 'light' | 'moderate' | 'heavy';
export type SpecBufferStatus = 'healthy' | 'workable' | 'tight' | 'negative';
export type SpecTimelineStatus = 'on_track' | 'tight' | 'at_risk';
export type SpecRoleExpectation = 'high_expression' | 'balanced' | 'efficiency';
export type SpecFailureMode =
  | 'overbuilt'
  | 'underwhelming'
  | 'cost_without_read'
  | 'timeline_fragile'
  | 'identity_dilution';
export type SpecPressureType =
  | 'over-articulation'
  | 'calendar'
  | 'margin'
  | 'execution_complexity';
export type SpecJustifiedBurden = 'earned' | 'conditional' | 'unearned';
export type SpecDecisionDirection =
  | 'hold'
  | 'simplify'
  | 'reallocate'
  | 'downgrade_construction'
  | 'swap_material'
  | 'refocus_finish';
export type SpecFeasibilityStance =
  | 'strong'
  | 'viable'
  | 'viable_with_constraints'
  | 'strained'
  | 'not_recommended';
export type SpecComplexityLevel = 'low' | 'moderate' | 'high';
export type SpecStepId = 'material' | 'construction' | 'execution';
export interface SpecExecutionLever {
  text: string;
  priority?: boolean;
}

export interface SpecDecisionDiagnostics {
  primary_carrier: SpecPrimaryCarrier;
  burden_level: SpecBurdenLevel;
  buffer_status: SpecBufferStatus;
  timeline_status: SpecTimelineStatus;
  role_expectation: SpecRoleExpectation;
  failure_mode: SpecFailureMode;
  pressure_type: SpecPressureType;
  justified_burden: SpecJustifiedBurden;
  best_next_move: SpecDecisionDirection;
  complexity_level: SpecComplexityLevel;
  complexity_stack: number;
}

export interface SpecRailInsight {
  feasibility_stance: SpecFeasibilityStance;
  headline: string;
  core_tension: string | null;
  feasibility_breakdown: {
    cost: SpecBufferStatus;
    timeline: SpecTimelineStatus;
    complexity: SpecComplexityLevel;
  };
  decision: {
    direction: SpecDecisionDirection;
    reason: string;
  };
  execution_levers: [SpecExecutionLever, SpecExecutionLever, SpecExecutionLever];
  alternative_path: {
    title: string;
    description: string;
    dimension?: 'material' | 'construction' | 'execution';
    target_tier?: 'low' | 'moderate' | 'high';
    method?: string;
  } | null;
}

export interface DeriveSpecDiagnosticsInput {
  pieceRole?: string | null;
  specStep: SpecStepId;
  silhouette?: string | null;
  constructionTier: 'low' | 'moderate' | 'high';
  constructionOverride?: boolean;
  materialBehavior: 'fluid' | 'structured' | 'medium' | 'textural' | 'balanced';
  materialProperties?: string[];
  marginBuffer?: number | null;
  targetCogs?: number | null;
  timelineGapWeeks?: number | null;
  requiredTimelineWeeks?: number | null;
  availableTimelineWeeks?: number | null;
  identityScore: number;
  resonanceScore: number;
  executionScore: number;
  strongExpressionLabels?: string[];
  missingExpressionLabels?: string[];
  collectionLanguageLabels?: string[];
  expressionSignals?: string[];
}

export interface SpecFallbackContext {
  material_name?: string;
  material_id: string;
  category?: string;
  silhouette?: string;
  construction_tier: string;
  target_msrp: number;
  cogs_usd: number;
  timeline_weeks: number;
  required_timeline_weeks?: number;
  timeline_gap_weeks?: number;
  brand_name?: string;
  keyPiece?: { item: string; type: string; signal: string };
  diagnostics: SpecDecisionDiagnostics;
  resolved_redirects?: {
    cost_reduction?: { material_id: string; reason: string } | null;
  };
}

export type LeverAssessment = {
  lever: 'construction' | 'material' | 'reprice'
  status: 'exhausted' | 'partial' | 'available'
  deltaUsd: number
  note: string
}

export type ViabilityState =
  | { state: 'viable' }
  | { state: 'reprice'; currentMsrp: number; suggestedMsrp: number; gapUsd: number; msrpCeilingHit: boolean }
  | { state: 'not_viable'; levers: LeverAssessment[] }

const CONSTRUCTION_FLOOR: Record<string, 'low' | 'moderate' | 'high'> = {
  jacket: 'moderate',
  coat: 'moderate',
  trench: 'moderate',
  parka: 'moderate',
  'puffer jacket': 'moderate',
  'leather jacket': 'moderate',
  'denim jacket': 'moderate',
  outerwear: 'moderate',
  blazer: 'moderate',
  'suit jacket': 'moderate',
  'structured dress': 'moderate',
  'shirt dress': 'moderate',
  tee: 'low',
  't-shirt': 'low',
  tank: 'low',
  shorts: 'low',
  'basic knit': 'low',
  leggings: 'low',
};

const CONSTRUCTION_TIER_RANK: Record<string, number> = {
  low: 0,
  moderate: 1,
  high: 2,
};

export function getConstructionFloor(category: string): 'low' | 'moderate' | 'high' {
  const normalized = category.toLowerCase().trim();
  return CONSTRUCTION_FLOOR[normalized] ?? 'low';
}

export function isBelowConstructionFloor(
  category: string,
  targetTier: string
): boolean {
  const floor = getConstructionFloor(category);
  return (CONSTRUCTION_TIER_RANK[targetTier] ?? 0) < (CONSTRUCTION_TIER_RANK[floor] ?? 0);
}

export function assessViability(
  ctx: {
    category: string
    constructionTier: string
    cogsUsd: number
    targetMsrp: number
    targetMargin: number
    priceTier?: string
    materialCostPerYard: number
    currentMaterialId: string
  },
  materials: Material[]
): ViabilityState {
  const marginCeiling = ctx.targetMsrp * (1 - ctx.targetMargin);
  const gap = ctx.cogsUsd - marginCeiling;

  if (gap <= 0) return { state: 'viable' };

  const maxMsrp = ctx.targetMsrp * 1.25;
  const requiredMsrp = ctx.cogsUsd / (1 - ctx.targetMargin);
  if (requiredMsrp <= maxMsrp) {
    const priceTierCeilings: Record<string, number> = {
      contemporary: 450,
      bridge: 800,
      luxury: 2000,
      unspecified: 600,
    };
    const tierKey = (ctx.priceTier ?? 'unspecified').toLowerCase();
    const ceiling = priceTierCeilings[tierKey] ?? 600;
    const uncappedSuggestedMsrp = Math.ceil(requiredMsrp / 5) * 5;
    const suggestedMsrp = Math.min(uncappedSuggestedMsrp, ceiling);

    return {
      state: 'reprice',
      currentMsrp: ctx.targetMsrp,
      suggestedMsrp,
      gapUsd: gap,
      msrpCeilingHit: suggestedMsrp < uncappedSuggestedMsrp,
    };
  }

  const isStructurallyNotViable = gap > 75 && gap / ctx.targetMsrp > 0.18;
  if (!isStructurallyNotViable) return { state: 'viable' };

  const levers: LeverAssessment[] = [];
  const atFloor = isBelowConstructionFloor(ctx.category, 'low') ||
    ctx.constructionTier === getConstructionFloor(ctx.category);
  levers.push({
    lever: 'construction',
    status: atFloor ? 'exhausted' : 'partial',
    deltaUsd: atFloor ? 0 : Math.round(gap * 0.3),
    note: atFloor
      ? `${ctx.constructionTier} is the minimum viable tier for ${ctx.category}`
      : `Dropping to ${getConstructionFloor(ctx.category)} recovers partial margin`,
  });

  const cheaper = materials
    .filter((m) => m.id !== ctx.currentMaterialId && m.cost_per_yard < ctx.materialCostPerYard)
    .sort((a, b) => b.cost_per_yard - a.cost_per_yard)[0];

  if (cheaper) {
    const materialDelta = Math.round(
      (ctx.materialCostPerYard - cheaper.cost_per_yard) * 2.5
    );
    levers.push({
      lever: 'material',
      status: materialDelta >= gap ? 'available' : 'partial',
      deltaUsd: materialDelta,
      note: `${cheaper.name} closes $${materialDelta} of the gap`,
    });
  } else {
    levers.push({
      lever: 'material',
      status: 'exhausted',
      deltaUsd: 0,
      note: 'No cheaper material available for this category',
    });
  }

  levers.push({
    lever: 'reprice',
    status: 'exhausted',
    deltaUsd: gap,
    note: `Closing the gap requires $${Math.ceil(requiredMsrp)} — exceeds 25% reprice ceiling`,
  });

  return { state: 'not_viable', levers };
}

const CARRIER_ORDER: SpecPrimaryCarrier[] = ['material', 'silhouette', 'construction', 'finish'];

function hasAnyMatch(values: string[], pattern: RegExp): boolean {
  return values.some((value) => pattern.test(value));
}

function toRoleExpectation(pieceRole?: string | null): SpecRoleExpectation {
  if (pieceRole === 'hero' || pieceRole === 'directional') return 'high_expression';
  if (pieceRole === 'volume-driver') return 'efficiency';
  return 'balanced';
}

function toBufferStatus(marginBuffer?: number | null, targetCogs?: number | null): SpecBufferStatus {
  if (marginBuffer == null) return 'tight';
  if (marginBuffer < 0) return 'negative';
  const ratio = targetCogs && targetCogs > 0 ? marginBuffer / targetCogs : 0;
  if (marginBuffer >= 18 || ratio >= 0.14) return 'healthy';
  if (marginBuffer >= 8 || ratio >= 0.06) return 'workable';
  return 'tight';
}

function toComplexityLevel(stack: number): SpecComplexityLevel {
  if (stack >= 3.5) return 'high';
  if (stack >= 1.75) return 'moderate';
  return 'low';
}

function toTimelineStatus(args: {
  timelineGapWeeks?: number | null;
  constructionTier: 'low' | 'moderate' | 'high';
  specStep: SpecStepId;
  finishSignalCount: number;
  missingSignalCount: number;
}): SpecTimelineStatus {
  const stackPenalty =
    (args.constructionTier === 'high' ? 1.5 : args.constructionTier === 'moderate' ? 0.75 : 0) +
    (args.specStep === 'execution' ? 0.5 : 0) +
    Math.min(1.25, args.finishSignalCount * 0.35) +
    Math.min(0.75, args.missingSignalCount * 0.2);
  const adjustedGap = (args.timelineGapWeeks ?? 0) - stackPenalty;

  if (adjustedGap >= 3) return 'on_track';
  if (adjustedGap >= -1) return 'tight';
  return 'at_risk';
}

function pickPrimaryCarrier(input: DeriveSpecDiagnosticsInput, finishSignalCount: number, tailoringSignal: boolean): SpecPrimaryCarrier {
  const silhouetteText = (input.silhouette ?? '').toLowerCase();
  const materialSignal =
    (input.materialBehavior === 'fluid' ? 2.6 : 0) +
    (input.materialBehavior === 'textural' ? 2.9 : 0) +
    (input.materialBehavior === 'balanced' ? 1.2 : 0) +
    (hasAnyMatch(input.materialProperties ?? [], /drape|fluid|lustre|sheen|soft|brushed|grain|slub|tactile/i) ? 1.2 : 0);
  const silhouetteSignal =
    (/column|cocoon|oversized|boxy|straight|slim|relaxed|tailored|structured/i.test(silhouetteText) ? 2.2 : 1.2) +
    (input.materialBehavior === 'structured' ? 1.1 : 0);
  const constructionSignal =
    (input.constructionTier === 'high' ? 3 : input.constructionTier === 'moderate' ? 1.5 : 0.5) +
    (input.constructionOverride ? 0.8 : 0) +
    (tailoringSignal ? 1 : 0);
  const finishSignal = finishSignalCount > 0
    ? 1.7 + Math.min(1.8, finishSignalCount * 0.6) + (input.specStep === 'execution' ? 0.6 : 0)
    : 0.4;

  const scores: Record<SpecPrimaryCarrier, number> = {
    material: materialSignal,
    silhouette: silhouetteSignal,
    construction: constructionSignal,
    finish: finishSignal,
  };

  return CARRIER_ORDER.reduce((best, carrier) => {
    if (scores[carrier] > scores[best]) return carrier;
    return best;
  }, 'silhouette' as SpecPrimaryCarrier);
}

export function deriveSpecDiagnostics(input: DeriveSpecDiagnosticsInput): SpecDecisionDiagnostics {
  const roleExpectation = toRoleExpectation(input.pieceRole);
  const strongSignals = input.strongExpressionLabels ?? [];
  const missingSignals = input.missingExpressionLabels ?? [];
  const allSignals = [...(input.expressionSignals ?? []), ...strongSignals];
  const finishSignalCount = allSignals.filter((label) => /contrast|lustre|surface|finish|trim|hardware|shine|wash/i.test(label)).length;
  const tailoringSignal = hasAnyMatch(
    [...(input.collectionLanguageLabels ?? []), ...allSignals],
    /tailor|precision|architect|utility|engineer|sharp|structured/i
  );
  const primaryCarrier = pickPrimaryCarrier(input, finishSignalCount, tailoringSignal);
  const bufferStatus = toBufferStatus(input.marginBuffer, input.targetCogs);
  const timelineStatus = toTimelineStatus({
    timelineGapWeeks: input.timelineGapWeeks,
    constructionTier: input.constructionTier,
    specStep: input.specStep,
    finishSignalCount,
    missingSignalCount: missingSignals.length,
  });

  const complexityStack =
    (input.constructionTier === 'high' ? 2.1 : input.constructionTier === 'moderate' ? 1.1 : 0.35) +
    (primaryCarrier === 'construction' ? 0.9 : 0) +
    (primaryCarrier === 'finish' ? 0.7 : 0) +
    (finishSignalCount > 0 ? Math.min(1.1, finishSignalCount * 0.3) : 0) +
    (input.constructionOverride ? 0.45 : 0) +
    (missingSignals.length > 1 ? 0.35 : 0);
  const complexityLevel = toComplexityLevel(complexityStack);

  const burdenScore =
    (bufferStatus === 'negative' ? 2 : bufferStatus === 'tight' ? 1 : 0) +
    (timelineStatus === 'at_risk' ? 2 : timelineStatus === 'tight' ? 1 : 0) +
    (complexityLevel === 'high' ? 2 : complexityLevel === 'moderate' ? 1 : 0) +
    (roleExpectation === 'efficiency' && complexityLevel !== 'low' ? 1 : 0);
  const burdenLevel: SpecBurdenLevel =
    burdenScore >= 5 ? 'heavy' : burdenScore >= 2 ? 'moderate' : 'light';

  const justificationScore =
    (roleExpectation === 'high_expression' ? 2 : roleExpectation === 'balanced' ? 1 : 0) +
    (primaryCarrier === 'material' || primaryCarrier === 'silhouette' ? 1 : 0) +
    (input.identityScore >= 78 ? 1 : 0) +
    (strongSignals.length > 0 ? 1 : 0) -
    (bufferStatus === 'negative' ? 2 : bufferStatus === 'tight' ? 1 : 0) -
    (timelineStatus === 'at_risk' ? 2 : timelineStatus === 'tight' ? 1 : 0) -
    (burdenLevel === 'heavy' ? 2 : burdenLevel === 'moderate' ? 1 : 0);
  const justifiedBurden: SpecJustifiedBurden =
    justificationScore >= 2 ? 'earned' : justificationScore >= 0 ? 'conditional' : 'unearned';

  const identityDilutionRisk =
    input.identityScore + 4 < input.resonanceScore ||
    missingSignals.length > strongSignals.length + 1;

  let failureMode: SpecFailureMode;
  if (timelineStatus === 'at_risk') {
    failureMode = 'timeline_fragile';
  } else if (
    (bufferStatus === 'negative' || bufferStatus === 'tight') &&
    (primaryCarrier === 'construction' || primaryCarrier === 'finish') &&
    justifiedBurden !== 'earned'
  ) {
    failureMode = 'cost_without_read';
  } else if (burdenLevel === 'heavy' && justifiedBurden === 'unearned') {
    failureMode = 'overbuilt';
  } else if (roleExpectation === 'high_expression' && burdenLevel === 'light' && input.identityScore < 74) {
    failureMode = 'underwhelming';
  } else if (identityDilutionRisk) {
    failureMode = 'identity_dilution';
  } else {
    failureMode = burdenLevel === 'light' ? 'underwhelming' : 'overbuilt';
  }

  let pressureType: SpecPressureType;
  if (timelineStatus === 'at_risk' || (timelineStatus === 'tight' && complexityLevel === 'high')) {
    pressureType = 'calendar';
  } else if (bufferStatus === 'negative' || (bufferStatus === 'tight' && burdenLevel !== 'light')) {
    pressureType = 'margin';
  } else if (complexityLevel === 'high' || primaryCarrier === 'construction') {
    pressureType = 'execution_complexity';
  } else {
    pressureType = 'over-articulation';
  }

  let bestNextMove: SpecDecisionDirection;
  if (failureMode === 'timeline_fragile') {
    bestNextMove = input.constructionTier === 'high' ? 'downgrade_construction' : 'simplify';
  } else if (pressureType === 'margin') {
    bestNextMove = primaryCarrier === 'material'
      ? 'swap_material'
      : primaryCarrier === 'construction'
        ? 'downgrade_construction'
        : 'simplify';
  } else if (failureMode === 'identity_dilution') {
    bestNextMove = primaryCarrier === 'finish' ? 'refocus_finish' : 'reallocate';
  } else if (failureMode === 'cost_without_read') {
    bestNextMove = primaryCarrier === 'finish' ? 'refocus_finish' : 'reallocate';
  } else if (failureMode === 'overbuilt') {
    bestNextMove = primaryCarrier === 'construction' ? 'downgrade_construction' : 'simplify';
  } else {
    bestNextMove = 'hold';
  }

  return {
    primary_carrier: primaryCarrier,
    burden_level: burdenLevel,
    buffer_status: bufferStatus,
    timeline_status: timelineStatus,
    role_expectation: roleExpectation,
    failure_mode: failureMode,
    pressure_type: pressureType,
    justified_burden: justifiedBurden,
    best_next_move: bestNextMove,
    complexity_level: complexityLevel,
    complexity_stack: Number(complexityStack.toFixed(2)),
  };
}

function normalizeHeadlineLabel(stance: SpecFeasibilityStance): string {
  switch (stance) {
    case 'strong':
      return 'Strong call';
    case 'viable':
      return 'Viable call';
    case 'viable_with_constraints':
      return 'Constrained call';
    case 'strained':
      return 'Strained call';
    case 'not_recommended':
      return 'Not recommended';
  }
}

function inferFeasibilityStance(diagnostics: SpecDecisionDiagnostics): SpecFeasibilityStance {
  if (diagnostics.buffer_status === 'negative' && diagnostics.timeline_status === 'at_risk') {
    return 'not_recommended';
  }
  if (
    diagnostics.failure_mode === 'timeline_fragile' ||
    (diagnostics.buffer_status === 'negative' && diagnostics.complexity_level === 'high')
  ) {
    return 'strained';
  }
  if (
    diagnostics.buffer_status === 'tight' ||
    diagnostics.timeline_status === 'tight' ||
    diagnostics.justified_burden === 'conditional'
  ) {
    return 'viable_with_constraints';
  }
  if (diagnostics.buffer_status === 'healthy' && diagnostics.timeline_status === 'on_track') {
    return 'strong';
  }
  return 'viable';
}

function carrierPhrase(carrier: SpecPrimaryCarrier, materialName: string, silhouette?: string): string {
  switch (carrier) {
    case 'material':
      return `${materialName} is doing the heavy lifting`;
    case 'silhouette':
      return `${silhouette || 'the silhouette'} is carrying the idea`;
    case 'construction':
      return 'the build is carrying the read';
    case 'finish':
      return 'surface treatment is carrying the read';
  }
}

function decisionReason(ctx: SpecFallbackContext): string {
  const d = ctx.diagnostics;
  const carrier = carrierPhrase(d.primary_carrier, ctx.material_name ?? 'the material', ctx.silhouette);
  const pieceName = ctx.keyPiece?.item ?? ctx.category ?? 'this piece';

  switch (d.best_next_move) {
    case 'hold':
      return `${carrier}, and the current burden still matches ${pieceName}'s job. Hold the route and protect execution discipline.`;
    case 'simplify':
      return `${carrier}, but the burden is outrunning what ${pieceName} can absorb. Remove secondary articulation before the idea starts paying for noise.`;
    case 'reallocate':
      return `${carrier}, but cost is landing in the wrong place. Reallocate effort into the move the customer actually reads first.`;
    case 'downgrade_construction':
      return `${carrier}, but the calendar is now paying for construction depth the read is not fully earning. Pull the build back one tier and keep the front-of-house idea intact.`;
    case 'swap_material':
      return `${carrier}, but the current fabric is consuming margin that should stay available for execution control. Keep the same read with a calmer material base.`;
    case 'refocus_finish':
      return `${carrier}, but finish is spreading emphasis instead of sharpening it. Reduce the surface story to one precise hit.`;
  }
}

function leverSet(ctx: SpecFallbackContext): [SpecExecutionLever, SpecExecutionLever, SpecExecutionLever] {
  const d = ctx.diagnostics;
  const materialName = ctx.material_name ?? 'the material';
  const silhouette = ctx.silhouette ?? 'the line';
  const levers: string[] = [];

  if (d.primary_carrier === 'material') {
    levers.push(`Keep ${materialName} responsible for the first read; do not ask construction to imitate its effect.`);
  } else if (d.primary_carrier === 'silhouette') {
    levers.push(`Protect ${silhouette} as the lead move; keep seams and finish subordinate to that proportion.`);
  } else if (d.primary_carrier === 'construction') {
    levers.push('Spend construction only where it sharpens the lead shape; secondary build will read like drag.');
  } else {
    levers.push('Limit finish to one controlled point of emphasis so the piece keeps a single center of gravity.');
  }

  if (d.pressure_type === 'calendar') {
    levers.push('Freeze approval-sensitive details now; every late change compounds both sample count and calendar risk.');
  } else if (d.pressure_type === 'margin') {
    levers.push('Protect visible value first; remove cost from hidden labor or duplicate articulation before touching the core idea.');
  } else if (d.pressure_type === 'execution_complexity') {
    levers.push('Consolidate the build sequence so the factory solves one hard thing well instead of three things passably.');
  } else {
    levers.push('Keep only the expression cues that materially change the rack read; the rest is dilution.');
  }

  if (d.role_expectation === 'efficiency') {
    levers.push('Keep repeatability intact; if the spec needs explanation to justify itself, it is already too loaded for this role.');
  } else if (d.role_expectation === 'high_expression') {
    levers.push('Make the high-expression move unmistakable, then quiet every supporting choice that competes with it.');
  } else {
    levers.push('Balance novelty against repeatability so the piece feels owned, not overworked.');
  }

  return [
    { text: levers[0] },
    { text: levers[1] },
    { text: levers[2] },
  ];
}

function buildAlternativePath(ctx: SpecFallbackContext, stance: SpecFeasibilityStance): { title: string; description: string; dimension?: 'material' | 'construction' | 'execution'; target_tier?: 'low' | 'moderate' | 'high'; method?: string } | null {
  const d = ctx.diagnostics;
  const materialName = ctx.material_name ?? 'the current material';
  const cheaperMaterial = ctx.resolved_redirects?.cost_reduction?.material_id?.replace(/-/g, ' ');

  switch (d.best_next_move) {
    case 'swap_material':
      return {
        title: 'Keep the idea, calm the fabric burden',
        description: cheaperMaterial
          ? `Hold the same silhouette and expression, but move out of ${materialName} into ${cheaperMaterial}. That preserves the read while reopening margin and calendar buffer.`
          : `Hold the same silhouette and expression, but move into a fabric with similar behavior and shorter lead. The point is to preserve the idea while reopening margin and calendar buffer.`,
        dimension: 'material' as const,
      };
    case 'downgrade_construction': {
      const currentTier = (ctx.construction_tier ?? 'moderate') as 'low' | 'moderate' | 'high';
      const targetTier: 'low' | 'moderate' | 'high' = currentTier === 'high' ? 'moderate' : 'low';
      if (isBelowConstructionFloor(ctx.category ?? '', targetTier)) {
        return null;
      }
      return {
        title: 'Keep the read, remove one layer of build',
        description: `Preserve ${materialName} and the current proportion, but take the construction down one tier. Concentrating precision in the visible areas keeps the idea intact with less sampling drag.`,
        dimension: 'construction' as const,
        target_tier: targetTier,
        method: `${targetTier} complexity`,
      };
    }
    case 'refocus_finish':
      return {
        title: 'Keep the attitude, narrow the finish',
        description: `Hold the same base spec and reduce finish to one deliberate accent. The idea stays intact, but the piece stops paying for surface activity that does not deepen the read.`,
        dimension: 'execution' as const,
      };
    case 'reallocate':
      return {
        title: 'Move effort back to the lead signal',
        description: `Keep the concept exactly where it is, but push effort back into the current carrier and quiet the secondary gestures. That keeps the piece directional without letting burden scatter across the build.`,
        dimension: 'execution' as const,
      };
    case 'simplify':
      return {
        title: 'Preserve the concept through subtraction',
        description: `Keep the same material story and overall silhouette, then strip out the move that the customer notices last. This keeps the piece recognisable while lowering execution drag.`,
        dimension: 'execution' as const,
      };
    case 'hold':
    default:
      return stance === 'strong' || stance === 'viable'
        ? {
            title: 'Material selection is working. No swap suggested.',
            description: 'The current selection is carrying the direction without adding avoidable execution pressure. Hold the route and use execution notes to preserve what is already working.',
            dimension: 'execution' as const,
          }
        : {
            title: 'Protect the current route',
            description: `The current path can still work if the team resists adding late articulation. Keep the idea intact and spend discipline on the execution choke point instead.`,
            dimension: 'execution' as const,
          };
  }
}

export function buildFallbackSpecRail(ctx: SpecFallbackContext): SpecRailInsight {
  const diagnostics = ctx.diagnostics;
  const stance = inferFeasibilityStance(diagnostics);
  const materialName = ctx.material_name ?? 'the selected material';
  const availableWeeks = ctx.timeline_weeks;
  const requiredWeeks = ctx.required_timeline_weeks ?? Math.max(0, availableWeeks - (ctx.timeline_gap_weeks ?? 0));
  const alternativePath = buildAlternativePath(ctx, stance);
  const headline = `${normalizeHeadlineLabel(stance)}: ${carrierPhrase(diagnostics.primary_carrier, materialName, ctx.silhouette)}, but ${diagnostics.pressure_type === 'calendar'
    ? `${requiredWeeks} weeks of work are pressing against a ${availableWeeks}-week window`
    : diagnostics.pressure_type === 'margin'
      ? `$${ctx.cogs_usd} COGS is leaving too little room for the rest of the build`
      : diagnostics.pressure_type === 'execution_complexity'
        ? `${diagnostics.complexity_level} complexity is asking the factory to carry too many decisions at once`
        : `${diagnostics.burden_level} burden is spreading the read too wide`}.`;

  const hasAllClear =
    (stance === 'strong' || stance === 'viable') &&
    diagnostics.best_next_move === 'hold' &&
    diagnostics.buffer_status !== 'tight' &&
    diagnostics.buffer_status !== 'negative' &&
    diagnostics.timeline_status === 'on_track';

  const coreTension = hasAllClear
    ? null
    : diagnostics.failure_mode === 'timeline_fragile'
      ? `${materialName} still carries the right tone, but the combination of ${diagnostics.primary_carrier} emphasis and ${diagnostics.complexity_level} complexity leaves the team solving calendar pressure and design expression at the same time.`
      : diagnostics.failure_mode === 'cost_without_read'
        ? `The spec is paying for burden in ${diagnostics.primary_carrier}, yet the customer is more likely to notice the overall idea than the extra work. That is the wrong cost architecture for this role.`
        : diagnostics.failure_mode === 'identity_dilution'
          ? `The piece still points at the concept, but burden is landing across too many channels at once. The more the read spreads, the less owned it feels.`
          : diagnostics.failure_mode === 'underwhelming'
            ? `The current route is feasible, but it is not yet converting enough of the concept promise into a visible product signal. Right now the burden is low, yet so is the payoff.`
            : `The build is stacking more effort than this role can reward. The issue is not raw complexity alone; it is complexity sitting in places that do not move the read enough.`;

  return {
    feasibility_stance: stance,
    headline,
    core_tension: coreTension,
    feasibility_breakdown: {
      cost: diagnostics.buffer_status,
      timeline: diagnostics.timeline_status,
      complexity: diagnostics.complexity_level,
    },
    decision: {
      direction: diagnostics.best_next_move,
      reason: decisionReason(ctx),
    },
    execution_levers: leverSet(ctx),
    alternative_path: alternativePath,
  };
}

export function mapSpecRailToInsightData(rail: SpecRailInsight, mode: InsightMode): InsightData {
  const secondary = rail.alternative_path?.title && rail.alternative_path.description
    ? [
        `${rail.alternative_path.title} — ${rail.alternative_path.description}`,
        `Decision — ${rail.decision.reason}`,
        `Feasibility — Cost ${rail.feasibility_breakdown.cost}, timeline ${rail.feasibility_breakdown.timeline}, complexity ${rail.feasibility_breakdown.complexity}.`,
      ]
    : [
        `Decision — ${rail.decision.reason}`,
        `Feasibility — Cost ${rail.feasibility_breakdown.cost}, timeline ${rail.feasibility_breakdown.timeline}, complexity ${rail.feasibility_breakdown.complexity}.`,
        'Alternative path — Current route holds if the team protects the lead decision and avoids adding burden late.',
      ];

  return {
    statements: [rail.headline, rail.core_tension ?? rail.decision.reason, rail.decision.reason],
    edit: rail.execution_levers.map((lever) => lever.text),
    editLabel: 'WHAT TO GET RIGHT',
    secondary,
    secondaryLabel: 'BETTER PATH',
    mode,
  };
}

export function shouldShowBetterPath(rail: SpecRailInsight): boolean {
  if (!rail.alternative_path?.title || !rail.alternative_path.description) {
    return false;
  }

  if (rail.alternative_path.title === 'Material selection is working. No swap suggested.') {
    return false;
  }

  if (
    rail.alternative_path.dimension === 'construction' &&
    !rail.alternative_path.target_tier
  ) {
    return false;
  }

  if (
    rail.alternative_path.dimension === 'construction' ||
    rail.alternative_path.dimension === 'material'
  ) {
    return true;
  }

  if (
    rail.core_tension == null &&
    (rail.feasibility_stance === 'viable' || rail.feasibility_stance === 'strong') &&
    rail.decision.direction === 'hold'
  ) {
    return false;
  }

  return (
    rail.feasibility_stance === 'strained' ||
    rail.feasibility_stance === 'not_recommended' ||
    rail.decision.direction !== 'hold'
  );
}

export function shouldShowFeasibilityTension(rail: SpecRailInsight): boolean {
  return !(rail.core_tension == null && rail.feasibility_stance === 'viable');
}
