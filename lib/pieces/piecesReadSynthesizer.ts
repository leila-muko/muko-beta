import { callClaude, parseJSONResponse } from "@/lib/claude/client";
import { buildPiecesReadPrompt } from "@/lib/pieces/piecesReadPrompt";
import type { PiecesReadInput, PiecesReadOutput } from "@/lib/pieces/types";
import { validatePiecesReadOutput } from "@/lib/pieces/validatePiecesReadOutput";

export async function synthesizePiecesRead(
  input: PiecesReadInput
): Promise<{ output: PiecesReadOutput; latencyMs: number }> {
  const { systemPrompt, userPrompt } = buildPiecesReadPrompt(input);
  const startedAt = Date.now();
  const raw = await callClaude(userPrompt, {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 700,
    temperature: 0.35,
    systemPrompt,
  });

  const parsed = parseJSONResponse<PiecesReadOutput>(raw);
  const validation = validatePiecesReadOutput(input, parsed);
  if (!validation.valid) {
    throw new Error(`Invalid pieces read output: ${validation.errors.join("; ")}`);
  }

  return {
    output: validation.data,
    latencyMs: Date.now() - startedAt,
  };
}
