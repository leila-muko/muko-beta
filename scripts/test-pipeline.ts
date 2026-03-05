#!/usr/bin/env npx tsx
// scripts/test-pipeline.ts
// End-to-end pipeline test for the Muko analysis orchestrator.
// Run with: npx tsx scripts/test-pipeline.ts
//
// NOTE: The orchestrator exports `runAnalysis` (not `runMukoAnalysis`).
// NOTE: Orchestrator stubs return fixed COGS=185 and redirect=null until real
//       agents are wired. Fixture 1 will fail the margin gate (ceiling=$112);
//       fixture 2 passes (ceiling=$200 on $500 MSRP). Both show no redirect yet
//       because the redirect stub always returns null — see orchestrator.ts:250.
// NOTE: Supabase persist will log an error (no server context in script) — non-fatal.

import {
  runAnalysis,
  type AnalysisInput,
  type BrandProfile,
  type SessionState,
  type AnalysisResult,
} from '../lib/agents/orchestrator';

// ─── Fixture 1 — Margin gate fail → redirect expected (once real agents wired) ─

const input1: AnalysisInput = {
  aesthetic_input:   'Dark Romantic',
  material_id:       'silk-charmeuse',
  silhouette:        'Relaxed',
  construction_tier: 'high',
  category:          'Dresses',
  target_msrp:       320,
  season:            'FW26',
  collection_name:   'Nocturne',
  timeline_weeks:    10,
};

const brand1: BrandProfile = {
  id:               'test-brand-001',
  brand_name:       'Test Brand',
  keywords:         ['Romantic', 'Luxe', 'Minimalist', 'Timeless'],
  customer_profile: null,
  price_tier:       'Contemporary',
  target_margin:    0.65,
  tension_context:  null,
};

// ─── Fixture 2 — Clean pass (ceiling $200 > stub COGS $185) ───────────────────
// Original fixture had `target_msrp: 18` (typo); corrected to 500 so the
// margin gate passes with the current stub COGS=185 (ceiling = 500 * 0.40 = $200).

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
  id:               'test-brand-002',
  brand_name:       'Test Brand 2',
  keywords:         ['Minimalist', 'Coastal', 'Sustainable', 'Accessible'],
  customer_profile: null,
  price_tier:       'Contemporary',
  target_margin:    0.60,
  tension_context:  null,
};

// ─── Shared session stub ──────────────────────────────────────────────────────

function makeSession(input: AnalysisInput): SessionState {
  return {
    collectionName:    input.collection_name,
    season:            input.season,
    selectedAesthetic: input.aesthetic_input,
    selectedElements:  [],
    category:          input.category,
    targetMSRP:        input.target_msrp,
    materialId:        input.material_id,
    silhouette:        input.silhouette,
    constructionTier:  input.construction_tier,
    timelineWeeks:     input.timeline_weeks,
    collectionRole:    null,
  };
}

// ─── Pretty printer ───────────────────────────────────────────────────────────

function printResult(label: string, input: AnalysisInput, brand: BrandProfile, result: AnalysisResult) {
  const SEP = '═'.repeat(64);
  const DIV = '─'.repeat(64);

  console.log(`\n${SEP}`);
  console.log(`FIXTURE: ${label}`);
  console.log(`  Collection: ${input.collection_name} · ${input.season}`);
  console.log(`  Aesthetic:  ${input.aesthetic_input}`);
  console.log(`  Material:   ${input.material_id} | Tier: ${input.construction_tier}`);
  console.log(`  MSRP: $${input.target_msrp} | Target margin: ${(brand.target_margin * 100).toFixed(0)}%`);
  console.log(DIV);

  // Step 1 & 2 — Researcher
  console.log(`[RESEARCHER]  aesthetic_matched_id: ${result.aesthetic_matched_id ?? 'null'}`);

  // Step 3 — Critic
  console.log(`[CRITIC]      identity: ${result.dimensions.identity}/100`);

  // Step 4 — Researcher (resonance)
  console.log(`[RESEARCHER]  resonance: ${result.dimensions.resonance}/100`);

  // Step 5 — Calculator (execution)
  console.log(`[CALCULATOR]  execution: ${result.dimensions.execution}/100`);

  // Step 6+7 — Calculator (COGS + gate)
  const gateMark = result.gates_passed.cost ? 'PASS' : 'FAIL';
  console.log(`[CALCULATOR]  gate: ${gateMark} | cost_gate: ${result.gates_passed.cost}`);

  // Step 8 — Final score
  console.log(`[ORCHESTRATOR] final_score: ${result.score}/100`);

  // Step 9 — Redirect
  if (result.redirect) {
    console.log(`[REDIRECTS]   type: ${result.redirect.type} | suggestion: ${result.redirect.suggestion}`);
    console.log(`              reason: ${result.redirect.reason}`);
  } else {
    console.log(`[REDIRECTS]   null (no redirect warranted)`);
  }

  // Step 10 — Narrative
  const narrativePreview = result.narrative
    ? result.narrative.slice(0, 120).replace(/\n/g, ' ') + (result.narrative.length > 120 ? '…' : '')
    : '(empty)';
  console.log(`[SYNTHESIZER] narrative: ${narrativePreview}`);

  // Errors
  if (result.errors.length > 0) {
    console.log(DIV);
    console.log(`PIPELINE ERRORS (${result.errors.length}):`);
    for (const e of result.errors) {
      console.log(`  [${e.agent}] ${e.message}`);
    }
  } else {
    console.log(DIV);
    console.log(`PIPELINE ERRORS: none`);
  }

  // Versions
  console.log(`VERSIONS: ${JSON.stringify(result.agent_versions)}`);
  console.log(SEP);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== MUKO PIPELINE END-TO-END TEST ===');
  console.log(`    ${new Date().toISOString()}`);
  console.log(`    runAnalysis v${(await import('../lib/agents/orchestrator')).AGENT_VERSIONS.orchestrator}`);

  // ── Fixture 1 ──
  console.log('\n[Running fixture 1: Dark Romantic / silk-charmeuse / MSRP $320...]');
  let result1: AnalysisResult;
  try {
    result1 = await runAnalysis(input1, brand1, makeSession(input1));
    printResult('Fixture 1 — Margin gate FAIL', input1, brand1, result1);
  } catch (err) {
    console.error('[FATAL] Fixture 1 threw outside pipeline:', err);
  }

  // ── Fixture 2 ──
  console.log('\n[Running fixture 2: Coastal Minimalism / linen / MSRP $500...]');
  let result2: AnalysisResult;
  try {
    result2 = await runAnalysis(input2, brand2, makeSession(input2));
    printResult('Fixture 2 — Margin gate PASS', input2, brand2, result2);
  } catch (err) {
    console.error('[FATAL] Fixture 2 threw outside pipeline:', err);
  }

  console.log('\n=== DONE ===\n');
}

main().catch(console.error);
