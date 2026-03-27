import type { PiecesReadInput, PiecesReadOutput } from "@/lib/pieces/types";

const LIMITS = {
  read_headline: 18,
  read_body: 70,
  how_to_lean_in: 55,
  start_here_title: 8,
  start_here_body: 65,
  piece_microcopy: 20,
} as const;

export function validatePiecesReadOutput(
  input: PiecesReadInput,
  output: unknown
): { valid: true; data: PiecesReadOutput } | { valid: false; errors: string[] } {
  const errors: string[] = [];
  const candidate = output as Partial<PiecesReadOutput> | null;

  if (!candidate || typeof candidate !== "object") {
    return { valid: false, errors: ["Output is not an object"] };
  }

  validateString(candidate.read_headline, "read_headline", LIMITS.read_headline, errors);
  validateString(candidate.read_body, "read_body", LIMITS.read_body, errors);
  validateString(candidate.how_to_lean_in, "how_to_lean_in", LIMITS.how_to_lean_in, errors);
  validateString(candidate.start_here_title, "start_here_title", LIMITS.start_here_title, errors);
  validateString(candidate.start_here_body, "start_here_body", LIMITS.start_here_body, errors);

  const suggestedNames = new Set(input.suggestedPieces.map((piece) => piece.name));
  const recommendedName = input.recommendedStartPiece?.name ?? null;

  if (candidate.piece_microcopy != null) {
    if (!Array.isArray(candidate.piece_microcopy)) {
      errors.push("piece_microcopy must be an array");
    } else {
      candidate.piece_microcopy.forEach((entry, index) => {
        if (!entry || typeof entry !== "object") {
          errors.push(`piece_microcopy[${index}] must be an object`);
          return;
        }
        const pieceName = "piece_name" in entry ? entry.piece_name : undefined;
        const microcopy = "microcopy" in entry ? entry.microcopy : undefined;
        validateString(pieceName, `piece_microcopy[${index}].piece_name`, undefined, errors);
        validateString(microcopy, `piece_microcopy[${index}].microcopy`, LIMITS.piece_microcopy, errors);
        if (typeof pieceName === "string" && !suggestedNames.has(pieceName)) {
          errors.push(`piece_microcopy[${index}] references unknown piece`);
        }
      });
    }
  }

  if (typeof candidate.start_here_body === "string" && recommendedName) {
    input.suggestedPieces
      .map((piece) => piece.name)
      .filter((name) => name !== recommendedName)
      .forEach((name) => {
        if (candidate.start_here_body?.includes(name)) {
          errors.push("start_here_body references a non-recommended piece");
        }
      });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: candidate as PiecesReadOutput };
}

function validateString(value: unknown, field: string, maxWords: number | undefined, errors: string[]) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${field} must be a non-empty string`);
    return;
  }

  if (maxWords != null && wordCount(value) > maxWords) {
    errors.push(`${field} exceeds ${maxWords} words`);
  }
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}
