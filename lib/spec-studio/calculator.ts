import type { Material, Category, Silhouette, ConstructionTier } from '@/types/spec-studio';

// Labor multipliers by construction tier
const LABOR_BASE = 35;
const LABOR_MULTIPLIERS: Record<ConstructionTier, number> = {
  low: 1.2,
  moderate: 1.8,
  high: 2.5,
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
  targetMargin: number
): COGSBreakdown {
  const materialCost = material.cost_per_yard * yardage;
  const laborCost = LABOR_BASE * LABOR_MULTIPLIERS[constructionTier];
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
    ? material.properties.filter(p => alternativeMaterial.properties.includes(p))
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
