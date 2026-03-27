import type { DeterministicSuggestedPiece, PiecesReadInput } from "@/lib/pieces/types";

function compact(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).slice(0, 6);
}

function normalizeVelocity(value?: string | null) {
  if (!value) return null;
  const token = value.toLowerCase();
  if (token === "ascending" || token === "rising") return 76;
  if (token === "peak") return 60;
  if (token === "declining") return 34;
  return 50;
}

function deriveWhitespace(saturationScore?: number | null) {
  if (saturationScore == null) return null;
  if (saturationScore >= 70) return "crowded" as const;
  if (saturationScore >= 45) return "moderate" as const;
  return "open" as const;
}

export function buildPiecesReadInput({
  season,
  collectionName,
  movementName,
  trendVelocity,
  saturationScore,
  seenIn,
  silhouette,
  palette,
  expression,
  interpretationText,
  confirmedPieceCount,
  confirmedCategories,
  coverageGaps,
  suggestedPieces,
  recommendedStartPiece,
}: {
  season: string;
  collectionName: string;
  movementName: string;
  trendVelocity?: string | null;
  saturationScore?: number | null;
  seenIn?: string[];
  silhouette: Array<string | null | undefined>;
  palette: Array<string | null | undefined>;
  expression: Array<string | null | undefined>;
  interpretationText?: string | null;
  confirmedPieceCount: number;
  confirmedCategories: Array<string | null | undefined>;
  coverageGaps: string[];
  suggestedPieces: DeterministicSuggestedPiece[];
  recommendedStartPiece: PiecesReadInput["recommendedStartPiece"];
}): PiecesReadInput {
  return {
    season: season || "Current season",
    collectionName: collectionName || "Untitled collection",
    movement: {
      name: movementName || "Collection direction",
      trendVelocity: normalizeVelocity(trendVelocity),
      saturationScore: saturationScore ?? null,
      marketWhitespace: deriveWhitespace(saturationScore),
      seenIn: compact(seenIn ?? []),
    },
    collectionFrame: {
      silhouette: compact(silhouette),
      palette: compact(palette),
      expression: compact(expression),
      interpretationText: interpretationText?.trim() ? interpretationText.trim().slice(0, 180) : null,
    },
    currentCollectionState: {
      confirmedPieceCount,
      confirmedCategories: compact(confirmedCategories),
      coverageGaps: Array.from(new Set(coverageGaps)).slice(0, 6),
    },
    suggestedPieces: suggestedPieces.map((piece) => ({
      name: piece.name,
      category: piece.category?.trim() || undefined,
      role: piece.role,
      rank: piece.rank,
      reasonTags: piece.reasonTags.slice(0, 6),
    })),
    recommendedStartPiece,
  };
}
