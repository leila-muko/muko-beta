import { describe, it, expect } from 'vitest';
import { calculateMukoScore } from '../calculateMukoScore';
import {
  calculateIdentityScore,
  calculateResonanceScore,
  calculateExecutionScore,
  COMPLEXITY_WEEKS,
} from '../calculateDimensions';

// ---------------------------------------------------------------------------
// calculateMukoScore — composite score tests
// ---------------------------------------------------------------------------
describe('calculateMukoScore', () => {
  it('All strong, gate passes → 87', () => {
    expect(
      calculateMukoScore(
        { identity_score: 90, resonance_score: 88, execution_score: 82 },
        { margin_gate_passed: true }
      )
    ).toBe(87);
  });

  it('Strong concept, weak execution, gate passes → 73', () => {
    expect(
      calculateMukoScore(
        { identity_score: 85, resonance_score: 80, execution_score: 52 },
        { margin_gate_passed: true }
      )
    ).toBe(73);
  });

  // NOTE: The PRD table listed 43 for this case, but the formula produces 41.
  // Calculation: (70×0.35 + 35×0.35 + 75×0.30) × 0.7 = 59.25 × 0.7 = 41.475 → 41.
  it('Low resonance, gate fails → 41', () => {
    expect(
      calculateMukoScore(
        { identity_score: 70, resonance_score: 35, execution_score: 75 },
        { margin_gate_passed: false }
      )
    ).toBe(41);
  });

  it('Borderline, gate fails → 42', () => {
    expect(
      calculateMukoScore(
        { identity_score: 60, resonance_score: 60, execution_score: 60 },
        { margin_gate_passed: false }
      )
    ).toBe(42);
  });

  it('Maximum score → 100', () => {
    expect(
      calculateMukoScore(
        { identity_score: 100, resonance_score: 100, execution_score: 100 },
        { margin_gate_passed: true }
      )
    ).toBe(100);
  });

  it('Rock bottom → 7', () => {
    expect(
      calculateMukoScore(
        { identity_score: 10, resonance_score: 10, execution_score: 10 },
        { margin_gate_passed: false }
      )
    ).toBe(7);
  });

  it('applies 30% penalty only when margin gate fails', () => {
    const dims = { identity_score: 80, resonance_score: 80, execution_score: 80 };
    const withGate = calculateMukoScore(dims, { margin_gate_passed: true });
    const withoutGate = calculateMukoScore(dims, { margin_gate_passed: false });
    expect(withGate).toBe(80);
    expect(withoutGate).toBe(56); // 80 × 0.7
  });
});

// ---------------------------------------------------------------------------
// calculateIdentityScore
// ---------------------------------------------------------------------------
describe('calculateIdentityScore', () => {
  it('returns 50 when no brand keywords are provided', () => {
    expect(calculateIdentityScore(['minimal', 'clean'], [])).toBe(50);
  });

  it('full overlap returns 100', () => {
    expect(calculateIdentityScore(['minimal', 'clean'], ['minimal', 'clean'])).toBe(100);
  });

  it('no overlap returns 0', () => {
    expect(calculateIdentityScore(['bold', 'loud'], ['minimal', 'clean'])).toBe(0);
  });

  it('partial overlap is proportional to brand keyword count', () => {
    // 1 of 4 brand keywords matched → 25
    expect(calculateIdentityScore(['minimal'], ['minimal', 'clean', 'soft', 'neutral'])).toBe(25);
  });

  it('comparison is case-insensitive', () => {
    expect(calculateIdentityScore(['Minimal', 'CLEAN'], ['minimal', 'clean'])).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// calculateResonanceScore
// ---------------------------------------------------------------------------
describe('calculateResonanceScore', () => {
  it('emerging trend (saturation 10) → high resonance 90', () => {
    expect(calculateResonanceScore(10)).toBe(90);
  });

  it('peak trend (saturation 80) → low resonance 20', () => {
    expect(calculateResonanceScore(80)).toBe(20);
  });

  it('mid saturation (saturation 50) → resonance 50', () => {
    expect(calculateResonanceScore(50)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// calculateExecutionScore
// ---------------------------------------------------------------------------
describe('calculateExecutionScore', () => {
  it('impossible timeline (buffer -2) → 10', () => {
    // total_needed = 6+4 = 10, timeline = 8, buffer = -2 → 30 + (-2×10) = 10
    expect(calculateExecutionScore(6, 4, 8)).toBe(10);
  });

  it('buffer -3 or worse clamps to 0', () => {
    // total_needed = 10+4 = 14, timeline = 8, buffer = -6 → 30 + (-60) = -30 → clamped to 0
    expect(calculateExecutionScore(10, 4, 8)).toBe(0);
  });

  it('tight buffer (buffer 1) → 60', () => {
    // total = 5+2 = 7, timeline = 8, buffer = 1 → 50 + 1×10 = 60
    expect(calculateExecutionScore(5, 2, 8)).toBe(60);
  });

  it('manageable buffer (buffer 4) → 85', () => {
    // total = 4+2 = 6, timeline = 10, buffer = 4 → 65 + 4×5 = 85
    expect(calculateExecutionScore(4, 2, 10)).toBe(85);
  });

  it('comfortable buffer (buffer 6) → 86', () => {
    // total = 4+2 = 6, timeline = 12, buffer = 6 → 80 + 6 = 86
    expect(calculateExecutionScore(4, 2, 12)).toBe(86);
  });

  it('very comfortable buffer caps at 100', () => {
    // total = 2+1 = 3, timeline = 24, buffer = 21 → 80+21 = 101 → capped 100
    expect(calculateExecutionScore(2, 1, 24)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// COMPLEXITY_WEEKS constant
// ---------------------------------------------------------------------------
describe('COMPLEXITY_WEEKS', () => {
  it('maps low=1, moderate=2, high=4', () => {
    expect(COMPLEXITY_WEEKS.low).toBe(1);
    expect(COMPLEXITY_WEEKS.moderate).toBe(2);
    expect(COMPLEXITY_WEEKS.high).toBe(4);
  });
});
