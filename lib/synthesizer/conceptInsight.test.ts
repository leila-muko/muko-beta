import { describe, expect, test } from 'vitest';

import {
  buildConceptPrompt,
  buildConceptLanguagePrompt,
  buildFallbackDecisionGuidance,
  parseConceptLanguageOutput,
  parseConceptV5Output,
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
    strategy_summary: 'Muko Test Brand operates at Contemporary with a customer who buys fewer, sharper pieces.',
    customer_profile: 'A design-led customer who buys fewer, sharper pieces.',
    reference_brands: ['The Row'],
    excluded_brands: ['Zara'],
    expression_signals: ['Knife-Pleated', 'Powder-Matte'],
    brand_interpretation: 'Sharper restraint with controlled volume.',
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

  test('diagnostic stage blocks another hero and can pivot aesthetics when the collection is overbuilt', () => {
    const bb = makeBlackboard({
      identity_score: 68,
      resonance_score: 57,
      collection_context: {
        brand: {
          name: 'Muko Test Brand',
          keywords: ['architectural', 'refined', 'restraint'],
        },
        existing_pieces: [
          { piece_name: 'Column coat', score: 78, dimensions: { identity: 72, resonance: 58, execution: 66 }, collection_role: 'hero', aesthetic_matched_id: 'quiet-structure' },
          { piece_name: 'Wrapped dress', score: 76, dimensions: { identity: 67, resonance: 55, execution: 69 }, collection_role: 'hero', aesthetic_matched_id: 'quiet-structure' },
          { piece_name: 'Tailored pant', score: 74, dimensions: { identity: 65, resonance: 56, execution: 70 }, collection_role: 'hero', aesthetic_matched_id: 'quiet-structure' },
        ],
        piece_count: 3,
      },
    });

    const summary = summarizeCollectionGuidanceContext(bb);
    const guidance = buildFallbackDecisionGuidance(bb, 'differentiate');

    expect(summary.repeated_role_issue).toBe(true);
    expect(summary.requires_aesthetic_pivot).toBe(true);
    expect(summary.suggested_aesthetic).toBe('Terrain Luxe');
    expect(guidance.recommended_direction.toLowerCase()).toContain('do not add another hero');
    expect(guidance.recommended_direction).toContain('Terrain Luxe');
  });

  test('concept prompt includes the derived collection summary for the model', () => {
    const bb = makeBlackboard({
      chip_selection: [],
      expression_signals: [],
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

  test('concept prompt includes strategy, expression signals, and brand interpretation', () => {
    const bb = makeBlackboard({
      chip_selection: [],
      expression_signals: [],
    });

    const prompt = JSON.parse(buildConceptPrompt(bb)) as {
      brand?: { strategy_summary?: string | null; brand_interpretation?: string | null };
      aesthetic?: { expression_signals?: string[] };
    };

    expect(prompt.brand?.strategy_summary).toContain('Contemporary');
    expect(prompt.brand?.brand_interpretation).toBe('Sharper restraint with controlled volume.');
    expect(prompt.aesthetic?.expression_signals).toEqual([]);
  });

  test('parser accepts positioning object and normalizes it for existing UI mapping', () => {
    const parsed = parseConceptV5Output(JSON.stringify({
      insight_title: 'Quiet Structure has a narrow opening before the lane turns generic.',
      insight_description: 'Refined restraint is consolidating quickly and sharper minimalism will be harder to differentiate within two seasons. Muko Test Brand can hold the lane by turning restraint into a more architectural proposition. The Row defines the upper register, but the contemporary gap is still under-authored. If the team hesitates, the category will flatten into safer minimalism by FW26.',
      positioning: {
        market_gap: 'Contemporary minimalism still lacks a sharper architectural register that feels directional without reading cold.',
        competitive_position: 'The Row and Toteme anchor the reference set, but the middle market is still drifting toward generic restraint.',
        brand_permission: 'The brand can translate restraint into a more precise, structured attitude that feels owned rather than merely adjacent.',
      },
      decision_guidance: {
        recommended_direction: 'Use Quiet Structure as a hero anchor through the Column coat, then build a tighter support layer behind it.',
        commitment_signal: 'Hero Expression',
        execution_levers: ['Sharp Shoulders', 'Longline'],
      },
      confidence: 0.82,
    }));

    expect(parsed?.positioning).toEqual([
      expect.stringMatching(/^Market Gap — /),
      expect.stringMatching(/^Competitive Position — /),
      expect.stringMatching(/^Brand Permission — /),
    ]);
  });

  test('concept language prompt includes actual selection inputs', () => {
    const prompt = JSON.parse(buildConceptLanguagePrompt({
      aesthetic_name: 'Quiet Structure',
      brand_keywords: ['architectural', 'refined', 'restraint'],
      brand_name: 'Muko Test Brand',
      customer_profile: 'A design-led customer who buys fewer, sharper pieces.',
      price_tier: 'Contemporary',
      tension_context: 'restraint-with-presence',
      strategy_summary: 'Muko Test Brand operates at Contemporary and wins through sharper restraint.',
      brand_interpretation: 'Sharper restraint with controlled volume.',
      selected_silhouettes: ['structured'],
      selected_palette: 'Stone Neutrals',
      collection_language: ['controlled volume', 'architectural restraint'],
      expression_signals: ['Knife-Pleated', 'Powder-Matte'],
    })) as {
      brand?: { strategy_summary?: string | null; brand_interpretation?: string | null };
      selections?: {
        selected_silhouettes?: string[];
        selected_palette?: string | null;
        collection_language?: string[];
        expression_signals?: string[];
      };
    };

    expect(prompt.brand?.strategy_summary).toContain('Contemporary');
    expect(prompt.brand?.brand_interpretation).toBe('Sharper restraint with controlled volume.');
    expect(prompt.selections?.selected_silhouettes).toEqual(['structured']);
    expect(prompt.selections?.selected_palette).toBe('Stone Neutrals');
    expect(prompt.selections?.collection_language).toEqual(['controlled volume', 'architectural restraint']);
    expect(prompt.selections?.expression_signals).toEqual(['Knife-Pleated', 'Powder-Matte']);
  });

  test('concept language parser requires guardrail', () => {
    const parsed = parseConceptLanguageOutput(JSON.stringify({
      headline: 'Translate Quiet Structure through a structured line with sharper restraint.',
      silhouette_steer: 'Keep the structured silhouette disciplined through longline shapes and held volume rather than soft collapse.',
      palette_steer: 'Use Stone Neutrals tonally so the palette reads precise rather than decorative.',
      signals_note: 'The signals should surface through crisp spacing and matte finish so the language feels controlled, not overworked.',
      guardrail: 'Do not soften the line with fluid drift or high-contrast color that breaks the controlled restraint of the chosen setup.',
    }));

    expect(parsed?.guardrail).toContain('Do not');
  });
});
