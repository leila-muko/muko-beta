import { NextRequest, NextResponse } from "next/server";
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

  try {
    const result = await synthesizePiecesRead(body);
    const validation = validatePiecesReadOutput(body, result.output);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", detail: validation.errors },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ...validation.data,
      _meta: {
        source: "synthesized",
        latency_ms: result.latencyMs,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Synthesis failed",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
