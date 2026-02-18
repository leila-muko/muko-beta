/**
 * Muko Calculator Agent
 * calculateCOGS() — Deterministic cost analysis for fashion designs
 *
 * PRD Reference: Section 4 (Technical Architecture), V2.1 Section 2 (Agent Table)
 * Philosophy: Pure math, no LLM. 100% reliable, 0ms latency.
 *
 * Formula:
 *   Material Cost = cost_per_yard × yards_required × complexity_modifier
 *   Labor Cost    = labor_base × construction_multiplier
 *   Overhead      = (Material + Labor) × overhead_rate
 *   COGS          = Material + Labor + Overhead
 *   Gate Pass     = COGS <= MSRP × (1 - target_margin)
 */

const fs = require("fs");
const path = require("path");

// ─── Load Reference Data ──────────────────────────────────────────────────────

// materials.json is a root array
const materialsData: unknown[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/materials.json"), "utf8")
);
const categoriesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/categories.json"), "utf8")
);

// ─── Complexity modifier derived from complexity_tier field ───────────────────
const COMPLEXITY_MODIFIER: Record<string, number> = {
  low: 1.0,
  moderate: 1.15,
  high: 1.30,
};

// Index by ID for O(1) lookup
const MATERIALS: Record<string, any> = Object.fromEntries(
  (materialsData as any[]).map((m: any) => [m.id, m])
);
const CATEGORIES: Record<string, any> = Object.fromEntries(
  (categoriesData.categories as any[]).map((c: any) => [c.id, c])
);

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Construction Multipliers
 * Applied to labor_base to reflect complexity overhead (not total labor).
 * The labor_base in categories.json already prices the standard complexity
 * for that category. These multipliers adjust for deviation from standard.
 *
 * PRD V2.1 reference values: Low=1.2x, High=2.5x
 * Calibrated: labor_base represents "moderate" — multipliers are relative to it.
 *   Low  = simpler than standard (-25%)
 *   High = more complex (+35%)
 */
const CONSTRUCTION_MULTIPLIERS: Record<string, number> = {
  low: 0.75,      // Simplified: fewer seams, no lining, basic closures
  moderate: 1.0,  // Standard for category (labor_base is calibrated to this)
  high: 1.35,     // Complex: full lining, hardware, tailored details
};

/**
 * Overhead Rate
 * Covers: shipping, packaging, QC, storage, misc factory costs.
 * Industry standard for contemporary brands: 15–20%.
 */
const OVERHEAD_RATE = 0.18;

/**
 * Default target margin if brand profile doesn't specify.
 * Contemporary brand standard: 60% gross margin.
 */
const DEFAULT_TARGET_MARGIN = 0.6;

// ─── Main Function ────────────────────────────────────────────────────────────

/**
 * calculateCOGS()
 *
 * @param input.material_id      - e.g. "tencel", "silk", "organic-cotton"
 * @param input.category_id      - e.g. "trench-coat", "midi-dress"
 * @param input.construction_tier - "low" | "moderate" | "high"
 * @param input.target_msrp      - Target retail price in USD, e.g. 450
 * @param input.target_margin    - Override brand margin, e.g. 0.65 (65%)
 *
 * @returns COGSResult — Full cost breakdown + gate pass/fail
 */
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
}) {
  // ── Step 1: Validate inputs ──────────────────────────────────────────────
  const errors = validateInputs({ material_id, category_id, construction_tier, target_msrp, target_margin });
  if (errors.length > 0) {
    return { success: false, errors };
  }

  const material = MATERIALS[material_id];
  const category = CATEGORIES[category_id];
  const multiplier = CONSTRUCTION_MULTIPLIERS[construction_tier];
  const complexityModifier = COMPLEXITY_MODIFIER[material.complexity_tier] ?? 1.0;

  // ── Step 2: Material Cost ────────────────────────────────────────────────
  // Most garments: cost_per_yard × yards_required × complexity_modifier
  // Knits (sweaters/cardigans): cost is per kg weight, handled separately
  let materialCost: number;
  let materialNote: string | null = null;

  if (category.knit_weight_kg) {
    // Knit category: price by weight
    // We use cost_per_yard as a proxy for cost_per_100g (acceptable for beta)
    const knitCostPerKg = material.cost_per_yard * 4; // rough industry conversion
    materialCost = knitCostPerKg * category.knit_weight_kg;
    materialNote = `Knit category: ${category.knit_weight_kg}kg @ $${knitCostPerKg.toFixed(2)}/kg`;
  } else {
    materialCost = material.cost_per_yard * category.yards_required * complexityModifier;
  }

  // ── Step 3: Labor Cost ───────────────────────────────────────────────────
  // labor_base (from categories.json) × construction_multiplier
  const laborCost = category.labor_base_usd * multiplier;

  // ── Step 4: Overhead ─────────────────────────────────────────────────────
  // Applied to (material + labor) subtotal.
  // Covers: duty, shipping, QC, packaging, waste factor.
  const subtotal = materialCost + laborCost;
  const overheadCost = subtotal * OVERHEAD_RATE;

  // ── Step 5: Total COGS ───────────────────────────────────────────────────
  const totalCOGS = materialCost + laborCost + overheadCost;

  // ── Step 6: Margin Gate ──────────────────────────────────────────────────
  // Gate formula: COGS <= MSRP × (1 - margin)
  // e.g. $450 MSRP @ 60% margin → max COGS = $450 × 0.40 = $180
  const maxAllowableCOGS = target_msrp * (1 - target_margin);
  const costGatePassed = totalCOGS <= maxAllowableCOGS;
  const actualMargin = (target_msrp - totalCOGS) / target_msrp;
  const cogsExcessAmount = costGatePassed ? 0 : totalCOGS - maxAllowableCOGS;

  // ── Step 7: Generate Redirect Suggestions ────────────────────────────────
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

  // ── Step 8: Return Result ─────────────────────────────────────────────────
  return {
    success: true,

    // Summary
    cost_gate_passed: costGatePassed,
    total_cogs: round(totalCOGS),
    actual_margin_pct: round(actualMargin * 100),
    target_margin_pct: round(target_margin * 100),

    // Breakdown
    breakdown: {
      material_cost: round(materialCost),
      labor_cost: round(laborCost),
      overhead_cost: round(overheadCost),
      overhead_rate_pct: OVERHEAD_RATE * 100,
    },

    // Gate details
    gate: {
      target_msrp,
      max_allowable_cogs: round(maxAllowableCOGS),
      cogs_excess: round(cogsExcessAmount),
      margin_gap_pct: costGatePassed ? 0 : round((target_margin - actualMargin) * 100),
    },

    // Source data (for transparency + audit trail)
    inputs_resolved: {
      material: material.name,
      material_cost_per_yard: material.cost_per_yard,
      material_complexity_tier: material.complexity_tier,
      material_complexity_modifier: complexityModifier,
      category: category.name,
      yards_required: category.yards_required || null,
      knit_weight_kg: category.knit_weight_kg || null,
      labor_base_usd: category.labor_base_usd,
      construction_tier,
      construction_multiplier: multiplier,
      material_note: materialNote,
    },

    // Redirects (only populated if gate fails)
    redirects,
  };
}

// ─── Redirect Generator ───────────────────────────────────────────────────────

/**
 * generateCostRedirects()
 * When the margin gate fails, suggest 1–3 actionable alternatives.
 * Returns suggestions sorted by estimated savings (highest first).
 */
function generateCostRedirects({
  material,
  category,
  construction_tier,
  totalCOGS,
  maxAllowableCOGS,
  target_msrp,
  target_margin,
}: {
  material: any;
  category: any;
  construction_tier: string;
  totalCOGS: number;
  maxAllowableCOGS: number;
  target_msrp: number;
  target_margin: number;
}) {
  const redirects: any[] = [];

  // ── Option A: Cheaper material alternative ──────────────────────────────
  const materialAlternatives = findCheaperMaterials(material, category, construction_tier, maxAllowableCOGS);
  redirects.push(...materialAlternatives);

  // ── Option B: Reduce construction tier ─────────────────────────────────
  if (construction_tier === "high") {
    const moderateResult = calculateCOGS({
      material_id: material.id,
      category_id: category.id,
      construction_tier: "moderate",
      target_msrp,
      target_margin,
    });
    if (moderateResult.cost_gate_passed) {
      const savings = totalCOGS - (moderateResult as any).total_cogs;
      redirects.push({
        type: "construction",
        action: "Reduce construction to Moderate",
        detail: `Moderate complexity reduces labor to $${(moderateResult as any).breakdown.labor_cost}`,
        new_cogs: (moderateResult as any).total_cogs,
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
    if (lowResult.cost_gate_passed) {
      const savings = totalCOGS - (lowResult as any).total_cogs;
      redirects.push({
        type: "construction",
        action: "Reduce construction to Low",
        detail: `Simple construction reduces labor to $${(lowResult as any).breakdown.labor_cost}`,
        new_cogs: (lowResult as any).total_cogs,
        savings: round(savings),
        savings_pct: round((savings / totalCOGS) * 100),
        gate_passes: true,
        caution: "Verify fit and quality expectations are still met.",
      });
    }
  }

  // ── Option C: Raise MSRP suggestion ────────────────────────────────────
  const breakEvenMSRP = totalCOGS / (1 - target_margin);
  const msrpIncrease = breakEvenMSRP - target_msrp;
  if (msrpIncrease / target_msrp < 0.3) {
    // Only suggest if increase is <30% (reasonable)
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

  // Sort: material swaps first, then construction, then pricing
  const sortOrder: Record<string, number> = { material: 0, construction: 1, pricing: 2 };
  redirects.sort((a, b) => (sortOrder[a.type] ?? 3) - (sortOrder[b.type] ?? 3));

  return redirects.slice(0, 3); // Max 3 redirects
}

// ─── Cheaper Material Finder ──────────────────────────────────────────────────

/**
 * findCheaperMaterials()
 * Finds materials cheaper than current that still pass the gate.
 * Returns top 2 options sorted by gate_passes, then by savings.
 */
function findCheaperMaterials(
  currentMaterial: any,
  category: any,
  construction_tier: string,
  maxAllowableCOGS: number
) {
  const candidates: any[] = [];

  for (const [id, mat] of Object.entries(MATERIALS) as [string, any][]) {
    if (id === currentMaterial.id) continue;
    if (mat.cost_per_yard >= currentMaterial.cost_per_yard) continue;

    const testResult = calculateCOGS({
      material_id: id,
      category_id: category.id,
      construction_tier,
      target_msrp: 99999, // Dummy — we just need the COGS
      target_margin: 0,
    });

    if (!testResult.success) continue;
    const result = testResult as any;

    const passes = result.total_cogs <= maxAllowableCOGS;
    const costReductionPct = round(
      ((result.total_cogs - maxAllowableCOGS) / result.total_cogs) * 100 * -1
    );

    candidates.push({
      type: "material",
      action: `Switch to ${mat.name}`,
      detail: `$${mat.cost_per_yard}/yd vs. $${currentMaterial.cost_per_yard}/yd`,
      new_cogs: result.total_cogs,
      savings: round(
        (currentMaterial.cost_per_yard - mat.cost_per_yard) * (category.yards_required || 2)
      ),
      savings_pct: costReductionPct > 0 ? costReductionPct : 0,
      gate_passes: passes,
      sustainability_score: mat.sustainability_score,
      caution: passes ? null : "This swap reduces cost but may not fully close the margin gap.",
    });
  }

  // Prioritize: passing candidates first, then sorted by savings
  return candidates
    .sort((a, b) => {
      if (a.gate_passes && !b.gate_passes) return -1;
      if (!a.gate_passes && b.gate_passes) return 1;
      return b.savings - a.savings;
    })
    .slice(0, 2);
}

// ─── Validation ───────────────────────────────────────────────────────────────

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
}) {
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

// ─── Utilities ────────────────────────────────────────────────────────────────

function round(num: number) {
  return Math.round(num * 100) / 100;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  calculateCOGS,
  MATERIALS,
  CATEGORIES,
  CONSTRUCTION_MULTIPLIERS,
  OVERHEAD_RATE,
};
