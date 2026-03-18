import { NextRequest, NextResponse } from "next/server";
import { callClaude, parseJSONResponse } from "@/lib/claude/client";

interface PieceReadRequest {
  piece?: {
    item?: string;
    type?: string;
    signal?: string;
    note?: string;
    bucket?: string;
  };
  context?: {
    aestheticName?: string;
    silhouetteLabel?: string;
    paletteName?: string;
    resonanceScore?: number | null;
    interpretationSummary?: string | null;
    isStartingPiece?: boolean;
  };
}

function buildStaticFallback(pieceItem: string) {
  return {
    title: pieceItem,
    body: "This piece carries the clearest expression of the collection direction. Assign its role before moving to specs.",
  };
}

export async function POST(req: NextRequest) {
  const { piece, context }: PieceReadRequest = await req.json();
  const pieceItem = piece?.item?.trim() ?? "";
  const fallback = buildStaticFallback(pieceItem);

  if (!pieceItem) {
    return NextResponse.json(fallback);
  }

  const aestheticName = context?.aestheticName?.trim() || "this direction";
  const silhouetteLabel = context?.silhouetteLabel?.trim() || "refined";
  const paletteName = context?.paletteName?.trim() || "unknown";
  const interpretationLine =
    context?.interpretationSummary?.trim()
      ? `\nDirection summary: ${context.interpretationSummary.trim()}`
      : "";
  const framingLine = context?.isStartingPiece
    ? "\nThis is the starting piece - frame the body as early assortment guidance, not a confirmed read. Use language like 'currently carries' and 'collection language taking shape'."
    : "\nThis is an active selected piece - frame the body as a direct commercial and aesthetic assessment.";

  try {
    const raw = await callClaude(
      `Write a piece read for ${pieceItem} in a ${aestheticName} collection with ${silhouetteLabel} silhouette and ${paletteName} palette.

Piece signal: ${piece?.signal?.trim() || "unknown"}
Piece note: ${piece?.note?.trim() || "none"}
Collection role bucket: ${piece?.bucket?.trim() || "unknown"}
Market resonance: ${context?.resonanceScore ?? "unknown"}/100${interpretationLine}${framingLine}

Return JSON: { "title": "${pieceItem}", "body": "[one paragraph, max 60 words, advisor voice]" }`,
      {
        model: "claude-haiku-4-5-20251001",
        maxTokens: 160,
        temperature: 0.4,
        systemPrompt:
          "You are a senior fashion strategy consultant advising a design team. You write precise, commercially grounded piece assessments - one clear title and one paragraph. Never mention brand keywords by name. Never use the word 'keywords'. Speak through market and aesthetic judgment. Return valid JSON only. No preamble, no markdown, no explanation.",
      },
    );

    const parsed = parseJSONResponse<{ title: string; body: string }>(raw);

    return NextResponse.json({
      title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : pieceItem,
      body: typeof parsed.body === "string" && parsed.body.trim() ? parsed.body.trim() : fallback.body,
    });
  } catch {
    return NextResponse.json(fallback);
  }
}
