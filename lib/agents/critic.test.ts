// /lib/agents/critic.test.ts
// Test suite for Muko Critic Agent
// Tests every routing path deterministically (no LLM calls in unit tests)

import { describe, test, expect, vi } from 'vitest';
import { checkBrandAlignment, CriticInput, BrandProfile } from './critic';

// ── MOCK CLAUDE CLIENT ──
// All tests run deterministically — LLM is mocked to avoid API calls and flakiness
vi.mock('@/lib/claude/client', () => ({
  callClaude: vi.fn().mockResolvedValue(JSON.stringify({
    alignment_score: 62,
    status: 'yellow',
    message: 'Some alignment through conceptual overlap',
    reasoning: 'Mock response for testing',
  })),
  parseJSONResponse: vi.fn().mockImplementation((raw: string) => JSON.parse(raw)),
}));

// ── BRAND FIXTURES ──

const minimalistBrand: BrandProfile = {
  id: 'brand-001',
  keywords: ['Minimalist', 'Sustainable', 'Luxe', 'Timeless'],
  tension_context: null,
  accepts_conflicts: false,
  price_tier: 'Contemporary',
  target_margin: 0.6,
};

const hybridBrand: BrandProfile = {
  id: 'brand-002',
  keywords: ['Timeless', 'Trendy', 'Luxe'],
  tension_context: 'trend-aware-classics',
  accepts_conflicts: true,
  price_tier: 'Bridge',
  target_margin: 0.55,
};

const edgyBrand: BrandProfile = {
  id: 'brand-003',
  keywords: ['Edgy', 'Urban', 'Technical', 'Innovative'],
  tension_context: null,
  accepts_conflicts: false,
  price_tier: 'Contemporary',
  target_margin: 0.58,
};

// ── TEST SUITES ──

describe('CriticAgent — checkBrandAlignment()', () => {

  // ── ROUTE E: HIGH KEYWORD OVERLAP (3+) ──
  describe('Route E: Standard keyword scoring', () => {

    test('3+ overlapping keywords → green, score 90', async () => {
      const input: CriticInput = {
        aesthetic_keywords: ['Minimalist', 'Sustainable', 'Luxe', 'Coastal'],
        aesthetic_name: 'Coastal Minimalism',
        brand: minimalistBrand,
      };
      const result = await checkBrandAlignment(input);
      expect(result.status).toBe('green');
      expect(result.alignment_score).toBeGreaterThanOrEqual(85);
      expect(result.overlap_count).toBeGreaterThanOrEqual(3);
      expect(result.llm_used).toBe(false);
      expect(result.agent_version).toBe('1.0.0');
    });

    test('2 overlapping keywords → green, score ~75', async () => {
      const input: CriticInput = {
        aesthetic_keywords: ['Minimalist', 'Sustainable', 'Bohemian'],
        aesthetic_name: 'Modern Bohemian',
        brand: minimalistBrand,
      };
      const result = await checkBrandAlignment(input);
      expect(result.status).toBe('green');
      expect(result.alignment_score).toBeGreaterThanOrEqual(70);
      expect(result.overlap_count).toBe(2);
      expect(result.llm_used).toBe(false);
    });

    test('1 overlapping keyword → yellow, score ~60', async () => {
      const input: CriticInput = {
        aesthetic_keywords: ['Urban', 'Sporty', 'Graphic'],
        aesthetic_name: 'Urban Streetwear',
        brand: edgyBrand, // edgyBrand has 'Urban'
      };
      const result = await checkBrandAlignment(input);
      expect(result.overlap_count).toBe(1);
      expect(result.status).toBe('yellow');
      expect(result.alignment_score).toBe(60);
      expect(result.llm_used).toBe(false);
    });

  });

  // ── ROUTE B: HARD CONFLICT, NO TENSION CONTEXT ──
  describe('Route B: Hard conflict, no tension_context', () => {

    test('Minimalist aesthetic vs Maximalist brand → red, score ≤ 30', async () => {
      const maximalistBrand: BrandProfile = {
        ...minimalistBrand,
        keywords: ['Maximalist', 'Dramatic'],
        tension_context: null,
      };
      const input: CriticInput = {
        aesthetic_keywords: ['Minimalist', 'Serene', 'Clean'],
        aesthetic_name: 'Desert Minimalism',
        brand: maximalistBrand,
      };
      const result = await checkBrandAlignment(input);
      expect(result.status).toBe('red');
      expect(result.alignment_score).toBeLessThanOrEqual(30);
      expect(result.conflict_detected).toBe(true);
      expect(result.conflict_ids).toContain('min_max');
      expect(result.llm_used).toBe(false);
    });

    test('Luxe aesthetic vs Accessible brand → red', async () => {
      const accessibleBrand: BrandProfile = {
        ...minimalistBrand,
        keywords: ['Accessible', 'Playful', 'Casual'],
        tension_context: null,
      };
      const input: CriticInput = {
        aesthetic_keywords: ['Luxe', 'Premium', 'Exclusive'],
        aesthetic_name: 'Quiet Luxury',
        brand: accessibleBrand,
      };
      const result = await checkBrandAlignment(input);
      expect(result.status).toBe('red');
      expect(result.conflict_ids).toContain('luxe_access');
    });

  });

  // ── ROUTE C: SOFT CONFLICT, NO TENSION CONTEXT ──
  describe('Route C: Soft conflict, no tension_context', () => {

    test('Edgy aesthetic vs Classic brand → yellow, soft conflict', async () => {
      const classicBrand: BrandProfile = {
        ...minimalistBrand,
        keywords: ['Classic', 'Refined', 'Traditional'],
        tension_context: null,
      };
      const input: CriticInput = {
        aesthetic_keywords: ['Edgy', 'Subversive', 'Raw'],
        aesthetic_name: 'Dark Edge',
        brand: classicBrand,
      };
      const result = await checkBrandAlignment(input);
      expect(result.status).toBe('yellow');
      expect(result.alignment_score).toBe(45);
      expect(result.conflict_detected).toBe(true);
      expect(result.conflict_ids).toContain('edgy_classic');
      expect(result.llm_used).toBe(false);
    });

  });

  // ── ROUTE A: CONFLICT + TENSION CONTEXT → LLM ──
  describe('Route A: Conflict detected + tension_context → LLM', () => {

    test('Trendy aesthetic vs Timeless brand with tension_context → routes to LLM', async () => {
      const input: CriticInput = {
        aesthetic_keywords: ['Trendy', 'Y2K', 'Bold'],
        aesthetic_name: '90s Grunge Revival',
        brand: hybridBrand, // has tension_context: 'trend-aware-classics'
      };
      const result = await checkBrandAlignment(input);
      expect(result.llm_used).toBe(true);
      expect(result.conflict_detected).toBe(true);
      expect(result.agent_version).toBe('1.0.0');
      // Score comes from mocked LLM: 62, yellow
      expect(result.status).toBe('yellow');
    });

  });

  // ── ROUTE D: ZERO OVERLAP, ZERO CONFLICT → LLM ──
  describe('Route D: Zero overlap, zero conflict → LLM', () => {

    test('Completely unrelated aesthetic → routes to LLM for semantic check', async () => {
      const input: CriticInput = {
        aesthetic_keywords: ['Preppy', 'Collegiate', 'Sporty'],
        aesthetic_name: 'Ivy League Prep',
        brand: {
          ...minimalistBrand,
          keywords: ['Gothic', 'Dark', 'Moody', 'Rebellious'], // zero overlap with Preppy
          tension_context: null,
        },
      };
      const result = await checkBrandAlignment(input);
      expect(result.overlap_count).toBe(0);
      expect(result.conflict_detected).toBe(false);
      expect(result.llm_used).toBe(true);
    });

  });

  // ── EDGE CASES ──
  describe('Edge cases', () => {

    test('Empty aesthetic keywords → handled gracefully', async () => {
      const input: CriticInput = {
        aesthetic_keywords: [],
        aesthetic_name: 'Unknown',
        brand: minimalistBrand,
      };
      const result = await checkBrandAlignment(input);
      expect(result).toBeDefined();
      expect(result.alignment_score).toBeGreaterThanOrEqual(0);
      expect(result.alignment_score).toBeLessThanOrEqual(100);
    });

    test('Empty brand keywords → handled gracefully', async () => {
      const input: CriticInput = {
        aesthetic_keywords: ['Minimalist', 'Clean'],
        aesthetic_name: 'Clean Aesthetic',
        brand: {
          ...minimalistBrand,
          keywords: [],
        },
      };
      const result = await checkBrandAlignment(input);
      expect(result).toBeDefined();
    });

    test('Case insensitive matching works', async () => {
      const input: CriticInput = {
        aesthetic_keywords: ['MINIMALIST', 'sustainable'],
        aesthetic_name: 'Minimal',
        brand: {
          ...minimalistBrand,
          keywords: ['Minimalist', 'Sustainable'], // mixed case
        },
      };
      const result = await checkBrandAlignment(input);
      expect(result.overlap_count).toBeGreaterThanOrEqual(2);
    });

    test('Result always includes agent_version', async () => {
      const input: CriticInput = {
        aesthetic_keywords: ['Minimalist'],
        aesthetic_name: 'Test',
        brand: minimalistBrand,
      };
      const result = await checkBrandAlignment(input);
      expect(result.agent_version).toBe('1.0.0');
    });

    test('Score is always clamped between 0 and 100', async () => {
      const input: CriticInput = {
        aesthetic_keywords: ['Minimalist', 'Sustainable', 'Luxe', 'Timeless', 'Serene'],
        aesthetic_name: 'Ultra-aligned aesthetic',
        brand: minimalistBrand,
      };
      const result = await checkBrandAlignment(input);
      expect(result.alignment_score).toBeGreaterThanOrEqual(0);
      expect(result.alignment_score).toBeLessThanOrEqual(100);
    });

  });

});
