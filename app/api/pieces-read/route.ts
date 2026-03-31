import { NextRequest, NextResponse } from "next/server";
import { buildPiecesReadFallback } from "@/lib/pieces/buildPiecesReadFallback";
import { synthesizePiecesRead } from "@/lib/pieces/piecesReadSynthesizer";
import type { PiecesReadInput } from "@/lib/pieces/types";
import { validatePiecesReadOutput } from "@/lib/pieces/validatePiecesReadOutput";

export async function POST(req: NextRequest) {
  let body: PiecesReadInput;
  try {
    body = await req.json();
  } catch {
    return Response.json({ message: "Request body is required" }, { status: 400 });
  }

  if (!body) {
    return Response.json({ message: "Request body is required" }, { status: 400 });
  }

  const fallback = buildPiecesReadFallback(body);

  try {
    const result = await synthesizePiecesRead(body);
    const validation = validatePiecesReadOutput(body, result.output);
    if (!validation.valid) {
      return NextResponse.json(
        {
          ...fallback,
          _meta: {
            source: "fallback",
            reason: "validation_failed",
            detail: validation.errors,
            latency_ms: result.latencyMs,
          },
        }
      );
    }

    return NextResponse.json({
      ...validation.data,
      _meta: {
        source: "synthesized",
        reason: validation.warnings.length > 0 ? "synthesized_with_warnings" : null,
        detail: validation.warnings,
        latency_ms: result.latencyMs,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        ...fallback,
        _meta: {
          source: "fallback",
          reason: classifyPiecesReadFailure(message),
          detail: [message],
        },
      },
    );
  }
}

function classifyPiecesReadFailure(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("failed to parse llm json response")) return "parse_failed";
  if (normalized.includes("invalid pieces read output")) return "validation_failed";
  if (normalized.includes("anthropic_api_key")) return "missing_api_key";
  return "synthesis_failed";
}
