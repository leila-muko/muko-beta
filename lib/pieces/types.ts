export type PieceStrategicRole = "stabilize_core" | "express_signal" | "extend_direction";
export type PieceDimension = "identity" | "resonance" | "execution";
export type CollectionPhase = "opening" | "building" | "forming" | "complete";

export const ROLE_DISPLAY_LABELS: Record<string, string> = {
  hero: "Hero",
  directional: "Directional",
  coreEvolution: "Core Evolution",
  volumeDriver: "Volume Driver",
};

export type PiecesReadInput = {
  season: string;
  collectionName: string;
  movement: {
    name: string;
    trendVelocity?: number | null;
    saturationScore?: number | null;
    marketWhitespace?: "open" | "moderate" | "crowded" | null;
    seenIn?: string[];
  };
  collectionFrame: {
    silhouette: string[];
    palette: string[];
    expression: string[];
    interpretationText?: string | null;
  };
  currentCollectionState: {
    confirmedPieceCount: number;
    confirmedCategories: string[];
    categoryDistribution: Record<string, number>;
    silhouetteDistribution: Record<string, number>;
    coverageGaps: string[];
    coverageGapLabels: string[];
    collectionPhase: CollectionPhase;
    dominantSilhouette?: string | null;
    materialSignals: string[];
    roleBalance: {
      hero: number;
      directional: number;
      coreEvolution: number;
      volumeDriver: number;
    };
    roleTargets: {
      hero: number;
      directional: number;
      coreEvolution: number;
      volumeDriver: number;
    };
    roleTargetRanges?: {
      hero: string;
      directional: string;
      coreEvolution: string;
      volumeDriver: string;
    };
    scoreSignals: {
      averageScore?: number | null;
      strongestPiece?: string | null;
      weakestPiece?: string | null;
    };
    dimensionDragSummary: {
      dominantDrag: PieceDimension | null;
      affectedPieceCount: number;
      affectedPieces: string[];
    };
    confirmedPieces: Array<{
      name: string;
      category?: string;
      silhouette?: string;
      material?: string;
      role?: string;
      score?: number | null;
      identityScore?: number | null;
      resonanceScore?: number | null;
      executionScore?: number | null;
      expression?: string;
    }>;
  };
  suggestedPieces: Array<{
    name: string;
    category?: string;
    role: PieceStrategicRole;
    rank: number;
    reasonTags: string[];
  }>;
  recommendedStartPiece: {
    name: string;
    role: PieceStrategicRole;
    why: string[];
  } | null;
};

export type PiecesReadOutput = {
  read_headline: string;
  read_body: string;
  how_to_lean_in?: string;
  start_here_title: string;
  start_here_body: string;
  piece_microcopy?: Array<{
    piece_name: string;
    microcopy: string;
  }>;
};

export type DeterministicSuggestedPiece = PiecesReadInput["suggestedPieces"][number] & {
  shortRationale: string;
};
