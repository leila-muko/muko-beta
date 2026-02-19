// Shared InsightData type — used by InsightPanel and, in Week 5, by the Synthesizer agent.

export type ConceptInsightMode = 'amplify' | 'differentiate' | 'reconsider';
export type SpecInsightMode = 'invest' | 'constrain';
export type InsightMode = ConceptInsightMode | SpecInsightMode;

export interface InsightData {
  /** Always exactly 3 plain-prose statements. No headers. */
  statements: string[];
  /** Always exactly 3 guardrail bullets rendered under the edit label. */
  edit: string[];
  /** 'THE EDIT' or 'THE OPPORTUNITY' — driven by mode. */
  editLabel: string;
  /** Optional chip labels (spec chips) to surface in the Sharpen row. */
  sharpenChips?: string[];
  /** Controls which placeholder content and visual mode is shown. */
  mode: InsightMode;
}
