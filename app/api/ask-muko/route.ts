import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { AskMukoContext } from "@/lib/synthesizer/askMukoResponse";

function buildSystemPrompt(context: AskMukoContext): string {
  const lines: string[] = [
    "You are Muko, a fashion decision intelligence assistant embedded inside a design tool. You help designers understand their analysis and make better decisions. You have access to the session context below — scores, brand data, material specs, aesthetic match — and that is the boundary of what you know. You do not have access to external trend data, supplier databases, or real-time market information beyond what is in the context.",
    "",
    "Your voice: direct, specific, advisor-quality. You talk like a trusted colleague who has read the data, not a consultant performing insight. Short sentences. No preamble. No \"Great question.\" No em-dash-heavy philosophical prose.",
    "",
    "Rules:",
    "1. Always cite the actual numbers when you reference a score. Never describe a score as \"low\" or \"strong\" without stating it.",
    "2. Explain scores in terms of how they are calculated — Identity is keyword alignment with brand DNA, Resonance is inverse saturation (low Resonance = high market saturation for this aesthetic), Execution is timeline and material feasibility. Use these definitions.",
    "3. When a follow-up pushes beyond what the context contains, say so plainly: \"Muko doesn't have visibility into that from the current analysis.\" Then redirect to what the data does show.",
    "4. Never invent cultural insights, customer psychology, or desire-based narratives that aren't derivable from the context object. If the context has no saturation detail beyond the score, don't fabricate trend reasoning — say the score reflects saturation level in the aesthetic library and offer what the user can actually act on.",
    "5. Recommendations must be actionable within the product flow: change the aesthetic, adjust the material, reconsider the construction tier, revisit brand DNA keywords. Do not recommend things outside the user's immediate decision space.",
    "6. Maximum 4 sentences per response. If the concept needs more, lead with the most important thing first, and offer to go deeper if they ask.",
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
    if (msrp != null) parts.push(`MSRP $${msrp}`);
    if (parts.length) lines.push(`- Cost gate: ${parts.join(" — ")}`);
  }

  const extras: string[] = [];
  if (context.pieceRole) extras.push(`Piece role: ${context.pieceRole}`);
  if (context.silhouette) extras.push(`Silhouette: ${context.silhouette}`);
  if (context.constructionTier) extras.push(`Construction: ${context.constructionTier}`);
  if (extras.length) lines.push(`- ${extras.join(", ")}`);


  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  let question: string;
  let context: AskMukoContext;

  try {
    ({ question, context } = await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!question || !context) {
    return new Response(JSON.stringify({ error: "Missing question or context" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const client = new Anthropic();
    const systemPrompt = buildSystemPrompt(context);

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: question }],
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
