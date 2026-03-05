// TEMP TEST ROUTE — delete before beta launch

import { NextResponse } from 'next/server';
import { runAnalysis } from '@/lib/agents/orchestrator';
import type { AnalysisInput, BrandProfile, SessionState, AnalysisResult } from '@/lib/agents/orchestrator';
import { calculateCOGS } from '@/lib/spec-studio/calculator';
import materialsRaw from '@/data/materials.json';
import categoriesRaw from '@/data/categories.json';

const MATERIALS_MAP = Object.fromEntries(
  (materialsRaw as Record<string, unknown>[]).map(m => [(m as { id: string }).id, m])
);
const CATEGORIES_MAP = Object.fromEntries(
  (categoriesRaw as { categories: Record<string, unknown>[] }).categories.map(
    c => [(c as { id: string }).id, c]
  )
);

function computeCOGS(input: AnalysisInput, brand: BrandProfile): number {
  try {
    const mat = MATERIALS_MAP[input.material_id];
    const cat = CATEGORIES_MAP[input.category] as { yards_required?: number } | undefined;
    const yardage = cat?.yards_required ?? 2.0;
    const breakdown = calculateCOGS(
      mat as Parameters<typeof calculateCOGS>[0],
      yardage,
      input.construction_tier,
      false,
      input.target_msrp,
      brand.target_margin,
    );
    return breakdown.totalCOGS;
  } catch {
    return 0;
  }
}

function summarise(result: AnalysisResult, cogs: number, label: string) {
  console.log(`\n── ${label} RESULT ──────────────────────────────`);
  console.log(`  aesthetic_matched_id : ${result.aesthetic_matched_id}`);
  console.log(`  identity_score       : ${result.dimensions.identity}`);
  console.log(`  resonance_score      : ${result.dimensions.resonance}`);
  console.log(`  execution_score      : ${result.dimensions.execution}`);
  console.log(`  final_score          : ${result.score}`);
  console.log(`  gate_passed          : ${result.gates_passed.cost}`);
  console.log(`  cogs                 : $${cogs}`);
  console.log(`  redirect             : ${result.redirect ? JSON.stringify(result.redirect) : 'null'}`);
  console.log(`  narrative_preview    : ${result.narrative.slice(0, 120)}`);
  console.log(`  errors               : ${result.errors.length === 0 ? 'none' : JSON.stringify(result.errors)}`);
  console.log(`  agent_versions       : ${JSON.stringify(result.agent_versions)}`);
}

export async function GET() {
  // ── Fixture 1 ─────────────────────────────────────────────────────────────
  const input1: AnalysisInput = {
    aesthetic_input:   'Dark Romantic',
    material_id:       'silk',
    silhouette:        'Relaxed',
    construction_tier: 'high',
    category:          'Dresses',
    target_msrp:       320,
    season:            'FW26',
    collection_name:   'Nocturne',
    timeline_weeks:    10,
  };

  const brand1: BrandProfile = {
    id:               'test-brand-1',
    brand_name:       'Test Brand',
    keywords:         ['Romantic', 'Luxe', 'Minimalist', 'Timeless'],
    customer_profile: null,
    price_tier:       'Contemporary',
    target_margin:    0.65,
    tension_context:  null,
  };

  const session1: SessionState = {
    collectionName:    input1.collection_name,
    season:            input1.season,
    selectedAesthetic: input1.aesthetic_input,
    selectedElements:  [],
    category:          input1.category,
    targetMSRP:        input1.target_msrp,
    materialId:        input1.material_id,
    silhouette:        input1.silhouette,
    constructionTier:  input1.construction_tier,
    timelineWeeks:     input1.timeline_weeks,
    collectionRole:    null,
  };

  // ── Fixture 2 ─────────────────────────────────────────────────────────────
  const input2: AnalysisInput = {
    aesthetic_input:   'Coastal Minimalism',
    material_id:       'linen',
    silhouette:        'Relaxed',
    construction_tier: 'low',
    category:          'Tops',
    target_msrp:       500,
    season:            'SS26',
    collection_name:   'Shoreline',
    timeline_weeks:    14,
  };

  const brand2: BrandProfile = {
    id:               'test-brand-2',
    brand_name:       'Test Brand 2',
    keywords:         ['Minimalist', 'Coastal', 'Sustainable', 'Accessible'],
    customer_profile: null,
    price_tier:       'Contemporary',
    target_margin:    0.60,
    tension_context:  null,
  };

  const session2: SessionState = {
    collectionName:    input2.collection_name,
    season:            input2.season,
    selectedAesthetic: input2.aesthetic_input,
    selectedElements:  [],
    category:          input2.category,
    targetMSRP:        input2.target_msrp,
    materialId:        input2.material_id,
    silhouette:        input2.silhouette,
    constructionTier:  input2.construction_tier,
    timelineWeeks:     input2.timeline_weeks,
    collectionRole:    null,
  };

  // ── Run pipeline ──────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════');
  console.log('  MUKO PIPELINE TEST — two fixtures');
  console.log('════════════════════════════════════════════════');

  console.log('\n[RESEARCHER]  Fixture 1 — aesthetic match + category trend');
  console.log('[CRITIC]      Fixture 1 — brand alignment / identity score');
  console.log('[CALCULATOR]  Fixture 1 — COGS + execution feasibility');
  console.log('[GATE]        Fixture 1 — margin gate');
  console.log('[SCORING]     Fixture 1 — final score blend');
  console.log('[REDIRECTS]   Fixture 1 — redirect selection');
  console.log('[SYNTHESIZER] Fixture 1 — narrative generation');
  const result1 = await runAnalysis(input1, brand1, session1);
  const cogs1 = computeCOGS(input1, brand1);
  summarise(result1, cogs1, 'FIXTURE 1');

  console.log('\n[RESEARCHER]  Fixture 2 — aesthetic match + category trend');
  console.log('[CRITIC]      Fixture 2 — brand alignment / identity score');
  console.log('[CALCULATOR]  Fixture 2 — COGS + execution feasibility');
  console.log('[GATE]        Fixture 2 — margin gate');
  console.log('[SCORING]     Fixture 2 — final score blend');
  console.log('[REDIRECTS]   Fixture 2 — redirect selection');
  console.log('[SYNTHESIZER] Fixture 2 — narrative generation');
  const result2 = await runAnalysis(input2, brand2, session2);
  const cogs2 = computeCOGS(input2, brand2);
  summarise(result2, cogs2, 'FIXTURE 2');

  // ── Shape response ────────────────────────────────────────────────────────
  function shape(r: AnalysisResult, cogs: number) {
    return {
      aesthetic_matched_id: r.aesthetic_matched_id,
      identity_score:       r.dimensions.identity,
      resonance_score:      r.dimensions.resonance,
      execution_score:      r.dimensions.execution,
      final_score:          r.score,
      gate_passed:          r.gates_passed.cost,
      cogs,
      redirect:             r.redirect,
      narrative_preview:    r.narrative.slice(0, 120),
      errors:               r.errors,
      agent_versions:       r.agent_versions,
    };
  }

  return NextResponse.json({
    fixture1: shape(result1, cogs1),
    fixture2: shape(result2, cogs2),
  });
}
