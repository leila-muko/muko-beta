export interface ScoreDimensions {
  identity_score: number;
  resonance_score: number;
  execution_score: number;
}

export interface ScoreGates {
  margin_gate_passed: boolean | null;
  sustainability?: null; // deferred to Phase 2
}

export interface ScoreResult {
  score: number;
  dimensions: ScoreDimensions;
  gates: ScoreGates;
}
