// lib/synthesizer/index.ts
// Public API for the Muko Synthesizer generator functions.
//
// Three surfaces, three generators. Each returns { data: InsightData, meta }.
// Callers are responsible for writing meta to the analyses table.

export { generateConceptInsight } from '@/lib/synthesizer/conceptInsight';
export type { ConceptBlackboard } from '@/lib/synthesizer/conceptInsight';

export { generateSpecInsight } from '@/lib/synthesizer/specInsight';
export type { SpecBlackboard } from '@/lib/synthesizer/specInsight';

export { generateReportNarrative } from '@/lib/synthesizer/reportNarrative';
export type { ReportBlackboard } from '@/lib/synthesizer/reportNarrative';

// Shared result type — identical across all three generators
export type { SynthesizerResult } from '@/lib/synthesizer/conceptInsight';

// Re-export blackboard builder for callers assembling context
export { buildBlackboard } from '@/lib/synthesizer/blackboard';
export type { BlackboardInput, Blackboard, ResolvedRedirects, AestheticContext } from '@/lib/synthesizer/blackboard';
