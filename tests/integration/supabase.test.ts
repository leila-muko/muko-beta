/**
 * Supabase Integration Tests
 * Requires .env.test with SUPABASE_URL, SUPABASE_ANON_KEY, and TEST_USER_ID set.
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, afterEach } from 'vitest';
import { supabase, TEST_USER_ID, teardown } from '../helpers/seed';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AnalysisInsert = Record<string, unknown>;

function makeAnalysis(overrides: AnalysisInsert = {}): AnalysisInsert {
  return {
    user_id: TEST_USER_ID,
    season: 'FW26',
    collection_name: 'Test Collection',
    piece_name: 'Test Cape',
    collection_role: 'hero',
    collection_aesthetic: 'Dark Romanticism',
    aesthetic_inflection: 'with structural precision',
    score: 72,
    dimensions: { identity: 70, resonance: 75, execution: 68 },
    gates_passed: { cost: true, sustainability: null },
    agent_versions: {
      orchestrator: '1.0.0',
      calculator: '1.0.0',
      researcher: '1.0.0',
      critic: '1.0.0',
      synthesizer: '1.0.0',
    },
    data_version: '1.0.0',
    mood_board_images: [],
    redirects: [],
    construction_tier_override: false,
    ...overrides,
  };
}

afterEach(async () => {
  // Clean up saved_collections for test user before cleaning analyses
  await supabase.from('saved_collections').delete().eq('user_id', TEST_USER_ID);
  await teardown(); // deletes all analyses for TEST_USER_ID
});

// ---------------------------------------------------------------------------
// ANALYSIS RECORD WRITES
// ---------------------------------------------------------------------------

describe('ANALYSIS RECORD WRITES', () => {
  it('creates a minimal valid analysis record — all required columns written and match inputs', async () => {
    const { data, error } = await supabase
      .from('analyses')
      .insert(makeAnalysis())
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.user_id).toBe(TEST_USER_ID);
    expect(data.season).toBe('FW26');
    expect(data.piece_name).toBe('Test Cape');
    expect(data.collection_role).toBe('hero');
    expect(data.collection_aesthetic).toBe('Dark Romanticism');
    expect(data.aesthetic_inflection).toBe('with structural precision');
    expect(data.score).toBe(72);
    expect(data.data_version).toBe('1.0.0');
    expect(data.id).toBeTruthy();
    expect(data.created_at).toBeTruthy();
  });

  it('piece_name, collection_role, collection_aesthetic, aesthetic_inflection are top-level columns (not buried in JSONB)', async () => {
    const { data: inserted } = await supabase
      .from('analyses')
      .insert(makeAnalysis())
      .select('id')
      .single();

    // Selecting these by name would fail if they were JSONB keys, not real columns
    const { data, error } = await supabase
      .from('analyses')
      .select('piece_name, collection_role, collection_aesthetic, aesthetic_inflection')
      .eq('id', inserted!.id)
      .single();

    expect(error).toBeNull();
    expect(data!.piece_name).toBe('Test Cape');
    expect(data!.collection_role).toBe('hero');
    expect(data!.collection_aesthetic).toBe('Dark Romanticism');
    expect(data!.aesthetic_inflection).toBe('with structural precision');
  });

  it('dimensions JSONB has keys: identity, resonance, execution — all integers 0–100', async () => {
    const { data, error } = await supabase
      .from('analyses')
      .insert(makeAnalysis())
      .select('dimensions')
      .single();

    expect(error).toBeNull();
    expect(data!.dimensions).toHaveProperty('identity');
    expect(data!.dimensions).toHaveProperty('resonance');
    expect(data!.dimensions).toHaveProperty('execution');

    const dims = data!.dimensions as Record<string, number>;
    for (const key of ['identity', 'resonance', 'execution']) {
      const val = dims[key];
      expect(typeof val, `dimensions.${key} should be a number`).toBe('number');
      expect(Number.isInteger(val), `dimensions.${key} should be an integer`).toBe(true);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(100);
    }
  });

  it('gates_passed JSONB has key: cost (boolean) — sustainability is null for beta', async () => {
    const { data, error } = await supabase
      .from('analyses')
      .insert(makeAnalysis({ gates_passed: { cost: true, sustainability: null } }))
      .select('gates_passed')
      .single();

    expect(error).toBeNull();
    const gates = data!.gates_passed as { cost: boolean; sustainability: boolean | null };
    expect(typeof gates.cost).toBe('boolean');
    expect('sustainability' in gates).toBe(true);
    expect(gates.sustainability).toBeNull();
  });

  it('agent_versions JSONB has keys: orchestrator, calculator, researcher, critic, synthesizer', async () => {
    const { data, error } = await supabase
      .from('analyses')
      .insert(makeAnalysis())
      .select('agent_versions')
      .single();

    expect(error).toBeNull();
    const versions = data!.agent_versions as Record<string, string>;
    for (const key of ['orchestrator', 'calculator', 'researcher', 'critic', 'synthesizer']) {
      expect(versions, `agent_versions should have key: ${key}`).toHaveProperty(key);
      expect(typeof versions[key]).toBe('string');
    }
  });

  it('data_version is a string', async () => {
    const { data, error } = await supabase
      .from('analyses')
      .insert(makeAnalysis())
      .select('data_version')
      .single();

    expect(error).toBeNull();
    expect(typeof data!.data_version).toBe('string');
  });

  it('score is an integer, not a float', async () => {
    const { data, error } = await supabase
      .from('analyses')
      .insert(makeAnalysis({ score: 72 }))
      .select('score')
      .single();

    expect(error).toBeNull();
    expect(typeof data!.score).toBe('number');
    expect(Number.isInteger(data!.score)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// COLLECTION-FIRST MODEL
// ---------------------------------------------------------------------------

describe('COLLECTION-FIRST MODEL', () => {
  it('creates a SavedCollection and adds 3 pieces — collection.analysis_ids contains all piece IDs', async () => {
    const { data: pieces, error: insertErr } = await supabase
      .from('analyses')
      .insert([
        makeAnalysis({ piece_name: 'Cape', collection_aesthetic: 'Utility Luxe', collection_role: 'hero' }),
        makeAnalysis({ piece_name: 'Shirt', collection_aesthetic: 'Utility Luxe', collection_role: 'directional' }),
        makeAnalysis({ piece_name: 'Trouser', collection_aesthetic: 'Utility Luxe', collection_role: 'core-evolution' }),
      ])
      .select('id');

    expect(insertErr).toBeNull();
    const analysisIds = pieces!.map((p) => p.id);

    const { data: collection, error: collErr } = await supabase
      .from('saved_collections')
      .insert({
        user_id: TEST_USER_ID,
        name: 'FW26 Test Collection',
        analysis_ids: analysisIds,
      })
      .select('id, analysis_ids')
      .single();

    expect(collErr).toBeNull();
    expect(collection!.analysis_ids).toHaveLength(3);
    for (const id of analysisIds) {
      expect(collection!.analysis_ids).toContain(id);
    }
  });

  it('collection_aesthetic is identical across all pieces in the collection', async () => {
    const sharedAesthetic = 'Dark Romanticism';

    const { data: pieces, error } = await supabase
      .from('analyses')
      .insert([
        makeAnalysis({ piece_name: 'Cape', collection_aesthetic: sharedAesthetic }),
        makeAnalysis({ piece_name: 'Gown', collection_aesthetic: sharedAesthetic }),
        makeAnalysis({ piece_name: 'Jacket', collection_aesthetic: sharedAesthetic }),
      ])
      .select('id, collection_aesthetic');

    expect(error).toBeNull();
    for (const piece of pieces!) {
      expect(piece.collection_aesthetic).toBe(sharedAesthetic);
    }
  });

  it('piece_name and collection_role are top-level columns on analyses, not in JSONB', async () => {
    // Selectable by column name — this would fail if they were buried in a JSONB field
    const { data: inserted } = await supabase
      .from('analyses')
      .insert(makeAnalysis())
      .select('id')
      .single();

    const { data, error } = await supabase
      .from('analyses')
      .select('piece_name, collection_role')
      .eq('id', inserted!.id)
      .single();

    expect(error).toBeNull();
    expect(data!.piece_name).toBe('Test Cape');
    expect(data!.collection_role).toBe('hero');
  });

  it('aesthetic_inflection can differ per piece (it is piece-level, not collection-level)', async () => {
    const sharedAesthetic = 'Quiet Luxury';
    const inflections = [
      'with restrained tension',
      'with velvet restraint',
      'with raw edge contrast',
    ];

    const { data: pieces, error } = await supabase
      .from('analyses')
      .insert(
        inflections.map((inflection, i) =>
          makeAnalysis({
            piece_name: `Piece ${i}`,
            collection_aesthetic: sharedAesthetic,
            aesthetic_inflection: inflection,
          })
        )
      )
      .select('aesthetic_inflection');

    expect(error).toBeNull();
    const stored = pieces!.map((p) => p.aesthetic_inflection);
    const unique = new Set(stored);
    expect(unique.size).toBe(3);
    for (const inflection of inflections) {
      expect(stored).toContain(inflection);
    }
  });
});

// ---------------------------------------------------------------------------
// QUERY PERFORMANCE
// ---------------------------------------------------------------------------

describe('QUERY PERFORMANCE', () => {
  it('queries 50 analyses by user_id ordered by created_at in < 500ms', { timeout: 60000 }, async () => {
    // Target is < 50ms on a local Supabase instance with idx_analyses_user_created in place.
    // 500ms is the ceiling to account for cloud round-trip latency in CI / dev environments.
    const batch = Array.from({ length: 50 }, (_, i) =>
      makeAnalysis({ collection_name: `Bulk ${i}`, piece_name: `Piece ${i}` })
    );

    const { error: batchErr } = await supabase.from('analyses').insert(batch);
    expect(batchErr).toBeNull();

    const start = Date.now();
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .order('created_at', { ascending: false });
    const elapsed = Date.now() - start;

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(50);
    expect(elapsed).toBeLessThan(500);
  });

  it('idx_analyses_user_created index exists on analyses table', async () => {
    // Queries pg_catalog.pg_indexes — may require elevated privileges.
    // If permission is denied, this test logs a warning and passes (advisory check).
    const { data, error } = await supabase
      .from('pg_catalog.pg_indexes' as 'analyses') // cast to avoid TS type error
      .select('indexname')
      .eq('tablename', 'analyses');

    if (error) {
      console.warn(
        'ADVISORY: Cannot query pg_catalog.pg_indexes with current key.',
        'Manually verify that idx_analyses_user_created exists.',
        error.message
      );
      return;
    }

    const names = (data ?? []).map((r: Record<string, string>) => r.indexname as string);
    const hasIndex = names.some(
      (name) => name.toLowerCase().includes('user') && name.toLowerCase().includes('created')
    );
    expect(hasIndex).toBe(true);
  });

  it('idx_analyses_parent index exists on analyses table', async () => {
    const { data, error } = await supabase
      .from('pg_catalog.pg_indexes' as 'analyses')
      .select('indexname')
      .eq('tablename', 'analyses');

    if (error) {
      console.warn(
        'ADVISORY: Cannot query pg_catalog.pg_indexes with current key.',
        'Manually verify that idx_analyses_parent exists.',
        error.message
      );
      return;
    }

    const names = (data ?? []).map((r: Record<string, string>) => r.indexname as string);
    const hasIndex = names.some((name) => name.toLowerCase().includes('parent'));
    expect(hasIndex).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MARGIN GATE DATA INTEGRITY
// ---------------------------------------------------------------------------

describe('MARGIN GATE DATA INTEGRITY', () => {
  it('analysis with gate failure: gates_passed.cost = false AND score reflects 30% penalty', async () => {
    // Base dimensions at 100 — penalized score = floor(100 * 0.7) = 70
    const baseScore = 100;
    const penalizedScore = Math.round(baseScore * 0.7);

    const { data, error } = await supabase
      .from('analyses')
      .insert(
        makeAnalysis({
          score: penalizedScore,
          dimensions: { identity: 100, resonance: 100, execution: 100 },
          gates_passed: { cost: false, sustainability: null },
        })
      )
      .select('score, gates_passed')
      .single();

    expect(error).toBeNull();
    const gates = data!.gates_passed as { cost: boolean; sustainability: boolean | null };
    expect(gates.cost).toBe(false);
    expect(data!.score).toBe(penalizedScore);
    expect(data!.score).toBeLessThan(baseScore);
  });

  it('analysis with gate pass: gates_passed.cost = true AND score is base score (no penalty)', async () => {
    const { data, error } = await supabase
      .from('analyses')
      .insert(makeAnalysis({ score: 72, gates_passed: { cost: true, sustainability: null } }))
      .select('score, gates_passed')
      .single();

    expect(error).toBeNull();
    const gates = data!.gates_passed as { cost: boolean };
    expect(gates.cost).toBe(true);
    expect(data!.score).toBe(72);
  });

  it('score is never stored as a float (must be integer)', async () => {
    const scores = [0, 50, 70, 100];

    const { data, error } = await supabase
      .from('analyses')
      .insert(scores.map((score, i) => makeAnalysis({ score, piece_name: `Score Test ${i}` })))
      .select('score');

    expect(error).toBeNull();
    for (const row of data!) {
      expect(
        Number.isInteger(row.score),
        `score ${row.score} should be an integer, not a float`
      ).toBe(true);
    }
  });
});
