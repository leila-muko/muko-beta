// /lib/agents/__tests__/researcher.test.ts
// Test suite for Researcher Agent — checkMarketSaturation, findAestheticMatch, getResonanceScore

import { describe, test, expect } from 'vitest'
import {
  checkMarketSaturation,
  findAestheticMatch,
  getResonanceScore,
  type Aesthetic,
  type SaturationResult,
} from '../researcher'

// ── MOCK AESTHETIC FACTORY ──

function mockAesthetic(overrides: Partial<Aesthetic> = {}): Aesthetic {
  return {
    id: 'test-aesthetic',
    name: 'Test Aesthetic',
    description: 'Test description',
    keywords: [],
    custom_keywords: [],
    tension_keywords: [],
    saturation_score: 50,
    saturation_basis: '',
    trend_velocity: 'ascending',
    score_source: 'test',
    seasonal_relevance: {},
    collections_analyzed: 100,
    seen_in: ['Brand A', 'Brand B'],
    consumer_insight: 'Test insight',
    adjacent_directions: [],
    confidence: 0.8,
    evidence: [],
    risk_factors: [],
    moodboard_images: [],
    chips: [],
    ...overrides,
  }
}

// ── checkMarketSaturation ──

describe('checkMarketSaturation()', () => {

  test('1. Green: saturation 25, velocity emerging', () => {
    const data = mockAesthetic({ saturation_score: 25, trend_velocity: 'emerging' })
    const result = checkMarketSaturation(data)
    expect(result.status).toBe('green')
    expect(result.message).toBe('Emerging opportunity')
    expect(result.saturation_score).toBe(25)
  })

  test('2. Yellow: saturation 55, velocity emerging', () => {
    const data = mockAesthetic({ saturation_score: 55, trend_velocity: 'emerging' })
    const result = checkMarketSaturation(data)
    expect(result.status).toBe('yellow')
    expect(result.message).toBe('Growing traction')
  })

  test('3. Red (peak): saturation 75, any velocity', () => {
    const data = mockAesthetic({ saturation_score: 75, trend_velocity: 'peak' })
    const result = checkMarketSaturation(data)
    expect(result.status).toBe('red')
    expect(result.message).toBe('Peak saturation')
  })

  test('4. Red (declining): saturation 35, velocity declining — overrides what would otherwise be green', () => {
    const data = mockAesthetic({ saturation_score: 35, trend_velocity: 'declining' })
    const result = checkMarketSaturation(data)
    expect(result.status).toBe('red')
    expect(result.message).toBe('Declining interest')
  })

  test('5. Edge: saturation exactly 40 → yellow (not green)', () => {
    const data = mockAesthetic({ saturation_score: 40, trend_velocity: 'ascending' })
    const result = checkMarketSaturation(data)
    expect(result.status).toBe('yellow')
    expect(result.message).toBe('Growing traction')
  })

  test('6. Edge: saturation exactly 70 → red (not yellow)', () => {
    const data = mockAesthetic({ saturation_score: 70, trend_velocity: 'ascending' })
    const result = checkMarketSaturation(data)
    expect(result.status).toBe('red')
    expect(result.message).toBe('Peak saturation')
  })

})

// ── findAestheticMatch ──

describe('findAestheticMatch()', () => {

  test('7. Valid id returned by LLM → returns correct aesthetic, is_proxy correctly set', () => {
    const result = findAestheticMatch('terrain-luxe', 'gorpcore vibes')
    expect(result.matched).not.toBeNull()
    expect(result.matched!.id).toBe('terrain-luxe')
    expect(result.matched!.name).toBe('Terrain Luxe')
    // 'gorpcore vibes' normalizes differently from 'terrain luxe' → is_proxy true
    expect(result.is_proxy).toBe(true)
    expect(result.proxy_source).toBe('gorpcore vibes')
  })

  test('8. LLM returns id not in library → treated as null, matched: null', () => {
    const result = findAestheticMatch('nonexistent-id', 'some input')
    expect(result.matched).toBeNull()
    expect(result.is_proxy).toBe(false)
    expect(result.proxy_source).toBeNull()
  })

  test('9. LLM returns null → returns { matched: null, is_proxy: false, proxy_source: null }', () => {
    const result = findAestheticMatch(null, 'some input')
    expect(result.matched).toBeNull()
    expect(result.is_proxy).toBe(false)
    expect(result.proxy_source).toBeNull()
  })

  test('10. is_proxy: true when LLM matched id differs from normalized user input', () => {
    const result = findAestheticMatch('quiet-structure', 'old money minimalism')
    expect(result.matched).not.toBeNull()
    expect(result.is_proxy).toBe(true)
    expect(result.proxy_source).toBe('old money minimalism')
  })

  test('11. is_proxy: false when user typed the aesthetic name exactly', () => {
    const result = findAestheticMatch('terrain-luxe', 'Terrain Luxe')
    expect(result.matched).not.toBeNull()
    expect(result.matched!.id).toBe('terrain-luxe')
    expect(result.is_proxy).toBe(false)
    expect(result.proxy_source).toBeNull()
  })

})

// ── getResonanceScore ──

describe('getResonanceScore()', () => {

  test('12. Score = 100 - saturation_score for non-declining velocity', () => {
    const data = mockAesthetic({ saturation_score: 42, trend_velocity: 'ascending' })
    expect(getResonanceScore(data)).toBe(58)
  })

  test('13. Declining velocity applies 15-point penalty', () => {
    const data = mockAesthetic({ saturation_score: 42, trend_velocity: 'declining' })
    expect(getResonanceScore(data)).toBe(43) // 100 - 42 - 15
  })

  test('14. Score floors at 0 (never negative)', () => {
    const data = mockAesthetic({ saturation_score: 95, trend_velocity: 'declining' })
    expect(getResonanceScore(data)).toBe(0) // 100 - 95 = 5, - 15 = -10 → clamped to 0
  })

  test('15. Output matches what Pulse Rail would display for same input', () => {
    // For a given aesthetic, checkMarketSaturation and getResonanceScore must agree
    const data = mockAesthetic({ saturation_score: 42, trend_velocity: 'ascending' })
    const saturation = checkMarketSaturation(data)
    const score = getResonanceScore(data)

    // Score is deterministic from saturation_score
    expect(score).toBe(100 - 42)

    // Saturation of 42 → yellow (≥40)
    expect(saturation.status).toBe('yellow')
    expect(saturation.message).toBe('Growing traction')

    // Score is within valid range
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)

    // The Pulse Rail displays: score as the number, saturation.message as the pill label
    // Verify they're consistent — score reflects opportunity (higher = better)
    // while saturation status reflects risk (higher saturation = worse)
    expect(score).toBe(100 - saturation.saturation_score)
  })

})
