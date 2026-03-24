/**
 * tests/unit/calculator.test.ts
 *
 * Unit tests for Muko scoring and calculation logic.
 * Covers: COGS calculation, margin gate, composite scoring, redirect selection.
 *
 * Data contract: imports materials.json directly — no mocks.
 */

import { describe, it, expect } from 'vitest';
import { calculateCOGS, checkExecutionFeasibility, applyRoleModifiers } from '@/lib/spec-studio/calculator';
import { calculateMukoScore } from '@/lib/scoring/calculateMukoScore';
import { selectRedirect } from '@/lib/agents/redirects';
import materialsRaw from '@/data/materials.json';
import categoriesRaw from '@/data/categories.json';
import type { Material, ConstructionTier } from '@/lib/types/spec-studio';
import type { BrandProfile } from '@/lib/agents/orchestrator-shared';

// ─── Constants mirrored from calculator.ts ───────────────────────────────────

const LABOR_BASE = 35;
const LABOR_MULTIPLIERS: Record<ConstructionTier, number> = {
  low: 1.2,
  moderate: 1.8,
  high: 2.5,
};
const LINING_COST = 18;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Cast the JSON array to typed Material array. */
const MATERIALS = materialsRaw as unknown as (Material & {
  complexity_tier: string;
  redirect_compatible: string[];
  functional_class: string;
  sustainability_flags?: string[];
  drape_quality?: string;
  fiber_type?: string;
})[];

const CATEGORIES = (categoriesRaw as { categories: { id: string; yards_required: number; defaultConstruction: ConstructionTier }[] }).categories;

/** Build a minimal Material stub for arithmetic edge-case tests. */
function stubMaterial(cost_per_yard: number): Material {
  return {
    id: 'stub',
    name: 'Stub Material',
    cost_per_yard,
    lead_time_weeks: 8,
    complexity_tier: 'low',
    properties: [],
    hand_feel: 'medium',
    weight: 'medium',
  };
}

/** Shared brand profile used in redirect tests. */
const BRAND_CONTEMPORARY: BrandProfile = {
  id: null,
  brand_name: 'Test Brand',
  keywords: ['Feminine', 'Romantic'],
  customer_profile: 'fashion-forward millennial',
  price_tier: 'Contemporary',
  target_margin: 0.55,
  tension_context: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. COGS CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateCOGS — material cost component per material', () => {
  /**
   * For each material, assert that materialCost equals
   * Math.round(cost_per_yard × yardage) and that the returned totalCOGS
   * equals Math.round(materialCost + laborCost + liningCost).
   */
  const YARDAGE = 2.0;
  const TIER: ConstructionTier = 'moderate';
  const MSRP = 500;
  const MARGIN = 0.55;

  for (const mat of MATERIALS) {
    it(`${mat.id}: materialCost = cost_per_yard × yardage`, () => {
      const result = calculateCOGS(mat, YARDAGE, TIER, false, MSRP, MARGIN);
      const expectedMaterialCost = Math.round(mat.cost_per_yard * YARDAGE);
      expect(result.materialCost).toBe(expectedMaterialCost);
    });

    it(`${mat.id}: totalCOGS = materialCost + laborCost + liningCost`, () => {
      const result = calculateCOGS(mat, YARDAGE, TIER, false, MSRP, MARGIN);
      const rawMaterial = mat.cost_per_yard * YARDAGE;
      const rawLabor = LABOR_BASE * LABOR_MULTIPLIERS[TIER];
      const expectedTotal = Math.round(rawMaterial + rawLabor);
      expect(result.totalCOGS).toBe(expectedTotal);
    });
  }
});

describe('calculateCOGS — labor multipliers by construction tier', () => {
  const mat = stubMaterial(10.0);
  const YARDAGE = 2.0;
  const MSRP = 500;
  const MARGIN = 0.55;

  it('low tier: laborCost = 35 × 1.2 = 42', () => {
    const result = calculateCOGS(mat, YARDAGE, 'low', false, MSRP, MARGIN);
    expect(result.laborCost).toBe(Math.round(LABOR_BASE * 1.2)); // 42
  });

  it('moderate tier: laborCost = 35 × 1.8 = 63', () => {
    const result = calculateCOGS(mat, YARDAGE, 'moderate', false, MSRP, MARGIN);
    expect(result.laborCost).toBe(Math.round(LABOR_BASE * 1.8)); // 63
  });

  it('high tier: laborCost = 35 × 2.5 = 88', () => {
    const result = calculateCOGS(mat, YARDAGE, 'high', false, MSRP, MARGIN);
    expect(result.laborCost).toBe(Math.round(LABOR_BASE * 2.5)); // 88
  });

  it('lining adds exactly $18 when lined=true', () => {
    const unlined = calculateCOGS(mat, YARDAGE, 'moderate', false, MSRP, MARGIN);
    const lined = calculateCOGS(mat, YARDAGE, 'moderate', true, MSRP, MARGIN);
    expect(lined.liningCost).toBe(LINING_COST);
    expect(lined.totalCOGS - unlined.totalCOGS).toBe(LINING_COST);
  });

  it('lining is $0 when lined=false', () => {
    const result = calculateCOGS(mat, YARDAGE, 'low', false, MSRP, MARGIN);
    expect(result.liningCost).toBe(0);
  });
});

describe('calculateCOGS — full tier × category matrix', () => {
  /**
   * Verifies totalCOGS for every (construction tier, category) combination
   * using organic-cotton ($14/yd) and the category's yards_required.
   */
  const organicCotton = MATERIALS.find(m => m.id === 'organic-cotton')!;
  const TIERS: ConstructionTier[] = ['low', 'moderate', 'high'];

  for (const category of CATEGORIES) {
    for (const tier of TIERS) {
      it(`${category.id} × ${tier}`, () => {
        const result = calculateCOGS(
          organicCotton,
          category.yards_required,
          tier,
          false,
          500,
          0.55,
        );
        const expectedMaterial = organicCotton.cost_per_yard * category.yards_required;
        const expectedLabor = LABOR_BASE * LABOR_MULTIPLIERS[tier];
        expect(result.totalCOGS).toBe(Math.round(expectedMaterial + expectedLabor));
        expect(result.materialCost).toBe(Math.round(expectedMaterial));
        expect(result.laborCost).toBe(Math.round(expectedLabor));
      });
    }
  }
});

describe('calculateCOGS — MSRP edge cases', () => {
  const mat = stubMaterial(10.0);
  const YARDAGE = 2.0;

  it('MSRP of $0 → marginCeiling is 0', () => {
    const result = calculateCOGS(mat, YARDAGE, 'low', false, 0, 0.55);
    expect(result.marginCeiling).toBe(0);
  });

  it('MSRP of $0 → any positive COGS is over budget', () => {
    const result = calculateCOGS(mat, YARDAGE, 'low', false, 0, 0.55);
    expect(result.totalCOGS).toBeGreaterThan(0);
    expect(result.isOverBudget).toBe(true);
  });

  it('negative MSRP → marginCeiling is negative → always over budget', () => {
    const result = calculateCOGS(mat, YARDAGE, 'low', false, -200, 0.55);
    expect(result.marginCeiling).toBeLessThan(0);
    expect(result.isOverBudget).toBe(true);
  });

  it('extremely high MSRP ($10,000) → comfortable margin buffer', () => {
    const result = calculateCOGS(mat, YARDAGE, 'high', false, 10_000, 0.55);
    expect(result.marginCeiling).toBeGreaterThan(result.totalCOGS);
    expect(result.isOverBudget).toBe(false);
    expect(result.buffer).toBeGreaterThan(0);
  });

  it('MSRP $10,000 → materialPct + laborPct < 1.0', () => {
    const result = calculateCOGS(mat, YARDAGE, 'moderate', false, 10_000, 0.55);
    expect(result.materialPct + result.laborPct).toBeLessThanOrEqual(1.0);
  });
});

describe('calculateCOGS — missing / zero-cost material stub', () => {
  it('zero cost_per_yard does not throw', () => {
    expect(() =>
      calculateCOGS(stubMaterial(0), 2.0, 'moderate', false, 200, 0.55)
    ).not.toThrow();
  });

  it('zero cost_per_yard → materialCost is 0', () => {
    const result = calculateCOGS(stubMaterial(0), 2.0, 'moderate', false, 200, 0.55);
    expect(result.materialCost).toBe(0);
  });

  it('zero cost_per_yard → totalCOGS equals laborCost only', () => {
    const result = calculateCOGS(stubMaterial(0), 2.0, 'moderate', false, 200, 0.55);
    expect(result.totalCOGS).toBe(Math.round(LABOR_BASE * LABOR_MULTIPLIERS.moderate));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. MARGIN GATE
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateCOGS — margin gate (isOverBudget)', () => {
  /**
   * Setup: low tier, yardage=2.0, not lined.
   *   laborCost = 35 × 1.2 = 42.0 (exact)
   *
   * To engineer an exact boundary, solve:
   *   cost_per_yard * 2.0 + 42.0 = MSRP * (1 - margin)
   *   → cost_per_yard * 2.0 = MSRP * (1 - margin) - 42.0
   *
   * Using MSRP=100, margin=0.40:
   *   ceiling = 100 * 0.60 = 60.0
   *   materialCost needed = 60.0 - 42.0 = 18.0 → cost_per_yard = 9.0
   */

  it('gate passes when totalCOGS is well below ceiling', () => {
    // cheap material, generous MSRP
    const mat = stubMaterial(5.0);
    const result = calculateCOGS(mat, 2.0, 'low', false, 500, 0.55);
    expect(result.isOverBudget).toBe(false);
  });

  it('gate fails when totalCOGS exceeds ceiling', () => {
    // expensive material against a low MSRP
    const silk = MATERIALS.find(m => m.id === 'silk')!;
    const result = calculateCOGS(silk, 3.0, 'high', true, 100, 0.55);
    expect(result.isOverBudget).toBe(true);
  });

  it('boundary: totalCOGS exactly equals ceiling → gate passes', () => {
    // Engineered: cost_per_yard=9.0, yardage=2.0, low, not lined
    //   materialCost = 18.0, laborCost = 42.0, total = 60.0
    //   MSRP=100, margin=0.40 → ceiling = 60.0
    //   gap = 0.0 → isOverBudget = false
    const mat = stubMaterial(9.0);
    const result = calculateCOGS(mat, 2.0, 'low', false, 100, 0.40);
    expect(result.totalCOGS).toBe(60);
    expect(result.marginCeiling).toBe(60);
    expect(result.isOverBudget).toBe(false);
  });

  it('boundary: totalCOGS = ceiling + $0.01 → gate fails', () => {
    // cost_per_yard=9.005 → materialCost = 18.01, total = 60.01, ceiling = 60.0 → gap = 0.01 > 0
    const mat = stubMaterial(9.005);
    const result = calculateCOGS(mat, 2.0, 'low', false, 100, 0.40);
    expect(result.isOverBudget).toBe(true);
  });

  describe('gate behaviour across target margins', () => {
    // fixed material + MSRP; vary margin to find pass/fail boundary
    // silk: cost_per_yard=38, yardage=2.0, high (laborCost=88), lined
    //   materialCost=76, laborCost=88, liningCost=18, totalCOGS=182

    const silk = MATERIALS.find(m => m.id === 'silk')!;

    it('margin 0.40: ceiling = 300 * 0.60 = 180 → COGS 182 fails', () => {
      const result = calculateCOGS(silk, 2.0, 'high', true, 300, 0.40);
      expect(result.isOverBudget).toBe(true);
    });

    it('margin 0.55: ceiling = 450 * 0.45 ≈ 202 → COGS 182 passes', () => {
      // ceiling = 450 * 0.45 = 202.5 → Math.round = 203; but isOverBudget uses unrounded
      // 450 * (1 - 0.55) = 450 * 0.45 = 202.5; gap = 182 - 202.5 = -20.5 → passes
      const result = calculateCOGS(silk, 2.0, 'high', true, 450, 0.55);
      expect(result.isOverBudget).toBe(false);
    });

    it('margin 0.60: ceiling = 500 * 0.40 = 200 → COGS 182 passes', () => {
      const result = calculateCOGS(silk, 2.0, 'high', true, 500, 0.60);
      expect(result.isOverBudget).toBe(false);
    });

    it('margin 0.70: ceiling = 700 * 0.30 = 210 → COGS 182 passes', () => {
      const result = calculateCOGS(silk, 2.0, 'high', true, 700, 0.70);
      expect(result.isOverBudget).toBe(false);
    });

    it('margin 0.70 with low MSRP: ceiling = 200 * 0.30 = 60 → COGS 182 fails', () => {
      const result = calculateCOGS(silk, 2.0, 'high', true, 200, 0.70);
      expect(result.isOverBudget).toBe(true);
    });
  });

  describe('gap and buffer are inverses', () => {
    it('buffer = -gap regardless of sign', () => {
      const mat = stubMaterial(12.0);
      const result = calculateCOGS(mat, 2.0, 'moderate', false, 200, 0.55);
      expect(result.buffer).toBe(-result.gap);
    });

    it('when gate passes, buffer > 0', () => {
      const mat = stubMaterial(5.0);
      const result = calculateCOGS(mat, 2.0, 'low', false, 500, 0.55);
      expect(result.buffer).toBeGreaterThan(0);
    });

    it('when gate fails, gap > 0', () => {
      const silk = MATERIALS.find(m => m.id === 'silk')!;
      const result = calculateCOGS(silk, 3.0, 'high', true, 100, 0.55);
      expect(result.gap).toBeGreaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SCORING FORMULA
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateMukoScore — base formula', () => {
  it('all dimensions at 100, gate passes → 100', () => {
    expect(
      calculateMukoScore(
        { identity_score: 100, resonance_score: 100, execution_score: 100 },
        { margin_gate_passed: true },
      ),
    ).toBe(100);
  });

  it('all dimensions at 0, gate passes → 0', () => {
    expect(
      calculateMukoScore(
        { identity_score: 0, resonance_score: 0, execution_score: 0 },
        { margin_gate_passed: true },
      ),
    ).toBe(0);
  });

  it('Identity=100, Resonance=0, Execution=0 → 35 (identity weight)', () => {
    // 100×0.35 + 0×0.35 + 0×0.30 = 35.0
    expect(
      calculateMukoScore(
        { identity_score: 100, resonance_score: 0, execution_score: 0 },
        { margin_gate_passed: true },
      ),
    ).toBe(35);
  });

  it('Identity=0, Resonance=100, Execution=0 → 35 (resonance weight)', () => {
    // 0×0.35 + 100×0.35 + 0×0.30 = 35.0
    expect(
      calculateMukoScore(
        { identity_score: 0, resonance_score: 100, execution_score: 0 },
        { margin_gate_passed: true },
      ),
    ).toBe(35);
  });

  it('Identity=0, Resonance=0, Execution=100 → 30 (execution weight)', () => {
    // 0×0.35 + 0×0.35 + 100×0.30 = 30.0
    expect(
      calculateMukoScore(
        { identity_score: 0, resonance_score: 0, execution_score: 100 },
        { margin_gate_passed: true },
      ),
    ).toBe(30);
  });

  it('Identity=90, Resonance=85, Execution=45, gate passes → 75', () => {
    // 90×0.35 + 85×0.35 + 45×0.30
    // = 31.5 + 29.75 + 13.5 = 74.75 → rounds to 75
    expect(
      calculateMukoScore(
        { identity_score: 90, resonance_score: 85, execution_score: 45 },
        { margin_gate_passed: true },
      ),
    ).toBe(75);
  });

  it('weights sum to 1.0: identity(0.35) + resonance(0.35) + execution(0.30)', () => {
    // Verify by checking that equal scores return the same score unchanged
    const score = calculateMukoScore(
      { identity_score: 80, resonance_score: 80, execution_score: 80 },
      { margin_gate_passed: true },
    );
    expect(score).toBe(80); // 80×(0.35+0.35+0.30) = 80×1.0 = 80
  });

  it('returns a rounded integer', () => {
    const score = calculateMukoScore(
      { identity_score: 71, resonance_score: 68, execution_score: 53 },
      { margin_gate_passed: true },
    );
    expect(Number.isInteger(score)).toBe(true);
  });
});

describe('calculateMukoScore — margin gate penalty', () => {
  it('gate failure applies 30% penalty: score × 0.7', () => {
    const withGate = calculateMukoScore(
      { identity_score: 80, resonance_score: 80, execution_score: 80 },
      { margin_gate_passed: true },
    );
    const withoutGate = calculateMukoScore(
      { identity_score: 80, resonance_score: 80, execution_score: 80 },
      { margin_gate_passed: false },
    );
    expect(withGate).toBe(80);
    expect(withoutGate).toBe(Math.round(80 * 0.7)); // 56
  });

  it('gate failure on a 73 base → 51', () => {
    // {85, 80, 52} → 85×0.35 + 80×0.35 + 52×0.30 = 29.75+28+15.6 = 73.35 → 73
    // 73 × 0.7 = 51.1 → rounds to 51
    const base = calculateMukoScore(
      { identity_score: 85, resonance_score: 80, execution_score: 52 },
      { margin_gate_passed: true },
    );
    expect(base).toBe(73);

    const penalised = calculateMukoScore(
      { identity_score: 85, resonance_score: 80, execution_score: 52 },
      { margin_gate_passed: false },
    );
    expect(penalised).toBe(51);
  });

  it('penalty must not produce a score below 0', () => {
    const score = calculateMukoScore(
      { identity_score: 0, resonance_score: 0, execution_score: 0 },
      { margin_gate_passed: false },
    );
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('all dimensions at 100 with gate failure → 70 (penalty applied, max does not exceed 100)', () => {
    // 100 × 0.7 = 70
    const score = calculateMukoScore(
      { identity_score: 100, resonance_score: 100, execution_score: 100 },
      { margin_gate_passed: false },
    );
    expect(score).toBe(70);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('all dimensions at 100 with gate passing → 100 (no penalty cap exceeded)', () => {
    const score = calculateMukoScore(
      { identity_score: 100, resonance_score: 100, execution_score: 100 },
      { margin_gate_passed: true },
    );
    expect(score).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. REDIRECT LOGIC
// ─────────────────────────────────────────────────────────────────────────────

describe('selectRedirect — cost failure', () => {
  it('gate failure → redirect type is "material"', () => {
    const result = selectRedirect(
      'silk',           // expensive material
      'poetcore',       // matched aesthetic
      false,            // gate failed
      80,               // identity fine
      85,               // execution fine
      BRAND_CONTEMPORARY,
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe('material');
  });

  it('gate failure → redirect reason is a non-empty string', () => {
    const result = selectRedirect('silk', 'poetcore', false, 80, 85, BRAND_CONTEMPORARY);
    expect(result).not.toBeNull();
    expect(result!.reason.trim().length).toBeGreaterThan(0);
  });

  it('gate failure → redirect does not suggest the same material that caused the failure', () => {
    const result = selectRedirect('silk', 'poetcore', false, 80, 85, BRAND_CONTEMPORARY);
    expect(result).not.toBeNull();
    expect(result!.target_material_id).not.toBe('silk');
  });

  it('gate failure → suggested material has lower cost_per_yard than source', () => {
    const result = selectRedirect('cashmere-blend', 'refined-clarity', false, 80, 85, BRAND_CONTEMPORARY);
    expect(result).not.toBeNull();
    const source = MATERIALS.find(m => m.id === 'cashmere-blend')!;
    const target = MATERIALS.find(m => m.id === result!.target_material_id);
    if (target) {
      expect(target.cost_per_yard).toBeLessThan(source.cost_per_yard);
    }
  });

  it('gate failure → cogs_delta_pct is negative (cheaper alternative)', () => {
    const result = selectRedirect('leather', 'indie-chic-grunge', false, 80, 85, BRAND_CONTEMPORARY);
    expect(result).not.toBeNull();
    expect(result!.cogs_delta_pct).toBeLessThan(0);
  });

  it('gate failure with leather source → frame_as_surface is true', () => {
    const result = selectRedirect('leather', 'indie-chic-grunge', false, 80, 85, BRAND_CONTEMPORARY);
    expect(result).not.toBeNull();
    expect(result!.frame_as_surface).toBe(true);
  });

  it('gate failure with vegan-leather source → frame_as_surface is true', () => {
    const result = selectRedirect('vegan-leather', 'gummy', false, 80, 85, BRAND_CONTEMPORARY);
    expect(result).not.toBeNull();
    expect(result!.frame_as_surface).toBe(true);
  });

  it('gate failure with non-leather source → frame_as_surface is absent', () => {
    const result = selectRedirect('silk', 'poetcore', false, 80, 85, BRAND_CONTEMPORARY);
    expect(result).not.toBeNull();
    expect(result!.frame_as_surface).toBeUndefined();
  });
});

describe('selectRedirect — identity / aesthetic mismatch', () => {
  /**
   * Brand has keyword 'Feminine'. terrain-luxe brand_mismatch has a 'Feminine' entry
   * pointing to 'romantic-analog'. With identityScore < 60 and gate passing,
   * we expect an aesthetic redirect.
   */
  it('identity < 60 + gate passes → redirect type is "aesthetic"', () => {
    const brand: BrandProfile = {
      ...BRAND_CONTEMPORARY,
      keywords: ['Feminine'],
    };
    const result = selectRedirect('linen', 'terrain-luxe', true, 40, 85, brand);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('aesthetic');
  });

  it('aesthetic redirect includes non-empty reason', () => {
    const brand: BrandProfile = {
      ...BRAND_CONTEMPORARY,
      keywords: ['Feminine'],
    };
    const result = selectRedirect('linen', 'terrain-luxe', true, 40, 85, brand);
    expect(result).not.toBeNull();
    expect(result!.reason.trim().length).toBeGreaterThan(0);
  });

  it('aesthetic redirect target is a different aesthetic than the source', () => {
    const brand: BrandProfile = {
      ...BRAND_CONTEMPORARY,
      keywords: ['Feminine'],
    };
    const result = selectRedirect('linen', 'terrain-luxe', true, 40, 85, brand);
    expect(result).not.toBeNull();
    expect(result!.target_material_id).not.toBe('terrain-luxe');
  });

  it('aesthetic redirect cogs_delta_pct is 0 (no material swap)', () => {
    const brand: BrandProfile = {
      ...BRAND_CONTEMPORARY,
      keywords: ['Feminine'],
    };
    const result = selectRedirect('linen', 'terrain-luxe', true, 40, 85, brand);
    expect(result).not.toBeNull();
    expect(result!.cogs_delta_pct).toBe(0);
  });

  it('identity >= 60 + gate passes → no redirect (all strong)', () => {
    const result = selectRedirect('organic-cotton', 'refined-clarity', true, 75, 85, BRAND_CONTEMPORARY);
    expect(result).toBeNull();
  });

  it('identity < 60 but aesthetic_matched_id is null → no redirect', () => {
    const result = selectRedirect('linen', null, true, 40, 85, BRAND_CONTEMPORARY);
    expect(result).toBeNull();
  });
});

describe('selectRedirect — execution failure suppression', () => {
  /**
   * When execution_score < 60 AND gate passes, the Synthesizer handles it —
   * selectRedirect returns null to avoid duplicate advice.
   */
  it('execution < 60 + gate passes → returns null (Synthesizer handles it)', () => {
    const result = selectRedirect(
      'silk',
      'poetcore',
      true,   // gate passed — no cost failure
      80,     // identity fine
      30,     // execution below 60
      BRAND_CONTEMPORARY,
    );
    expect(result).toBeNull();
  });

  it('execution < 60 + gate fails → still returns a material redirect (cost failure takes priority)', () => {
    const result = selectRedirect(
      'silk',
      'poetcore',
      false,  // gate failed
      80,
      30,     // low execution
      BRAND_CONTEMPORARY,
    );
    // Gate failure warrants redirect regardless of execution score
    expect(result).not.toBeNull();
    expect(result!.type).toBe('material');
  });
});

describe('selectRedirect — unknown material id', () => {
  it('unknown source material_id → returns null without throwing', () => {
    let result: ReturnType<typeof selectRedirect> | null = null;
    expect(() => {
      result = selectRedirect('nonexistent-material', 'poetcore', false, 80, 85, BRAND_CONTEMPORARY);
    }).not.toThrow();
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. EXECUTION FEASIBILITY (timeline_buffer)
// ─────────────────────────────────────────────────────────────────────────────

describe('checkExecutionFeasibility', () => {
  /**
   * required_weeks = complexity_weeks[tier] + material.lead_time_weeks
   *   low: 6, moderate: 10, high: 16
   * timeline_gap = timeline_weeks - required_weeks
   */

  it('comfortable buffer (gap >= 4) → green', () => {
    const result = checkExecutionFeasibility({
      construction_tier: 'low',
      material: { lead_time_weeks: 4 },
      timeline_weeks: 20, // required = 6+4 = 10; gap = 10
    });
    expect(result.status).toBe('green');
    expect(result.timeline_gap).toBeGreaterThanOrEqual(4);
  });

  it('tight buffer (-4 < gap < 4) → yellow', () => {
    const result = checkExecutionFeasibility({
      construction_tier: 'low',
      material: { lead_time_weeks: 4 },
      timeline_weeks: 9, // required = 10; gap = -1
    });
    expect(result.status).toBe('yellow');
  });

  it('timeline_buffer < 0 (gap < -4) → red', () => {
    const result = checkExecutionFeasibility({
      construction_tier: 'high',
      material: { lead_time_weeks: 15 },
      timeline_weeks: 10, // required = 16+15 = 31; gap = -21
    });
    expect(result.status).toBe('red');
    expect(result.timeline_gap).toBeLessThan(-4);
  });

  it('required_weeks = complexity + lead_time', () => {
    const result = checkExecutionFeasibility({
      construction_tier: 'moderate',
      material: { lead_time_weeks: 12 },
      timeline_weeks: 30, // 10 + 12 = 22
    });
    expect(result.required_weeks).toBe(22);
  });

  it('timeline_gap = timeline_weeks - required_weeks', () => {
    const result = checkExecutionFeasibility({
      construction_tier: 'moderate',
      material: { lead_time_weeks: 8 },
      timeline_weeks: 20, // required = 18; gap = 2
    });
    expect(result.timeline_gap).toBe(2);
  });

  it('gap exactly 4 → green (boundary)', () => {
    // required = 6 + 4 = 10; timeline = 14; gap = 4
    const result = checkExecutionFeasibility({
      construction_tier: 'low',
      material: { lead_time_weeks: 4 },
      timeline_weeks: 14,
    });
    expect(result.status).toBe('green');
    expect(result.timeline_gap).toBe(4);
  });

  it('gap exactly 3 → yellow (below green threshold)', () => {
    // required = 6 + 4 = 10; timeline = 13; gap = 3
    const result = checkExecutionFeasibility({
      construction_tier: 'low',
      material: { lead_time_weeks: 4 },
      timeline_weeks: 13,
    });
    expect(result.status).toBe('yellow');
  });

  it('gap exactly -4 → red (strict inequality: yellow requires gap > -4)', () => {
    // required = 6 + 4 = 10; timeline = 6; gap = -4
    // Code: `else if (gap > -4)` — at -4 the condition is false → red
    const result = checkExecutionFeasibility({
      construction_tier: 'low',
      material: { lead_time_weeks: 4 },
      timeline_weeks: 6,
    });
    expect(result.status).toBe('red');
  });

  it('gap exactly -5 → red', () => {
    // required = 6 + 4 = 10; timeline = 5; gap = -5
    const result = checkExecutionFeasibility({
      construction_tier: 'low',
      material: { lead_time_weeks: 4 },
      timeline_weeks: 5,
    });
    expect(result.status).toBe('red');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. ROLE MODIFIERS (applyRoleModifiers)
// ─────────────────────────────────────────────────────────────────────────────

describe('applyRoleModifiers', () => {
  it('no modifiers triggered → score unchanged (rounded)', () => {
    expect(applyRoleModifiers(80, 'hero', { cost: true }, 'moderate')).toBe(80);
  });

  it('volume-driver + cost failure → 0.65 penalty', () => {
    expect(applyRoleModifiers(80, 'volume-driver', { cost: false }, 'low')).toBe(
      Math.round(80 * 0.65),
    );
  });

  it('hero + cost failure → 0.92 penalty', () => {
    expect(applyRoleModifiers(80, 'hero', { cost: false }, 'low')).toBe(
      Math.round(80 * 0.92),
    );
  });

  it('volume-driver + high construction → 0.88 penalty on top of base', () => {
    // cost passes, but high tier: 80 × 0.88 = 70.4 → 70
    expect(applyRoleModifiers(80, 'volume-driver', { cost: true }, 'high')).toBe(
      Math.round(80 * 0.88),
    );
  });

  it('volume-driver + cost failure + high construction → both penalties stack', () => {
    // 80 × 0.65 × 0.88 = 45.76 → 46
    expect(applyRoleModifiers(80, 'volume-driver', { cost: false }, 'high')).toBe(
      Math.round(80 * 0.65 * 0.88),
    );
  });

  it('directional role with cost failure → no special penalty', () => {
    // directional has no modifier — score unchanged
    expect(applyRoleModifiers(80, 'directional', { cost: false }, 'high')).toBe(80);
  });

  it('returns a rounded integer', () => {
    const score = applyRoleModifiers(77, 'volume-driver', { cost: false }, 'high');
    expect(Number.isInteger(score)).toBe(true);
  });
});
