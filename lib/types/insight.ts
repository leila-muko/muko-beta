// Shared InsightData type — used by InsightPanel and, in Week 5, by the Synthesizer agent.

export type ConceptInsightMode = 'amplify' | 'differentiate' | 'reconsider';
export type SpecInsightMode = 'invest' | 'constrain';
export type InsightMode = ConceptInsightMode | SpecInsightMode;

export type CommitmentSignal =
  | 'Increase Investment'
  | 'Hero Expression'
  | 'Controlled Test'
  | 'Maintain Exposure'
  | 'Reduce Exposure';

export interface DecisionGuidance {
  recommended_direction: string;
  commitment_signal: CommitmentSignal;
  execution_levers: string[];
}

export interface InsightData {
  /** Always exactly 3 plain-prose statements. No headers. */
  statements: string[];
  /** Always exactly 3 bullets rendered under the primary label (edit or opportunity). */
  edit: string[];
  /** 'THE EDIT' or 'THE OPPORTUNITY' — driven by mode. */
  editLabel: string;
  /** Always exactly 3 bullets for the secondary section (opposite of primary). */
  secondary?: string[];
  /** 'THE EDIT' when primary is OPPORTUNITY, 'THE OPPORTUNITY' when primary is EDIT. */
  secondaryLabel?: string;
  /** Optional chip labels (spec chips) to surface in the Sharpen row. */
  sharpenChips?: string[];
  /** Concept-stage product recommendation derived from the selected direction. */
  decision_guidance?: DecisionGuidance;
  /** Controls which placeholder content and visual mode is shown. */
  mode: InsightMode;
}
