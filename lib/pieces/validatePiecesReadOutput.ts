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
): { valid: true; data: PiecesReadOutput; warnings: string[] } | { valid: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const candidate = output as Partial<PiecesReadOutput> | null;
  const sanitizedPieceMicrocopy: NonNullable<PiecesReadOutput["piece_microcopy"]> = [];

  if (!candidate || typeof candidate !== "object") {
    return { valid: false, errors: ["Output is not an object"] };
  }

  validateString(candidate.read_headline, "read_headline", LIMITS.read_headline, errors, warnings, "warn");
  validateString(candidate.read_body, "read_body", LIMITS.read_body, errors, warnings, "warn");
  validateString(candidate.how_to_lean_in, "how_to_lean_in", LIMITS.how_to_lean_in, errors, warnings, "warn");
  validateString(candidate.start_here_title, "start_here_title", LIMITS.start_here_title, errors, warnings, "warn");
  validateString(candidate.start_here_body, "start_here_body", LIMITS.start_here_body, errors, warnings, "warn");

  if (typeof candidate.read_body === "string") {
    const specificityChecks = buildSpecificityChecks(input);
    const hits = specificityChecks.filter((value) => containsToken(candidate.read_body ?? "", value));
    if (hits.length < 2) {
      warnings.push("read_body is too generic for the supplied collection state");
    }

    if (!containsToken(candidate.read_headline ?? "", input.movement.name) && !containsToken(candidate.read_body, input.movement.name)) {
      warnings.push("read should reference the actual direction name");
    }

    if (isGenericCopy(candidate.read_headline ?? "") || isGenericCopy(candidate.read_body)) {
      errors.push("read output contains generic copy");
    }
  }

  const suggestedNames = new Set(input.suggestedPieces.map((piece) => piece.name));
  const recommendedName = input.recommendedStartPiece?.name ?? null;
  const isNextMovePhase =
    input.currentCollectionState.collectionPhase === "forming" ||
    input.currentCollectionState.collectionPhase === "complete";

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
        validateString(pieceName, `piece_microcopy[${index}].piece_name`, undefined, errors, warnings, "hard");
        validateString(microcopy, `piece_microcopy[${index}].microcopy`, LIMITS.piece_microcopy, errors, warnings, "warn");
        if (
          typeof pieceName === "string" &&
          typeof microcopy === "string" &&
          suggestedNames.has(pieceName)
        ) {
          sanitizedPieceMicrocopy.push({
            piece_name: pieceName,
            microcopy,
          });
        } else if (typeof pieceName === "string" && !suggestedNames.has(pieceName)) {
          errors.push(`piece_microcopy[${index}].piece_name must match a suggested piece`);
        }
      });
    }
  }

  if (typeof candidate.start_here_body === "string" && recommendedName && !isNextMovePhase) {
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

  return {
    valid: true,
    data: {
      ...candidate,
      ...(candidate.piece_microcopy != null ? { piece_microcopy: sanitizedPieceMicrocopy } : {}),
    } as PiecesReadOutput,
    warnings,
  };
}

function validateString(
  value: unknown,
  field: string,
  maxWords: number | undefined,
  errors: string[],
  warnings: string[],
  wordLimitMode: "hard" | "warn"
) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${field} must be a non-empty string`);
    return;
  }

  if (maxWords != null && wordCount(value) > maxWords) {
    const issue = `${field} exceeds ${maxWords} words`;
    if (wordLimitMode === "hard") {
      errors.push(issue);
    } else {
      warnings.push(issue);
    }
  }
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function containsToken(body: string, token: string | null | undefined) {
  if (!token) return false;
  const haystack = normalize(body);
  const needle = normalize(token);
  return needle.length > 0 && haystack.includes(needle);
}

function buildSpecificityChecks(input: PiecesReadInput) {
  const checks = new Set<string>();
  checks.add(input.movement.name);
  checks.add(input.currentCollectionState.collectionPhase);
  if (input.currentCollectionState.dimensionDragSummary.dominantDrag) {
    checks.add(input.currentCollectionState.dimensionDragSummary.dominantDrag);
  }
  input.currentCollectionState.coverageGapLabels.forEach((gap) => checks.add(gap));
  input.currentCollectionState.confirmedCategories.forEach((category) => checks.add(category));
  Object.entries(input.currentCollectionState.categoryDistribution).forEach(([category, count]) => {
    checks.add(`${category} ${count}`);
  });
  Object.entries(input.currentCollectionState.silhouetteDistribution).forEach(([silhouette, count]) => {
    checks.add(`${silhouette} ${count}`);
  });
  Object.entries(input.currentCollectionState.roleBalance).forEach(([role, count]) => {
    checks.add(`${role} ${count}`);
  });
  Object.entries(input.currentCollectionState.roleTargets).forEach(([role, count]) => {
    checks.add(`${role} ${count}`);
  });
  input.currentCollectionState.dimensionDragSummary.affectedPieces.forEach((piece) => checks.add(piece));
  input.currentCollectionState.materialSignals.forEach((material) => checks.add(material));
  if (input.currentCollectionState.dominantSilhouette) checks.add(input.currentCollectionState.dominantSilhouette);
  input.currentCollectionState.confirmedPieces.forEach((piece) => {
    checks.add(piece.name);
    if (piece.category) checks.add(piece.category);
    if (piece.material) checks.add(piece.material);
    if (piece.silhouette) checks.add(piece.silhouette);
  });

  return Array.from(checks).filter((value) => normalize(value).length >= 4);
}

function isGenericCopy(value: string) {
  const normalized = normalize(value);
  return [
    "lead with the clearest piece",
    "build this starting point",
    "start with the clearest piece",
    "build the starting point",
  ].some((phrase) => normalized.includes(phrase));
}
