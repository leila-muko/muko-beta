#!/usr/bin/env npx tsx
// /scripts/test-critic.ts
// Quick sanity check for the Critic Agent — run with `npx tsx scripts/test-critic.ts`
// Tests 4 real scenarios against checkBrandAlignment() and logs results to console.
// NOTE: Routes that trigger LLM (A and D) require ANTHROPIC_API_KEY in environment.

import { checkBrandAlignment, CriticInput, BrandProfile } from '../lib/agents/critic';

const minimalistBrand: BrandProfile = {
  id: 'brand-test-001',
  keywords: ['Minimalist', 'Sustainable', 'Luxe', 'Timeless'],
  tension_context: null,
  accepts_conflicts: false,
  price_tier: 'Contemporary',
  target_margin: 0.6,
};

const hybridBrand: BrandProfile = {
  id: 'brand-test-002',
  keywords: ['Timeless', 'Trendy', 'Luxe'],
  tension_context: 'trend-aware-classics',
  accepts_conflicts: true,
  price_tier: 'Bridge',
  target_margin: 0.55,
};

async function runScenario(label: string, input: CriticInput) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`SCENARIO: ${label}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`Aesthetic: "${input.aesthetic_name}" [${input.aesthetic_keywords.join(', ')}]`);
  console.log(`Brand:     [${input.brand.keywords.join(', ')}]`);
  if (input.brand.tension_context) {
    console.log(`Tension:   "${input.brand.tension_context}"`);
  }
  console.log(`${'─'.repeat(60)}`);

  try {
    const result = await checkBrandAlignment(input);
    const statusEmoji = result.status === 'green' ? '🟢' : result.status === 'yellow' ? '🟡' : '🔴';
    console.log(`${statusEmoji} Status:     ${result.status.toUpperCase()}`);
    console.log(`   Score:      ${result.alignment_score}/100`);
    console.log(`   Message:    ${result.message}`);
    console.log(`   Overlap:    ${result.overlap_count} keyword(s)`);
    console.log(`   Conflict:   ${result.conflict_detected ? `YES [${result.conflict_ids.join(', ')}]` : 'No'}`);
    console.log(`   LLM used:   ${result.llm_used ? 'YES' : 'No'}`);
    console.log(`   Reasoning:  ${result.reasoning}`);
    console.log(`   Version:    ${result.agent_version}`);
  } catch (err) {
    console.error(`   ❌ ERROR: ${err}`);
  }
}

async function main() {
  console.log('\n🔍 MUKO CRITIC AGENT — SANITY CHECK');
  console.log(`   ${new Date().toISOString()}\n`);

  // Scenario 1: ROUTE E — High keyword overlap → green
  await runScenario('Strong Alignment (Route E — 3+ overlap)', {
    aesthetic_keywords: ['Minimalist', 'Sustainable', 'Luxe', 'Coastal'],
    aesthetic_name: 'Coastal Minimalism',
    brand: minimalistBrand,
  });

  // Scenario 2: ROUTE B — Hard conflict → red
  await runScenario('Hard Conflict (Route B — Minimalist vs Maximalist)', {
    aesthetic_keywords: ['Minimalist', 'Serene', 'Clean'],
    aesthetic_name: 'Desert Minimalism',
    brand: {
      ...minimalistBrand,
      keywords: ['Maximalist', 'Dramatic', 'Bold'],
    },
  });

  // Scenario 3: ROUTE C — Soft conflict → yellow
  await runScenario('Soft Conflict (Route C — Edgy vs Classic)', {
    aesthetic_keywords: ['Edgy', 'Raw', 'Subversive'],
    aesthetic_name: 'Dark Edge',
    brand: {
      ...minimalistBrand,
      keywords: ['Classic', 'Refined', 'Traditional'],
      tension_context: null,
    },
  });

  // Scenario 4: ROUTE A — Conflict + tension context → LLM
  // NOTE: This will call the actual Claude API if ANTHROPIC_API_KEY is set,
  // otherwise it will use the fallback result.
  await runScenario('Intentional Tension (Route A — Trendy vs Timeless + context)', {
    aesthetic_keywords: ['Trendy', 'Y2K', 'Bold'],
    aesthetic_name: '90s Grunge Revival',
    brand: hybridBrand,
  });

  console.log(`\n${'═'.repeat(60)}`);
  console.log('✅ Sanity check complete\n');
}

main().catch(console.error);
