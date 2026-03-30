"use client";

import categoriesData from "@/data/categories.json";
import { parseSelectedPieceImage, resolvePieceImageType } from "@/lib/piece-image";
import { normalizeSpecSubcategoryId } from "@/lib/spec-studio/smart-defaults";
import { useSessionStore, type CollectionRoleId, type KeyPiece, type PieceBuildContext } from "@/lib/store/sessionStore";
import { hydrateCollectionContextFromAnalysis, type PersistedCollectionContextRow } from "@/lib/collections/hydrateCollectionContext";

export interface PersistedSpecAnalysisRow extends PersistedCollectionContextRow {
  id: string;
  collection_name?: string | null;
  piece_name?: string | null;
  category: string | null;
  collection_role?: string | null;
  aesthetic_input: string | null;
  aesthetic_matched_id?: string | null;
  season: string | null;
  material_id: string | null;
  silhouette: string | null;
  construction_tier: "low" | "moderate" | "high" | null;
  construction_tier_override?: boolean | null;
  target_msrp?: number | null;
  aesthetic_inflection?: string | null;
  agent_versions?: Record<string, unknown> | null;
}

const categoryNameById = new Map(
  ((categoriesData as { categories: Array<{ id: string; name: string }> }).categories ?? []).map((category) => [
    category.id,
    category.name,
  ])
);

function normalizeToken(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value: string | null | undefined) {
  if (!value) return "";
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPieceName(row: PersistedSpecAnalysisRow) {
  const savedPieceName =
    typeof row.agent_versions?.saved_piece_name === "string"
      ? row.agent_versions.saved_piece_name.trim()
      : "";

  return row.piece_name?.trim() || savedPieceName || row.category?.trim() || "Untitled Piece";
}

function getAssignedRole(row: PersistedSpecAnalysisRow): CollectionRoleId | null {
  const storedRole = normalizeToken(
    row.collection_role ??
      (typeof row.agent_versions?.collection_role === "string" ? row.agent_versions.collection_role : null)
  );

  if (
    storedRole === "hero" ||
    storedRole === "volume-driver" ||
    storedRole === "core-evolution" ||
    storedRole === "directional"
  ) {
    return storedRole;
  }

  return null;
}

export function deriveSpecSessionSnapshot(row: PersistedSpecAnalysisRow) {
  const pieceName = getPieceName(row);
  const storedPieceImage = parseSelectedPieceImage(
    typeof row.agent_versions?.selected_piece_image === "string" ? row.agent_versions.selected_piece_image : null
  );
  const resolvedPieceType =
    storedPieceImage?.pieceType ??
    resolvePieceImageType({
      pieceName,
      category: row.category,
      silhouette: row.silhouette,
    });
  const categoryId = normalizeToken(row.category);
  const categoryName = (categoryId ? categoryNameById.get(categoryId) : null) ?? titleCase(row.category) ?? "";
  const subcategoryId = normalizeSpecSubcategoryId(resolvedPieceType ?? null) ?? "";
  const role = getAssignedRole(row);
  const savedPieceExpression =
    typeof row.agent_versions?.saved_piece_expression === "string"
      ? row.agent_versions.saved_piece_expression.trim() || null
      : null;

  const selectedKeyPiece: KeyPiece = {
    item: pieceName,
    signal: storedPieceImage?.signal ?? null,
    note: undefined,
    category: categoryId || null,
    type: resolvedPieceType ?? (subcategoryId || null),
    recommended_material_id: row.material_id?.trim() || null,
    redirect_material_id: null,
  };

  const pieceBuildContext: PieceBuildContext = {
    adaptedTitle: pieceName,
    role,
    archetype: resolvedPieceType ?? (subcategoryId || null),
    originalLabel: pieceName,
    expression: savedPieceExpression,
    translation: row.aesthetic_inflection?.trim() || null,
    collectionLanguage: [],
    expressionSignals: [],
    complexityBias: null,
  };

  return {
    pieceName,
    categoryId,
    categoryName,
    subcategoryId,
    materialId: row.material_id?.trim() || "",
    silhouette: row.silhouette?.trim() || "",
    constructionTier: row.construction_tier ?? "moderate",
    constructionTierOverride: Boolean(row.construction_tier_override),
    targetMsrp: row.target_msrp ?? 0,
    role,
    selectedPieceImage: storedPieceImage,
    selectedKeyPiece,
    pieceBuildContext,
    season: row.season?.trim() || "",
    aestheticInput: row.aesthetic_input?.trim() || "",
    aestheticMatchedId: row.aesthetic_matched_id?.trim() || null,
  };
}

export function hydrateSpecSessionFromAnalysis(collectionName: string, row: PersistedSpecAnalysisRow) {
  const snapshot = deriveSpecSessionSnapshot(row);
  const state = useSessionStore.getState();

  hydrateCollectionContextFromAnalysis(collectionName, row);

  useSessionStore.setState({
    aestheticMatchedId: snapshot.aestheticMatchedId,
    aestheticInput: snapshot.aestheticInput,
  });

  state.setCollectionName(collectionName);
  state.setActiveCollection(collectionName);
  if (snapshot.season) {
    state.setSeason(snapshot.season);
  }
  state.setSavedAnalysisId(row.id);
  state.setActiveProductPieceId(snapshot.pieceName);
  state.setCategory(snapshot.categoryName);
  state.setSubcategory(snapshot.subcategoryId);
  state.setMaterial(snapshot.materialId);
  state.setTargetMsrp(snapshot.targetMsrp);
  state.setSilhouette(snapshot.silhouette);
  state.setConstructionTier(snapshot.constructionTier, snapshot.constructionTierOverride);
  state.setCollectionRole(snapshot.role);
  state.setSelectedPieceImage(snapshot.selectedPieceImage);
  state.setSelectedKeyPiece(snapshot.selectedKeyPiece);
  state.setPieceBuildContext(snapshot.pieceBuildContext);
  state.setPieceRolesById(
    snapshot.role
      ? {
          ...state.pieceRolesById,
          [snapshot.pieceName]: snapshot.role,
        }
      : state.pieceRolesById
  );

  try {
    window.localStorage.setItem("muko_collectionName", collectionName);
    if (snapshot.season) {
      window.localStorage.setItem("muko_seasonLabel", snapshot.season);
    }
  } catch {}

  return snapshot;
}
