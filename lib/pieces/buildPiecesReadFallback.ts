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
  const palette = pick(input.collectionFrame.palette, "a resolved palette rhythm");
  const expression = pick(input.collectionFrame.expression, "a visible product signal");
  const whitespace = labelWhitespace(input.movement.marketWhitespace);
  const startPiece = input.recommendedStartPiece;

  const headline =
    input.currentCollectionState.confirmedPieceCount === 0
      ? `${input.movement.name} still has room for a clearer first claim.`
      : `${input.movement.name} is readable, but it still needs a sharper product lead.`;

  const body =
    input.currentCollectionState.confirmedPieceCount === 0
      ? `The frame is already pointing toward ${silhouette}, ${palette}, and ${expression}. The opportunity is to make that direction read as product, not premise, while the market is still ${whitespace}.`
      : `The collection is holding through ${silhouette} and ${palette}, but ${expression} still needs a more legible product move. The opportunity is to tighten what the line stands for before it starts to read familiar.`;

  const leanIn = startPiece?.role === "stabilize_core"
    ? "Translate the direction through a piece that carries clarity without over-explaining it. Use it to give the range a steadier commercial center."
    : startPiece?.role === "extend_direction"
    ? "Push the next product move into a lane that widens the frame without changing its posture. The collection should gain range while keeping the same point of view."
    : "Make the opening product move visibly carry the signal. The right piece should lock posture, surface, and proportion into one legible statement.";

  const startTitle =
    startPiece?.role === "stabilize_core"
      ? "Open with the core"
      : startPiece?.role === "extend_direction"
      ? "Extend the frame"
      : "Begin with the signal";

  const startBody = startPiece
    ? `${startPiece.name} is the right first move because it ${joinReasons(startPiece.why)}.`
    : "Use the first piece to set the collection's hierarchy, product posture, and visible point of view.";

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
