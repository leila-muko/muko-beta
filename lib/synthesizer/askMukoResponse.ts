export interface AskMukoContext {
  step: "concept" | "spec" | "pieces";
  brand?: {
    brandName?: string;
    keywords?: string[];
    priceTier?: string;
    targetMargin?: number;
    tensionContext?: string;
  };
  intent?: {
    season?: string;
    collectionName?: string;
    collectionRole?: string;
    collectionThesis?: string;
  };
  aesthetic?: {
    input?: string;
    matchedId?: string;
    inflection?: string;
  };
  scores?: {
    identity?: number;
    resonance?: number;
    execution?: number;
    overall?: number;
  };
  material?: {
    name?: string;
    costPerYard?: number;
    complexityTier?: string;
    leadTimeWeeks?: number;
  };
  gates?: {
    costPassed?: boolean;
    cogs?: number;
    msrp?: number;
  };
  pieceRole?: string;
  silhouette?: string;
  constructionTier?: string;
  collectionLanguage?: string[];
  expressionSignals?: string[];
  brandInterpretation?: string;
  pieces?: {
    confirmedPieceCount?: number;
    suggestedPieceCount?: number;
    confirmedPieceNames?: string[];
    confirmedCategories?: string[];
    coverageGaps?: string[];
    recommendedStartPiece?: string;
    averageScore?: number;
    strongestPiece?: string;
    weakestPiece?: string;
    dominantSilhouette?: string;
    materialSignals?: string[];
    suggestedStartingPoints?: string[];
  };
}

const FALLBACK_SUGGESTIONS: Record<AskMukoContext["step"], string[]> = {
  concept: [
    "Why is Identity scored this way?",
    "What brands own this aesthetic?",
    "How saturated is this direction?",
  ],
  spec: [
    "Why did Execution score this?",
    "What happens if I keep this material?",
    "Should I act on the redirect?",
  ],
  pieces: [
    "What piece should I build first?",
    "Where is the assortment still weak?",
    "Which role is still missing?",
  ],
};

export async function generateSuggestedQuestions(
  context: AskMukoContext
): Promise<string[]> {
  try {
    const response = await fetch("/api/ask-muko-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context }),
    });

    if (!response.ok) return FALLBACK_SUGGESTIONS[context.step];

    const data = await response.json();
    if (Array.isArray(data.questions) && data.questions.length > 0) {
      return data.questions as string[];
    }
    return FALLBACK_SUGGESTIONS[context.step];
  } catch {
    return FALLBACK_SUGGESTIONS[context.step];
  }
}

export async function generateAskMukoResponse(
  question: string,
  context: AskMukoContext
): Promise<string> {
  try {
    const response = await fetch("/api/ask-muko", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, context }),
    });

    if (!response.ok) {
      return "Muko couldn't process that right now. Try rephrasing or ask something else.";
    }

    const data = await response.json();
    return data.answer ?? "Muko couldn't process that right now. Try rephrasing or ask something else.";
  } catch {
    return "Muko couldn't process that right now. Try rephrasing or ask something else.";
  }
}
