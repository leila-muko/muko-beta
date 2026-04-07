import type { Material, Category, Silhouette, ConstructionTier } from '@/lib/types/spec-studio';
import { getMaterialProperties } from '@/lib/spec-studio/material-properties';

// Labor multipliers by construction tier
const LABOR_MULTIPLIERS: Record<ConstructionTier, number> = {
  low: 0.75,
  moderate: 1.0,
  high: 1.35,
};

const LINING_COST = 18;

export interface COGSBreakdown {
  materialCost: number;
  laborCost: number;
  liningCost: number;
  totalCOGS: number;
  marginCeiling: number;
  gap: number;         // positive = over budget
  buffer: number;      // positive = under budget
  isOverBudget: boolean;
  materialPct: number; // % of COGS from material
  laborPct: number;    // % of COGS from labor
}

export function calculateCOGS(
  material: Material,
  yardage: number,
  constructionTier: ConstructionTier,
  lined: boolean,
  targetMSRP: number,
  targetMargin: number,
  laborBaseUsd = 35
): COGSBreakdown {
  const materialCost = material.cost_per_yard * yardage;
  const laborCost = laborBaseUsd * LABOR_MULTIPLIERS[constructionTier];
  const liningCost = lined ? LINING_COST : 0;
  const totalCOGS = materialCost + laborCost + liningCost;
  const marginCeiling = targetMSRP * (1 - targetMargin);
  const gap = totalCOGS - marginCeiling;

  return {
    materialCost: Math.round(materialCost),
    laborCost: Math.round(laborCost),
    liningCost,
    totalCOGS: Math.round(totalCOGS),
    marginCeiling: Math.round(marginCeiling),
    gap: Math.round(gap),
    buffer: Math.round(-gap),
    isOverBudget: gap > 0,
    materialPct: materialCost / totalCOGS,
    laborPct: laborCost / totalCOGS,
  };
}

export type InsightType = 'warning' | 'viable' | 'strong';

export interface MukoInsight {
  type: InsightType;
  headline: string;
  body: string;
  cogs: number;
  ceiling: number;
  biggestDriver: 'material' | 'construction' | 'lining';
  alternative: {
    name: string;
    cost: number;
    saving: number;
    sharedProperties: string[];
  } | null;
}

export interface FeasibilityResult {
  status: 'green' | 'yellow' | 'red';
  message: string;
  required_weeks: number;
  timeline_gap: number;
  executionScore: number;
  timelineSubStatus: 'green' | 'yellow_comfortable' | 'yellow_tight' | 'yellow_at_risk' | 'red';
}

export function checkExecutionFeasibility({
  construction_tier,
  material,
  timeline_weeks,
  costStatus = null,
  role = '',
}: {
  construction_tier: 'low' | 'moderate' | 'high';
  material: { lead_time_weeks: number };
  timeline_weeks: number;
  costStatus?: 'green' | 'yellow' | 'red' | null;
  role?: string;
}): FeasibilityResult {
  const complexity_weeks = { low: 6, moderate: 10, high: 16 };
  const required_weeks = complexity_weeks[construction_tier] + material.lead_time_weeks;
  const gap = timeline_weeks - required_weeks;
  const timelineStatus =
    gap >= 4  ? "green" :
    gap >= 2  ? "yellow_comfortable" :
    gap >= 0  ? "yellow_tight" :
    gap >= -4 ? "yellow_at_risk" :
                "red";
  const executionStatus =
    timelineStatus === "red" || costStatus === "red" ? "red" :
    timelineStatus === "green" ? "green" :
    "yellow";
  const baseExecutionScore = (() => {
    if (costStatus === "red" && timelineStatus === "red") return 35;
    if (costStatus === "red") return 48;
    if (timelineStatus === "red") return 35;
    if (timelineStatus === "yellow_at_risk") return 48;
    if (timelineStatus === "yellow_tight") return 60;
    if (timelineStatus === "yellow_comfortable") return 72;
    if (timelineStatus === "green") return 85;
    return 60;
  })();
  const executionScore = applyRoleModifiers(
    baseExecutionScore,
    role,
    { cost: costStatus === null ? null : costStatus !== 'red' },
    construction_tier
  );
  const message =
    executionStatus === 'green'
      ? 'Feasible timeline'
      : executionStatus === 'yellow'
        ? 'Tight but possible'
        : 'Significant timeline risk';

  return { status: executionStatus, message, required_weeks, timeline_gap: gap, executionScore, timelineSubStatus: timelineStatus };
}

export function applyRoleModifiers(
  baseScore: number,
  role: string,
  gatesPassed: { cost: boolean | null },
  constructionTier: string
): number {
  let score = baseScore;
  if (role === 'volume-driver' && gatesPassed.cost === false) score *= 0.65;
  if (role === 'hero' && gatesPassed.cost === false) score *= 0.92;
  if (role === 'volume-driver' && constructionTier === 'high') score *= 0.88;
  return Math.round(score);
}

export function generateInsight(
  breakdown: COGSBreakdown,
  material: Material,
  silhouetteName: string,
  constructionTier: ConstructionTier,
  lined: boolean,
  yardage: number,
  alternativeMaterial: Material | null
): MukoInsight {
  const altSaving = alternativeMaterial
    ? Math.round((material.cost_per_yard - alternativeMaterial.cost_per_yard) * yardage)
    : 0;

  const sharedProps = alternativeMaterial
    ? getMaterialProperties(material).filter((property) => getMaterialProperties(alternativeMaterial).includes(property))
    : [];

  const biggestDriver: 'material' | 'construction' | 'lining' =
    breakdown.materialPct > 0.5 ? 'material' :
    breakdown.laborPct > 0.35 ? 'construction' : 'lining';

  const alternative = alternativeMaterial ? {
    name: alternativeMaterial.name,
    cost: alternativeMaterial.cost_per_yard,
    saving: altSaving,
    sharedProperties: sharedProps,
  } : null;

  if (breakdown.isOverBudget) {
    const driverText = biggestDriver === 'material'
      ? `${material.name} at $${material.cost_per_yard}/yard is your biggest cost driver`
      : `${constructionTier} construction complexity is driving labor costs`;

    const suggestionText = alternative
      ? `${alternative.name} shares ${material.name}'s ${sharedProps.join(' + ')} qualities at $${alternative.cost}/yard — saving ~$${altSaving} on this piece.`
      : constructionTier === 'high'
        ? 'Consider reducing to Moderate construction to bring labor costs down.'
        : 'Consider a more economical silhouette to reduce yardage.';

    return {
      type: 'warning',
      headline: `$${breakdown.totalCOGS} estimated COGS — $${breakdown.gap} over your $${breakdown.marginCeiling} ceiling`,
      body: `${driverText}. ${suggestionText}`,
      cogs: breakdown.totalCOGS,
      ceiling: breakdown.marginCeiling,
      biggestDriver,
      alternative,
    };
  }

  const bufferPct = breakdown.buffer / breakdown.marginCeiling;

  if (bufferPct > 0.15) {
    return {
      type: 'strong',
      headline: `$${breakdown.totalCOGS} estimated COGS — $${breakdown.buffer} margin buffer`,
      body: `Strong position. You have room to invest in finishing details or upgrade material without breaking your margin target.`,
      cogs: breakdown.totalCOGS,
      ceiling: breakdown.marginCeiling,
      biggestDriver,
      alternative: null,
    };
  }

  const tightText = lined
    ? `Removing lining saves ~$${LINING_COST}. `
    : '';

  return {
    type: 'viable',
    headline: `$${breakdown.totalCOGS} estimated COGS — $${breakdown.buffer} margin buffer`,
    body: `Viable but tight. ${tightText}A lower construction tier would add more breathing room.`,
    cogs: breakdown.totalCOGS,
    ceiling: breakdown.marginCeiling,
    biggestDriver,
    alternative,
  };
}
