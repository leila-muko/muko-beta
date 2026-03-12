import { describe, expect, test } from 'vitest';

import {
  buildConceptPrompt,
  buildFallbackDecisionGuidance,
  summarizeCollectionGuidanceContext,
  type ConceptBlackboard,
} from '@/lib/synthesizer/conceptInsight';

function makeBlackboard(overrides?: Partial<ConceptBlackboard>): ConceptBlackboard {
  return {
    aesthetic_input: 'Quiet Structure',
    aesthetic_matched_id: 'quiet-structure',
    is_proxy_match: false,
    brand_keywords: ['architectural', 'refined', 'restraint'],
    identity_score: 82,
    resonance_score: 71,
    season: 'fw26',
    brand_name: 'Muko Test Brand',
    customer_profile: 'A design-led customer who buys fewer, sharper pieces.',
    reference_brands: ['The Row'],
    excluded_brands: ['Zara'],
    aesthetic_context: {
      consumer_insight: 'Consumers are consolidating around restraint with sharper proportion.',
      risk_factors: ['Can flatten into generic minimalism'],
      seen_in: ['The Row', 'Toteme'],
      adjacent_directions: ['terrain-luxe'],
      seasonal_relevance: 'Strong FW26 relevance (5/5)',
      saturation_score: 58,
      trend_velocity: 'ascending',
    },
    resolved_redirects: { brand_mismatch: null },
    intent: {
      primary_goals: ['Make a strong brand statement'],
      tradeoff: 'Refinement over boldness',
      piece_role: 'hero',
      tension_sliders: {
        trend_forward: 55,
        creative_expression: 72,
        elevated_design: 68,
        novelty: 60,
      },
    },
    key_pieces: [{ item: 'Column coat', type: 'outerwear', signal: 'high-volume' }],
    collection_context: {
      brand: {
        name: 'Muko Test Brand',
        keywords: ['architectural', 'refined', 'restraint'],
        customer_profile: 'A design-led customer who buys fewer, sharper pieces.',
        price_tier: 'Contemporary',
        target_margin: 0.68,
        tension_context: 'restraint-with-presence',
      },
      existing_pieces: [],
      piece_count: 0,
    },
    ...overrides,
  };
}

describe('Decision Guidance collection progression', () => {
  test('directional stage recommends an anchor when no pieces exist', () => {
    const bb = makeBlackboard();
    const summary = summarizeCollectionGuidanceContext(bb);
    const guidance = buildFallbackDecisionGuidance(bb, 'amplify');

    expect(summary.stage).toBe('directional');
    expect(summary.anchor_recommendation).toContain('Column coat');
    expect(guidance.recommended_direction).toContain('Column coat');
    expect(['Hero Expression', 'Controlled Test']).toContain(guidance.commitment_signal);
  });

  test('comparative stage identifies the missing role with one or two pieces', () => {
    const bb = makeBlackboard({
      collection_context: {
        brand: {
          name: 'Muko Test Brand',
          keywords: ['architectural', 'refined', 'restraint'],
        },
        existing_pieces: [
          { piece_name: 'Sharp trouser', score: 81, dimensions: { identity: 84, resonance: 72, execution: 74 }, collection_role: 'hero' },
          { piece_name: 'Funnel knit', score: 76, dimensions: { identity: 78, resonance: 70, execution: 71 }, collection_role: 'core' },
        ],
        piece_count: 2,
      },
    });

    const summary = summarizeCollectionGuidanceContext(bb);
    const guidance = buildFallbackDecisionGuidance(bb, 'amplify');

    expect(summary.stage).toBe('comparative');
    expect(summary.missing_role).toBe('support');
    expect(guidance.recommended_direction.toLowerCase()).toContain('support');
  });

  test('diagnostic stage surfaces the urgent collection health gap at three pieces', () => {
    const bb = makeBlackboard({
      identity_score: 74,
      resonance_score: 63,
      collection_context: {
        brand: {
          name: 'Muko Test Brand',
          keywords: ['architectural', 'refined', 'restraint'],
        },
        existing_pieces: [
          { piece_name: 'Column coat', score: 83, dimensions: { identity: 86, resonance: 66, execution: 58 }, collection_role: 'hero' },
          { piece_name: 'Split skirt', score: 79, dimensions: { identity: 80, resonance: 61, execution: 55 }, collection_role: 'hero' },
          { piece_name: 'Tailored pant', score: 75, dimensions: { identity: 76, resonance: 62, execution: 57 }, collection_role: 'core' },
        ],
        piece_count: 3,
      },
    });

    const summary = summarizeCollectionGuidanceContext(bb);
    const guidance = buildFallbackDecisionGuidance(bb, 'differentiate');

    expect(summary.stage).toBe('diagnostic');
    expect(summary.weakest_dimension).toBe('execution');
    expect(guidance.recommended_direction.toLowerCase()).toMatch(/simplify|hold the line|execution/);
  });

  test('concept prompt includes the derived collection summary for the model', () => {
    const bb = makeBlackboard({
      collection_context: {
        brand: {
          name: 'Muko Test Brand',
          keywords: ['architectural', 'refined', 'restraint'],
        },
        existing_pieces: [{ piece_name: 'Column coat', score: 83, dimensions: { identity: 86, resonance: 66, execution: 58 }, collection_role: 'hero' }],
        piece_count: 1,
      },
    });

    const prompt = JSON.parse(buildConceptPrompt(bb)) as {
      collection_context?: { summary?: { stage?: string; missing_role?: string } };
    };

    expect(prompt.collection_context?.summary?.stage).toBe('comparative');
    expect(prompt.collection_context?.summary?.missing_role).toBeTruthy();
  });
});
