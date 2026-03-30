import type { PiecesReadInput, PiecesReadOutput } from "@/lib/pieces/types";

function labelWhitespace(value?: PiecesReadInput["movement"]["marketWhitespace"]) {
  if (value === "crowded") return "crowded";
  if (value === "moderate") return "active";
  return "open";
}

function pick<T>(values: T[], fallback: T) {
  return values[0] ?? fallback;
}

export function buildPiecesReadFallback(input: PiecesReadInput): PiecesReadOutput {
  const silhouette = pick(input.collectionFrame.silhouette, "controlled proportion");
  const startPiece = input.recommendedStartPiece;
  const dominantSilhouette = input.currentCollectionState.dominantSilhouette ?? silhouette;
  const materialSignal = pick(input.currentCollectionState.materialSignals, "material language");
  const coverageGap = pick(input.currentCollectionState.coverageGapLabels, "the missing assortment role");
  const confirmedPieces = input.currentCollectionState.confirmedPieces;
  const scoredPieces = confirmedPieces
    .filter((piece): piece is PiecesReadInput["currentCollectionState"]["confirmedPieces"][number] & { score: number } =>
      typeof piece.score === "number"
    )
    .slice()
    .sort((a, b) => b.score - a.score);
  const strongestPiece =
    confirmedPieces.find((piece) => piece.name === input.currentCollectionState.scoreSignals.strongestPiece) ??
    scoredPieces[0] ??
    confirmedPieces[0];
  const weakestPiece =
    confirmedPieces.find((piece) => piece.name === input.currentCollectionState.scoreSignals.weakestPiece) ??
    scoredPieces[scoredPieces.length - 1] ??
    confirmedPieces[confirmedPieces.length - 1];
  const comparisonPiece =
    confirmedPieces.find(
      (piece) =>
        piece.name !== weakestPiece?.name &&
        piece.category &&
        weakestPiece?.category &&
        piece.category.toLowerCase() === weakestPiece.category.toLowerCase()
    ) ?? strongestPiece;

  const headline =
    input.currentCollectionState.confirmedPieceCount === 0
      ? `${input.movement.name} needs one piece to set ${dominantSilhouette}.`
      : buildHeadline({
          movementName: input.movement.name,
          weakestPiece,
          materialSignal,
          coverageGap,
        });

  const body =
    input.currentCollectionState.confirmedPieceCount === 0
      ? buildEmptyBody({
          movementName: input.movement.name,
          dominantSilhouette,
          startPieceName: startPiece?.name ?? null,
          coverageGap,
        })
      : buildBody({
          movementName: input.movement.name,
          weakestPiece,
          comparisonPiece,
          materialSignal,
          dominantSilhouette,
          coverageGap,
        });

  const leanIn = buildLeanIn({
    weakestPiece,
    comparisonPiece,
    coverageGap,
    materialSignal,
    startPieceName: startPiece?.name ?? null,
  });

  const startTitle = startPiece ? `Start with ${startPiece.name}` : "Start with one anchor";

  const startBody = startPiece
    ? buildStartBody({
        startPiece,
        suggestedPiece: input.suggestedPieces.find((piece) => piece.name === startPiece.name),
        coverageGap,
      })
    : `Open with one piece that fixes ${coverageGap.toLowerCase()} and locks ${dominantSilhouette} into product.`;

  return {
    read_headline: headline,
    read_body: body,
    how_to_lean_in: leanIn,
    start_here_title: startTitle,
    start_here_body: startBody,
  };
}

function joinReasons(why: string[]) {
  if (why.length === 0) return "sets the line on a clearer footing";
  if (why.length === 1) return why[0];
  if (why.length === 2) return `${why[0]} and ${why[1]}`;
  return `${why[0]}, ${why[1]}, and ${why[2]}`;
}

function buildHeadline({
  movementName,
  weakestPiece,
  materialSignal,
  coverageGap,
}: {
  movementName: string;
  weakestPiece?: PiecesReadInput["currentCollectionState"]["confirmedPieces"][number];
  materialSignal: string;
  coverageGap: string;
}) {
  if (weakestPiece?.name && weakestPiece.material) {
    return `${weakestPiece.material} is dragging ${weakestPiece.name} below ${movementName}.`;
  }
  if (weakestPiece?.name) {
    return `${weakestPiece.name} is where ${coverageGap.toLowerCase()} is showing.`;
  }
  return `${materialSignal} is not resolving ${coverageGap.toLowerCase()} yet.`;
}

function buildEmptyBody({
  movementName,
  dominantSilhouette,
  startPieceName,
  coverageGap,
}: {
  movementName: string;
  dominantSilhouette: string;
  startPieceName: string | null;
  coverageGap: string;
}) {
  if (startPieceName) {
    return `${startPieceName} should open ${movementName} because it gives ${dominantSilhouette} a visible first claim. Without that piece, ${coverageGap.toLowerCase()} keeps the direction abstract.`;
  }
  return `${movementName} has ${dominantSilhouette} as a frame, but no piece is establishing it yet. Until one product fixes ${coverageGap.toLowerCase()}, the direction stays descriptive instead of sellable.`;
}

function buildBody({
  movementName,
  weakestPiece,
  comparisonPiece,
  materialSignal,
  dominantSilhouette,
  coverageGap,
}: {
  movementName: string;
  weakestPiece?: PiecesReadInput["currentCollectionState"]["confirmedPieces"][number];
  comparisonPiece?: PiecesReadInput["currentCollectionState"]["confirmedPieces"][number];
  materialSignal: string;
  dominantSilhouette: string;
  coverageGap: string;
}) {
  if (weakestPiece?.name && comparisonPiece?.name && weakestPiece.name !== comparisonPiece.name) {
    const weakScore = typeof weakestPiece.score === "number" ? ` at ${weakestPiece.score}` : "";
    const comparisonScore =
      typeof comparisonPiece.score === "number" ? ` at ${comparisonPiece.score}` : "";
    const weakMaterial = weakestPiece.material ?? materialSignal;
    return `${weakestPiece.name}${weakScore} is where ${movementName} loses pressure. ${comparisonPiece.name}${comparisonScore} is proving the line can land. The tension is not direction but ${weakMaterial} keeping ${weakestPiece.category ?? dominantSilhouette} from doing the same job.`;
  }
  if (weakestPiece?.name) {
    return `${weakestPiece.name} is exposing ${coverageGap.toLowerCase()} because ${weakestPiece.material ?? materialSignal} is not giving ${movementName} enough visible control. The issue is execution, not the direction itself.`;
  }
  return `${movementName} is reading through ${dominantSilhouette}, but ${coverageGap.toLowerCase()} is still unresolved because ${materialSignal} is not showing up consistently across the assortment.`;
}

function buildLeanIn({
  weakestPiece,
  comparisonPiece,
  coverageGap,
  materialSignal,
  startPieceName,
}: {
  weakestPiece?: PiecesReadInput["currentCollectionState"]["confirmedPieces"][number];
  comparisonPiece?: PiecesReadInput["currentCollectionState"]["confirmedPieces"][number];
  coverageGap: string;
  materialSignal: string;
  startPieceName: string | null;
}) {
  if (weakestPiece?.name && comparisonPiece?.name && weakestPiece.name !== comparisonPiece.name) {
    return `Rework ${weakestPiece.name} before adding another ${weakestPiece.category ?? "piece"} - ${comparisonPiece.name} is already doing that job better.`;
  }
  if (weakestPiece?.name) {
    return `Change ${weakestPiece.name}'s material before adding more range - ${weakestPiece.material ?? materialSignal} is where the weakness is sitting.`;
  }
  if (startPieceName) {
    return `Add ${startPieceName} first, then correct ${coverageGap.toLowerCase()} with the next category move.`;
  }
  return `Fix ${coverageGap.toLowerCase()} with one product move, not another broad direction statement.`;
}

function buildStartBody({
  startPiece,
  suggestedPiece,
  coverageGap,
}: {
  startPiece: NonNullable<PiecesReadInput["recommendedStartPiece"]>;
  suggestedPiece?: PiecesReadInput["suggestedPieces"][number];
  coverageGap: string;
}) {
  const establishment = describeStartPieceEstablishment(startPiece, suggestedPiece);
  return `${startPiece.name} should open because it ${joinReasons(startPiece.why)}. It establishes ${establishment}, which gives ${coverageGap.toLowerCase()} a concrete first answer.`;
}

function describeStartPieceEstablishment(
  startPiece: NonNullable<PiecesReadInput["recommendedStartPiece"]>,
  suggestedPiece?: PiecesReadInput["suggestedPieces"][number]
) {
  if (suggestedPiece?.reasonTags.includes("opens_commercial_entry")) return "a clearer commercial entry point";
  if (suggestedPiece?.reasonTags.includes("anchors_hierarchy")) return "the line's hierarchy in product";
  if (suggestedPiece?.reasonTags.includes("grounds_assortment")) return "a steadier assortment base";
  if (startPiece.role === "express_signal") return "the collection's visible surface signal";
  if (startPiece.role === "stabilize_core") return "the range's everyday base";
  return "the next extension of the collection frame";
}
