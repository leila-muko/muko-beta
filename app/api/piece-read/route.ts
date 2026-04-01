import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { parseJSONResponse } from "@/lib/claude/client";
import aestheticsData from "@/data/aesthetics.json";

interface PieceReadRequest {
  piece?: {
    item?: string;
    type?: string;
    signal?: string;
    note?: string;
    bucket?: string;
    category?: string;
    material?: string;
    construction?: string;
  };
  context?: {
    aestheticName?: string;
    season?: string;
    silhouetteLabel?: string;
    paletteName?: string;
    resonanceScore?: number | null;
    interpretationSummary?: string | null;
    collectionDirection?: string | null;
    collectionLanguage?: string[];
    expressionSignals?: string[];
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
    existingPieces?: Array<{
      name: string;
      role: string;
      category: string;
    }>;
    isStartingPiece?: boolean;
  };
}

interface PieceReadResponse {
  headline: string;
  core_read: string;
  move_that_matters: string;
  start_here: string;
}

interface AestheticEntry {
  id: string;
  name: string;
  trend_velocity?: string;
  saturation_score?: number;
  seen_in?: string[];
  risk_factors?: string[];
  seasonal_relevance?: string | Record<string, number>;
}

const aesthetics = aestheticsData as AestheticEntry[];

function normalizeToken(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function getAestheticEntry(name?: string | null) {
  if (!name) return null;
  const token = normalizeToken(name);
  return aesthetics.find((entry) => normalizeToken(entry.id) === token || normalizeToken(entry.name) === token) ?? null;
}

function buildStaticFallback(pieceItem: string) {
  const safeItem = pieceItem || "The opening piece";
  return {
    headline: `${safeItem} is the clearest route into the collection, but it still needs a sharper market claim.`,
    core_read:
      "The silhouette direction is readable and the collection language is starting to hold, but the product story is not specific enough yet to cut through a crowded market.",
    move_that_matters:
      "If this does not become a precise expression of the collection’s proportion and surface, the line risks opening with mood instead of product authority.",
    start_here:
      `${safeItem} should carry the first claim because it can set the collection’s weight, silhouette role, and commercial posture in one move.`,
  };
}

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  let body: PieceReadRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ message: 'Request body is required' }, { status: 400 });
  }
  if (!body) {
    return Response.json({ message: 'Request body is required' }, { status: 400 });
  }
  const { piece, context } = body;
  const pieceItem = piece?.item?.trim() ?? "";
  const fallback = buildStaticFallback(pieceItem);

  if (!pieceItem) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sse('complete', fallback)));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    });
  }

  const aestheticName = context?.aestheticName?.trim() || "this direction";
  const aestheticEntry = getAestheticEntry(aestheticName);
  const saturation =
    aestheticEntry?.saturation_score != null
      ? aestheticEntry.saturation_score >= 70
        ? "crowded"
        : aestheticEntry.saturation_score <= 40
          ? "emerging"
          : "open"
      : "open";
  const momentum =
    aestheticEntry?.trend_velocity === "ascending"
      ? "rising"
      : aestheticEntry?.trend_velocity === "declining"
        ? "declining"
        : aestheticEntry?.trend_velocity ?? "peak";
  const structuredPayload = {
    collection: {
      direction: context?.collectionDirection?.trim() || aestheticName,
      silhouette: context?.silhouetteLabel?.trim() || "refined proportions",
      palette: context?.paletteName?.trim() || "palette not yet resolved",
      materials: context?.expressionSignals?.length ? context.expressionSignals : ["material signals not yet resolved"],
      elements: context?.collectionLanguage?.length ? context.collectionLanguage : [context?.interpretationSummary?.trim() || "direction not yet articulated"],
      priorities: context?.priorities?.length ? context.priorities : ["brand expression", "commercial performance"],
      existing_pieces: context?.existingPieces ?? [],
      piece_count: context?.existingPieces?.length ?? 0,
      tradeoffs: {
        trend_exposure: context?.tradeoffs?.trend_exposure ?? "balanced",
        expression: context?.tradeoffs?.expression ?? "balanced",
        value: context?.tradeoffs?.value ?? "balanced",
        innovation: context?.tradeoffs?.innovation ?? "continuity-aware",
      },
      commercial: {
        target_msrp: context?.commercial?.target_msrp ?? null,
        margin: context?.commercial?.margin ?? null,
        cost_ceiling: context?.commercial?.cost_ceiling ?? null,
      },
    },
    market: {
      momentum,
      saturation,
      resonance_score: context?.resonanceScore ?? null,
      ownership: aestheticEntry?.seen_in?.slice(0, 5) ?? [],
      whitespace:
        aestheticEntry?.risk_factors?.[0]
          ? `the market still has not resolved ${aestheticEntry.risk_factors[0].charAt(0).toLowerCase()}${aestheticEntry.risk_factors[0].slice(1)}`
          : "an opening for a more precise interpretation at this price level",
      season: context?.season ?? "current season",
      seasonal_timing:
        typeof aestheticEntry?.seasonal_relevance === "string"
          ? aestheticEntry.seasonal_relevance
          : aestheticEntry?.seasonal_relevance ?? context?.season ?? "current season",
    },
    piece: {
      item: pieceItem,
      type: piece?.type?.trim() || "piece type unresolved",
      signal: piece?.signal?.trim() || "unknown",
      note: piece?.note?.trim() || "none",
      bucket: piece?.bucket?.trim() || "unknown",
      category: piece?.category?.trim() || undefined,
      material: piece?.material?.trim() || undefined,
      construction: piece?.construction?.trim() || undefined,
      stage: context?.isStartingPiece ? "starting piece" : "selected piece",
    },
  };

  const userMessage = `Use this structured payload and return only the final answer as JSON:
${JSON.stringify(structuredPayload, null, 2)}

Return exactly:
{
  "headline": "1-2 sentences max",
  "core_read": "short paragraph",
  "move_that_matters": "short paragraph",
  "start_here": "short paragraph"
}`;

  const systemPrompt = `You are Muko — a fashion collection intelligence system writing with the authority of a senior merchant and the precision of a design director.

You are not summarizing the collection. You are making a call about whether this piece is the right first move and why.

Every sentence must make a falsifiable claim. If a sentence would still be true for a different collection with a different direction and a different piece, delete it and rewrite it until it cannot.
If a sentence could apply to any collection or piece without these exact inputs, rewrite it.

REGISTER FAILURE MODE — before finalizing, scan every sentence for atmospheric language: evocative phrasing that creates mood but makes no concrete claim.
Atmospheric sentences pass every rule but say nothing specific.
Examples of atmospheric (delete and rewrite):
- "The collection carries a quiet confidence that anchors the direction."
- "This piece brings presence and intention to the opening move."
- "The silhouette reads with restraint and purpose."
Examples of declarative (keep):
- "Opening with a shell instead of a trouser locks proportion before color enters — the collection reads as a surface story, not a shape story."
- "The column silhouette sets the collection's vertical line early, which means every subsequent piece either reinforces or disrupts it."
- "At 65% saturation, the structured-minimalist lane still has room at this price point, but only if the first piece claims a specific proportion — not just the aesthetic."

FIELD RULES
headline: 1–2 sentences. Must name the collection direction and state a specific consequence of the first move. No atmospheric openers.

core_read: 3–5 sentences. Must name the specific tension this piece is navigating — not the general aesthetic. Must include one concrete market claim (saturation level, timing window, or competitive adjacency). Must name what this piece needs to deliver for the collection to succeed in market — framed as what it must do, not what could go wrong. If the piece is well-positioned and clearly differentiated, name the specific thing it is doing right and what that enables for the pieces that follow. If genuine risk exists, name it once specifically. Do not invent failure modes when the piece is working.

move_that_matters: 2–3 sentences. Must include a conditional consequence structured as: if [specific decision] → [specific outcome]. The condition and consequence must both be specific to this collection's direction, silhouette, and palette — not the category generally.

start_here: 2–3 sentences. Must name why this specific piece (not a piece like it) is the right opening move. Must reference material behavior or silhouette role as the mechanism, not the result. Must end with what this piece makes possible for the pieces that follow it.

Positive example:
{
  "headline": "The cigarette jean locks the collection's proportion language early — everything that follows either reinforces or responds to this line.",
  "core_read": "Opening with a clean, straight-leg bottom sets the vertical axis for the collection before any surface complexity enters. The silhouette is specific enough to be directional without being costume. At building saturation in the Heritage Hand lane at contemporary price, this piece works because it carries the direction through structure rather than decoration — the market signal is already consolidating around the brands doing the opposite.",
  "move_that_matters": "If the seam finish stays clean and the leg opening holds narrow, this piece establishes the collection's restraint language in a way that makes subsequent tops easier to land. If the construction tier drifts toward moderate, the piece loses the simplicity that is doing the directional work.",
  "start_here": "This specific piece is the right opening move because it anchors category, silhouette, and material register simultaneously. The straight leg sets proportion; Tencel sets surface behavior; low construction keeps the read clean. That combination makes the next piece — likely a soft top — readable against it immediately."
}

ASSORTMENT CONTEXT RULES
When existing_pieces is present and non-empty:
- The core_read must reference the collection's current composition directly. Name what roles are already present and what is missing.
- The start_here must explain why this piece specifically fills a gap in the existing assortment — not why it is generically good.
- If piece_count is 0, treat this as the opening move and focus on what this piece makes possible for pieces that follow.

When existing_pieces is empty or absent:
- Treat this as piece one. Focus on what this piece establishes and what it constrains for the collection that follows.

HARD RULES
- No bullets anywhere.
- No filler. Every sentence earns its place or is cut.
- Do not use: "based on", "this suggests", "strong alignment", "elevated", "curated", "quiet confidence", "speaks to", "brings presence", "carries intention"ith restraint".
- Do not restate the collection inputs back as prose.
- Return valid JSON only. No preamble. No markdown.`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = new Anthropic();
        const anthropicStream = client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 400,
          temperature: 0.4,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        });

        let accumulated = '';

        for await (const event of anthropicStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            accumulated += event.delta.text;
            controller.enqueue(encoder.encode(sse('chunk', { text: event.delta.text })));
          }
        }

        try {
          const parsed = parseJSONResponse<PieceReadResponse>(accumulated);
          controller.enqueue(encoder.encode(sse('complete', {
            headline: typeof parsed.headline === "string" && parsed.headline.trim() ? parsed.headline.trim() : fallback.headline,
            core_read: typeof parsed.core_read === "string" && parsed.core_read.trim() ? parsed.core_read.trim() : fallback.core_read,
            move_that_matters:
              typeof parsed.move_that_matters === "string" && parsed.move_that_matters.trim()
                ? parsed.move_that_matters.trim()
                : fallback.move_that_matters,
            start_here: typeof parsed.start_here === "string" && parsed.start_here.trim() ? parsed.start_here.trim() : fallback.start_here,
          })));
        } catch {
          controller.enqueue(encoder.encode(sse('complete', fallback)));
        }
      } catch {
        controller.enqueue(encoder.encode(sse('complete', fallback)));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
