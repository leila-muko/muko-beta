import type { CollectionRoleId, KeyPiece } from "@/lib/store/sessionStore";
import type { PieceStrategicRole } from "@/lib/pieces/types";

type StartingPointPurpose = "language-gap" | "role-balance" | "execution-risk";

export function assignStrategicRole({
  piece,
  collectionRole,
  purpose,
  complexityBias,
}: {
  piece: KeyPiece;
  collectionRole: CollectionRoleId;
  purpose: StartingPointPurpose;
  complexityBias: "reduce" | "steady";
}): PieceStrategicRole {
  if (purpose === "language-gap") return "express_signal";
  if (collectionRole === "hero") return "express_signal";
  if (collectionRole === "volume-driver" || collectionRole === "core-evolution") return "stabilize_core";
  if (purpose === "execution-risk" && complexityBias === "reduce") return "stabilize_core";
  if (piece.signal === "high-volume") return "stabilize_core";
  if (piece.signal === "ascending") return "express_signal";
  return "extend_direction";
}

export function buildStrategicReasonTags({
  piece,
  strategicRole,
  purpose,
  collectionRole,
  complexityBias,
  targetCollectionLanguage,
  targetExpressionSignal,
}: {
  piece: KeyPiece;
  strategicRole: PieceStrategicRole;
  purpose: StartingPointPurpose;
  collectionRole: CollectionRoleId;
  complexityBias: "reduce" | "steady";
  targetCollectionLanguage?: string;
  targetExpressionSignal?: string;
}): string[] {
  const tags = new Set<string>();

  tags.add(`role_${strategicRole}`);
  tags.add(`purpose_${purpose}`);

  if (piece.signal) tags.add(`signal_${piece.signal}`);
  if (collectionRole === "hero") tags.add("anchors_hierarchy");
  if (collectionRole === "volume-driver") tags.add("opens_commercial_entry");
  if (collectionRole === "core-evolution") tags.add("grounds_assortment");
  if (collectionRole === "directional") tags.add("widens_collection_language");
  if (complexityBias === "reduce") tags.add("manages_execution_risk");

  const normalizedExpression = normalizeTag(targetExpressionSignal);
  const normalizedLanguage = normalizeTag(targetCollectionLanguage);
  if (normalizedExpression) tags.add(`expression_${normalizedExpression}`);
  if (normalizedLanguage) tags.add(`language_${normalizedLanguage}`);

  if (strategicRole === "express_signal") tags.add("makes_direction_legible");
  if (strategicRole === "stabilize_core") tags.add("supports_assortment_balance");
  if (strategicRole === "extend_direction") tags.add("extends_range_without_reset");

  return Array.from(tags).slice(0, 6);
}

export function getStrategicRoleLabel(role: PieceStrategicRole) {
  if (role === "express_signal") return "To express the signal";
  if (role === "stabilize_core") return "To stabilize your core";
  return "To extend the direction";
}

export function buildDeterministicPieceMicrocopy({
  role,
  reasonTags,
}: {
  role: PieceStrategicRole;
  reasonTags: string[];
}) {
  if (role === "express_signal") {
    if (reasonTags.some((tag) => tag.startsWith("expression_"))) return "Makes the surface idea visible fast.";
    return "Gives the collection a clear opening statement.";
  }

  if (role === "stabilize_core") {
    if (reasonTags.includes("manages_execution_risk")) return "Keeps the range grounded and buildable.";
    return "Builds a stable base the line can grow from.";
  }

  return "Extends the frame without diluting the point of view.";
}

function normalizeTag(value?: string) {
  if (!value) return null;
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
