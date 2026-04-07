import categoriesData from "@/data/categories.json";
import type { DeterministicSuggestedPiece, PieceDimension, PiecesReadInput } from "@/lib/pieces/types";

const CATEGORY_KEYS = (
  categoriesData as {
    categories: Array<{ id: string; silhouettes?: Array<{ id: string }> }>;
  }
).categories.map((category) => category.id);

const SILHOUETTE_KEYS = Array.from(
  new Set(
    (
      categoriesData as {
        categories: Array<{ silhouettes?: Array<{ id: string }> }>;
      }
    ).categories.flatMap((category) => category.silhouettes?.map((silhouette) => silhouette.id) ?? [])
  )
);

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

function buildDistribution(
  values: Array<string | null | undefined>,
  baseKeys: string[]
) {
  const distribution = Object.fromEntries(baseKeys.map((key) => [key, 0])) as Record<string, number>;

  values.forEach((value) => {
    const key = value?.trim();
    if (!key) return;
    distribution[key] = (distribution[key] ?? 0) + 1;
  });

  return distribution;
}

function deriveCollectionPhase(confirmedPieceCount: number): PiecesReadInput["currentCollectionState"]["collectionPhase"] {
  if (confirmedPieceCount >= 11) return "complete";
  if (confirmedPieceCount >= 6) return "forming";
  if (confirmedPieceCount >= 3) return "building";
  return "opening";
}

function deriveRoleTargets(confirmedPieceCount: number): PiecesReadInput["currentCollectionState"]["roleTargets"] {
  if (confirmedPieceCount < 4) {
    return {
      hero: 1,
      directional: 1,
      volumeDriver: 1,
      coreEvolution: 1,
    };
  }

  const hero = Math.max(1, Math.round(confirmedPieceCount * 0.12));
  const directional = Math.max(1, Math.round(confirmedPieceCount * 0.15));
  const volumeDriver = Math.max(1, Math.round(confirmedPieceCount * 0.45));
  const coreEvolution = Math.max(1, Math.round(confirmedPieceCount * 0.28));

  return {
    hero,
    directional,
    volumeDriver,
    coreEvolution,
  };
}

function deriveRoleTargetRanges(): PiecesReadInput["currentCollectionState"]["roleTargetRanges"] {
  return {
    hero: "10–15%",
    directional: "10–20%",
    volumeDriver: "40–50%",
    coreEvolution: "25–30%",
  };
}

function deriveDimensionDragSummary(
  confirmedPieces: Array<{
    name: string;
    score?: number | null;
    identityScore?: number | null;
    resonanceScore?: number | null;
    executionScore?: number | null;
  }>
): PiecesReadInput["currentCollectionState"]["dimensionDragSummary"] {
  const lowScorePieces = confirmedPieces.filter(
    (piece) => typeof piece.score === "number" && piece.score < 78
  );

  if (lowScorePieces.length === 0) {
    return {
      dominantDrag: null,
      affectedPieceCount: 0,
      affectedPieces: [],
    };
  }

  const counts: Record<PieceDimension, number> = {
    identity: 0,
    resonance: 0,
    execution: 0,
  };
  const affectedByDimension: Record<PieceDimension, string[]> = {
    identity: [],
    resonance: [],
    execution: [],
  };

  lowScorePieces.forEach((piece) => {
    const scoredDimensions: Array<[PieceDimension, number]> = [
      ["identity", piece.identityScore ?? Number.POSITIVE_INFINITY],
      ["resonance", piece.resonanceScore ?? Number.POSITIVE_INFINITY],
      ["execution", piece.executionScore ?? Number.POSITIVE_INFINITY],
    ].filter((entry): entry is [PieceDimension, number] => Number.isFinite(entry[1]));

    if (scoredDimensions.length === 0) return;

    const lowestScore = Math.min(...scoredDimensions.map(([, value]) => value));
    scoredDimensions
      .filter(([, value]) => value === lowestScore)
      .forEach(([dimension]) => {
        counts[dimension] += 1;
        affectedByDimension[dimension].push(piece.name.trim());
      });
  });

  const dominantDrag =
    (["identity", "resonance", "execution"] as PieceDimension[]).sort((a, b) => counts[b] - counts[a])[0] ?? null;

  if (!dominantDrag || counts[dominantDrag] === 0) {
    return {
      dominantDrag: null,
      affectedPieceCount: 0,
      affectedPieces: [],
    };
  }

  const affectedPieces = Array.from(
    new Set(affectedByDimension[dominantDrag].filter(Boolean))
  );

  return {
    dominantDrag,
    affectedPieceCount: affectedPieces.length,
    affectedPieces,
  };
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
  coverageGapLabels,
  dominantSilhouette,
  materialSignals,
  roleBalance,
  scoreSignals,
  confirmedPieces,
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
  coverageGapLabels: Array<string | null | undefined>;
  dominantSilhouette?: string | null;
  materialSignals: Array<string | null | undefined>;
  roleBalance: {
    hero: number;
    directional: number;
    coreEvolution: number;
    volumeDriver: number;
  };
  scoreSignals: {
    averageScore?: number | null;
    strongestPiece?: string | null;
    weakestPiece?: string | null;
  };
  confirmedPieces: Array<{
    name: string;
    category?: string | null;
    silhouette?: string | null;
    material?: string | null;
    role?: string | null;
    score?: number | null;
    identityScore?: number | null;
    resonanceScore?: number | null;
    executionScore?: number | null;
    expression?: string | null;
  }>;
  suggestedPieces: DeterministicSuggestedPiece[];
  recommendedStartPiece: PiecesReadInput["recommendedStartPiece"];
}): PiecesReadInput {
  const normalizedConfirmedPieces = confirmedPieces.slice(0, 12).map((piece) => ({
    name: piece.name.trim(),
    category: piece.category?.trim() || undefined,
    silhouette: piece.silhouette?.trim() || undefined,
    material: piece.material?.trim() || undefined,
    role: piece.role?.trim() || undefined,
    score: piece.score ?? null,
    identityScore: piece.identityScore ?? null,
    resonanceScore: piece.resonanceScore ?? null,
    executionScore: piece.executionScore ?? null,
    expression: piece.expression?.trim() || undefined,
  }));

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
      categoryDistribution: buildDistribution(
        normalizedConfirmedPieces.map((piece) => piece.category),
        CATEGORY_KEYS
      ),
      silhouetteDistribution: buildDistribution(
        normalizedConfirmedPieces.map((piece) => piece.silhouette),
        SILHOUETTE_KEYS
      ),
      coverageGaps: Array.from(new Set(coverageGaps)).slice(0, 6),
      coverageGapLabels: compact(coverageGapLabels),
      collectionPhase: deriveCollectionPhase(confirmedPieceCount),
      dominantSilhouette: dominantSilhouette?.trim() ? dominantSilhouette.trim() : null,
      materialSignals: compact(materialSignals),
      roleBalance,
      roleTargets: deriveRoleTargets(confirmedPieceCount),
      roleTargetRanges: deriveRoleTargetRanges(),
      scoreSignals: {
        averageScore:
          typeof scoreSignals.averageScore === "number" && Number.isFinite(scoreSignals.averageScore)
            ? Math.round(scoreSignals.averageScore)
            : null,
        strongestPiece: scoreSignals.strongestPiece?.trim() ? scoreSignals.strongestPiece.trim() : null,
        weakestPiece: scoreSignals.weakestPiece?.trim() ? scoreSignals.weakestPiece.trim() : null,
      },
      dimensionDragSummary: deriveDimensionDragSummary(normalizedConfirmedPieces),
      confirmedPieces: normalizedConfirmedPieces,
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
