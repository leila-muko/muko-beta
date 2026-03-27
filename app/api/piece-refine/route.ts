import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import aestheticsData from "@/data/aesthetics.json";
import {
  buildArchetypeFallbackExpression,
  inferGarmentArchetype,
  inferRoleFromArchetype,
  validateArchetypeOutput,
} from "@/lib/garment-archetypes";

interface PieceRefinementRequest {
  collection?: {
    direction?: string;
    silhouette?: string;
    palette?: string;
    materials?: string[];
    elements?: string[];
    priorities?: string[];
    tradeoffs?: {
      trend_exposure?: string;
      expression?: string;
      value?: string;
      innovation?: string;
    };
    commercial?: {
      target_msrp?: number | null;
      margin?: number | null;
      cost_ceiling?: number | null;
    };
  };
  market?: {
    season?: string;
    direction?: string;
  };
  user_input?: string;
  selected_role?: string;
  existing_pieces?: Array<{
    name: string;
    role: string;
    category: string;
  }>;
}

interface PieceRefinementResponse {
  read: string;
  refined_expression: string;
  role: "Hero" | "Volume Driver" | "Core Evolution" | "Directional Signal";
}

interface AestheticEntry {
  id: string;
  name: string;
  trend_velocity?: string;
  saturation_score?: number;
  seen_in?: string[];
  risk_factors?: string[];
}

const aesthetics = aestheticsData as AestheticEntry[];
const MAX_SENTENCES = 2;
const SENTENCE_SPLIT_REGEX = /(?<=[.!?])\s+/;
const OVERPRECISION_REGEX =
  /\b(\d+(?:\.\d+)?\s?(?:cm|mm|inches|inch|in|oz|gsm|%))\b|\b(\$\d+|\d+\s?(?:usd|eur))\b|\b(msrp|margin|markup|price point|cost ceiling|opening|inseam|outseam|rise|waistband|fly|yoke|dart|topstitch|top-stitch|seam allowance|placket|zipper|zip fly|button fly|pocket bag|belt loop|hem width|ankle opening|sweep)\b/i;
const ROLE_SCOPE_TERMS = [
  "anchor",
  "anchoring",
  "support",
  "supporting",
  "hero",
  "directional",
  "core",
  "volume",
  "collection",
  "assortment",
  "line",
  "proportion",
  "control",
  "surface",
  "silhouette",
];

function normalizeToken(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function getAestheticEntry(name?: string | null) {
  if (!name) return null;
  const token = normalizeToken(name);
  return aesthetics.find((entry) => normalizeToken(entry.id) === token || normalizeToken(entry.name) === token) ?? null;
}

function cleanList(values: Array<string | null | undefined> | undefined, fallback: string[]) {
  const cleaned = (values ?? []).map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  return cleaned.length > 0 ? cleaned : fallback;
}

function titleCase(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function limitToSentenceCount(value: string, maxSentences = MAX_SENTENCES) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return trimmed
    .split(SENTENCE_SPLIT_REGEX)
    .filter(Boolean)
    .slice(0, maxSentences)
    .join(" ")
    .trim();
}

function hasOverprecision(value: string) {
  return OVERPRECISION_REGEX.test(value);
}

function looksCredibleForStage(output: PieceRefinementResponse) {
  const read = output.read?.trim() ?? "";
  const expression = output.refined_expression?.trim() ?? "";
  const combined = `${read} ${expression}`.toLowerCase();

  if (!read || !expression) return false;
  if (hasOverprecision(read) || hasOverprecision(expression)) return false;
  if (read.split(SENTENCE_SPLIT_REGEX).filter(Boolean).length > MAX_SENTENCES) return false;
  if (expression.split(SENTENCE_SPLIT_REGEX).filter(Boolean).length > MAX_SENTENCES) return false;

  const hasRoleLanguage = ROLE_SCOPE_TERMS.some((term) => combined.includes(term));
  return hasRoleLanguage;
}

function buildFallback(
  body: PieceRefinementRequest,
  market: {
    saturation: "crowded" | "open" | "contested";
  }
): PieceRefinementResponse {
  const userInput = body.user_input?.trim() || "piece";
  const direction = body.collection?.direction?.trim() || "the collection direction";
  const silhouette = body.collection?.silhouette?.trim() || "controlled proportion";
  const palette = body.collection?.palette?.trim() || "a restrained palette";
  const archetype = inferGarmentArchetype(userInput);
  const roleType = inferRoleFromArchetype(userInput, archetype);
  const position =
    roleType === "Hero" || roleType === "Directional Signal"
      ? "Carrying"
      : roleType === "Volume Driver" || roleType === "Core Evolution"
      ? "Anchoring"
      : "Diluting";
  const refinedExpression = buildArchetypeFallbackExpression(userInput, archetype, {
    direction,
    silhouette,
    palette,
    saturation: market.saturation,
  });
  const pieceLabel = titleCase(userInput);

  return {
    read:
      position === "Carrying"
        ? `${pieceLabel} works as a directional lead for the collection. The risk is pushing it into novelty instead of keeping the line controlled enough to feel intentional.`
        : position === "Anchoring"
        ? `${pieceLabel} works as a core anchor in the assortment. The risk is letting it slip into a generic version of the category unless the proportion feels deliberate inside the ${silhouette.toLowerCase()} silhouette language.`
        : `${pieceLabel} can still support the collection, but only if it is treated as a secondary piece rather than a lead statement. The risk is letting it blur the collection direction instead of sharpening it.`,
    refined_expression: limitToSentenceCount(refinedExpression),
    role: roleType,
  };
}

function parseJsonResponse(raw: string): PieceRefinementResponse {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned) as PieceRefinementResponse;
}

function isCollectionSpecific(
  output: { read?: string; refined_expression?: string },
  collection: { direction?: string; silhouette?: string; palette?: string }
): boolean {
  const combined = [output.read ?? '', output.refined_expression ?? '']
    .join(' ')
    .toLowerCase();

  const direction = (collection.direction ?? '').toLowerCase();
  const silhouette = (collection.silhouette ?? '').toLowerCase();
  const palette = (collection.palette ?? '').toLowerCase();

  // Require at least 2 of 3 collection signals present, not just 1
  const signals = [direction, silhouette, palette].filter(s => s.length > 3);
  if (signals.length === 0) return true; // no collection context to check

  const matchCount = signals.filter(signal => {
    // Check for the signal itself or meaningful substrings (>4 chars)
    const words = signal.split(/\s+/).filter(w => w.length > 4);
    return words.some(word => combined.includes(word));
  }).length;

  // Must match at least 2 signals, or all available if fewer than 2
  const required = Math.min(2, signals.length);
  return matchCount >= required;
}

export async function POST(req: NextRequest) {
  let body: PieceRefinementRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ message: "Request body is required" }, { status: 400 });
  }

  const userInput = body.user_input?.trim() ?? "";
  if (!userInput) {
    return Response.json({ message: "user_input is required" }, { status: 400 });
  }

  const archetype = inferGarmentArchetype(userInput);
  const aestheticEntry = getAestheticEntry(body.market?.direction ?? body.collection?.direction ?? null);
  const market: {
    momentum: string;
    saturation: "crowded" | "open" | "contested";
    ownership: string[];
    whitespace: string;
    season: string;
  } = {
    momentum:
      aestheticEntry?.trend_velocity === "ascending"
        ? "rising"
        : aestheticEntry?.trend_velocity === "declining"
        ? "softening"
        : aestheticEntry?.trend_velocity ?? "steady",
    saturation:
      aestheticEntry?.saturation_score != null
        ? aestheticEntry.saturation_score >= 70
          ? "crowded"
          : aestheticEntry.saturation_score <= 40
          ? "open"
          : "contested"
        : "contested",
    ownership: aestheticEntry?.seen_in?.slice(0, 5) ?? [],
    whitespace:
      aestheticEntry?.risk_factors?.[0]
        ? `The market still has not resolved ${aestheticEntry.risk_factors[0].charAt(0).toLowerCase()}${aestheticEntry.risk_factors[0].slice(1)}`
        : "There is still room for a sharper point of view at this price level",
    season: body.market?.season?.trim() || "current season",
  };
  const fallback = buildFallback(body, { saturation: market.saturation });

  const structuredPayload = {
    garment_archetype: archetype,
    selected_role: body.selected_role?.trim() || null,
    existing_pieces: body.existing_pieces ?? [],
    piece_count: body.existing_pieces?.length ?? 0,
    collection: {
      direction: body.collection?.direction?.trim() || "Direction not resolved",
      silhouette: body.collection?.silhouette?.trim() || "Silhouette not resolved",
      palette: body.collection?.palette?.trim() || "Palette not resolved",
      elements: cleanList(body.collection?.elements, ["collection language not yet resolved"]),
      priorities: cleanList(body.collection?.priorities, ["brand expression", "commercial performance"]),
      tradeoffs: {
        trend_exposure: body.collection?.tradeoffs?.trend_exposure ?? "balanced",
        expression: body.collection?.tradeoffs?.expression ?? "balanced",
        value: body.collection?.tradeoffs?.value ?? "balanced",
        innovation: body.collection?.tradeoffs?.innovation ?? "continuity-aware",
      },
      commercial: {
        target_msrp: body.collection?.commercial?.target_msrp ?? null,
        margin: body.collection?.commercial?.margin ?? null,
        cost_ceiling: body.collection?.commercial?.cost_ceiling ?? null,
      },
    },
    market,
    user_input: userInput,
  };

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(fallback);
  }

  const systemPrompt = `You are Muko, a fashion design partner inside a collection-building workflow.

You are refining a designer's idea inside a locked collection frame.
You are not replacing the idea. You are sharpening it.
This is an upstream product decision layer, not a spec-writing layer.

Use the structured payload as hard constraints.
Collection context and market context are mandatory. They are not optional reference.

Return exactly this JSON shape:
{
  "read": "...",
  "refined_expression": "...",
  "role": "Hero | Volume Driver | Core Evolution | Directional Signal"
}

Rules:
- Produce exactly one refined expression.
- The output must feel specific to this collection. If it could apply to another collection, it is wrong.
- The garment_archetype object is non-negotiable. Treat it as structural law.
- Determine the natural role before evaluating the piece. Do not force foundational pieces into statement roles.
- Before writing, force a position for the piece: Anchoring, Carrying, or Diluting. You must choose one internally, but do not label the response with that word unless it reads naturally.
- "read" is the Muko's Take field. It must be 1 or 2 sentences max.
- "read" must answer three things at a high level: what role this piece plays in the collection, what makes it work or fail, and what the risk is if it is handled too generically.
- "read" must sound like a senior merchandiser or design director. It should stay grounded in assortment logic and product positioning, not garment engineering.
- "refined_expression" is the Suggested Expression field. It must be 1 or 2 sentences max.
- "refined_expression" must name one primary design lever only, then explain how the piece should behave visually.
- Good levers: proportion, line, volume, dominance, restraint, surface emphasis, control vs softness, statement vs support role, placement in the assortment.
- If the piece is Anchoring, sharpen one dimension that keeps it intentional rather than generic.
- If the piece is Carrying, keep the differentiation visible through line, proportion, or visual control without changing the garment archetype.
- If the piece is Diluting but still viable, integrate it through reduced dominance or clearer positioning rather than rejecting it.
- The goal is to make the piece work, not eliminate it, unless it cannot be reconciled at all.
- The expression should make a decision about how the piece should behave relative to the rest of the assortment.
- When relevant, embed subtle market comparison through saturation, sameness, or differentiation. Do not over-explain it.
- Precision guardrail: only specify measurable or technical details when they are both critical to the recommendation and strongly supported by user input or known constraints.
- Otherwise stay at the level of silhouette behavior, line, volume, restraint, tension, proportion, surface emphasis, and role in collection.
- Do not mention or invent specific materials or fabrics.
- Do not mention or invent pricing logic, cost logic, exact dimensions, seam details, openings, construction components, or technical garment specs that are not directly supplied.
- Follow every silhouette_rules, construction_rules, and behavior_rules item.
- Avoid every disallowed_behaviors item.
- Respect category logic. If the result would not still be recognized as the original garment, it is invalid.
- Use line, proportion, surface, structure, control, volume, restraint. Do not drift into poetic or abstract phrasing.
- Keep foundational pieces simple when that is the right job. Do not over-critique or over-design them.
- Make the wording specific to THIS silhouette, THIS direction, and THIS palette. If it could apply to any jacket, any skirt, or any collection, rewrite it.
- Avoid generic fixes such as "tone it down", "keep it clean", "stay minimal", or "let it do the work". Specify how the proportion, line, placement, surface emphasis, or dominance should change.
- No bullet lists in any field.
- No templated language.
- Do not use these phrases: "based on", "this suggests", "strong alignment", "elevated", "curated".
- Prefer language like "this works as", "the risk is", "keep the line", "this should read as", "the value comes from", "avoid letting it slip into", "anchor it through", "let the piece carry".
- Internal credibility filter before finalizing: would a senior merchandiser or design lead realistically say this given the information available? If not, rewrite it to be more grounded.
- Do not ask for clarification. If the input is vague, sharpen it anyway.

ROLE AND ASSORTMENT RULES
When selected_role is present:
- The read must reflect the specific job this role performs in the collection. A Hero read is different from a Volume Driver read — Hero copy should address statement and distinctiveness, Volume Driver copy should address repeatability and commercial breadth.
- Do not recommend a role different from selected_role unless the piece genuinely cannot perform that role, and explain specifically why.

When existing_pieces is present and non-empty:
- The read must reference the collection context directly. If there are already two heroes, flag the tension. If this is the only bottom, name that it is anchoring the category.
- refined_expression must account for how this piece sits relative to the pieces already in the collection — not just how it reads in isolation.

Return valid JSON only. No markdown. No preamble.`;

  const userMessage = `Refine this custom piece proposal inside the given collection frame:
${JSON.stringify(structuredPayload, null, 2)}`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 320,
      temperature: 0.45,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return Response.json(fallback);
    }

    const parsed = parseJsonResponse(content.text);
    const validation = validateArchetypeOutput(parsed, archetype);
    const specificToCollection = isCollectionSpecific(parsed, {
      direction: structuredPayload.collection.direction,
      silhouette: structuredPayload.collection.silhouette,
      palette: structuredPayload.collection.palette,
    });
    const scopedOutput = {
      read: limitToSentenceCount(parsed.read?.trim() || ""),
      refined_expression: limitToSentenceCount(parsed.refined_expression?.trim() || ""),
      role: parsed.role,
    };
    const safeExpression =
      validation.valid && specificToCollection && looksCredibleForStage(scopedOutput)
        ? scopedOutput.refined_expression || fallback.refined_expression
        : fallback.refined_expression;
    const safeRead =
      validation.valid && specificToCollection && looksCredibleForStage(scopedOutput)
        ? scopedOutput.read || fallback.read
        : fallback.read;

    return Response.json({
      read: safeRead,
      refined_expression: safeExpression,
      role: parsed.role || fallback.role,
    });
  } catch {
    return Response.json(fallback);
  }
}
