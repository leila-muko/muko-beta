import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { parseJSONResponse } from "@/lib/claude/client";

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
  const silhouetteLabel = context?.silhouetteLabel?.trim() || "refined";
  const paletteName = context?.paletteName?.trim() || "unknown";
  const interpretationLine =
    context?.interpretationSummary?.trim()
      ? `\nDirection summary: ${context.interpretationSummary.trim()}`
      : "";
  const framingLine = context?.isStartingPiece
    ? "\nThis is the starting piece - frame the body as early assortment guidance, not a confirmed read. Use language like 'currently carries' and 'collection language taking shape'."
    : "\nThis is an active selected piece - frame the body as a direct commercial and aesthetic assessment.";

  const userMessage = `Write a piece read for ${pieceItem} in a ${aestheticName} collection with ${silhouetteLabel} silhouette and ${paletteName} palette.

Piece signal: ${piece?.signal?.trim() || "unknown"}
Piece note: ${piece?.note?.trim() || "none"}
Collection role bucket: ${piece?.bucket?.trim() || "unknown"}
Market resonance: ${context?.resonanceScore ?? "unknown"}/100${interpretationLine}${framingLine}

Return JSON: { "title": "${pieceItem}", "body": "[one paragraph, max 60 words, advisor voice]" }`;

  const systemPrompt =
    "You are a senior fashion strategy consultant advising a design team. You write precise, commercially grounded piece assessments - one clear title and one paragraph. Never mention brand keywords by name. Never use the word 'keywords'. Speak through market and aesthetic judgment. Return valid JSON only. No preamble, no markdown, no explanation.";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = new Anthropic();
        const anthropicStream = client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 160,
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
          const parsed = parseJSONResponse<{ title: string; body: string }>(accumulated);
          controller.enqueue(encoder.encode(sse('complete', {
            title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : pieceItem,
            body: typeof parsed.body === "string" && parsed.body.trim() ? parsed.body.trim() : fallback.body,
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
