/**
 * Muko Calculator Agent
 * calculateCOGS() — Deterministic cost analysis for fashion designs
 *
 * PRD Reference: Section 4 (Technical Architecture), V2.1 Section 2 (Agent Table)
 * Philosophy: Pure math, no LLM. 100% reliable, 0ms latency.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface MaterialRecord {
  id: string;
  name: string;
  cost_per_yard: number;
  complexity_tier: string;
  sustainability_score?: number | null;
}

interface CategoryRecord {
  id: string;
  name: string;
  yards_required?: number | null;
  knit_weight_kg?: number | null;
  labor_base_usd: number;
}

interface CategoriesPayload {
  categories: CategoryRecord[];
}

interface CostRedirect {
  type: "material" | "construction" | "pricing";
  action: string;
  detail: string;
  new_cogs: number;
  savings: number;
  savings_pct: number;
  gate_passes: boolean;
  caution: string | null;
  sustainability_score?: number | null;
}

interface SuccessResult {
  success: true;
  cost_gate_passed: boolean;
  total_cogs: number;
  actual_margin_pct: number;
  target_margin_pct: number;
  breakdown: {
    material_cost: number;
    labor_cost: number;
    overhead_cost: number;
    overhead_rate_pct: number;
  };
  gate: {
    target_msrp: number;
    max_allowable_cogs: number;
    cogs_excess: number;
    margin_gap_pct: number;
  };
  inputs_resolved: {
    material: string;
    material_cost_per_yard: number;
    material_complexity_tier: string;
    material_complexity_modifier: number;
    category: string;
    yards_required: number | null;
    knit_weight_kg: number | null;
    labor_base_usd: number;
    construction_tier: string;
    construction_multiplier: number;
    material_note: string | null;
  };
  redirects: CostRedirect[];
}

type ErrorResult = { success: false; errors: string[] };
type COGSResult = SuccessResult | ErrorResult;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const materialsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/materials.json"), "utf8")
) as MaterialRecord[];
const categoriesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/categories.json"), "utf8")
) as CategoriesPayload;

const COMPLEXITY_MODIFIER: Record<string, number> = {
  low: 1.0,
  moderate: 1.15,
  high: 1.3,
};

const MATERIALS: Record<string, MaterialRecord> = Object.fromEntries(
  materialsData.map((material) => [material.id, material])
);
const CATEGORIES: Record<string, CategoryRecord> = Object.fromEntries(
  categoriesData.categories.map((category) => [category.id, category])
);

const CONSTRUCTION_MULTIPLIERS: Record<string, number> = {
  low: 0.75,
  moderate: 1.0,
  high: 1.35,
};

const OVERHEAD_RATE = 0.18;
const DEFAULT_TARGET_MARGIN = 0.6;

function buildSuccessResult(args: {
  costGatePassed: boolean;
  totalCOGS: number;
  actualMargin: number;
  targetMargin: number;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  targetMsrp: number;
  maxAllowableCOGS: number;
  cogsExcessAmount: number;
  material: MaterialRecord;
  complexityModifier: number;
  category: CategoryRecord;
  constructionTier: string;
  multiplier: number;
  materialNote: string | null;
  redirects: CostRedirect[];
}): SuccessResult {
  return {
    success: true,
    cost_gate_passed: args.costGatePassed,
    total_cogs: round(args.totalCOGS),
    actual_margin_pct: round(args.actualMargin * 100),
    target_margin_pct: round(args.targetMargin * 100),
    breakdown: {
      material_cost: round(args.materialCost),
      labor_cost: round(args.laborCost),
      overhead_cost: round(args.overheadCost),
      overhead_rate_pct: OVERHEAD_RATE * 100,
    },
    gate: {
      target_msrp: args.targetMsrp,
      max_allowable_cogs: round(args.maxAllowableCOGS),
      cogs_excess: round(args.cogsExcessAmount),
      margin_gap_pct: args.costGatePassed ? 0 : round((args.targetMargin - args.actualMargin) * 100),
    },
    inputs_resolved: {
      material: args.material.name,
      material_cost_per_yard: args.material.cost_per_yard,
      material_complexity_tier: args.material.complexity_tier,
      material_complexity_modifier: args.complexityModifier,
      category: args.category.name,
      yards_required: args.category.yards_required ?? null,
      knit_weight_kg: args.category.knit_weight_kg ?? null,
      labor_base_usd: args.category.labor_base_usd,
      construction_tier: args.constructionTier,
      construction_multiplier: args.multiplier,
      material_note: args.materialNote,
    },
    redirects: args.redirects,
  };
}

function calculateCOGS({
  material_id,
  category_id,
  construction_tier,
  target_msrp,
  target_margin = DEFAULT_TARGET_MARGIN,
}: {
  material_id: string;
  category_id: string;
  construction_tier: string;
  target_msrp: number;
  target_margin?: number;
}): COGSResult {
  const errors = validateInputs({ material_id, category_id, construction_tier, target_msrp, target_margin });
  if (errors.length > 0) {
    return { success: false, errors };
  }

  const material = MATERIALS[material_id];
  const category = CATEGORIES[category_id];
  const multiplier = CONSTRUCTION_MULTIPLIERS[construction_tier];
  const complexityModifier = COMPLEXITY_MODIFIER[material.complexity_tier] ?? 1.0;

  let materialCost: number;
  let materialNote: string | null = null;

  if (category.knit_weight_kg) {
    const knitCostPerKg = material.cost_per_yard * 4;
    materialCost = knitCostPerKg * category.knit_weight_kg;
    materialNote = `Knit category: ${category.knit_weight_kg}kg @ $${knitCostPerKg.toFixed(2)}/kg`;
  } else {
    materialCost = material.cost_per_yard * (category.yards_required ?? 0) * complexityModifier;
  }

  const laborCost = category.labor_base_usd * multiplier;
  const subtotal = materialCost + laborCost;
  const overheadCost = subtotal * OVERHEAD_RATE;
  const totalCOGS = materialCost + laborCost + overheadCost;
  const maxAllowableCOGS = target_msrp * (1 - target_margin);
  const costGatePassed = totalCOGS <= maxAllowableCOGS;
  const actualMargin = (target_msrp - totalCOGS) / target_msrp;
  const cogsExcessAmount = costGatePassed ? 0 : totalCOGS - maxAllowableCOGS;
  const redirects = costGatePassed
    ? []
    : generateCostRedirects({
        material,
        category,
        construction_tier,
        totalCOGS,
        maxAllowableCOGS,
        target_msrp,
        target_margin,
      });

  return buildSuccessResult({
    costGatePassed,
    totalCOGS,
    actualMargin,
    targetMargin: target_margin,
    materialCost,
    laborCost,
    overheadCost,
    targetMsrp: target_msrp,
    maxAllowableCOGS,
    cogsExcessAmount,
    material,
    complexityModifier,
    category,
    constructionTier: construction_tier,
    multiplier,
    materialNote,
    redirects,
  });
}

function generateCostRedirects({
  material,
  category,
  construction_tier,
  totalCOGS,
  maxAllowableCOGS,
  target_msrp,
  target_margin,
}: {
  material: MaterialRecord;
  category: CategoryRecord;
  construction_tier: string;
  totalCOGS: number;
  maxAllowableCOGS: number;
  target_msrp: number;
  target_margin: number;
}): CostRedirect[] {
  const redirects: CostRedirect[] = [];

  redirects.push(...findCheaperMaterials(material, category, construction_tier, maxAllowableCOGS));

  if (construction_tier === "high") {
    const moderateResult = calculateCOGS({
      material_id: material.id,
      category_id: category.id,
      construction_tier: "moderate",
      target_msrp,
      target_margin,
    });
    if (moderateResult.success && moderateResult.cost_gate_passed) {
      const savings = totalCOGS - moderateResult.total_cogs;
      redirects.push({
        type: "construction",
        action: "Reduce construction to Moderate",
        detail: `Moderate complexity reduces labor to $${moderateResult.breakdown.labor_cost}`,
        new_cogs: moderateResult.total_cogs,
        savings: round(savings),
        savings_pct: round((savings / totalCOGS) * 100),
        gate_passes: true,
        caution: "Review spec sheet — some construction details may need to be simplified.",
      });
    }
  } else if (construction_tier === "moderate") {
    const lowResult = calculateCOGS({
      material_id: material.id,
      category_id: category.id,
      construction_tier: "low",
      target_msrp,
      target_margin,
    });
    if (lowResult.success && lowResult.cost_gate_passed) {
      const savings = totalCOGS - lowResult.total_cogs;
      redirects.push({
        type: "construction",
        action: "Reduce construction to Low",
        detail: `Simple construction reduces labor to $${lowResult.breakdown.labor_cost}`,
        new_cogs: lowResult.total_cogs,
        savings: round(savings),
        savings_pct: round((savings / totalCOGS) * 100),
        gate_passes: true,
        caution: "Verify fit and quality expectations are still met.",
      });
    }
  }

  const breakEvenMSRP = totalCOGS / (1 - target_margin);
  const msrpIncrease = breakEvenMSRP - target_msrp;
  if (msrpIncrease / target_msrp < 0.3) {
    redirects.push({
      type: "pricing",
      action: `Raise MSRP to $${Math.ceil(breakEvenMSRP / 5) * 5}`,
      detail: `A $${round(msrpIncrease)} price increase (${round((msrpIncrease / target_msrp) * 100)}% higher) restores target margin`,
      new_cogs: round(totalCOGS),
      savings: 0,
      savings_pct: 0,
      gate_passes: true,
      caution: "Validate against competitive price ceiling for this category and brand tier.",
    });
  }

  const sortOrder: Record<CostRedirect["type"], number> = { material: 0, construction: 1, pricing: 2 };
  redirects.sort((a, b) => sortOrder[a.type] - sortOrder[b.type]);

  return redirects.slice(0, 3);
}

function findCheaperMaterials(
  currentMaterial: MaterialRecord,
  category: CategoryRecord,
  construction_tier: string,
  maxAllowableCOGS: number
): CostRedirect[] {
  const candidates: CostRedirect[] = [];

  for (const [id, material] of Object.entries(MATERIALS)) {
    if (id === currentMaterial.id) continue;
    if (material.cost_per_yard >= currentMaterial.cost_per_yard) continue;

    const testResult = calculateCOGS({
      material_id: id,
      category_id: category.id,
      construction_tier,
      target_msrp: 99999,
      target_margin: 0,
    });

    if (!testResult.success) continue;

    const passes = testResult.total_cogs <= maxAllowableCOGS;
    const costReductionPct = round(
      ((testResult.total_cogs - maxAllowableCOGS) / testResult.total_cogs) * 100 * -1
    );

    candidates.push({
      type: "material",
      action: `Switch to ${material.name}`,
      detail: `$${material.cost_per_yard}/yd vs. $${currentMaterial.cost_per_yard}/yd`,
      new_cogs: testResult.total_cogs,
      savings: round(
        (currentMaterial.cost_per_yard - material.cost_per_yard) * (category.yards_required || 2)
      ),
      savings_pct: costReductionPct > 0 ? costReductionPct : 0,
      gate_passes: passes,
      sustainability_score: material.sustainability_score ?? null,
      caution: passes ? null : "This swap reduces cost but may not fully close the margin gap.",
    });
  }

  return candidates
    .sort((a, b) => {
      if (a.gate_passes && !b.gate_passes) return -1;
      if (!a.gate_passes && b.gate_passes) return 1;
      return b.savings - a.savings;
    })
    .slice(0, 2);
}

function validateInputs({
  material_id,
  category_id,
  construction_tier,
  target_msrp,
  target_margin,
}: {
  material_id: string;
  category_id: string;
  construction_tier: string;
  target_msrp: number;
  target_margin: number;
}): string[] {
  const errors: string[] = [];

  if (!MATERIALS[material_id]) {
    errors.push(`Unknown material_id: "${material_id}". Valid options: ${Object.keys(MATERIALS).join(", ")}`);
  }
  if (!CATEGORIES[category_id]) {
    errors.push(`Unknown category_id: "${category_id}". Valid options: ${Object.keys(CATEGORIES).join(", ")}`);
  }
  if (!CONSTRUCTION_MULTIPLIERS[construction_tier]) {
    errors.push(`Invalid construction_tier: "${construction_tier}". Must be: low | moderate | high`);
  }
  if (!target_msrp || target_msrp <= 0) {
    errors.push(`target_msrp must be a positive number. Got: ${target_msrp}`);
  }
  if (target_margin <= 0 || target_margin >= 1) {
    errors.push(`target_margin must be between 0 and 1 (e.g., 0.60 for 60%). Got: ${target_margin}`);
  }

  return errors;
}

function round(num: number): number {
  return Math.round(num * 100) / 100;
}

export { calculateCOGS, MATERIALS, CATEGORIES, CONSTRUCTION_MULTIPLIERS, OVERHEAD_RATE };
