export type PieceStrategicRole = "stabilize_core" | "express_signal" | "extend_direction";

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
    coverageGaps: string[];
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
  how_to_lean_in: string;
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
