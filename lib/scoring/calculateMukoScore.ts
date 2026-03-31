import type { ScoreDimensions, ScoreGates } from './types';

// Weights per PRD V2.1
const WEIGHTS = {
  identity: 0.35,
  resonance: 0.35,
  execution: 0.30,
};

export function calculateMukoScore(
  dimensions: ScoreDimensions,
  gates: ScoreGates
): number {
  let base_score =
    dimensions.identity_score * WEIGHTS.identity +
    dimensions.resonance_score * WEIGHTS.resonance +
    dimensions.execution_score * WEIGHTS.execution;

  if (gates.margin_gate_passed === false) {
    base_score *= 0.7; // 30% penalty for margin failure
  }

  return Math.round(base_score);
}
