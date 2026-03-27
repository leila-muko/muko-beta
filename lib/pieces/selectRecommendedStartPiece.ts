import type { DeterministicSuggestedPiece, PiecesReadInput } from "@/lib/pieces/types";

type RecommendedStartPiece = PiecesReadInput["recommendedStartPiece"];

export function selectRecommendedStartPiece({
  suggestedPieces,
  confirmedCategories,
  confirmedPieceNames = [],
  coverageGaps,
}: {
  suggestedPieces: DeterministicSuggestedPiece[];
  confirmedCategories: string[];
  confirmedPieceNames?: string[];
  coverageGaps: string[];
}): RecommendedStartPiece {
  if (suggestedPieces.length === 0) return null;

  const confirmedCategorySet = new Set(confirmedCategories.map(normalize));
  const confirmedNameSet = new Set(confirmedPieceNames.map(normalize));
  const gapSet = new Set(coverageGaps);

  const ranked = suggestedPieces
    .map((piece) => {
      let score = Math.max(0, 40 - piece.rank * 4);

      if (!confirmedNameSet.has(normalize(piece.name))) score += 3;
      if (piece.category && !confirmedCategorySet.has(normalize(piece.category))) score += 2;

      if (piece.role === "express_signal") {
        score += 4;
        if (gapSet.has("needs_anchor_piece")) score += 3;
        if (gapSet.has("needs_visible_surface_expression")) score += 3;
      }

      if (piece.role === "stabilize_core") {
        if (gapSet.has("needs_commercial_base")) score += 4;
        if (gapSet.has("needs_core_daywear")) score += 3;
      }

      if (piece.role === "extend_direction" && !gapSet.has("needs_anchor_piece")) score += 2;

      if (piece.reasonTags.includes("makes_direction_legible")) score += 2;
      if (piece.reasonTags.includes("opens_commercial_entry")) score += 2;
      if (piece.reasonTags.includes("manages_execution_risk")) score += 1;

      return { piece, score };
    })
    .sort((a, b) => b.score - a.score || a.piece.rank - b.piece.rank);

  const winner = ranked[0]?.piece;
  if (!winner) return null;

  const why = new Set<string>();

  if (winner.role === "express_signal") {
    why.add("makes the collection direction legible early");
    why.add("sets the tone for posture, proportion, and surface");
    if (gapSet.has("needs_visible_surface_expression")) why.add("establishes visible execution of the collection signal");
  } else if (winner.role === "stabilize_core") {
    why.add("gives the collection a stable commercial base");
    why.add("opens the range through a clearer everyday anchor");
    if (gapSet.has("needs_commercial_base")) why.add("addresses the need for a stronger core entry point");
  } else {
    why.add("extends the direction without resetting the frame");
    why.add("widens the product read while keeping the collection coherent");
  }

  if (winner.reasonTags.includes("anchors_hierarchy")) why.add("claims hierarchy quickly in the line");
  if (winner.reasonTags.includes("grounds_assortment")) why.add("gives later pieces something steady to build against");

  return {
    name: winner.name,
    role: winner.role,
    why: Array.from(why).slice(0, 3),
  };
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}
