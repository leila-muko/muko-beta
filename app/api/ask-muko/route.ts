import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { AskMukoContext } from "@/lib/synthesizer/askMukoResponse";

type AskMukoHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

function buildSystemPrompt(context: AskMukoContext): string {
  const lines: string[] = [
    "You are Muko, a fashion decision intelligence assistant embedded inside a design tool. You help designers understand their analysis and make better decisions. You have access to the session context below — scores, brand data, material specs, aesthetic match — and that is the boundary of what you know. You do not have access to external trend data, supplier databases, or real-time market information beyond what is in the context.",
    "",
    "Scope: You advise on ready-to-wear apparel only — tops, bottoms, outerwear, dresses, and knitwear. You do not suggest footwear, bags, jewelry, accessories, or any category outside the collection being built. If asked about out-of-scope categories, redirect: 'Muko focuses on garments in this collection — I can help with piece decisions, not [category].' Never volunteer out-of-scope suggestions unprompted.",
    "",
    "Action boundary: You can recommend, suggest, analyze, and advise — but you cannot create, add, lock in, confirm, or save anything in the product. You have no ability to modify the collection. Never say things like 'Lock it in,' 'Confirmed: [piece name],' 'I've added,' 'Piece saved,' or any language that implies you have performed an action. If a user asks you to add or create something, redirect clearly: 'I can't add pieces directly — use the + Add Your Own button on the Pieces page to build this out.' Keep the advisory role clean: your job is to sharpen the decision, not to execute it.",
    "",
    "Your voice: direct, specific, advisor-quality. You talk like a trusted colleague who has read the data, not a consultant performing insight. Short sentences. No preamble. No \"Great question.\" No em-dash-heavy philosophical prose.",
    "",
    "Rules:",
    "1. Always cite the actual numbers when you reference a score. Never describe a score as \"low\" or \"strong\" without stating it.",
    "2. Only reference a score dimension if it is directly relevant to what the user asked. When you do cite a score, explain it using its definition: Identity is keyword alignment with brand DNA, Resonance is inverse saturation (low Resonance = high market saturation for this aesthetic), Execution is timeline and material feasibility. Do not mention a dimension just because it appears in context.",
    "3. When a follow-up pushes beyond what the context contains, say so plainly: \"Muko doesn't have visibility into that from the current analysis.\" Then redirect to what the data does show.",
    "4. Never invent cultural insights, customer psychology, or desire-based narratives that aren't derivable from the context object. If the context has no saturation detail beyond the score, don't fabricate trend reasoning — say the score reflects saturation level in the aesthetic library and offer what the user can actually act on.",
    "5. Recommendations must be actionable within the product flow: change the aesthetic, adjust the material, reconsider the construction tier, revisit brand DNA keywords. Do not recommend things outside the user's immediate decision space.",
    "6. Maximum 4 sentences per response. If the concept needs more, lead with the most important thing first, and offer to go deeper if they ask.",
    "7. If the user's message is a bare affirmative (\"yes\", \"sure\", \"go ahead\", \"yeah\") or a minimal confirmation, treat it as continuing the thread of the immediately preceding assistant message. Re-read your last response, identify the specific offer or question you made, and follow through on exactly that — do not pivot to a different topic.",
    "8. If MSRP is not present in context, do not ask the user for it. If MSRP is not set but brand.targetMargin and gates.cogs are both present, derive an implied price floor using COGS / (1 - targetMargin) and use that as the viability threshold. State the derived floor explicitly in your response: 'Based on your target margin of X%, this piece needs to retail at $Y minimum to be viable.' Do not present this as a definitive MSRP — frame it as a floor derived from margin. If neither MSRP nor targetMargin is present, say cost viability cannot be assessed and direct the user to set a target margin in brand onboarding or an MSRP in the collection intent step.",
    "",
    "Current session context:",
    `- Step: ${context.step}`,
  ];

  if (context.brand) {
    const { brandName, keywords, priceTier, targetMargin } = context.brand;
    const parts: string[] = [];
    if (brandName) parts.push(brandName);
    if (keywords?.length) parts.push(`keywords: ${keywords.join(", ")}`);
    if (priceTier) parts.push(`price tier: ${priceTier}`);
    if (targetMargin != null) parts.push(`target margin: ${targetMargin}%`);
    if (parts.length) lines.push(`- Brand: ${parts.join(", ")}`);
  }

  if (context.intent) {
    const { season, collectionName, collectionRole } = context.intent;
    const parts: string[] = [];
    if (season) parts.push(season);
    if (collectionName) parts.push(`collection: ${collectionName}`);
    if (collectionRole) parts.push(`role: ${collectionRole}`);
    if (parts.length) lines.push(`- Intent: ${parts.join(", ")}`);
  }

  if (context.aesthetic) {
    const { input, matchedId, inflection } = context.aesthetic;
    const parts: string[] = [];
    if (input) parts.push(`"${input}"`);
    if (matchedId) parts.push(`matched to: ${matchedId}`);
    if (inflection) parts.push(`inflection: ${inflection}`);
    if (parts.length) lines.push(`- Aesthetic: ${parts.join(", ")}`);
  }

  if (context.scores) {
    const { identity, resonance, execution, overall } = context.scores;
    const parts: string[] = [];
    if (identity != null) parts.push(`Identity: ${identity}`);
    if (resonance != null) parts.push(`Resonance: ${resonance}`);
    if (execution != null) parts.push(`Execution: ${execution}`);
    if (overall != null) parts.push(`Overall: ${overall}`);
    if (parts.length) lines.push(`- Scores — ${parts.join(", ")}`);
  }

  if (context.material) {
    const { name, costPerYard, complexityTier, leadTimeWeeks } = context.material;
    const parts: string[] = [];
    if (name) parts.push(name);
    if (costPerYard != null) parts.push(`$${costPerYard}/yd`);
    if (complexityTier) parts.push(`${complexityTier} complexity`);
    if (leadTimeWeeks != null) parts.push(`${leadTimeWeeks}wk lead time`);
    if (parts.length) lines.push(`- Material: ${parts.join(", ")}`);
  }

  if (context.gates) {
    const { costPassed, cogs, msrp } = context.gates;
    const parts: string[] = [];
    if (costPassed != null) parts.push(costPassed ? "passed" : "failed");
    if (cogs != null) parts.push(`COGS $${cogs}`);
    if (typeof msrp === "number" && msrp > 0) {
      parts.push(`MSRP $${msrp}`);
    } else {
      parts.push("MSRP: not set — use brand target margin if available, do not ask the user for this value");
    }
    if (parts.length) lines.push(`- Cost gate: ${parts.join(" — ")}`);
  }

  const extras: string[] = [];
  if (context.pieceRole) extras.push(`Piece role: ${context.pieceRole}`);
  if (context.silhouette) extras.push(`Silhouette: ${context.silhouette}`);
  if (context.constructionTier) extras.push(`Construction: ${context.constructionTier}`);
  if (context.brandInterpretation) extras.push(`Brand interpretation: ${context.brandInterpretation}`);
  if (extras.length) lines.push(`- ${extras.join(", ")}`);

  if (context.collectionLanguage?.length) {
    lines.push(`- Collection language: ${context.collectionLanguage.join(", ")}`);
  }

  if (context.expressionSignals?.length) {
    lines.push(`- Expression signals: ${context.expressionSignals.join(", ")}`);
  }

  if (context.pieces) {
    const {
      confirmedPieceCount,
      suggestedPieceCount,
      confirmedPieceNames,
      confirmedCategories,
      coverageGaps,
      recommendedStartPiece,
      averageScore,
      strongestPiece,
      weakestPiece,
      dominantSilhouette,
      materialSignals,
      suggestedStartingPoints,
    } = context.pieces;

    const assortmentParts: string[] = [];
    if (confirmedPieceCount != null) assortmentParts.push(`confirmed pieces: ${confirmedPieceCount}`);
    if (suggestedPieceCount != null) assortmentParts.push(`suggested starting points: ${suggestedPieceCount}`);
    if (recommendedStartPiece) assortmentParts.push(`recommended start: ${recommendedStartPiece}`);
    if (averageScore != null) assortmentParts.push(`average piece score: ${Math.round(averageScore)}`);
    if (strongestPiece) assortmentParts.push(`strongest piece: ${strongestPiece}`);
    if (weakestPiece) assortmentParts.push(`weakest piece: ${weakestPiece}`);
    if (dominantSilhouette) assortmentParts.push(`dominant silhouette: ${dominantSilhouette}`);
    if (assortmentParts.length) lines.push(`- Assortment: ${assortmentParts.join(", ")}`);

    if (confirmedPieceNames?.length) {
      lines.push(`- Confirmed piece names: ${confirmedPieceNames.join(", ")}`);
    }

    if (confirmedCategories?.length) {
      lines.push(`- Confirmed categories: ${confirmedCategories.join(", ")}`);
    }

    if (coverageGaps?.length) {
      lines.push(`- Coverage gaps: ${coverageGaps.join(", ")}`);
    }

    if (materialSignals?.length) {
      lines.push(`- Material signals: ${materialSignals.join(", ")}`);
    }

    if (suggestedStartingPoints?.length) {
      lines.push(`- Suggested starting points: ${suggestedStartingPoints.join(", ")}`);
    }
  }


  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ message: 'Request body is required' }, { status: 400 });
  }
  if (!body) {
    return Response.json({ message: 'Request body is required' }, { status: 400 });
  }
  const {
    question,
    context,
    history,
  }: {
    question: string;
    context: AskMukoContext;
    history?: AskMukoHistoryMessage[];
  } = body;

  if (!question || !context) {
    return new Response(JSON.stringify({ error: "Missing question or context" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const client = new Anthropic();
    const systemPrompt = buildSystemPrompt(context);
    const messages = [
      ...((Array.isArray(history) ? history : []).filter(
        (message): message is AskMukoHistoryMessage =>
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string"
      )),
      { role: "user" as const, content: question },
    ];

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: systemPrompt,
      messages,
    });

    const answer = (response.content[0] as { type: string; text: string }).text;
    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
