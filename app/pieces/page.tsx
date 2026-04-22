"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import AskMuko from "@/components/AskMuko";
import { trackEvent } from "@/lib/analytics";
import { useSessionStore } from "@/lib/store/sessionStore";
import type { CollectionRoleId, KeyPiece, PieceBuildContext } from "@/lib/store/sessionStore";
import type { AskMukoContext } from "@/lib/synthesizer/askMukoResponse";
import { getFlatForPiece } from "@/components/flats";
import { MukoNav } from "@/components/MukoNav";
import { createClient } from "@/lib/supabase/client";
import { getCollectionLanguageLabels, getExpressionSignalLabels } from "@/lib/collection-signals";
import { resolvePieceImageType, resolveSelectedPieceImage } from "@/lib/piece-image";
import aestheticsData from "@/data/aesthetics.json";
import categoriesData from "@/data/categories.json";
import materialsData from "@/data/materials.json";
import subcategoriesData from "@/data/subcategories.json";
import { CollectionContextBar, COLLECTION_CONTEXT_BAR_OFFSET } from "@/components/collection/CollectionContextBar";
import { MukoTypedLoadingState } from "@/components/ui/MukoTypedLoadingState";
import { buildPiecesReadFallback } from "@/lib/pieces/buildPiecesReadFallback";
import { buildPiecesReadInput } from "@/lib/pieces/buildPiecesReadInput";
import { normalizeSpecSubcategoryId } from "@/lib/spec-studio/smart-defaults";
import { hydrateSpecSessionFromAnalysis, type PersistedSpecAnalysisRow } from "@/lib/collections/hydrateSpecSessionFromAnalysis";
import {
  hydrateCollectionContextFromAnalysis,
  mergeCollectionContextRows,
  restoreCollectionContextFromCache,
} from "@/lib/collections/hydrateCollectionContext";
import { getLatestCollectionContextRow } from "@/lib/collections/getLatestCollectionContextRow";
import {
  assignStrategicRole,
  buildDeterministicPieceMicrocopy,
  buildStrategicReasonTags,
  getStrategicRoleLabel,
} from "@/lib/pieces/roleAssignment";
import { selectRecommendedStartPiece } from "@/lib/pieces/selectRecommendedStartPiece";
import type { DeterministicSuggestedPiece, PiecesReadOutput, PieceStrategicRole } from "@/lib/pieces/types";

type PiecesReadResponseMeta = {
  source?: "synthesized" | "fallback";
  reason?: string | null;
  detail?: string[];
  latency_ms?: number;
};

// ── Design tokens ──────────────────────────────────────────────
const BG = "#FAF9F6";
const BG2 = "#FAF9F6";
const TEXT = "#191919";
const MUTED = "#888078";
const BORDER = "#E2DDD6";
const CHARTREUSE = "#A8B475";
const GREEN = "#7A9E7E";
const AMBER = "#C4955A";
const RED = "#B85C5C";
const STEEL_BLUE = "#7D96AC";

const sohne = "var(--font-sohne-breit), -ui-sans-serif, sans-serif";
const inter = "var(--font-inter), -ui-sans-serif, sans-serif";
const EYEBROW_STYLE = {
  fontFamily: "Inter, sans-serif",
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "rgba(67,67,43,0.45)",
};
const SECTION_TITLE_STYLE = {
  fontFamily: sohne,
  fontWeight: 500,
  color: "#43432B",
  letterSpacing: "-0.03em",
};
const BODY_COPY_STYLE = {
  fontFamily: "Inter, sans-serif",
  fontSize: 14,
  fontWeight: 400,
  lineHeight: 1.65,
  color: "rgba(67,67,43,0.7)",
};
const BODY_SMALL_STYLE = {
  fontFamily: inter,
  fontSize: 12.5,
  color: "rgba(67,67,43,0.62)",
  lineHeight: 1.65,
};
const READ_ZONE_LABEL_STYLE = {
  fontFamily: inter,
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
  color: "#888078",
};
const READ_BODY_STYLE = {
  margin: 0,
  fontFamily: inter,
  fontSize: 12.5,
  color: "rgba(67,67,43,0.66)",
  lineHeight: 1.76,
};
const READ_HEADLINE_STYLE = {
  fontFamily: sohne,
  fontSize: 20,
  fontWeight: 700,
  lineHeight: 1.3,
  color: "#191919",
  letterSpacing: "-0.01em",
  width: "100%",
};

// ── Types ──────────────────────────────────────────────────────
interface CollectionPiece {
  id: string;
  collection_name?: string | null;
  brand_profile_id?: string | null;
  piece_name: string | null;
  score: number | null;
  dimensions: Record<string, number> | null;
  collection_role: string | null;
  category: string | null;
  material_id?: string | null;
  previous_material_id?: string | null;
  silhouette: string | null;
  aesthetic_matched_id: string | null;
  aesthetic_input?: string | null;
  season?: string | null;
  aesthetic_inflection: string | null;
  construction_tier: string | null;
  construction_tier_override?: boolean | null;
  target_msrp?: number | null;
  execution_notes?: string | null;
  agent_versions?: {
    saved_piece_name?: string | null;
    saved_piece_expression?: string | null;
    selected_piece_image?: string | null;
    [key: string]: unknown;
  } | null;
}

interface AestheticDataEntry {
  id?: string;
  name: string;
  keywords?: string[];
  seen_in?: string[];
  risk_factors?: string[];
  trend_velocity?: string;
  saturation_score?: number;
  key_pieces?: Record<string, KeyPiece[]>;
  palette_options?: Array<{ id: string; name: string }>;
}

interface BrandProfileRow {
  brand_name: string | null;
  keywords: string[] | null;
  price_tier: string | null;
  target_margin: number | null;
  tension_context: string | null;
}

interface CollectionContextRow {
  collection_aesthetic?: string | null;
  aesthetic_inflection?: string | null;
  aesthetic_matched_id?: string | null;
  mood_board_images?: string[] | null;
  silhouette?: string | null;
  season?: string | null;
  agent_versions?: Record<string, unknown> | null;
}

type CategoriesData = { categories: Array<{ id: string; name: string }> };
type SubcategoryEntry = { id: string; name: string };
type CollectionLanguageState = "strong" | "emerging" | "missing";
type SignalExpression = {
  label: string;
  state: CollectionLanguageState;
  hits: number;
  coverage: number;
};

type StartingPointPurpose = "language-gap" | "role-balance" | "execution-risk";

type StartingPointSuggestion = {
  archetype: string;
  adapted_title: string;
  intent: string;
  role: CollectionRoleId;
  strategicRole: PieceStrategicRole;
  reasonTags: string[];
  rank: number;
  shortRationale: string;
  adaptation_summary: string;
  description: string;
  original_label: string;
  version_label: string;
  sourcePiece: KeyPiece;
};

type SuggestedPiece = StartingPointSuggestion;

type CustomPieceRoleLabel = "Hero" | "Volume Driver" | "Core Evolution" | "Directional Signal";

type CustomPieceRefinement = {
  read: string;
  refined_expression: string;
  role: CustomPieceRoleLabel;
  category: string;
  subcategory: string;
};

const PIECE_ROLE_OPTIONS: Array<{
  id: CollectionRoleId;
  label: string;
  description: string;
}> = [
  {
    id: "hero",
    label: "Hero",
    description: "Statement piece that defines the collection",
  },
  {
    id: "volume-driver",
    label: "Volume Driver",
    description: "Core revenue piece with broad appeal",
  },
  {
    id: "core-evolution",
    label: "Core Evolution",
    description: "Refines and reinforces what the brand already owns",
  },
  {
    id: "directional",
    label: "Directional Signal",
    description: "Pushes the edge — builds forward identity",
  },
];

function getPieceRoleLabel(role: CollectionRoleId) {
  return PIECE_ROLE_OPTIONS.find((option) => option.id === role)?.label ?? role;
}

function mapRoleLabelToId(role: CustomPieceRoleLabel): CollectionRoleId {
  if (role === "Hero") return "hero";
  if (role === "Volume Driver") return "volume-driver";
  if (role === "Directional Signal") return "directional";
  return "core-evolution";
}

function parseStoredStringArray(value: string | null | undefined) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function parseStoredChipSelection(value: string | null | undefined) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as { activatedChips?: Array<{ label?: string | null }> } | null;
    if (!parsed || typeof parsed !== "object") return null;

    const activatedChips = Array.isArray(parsed.activatedChips)
      ? parsed.activatedChips
          .map((chip) => (typeof chip?.label === "string" ? chip.label.trim() : ""))
          .filter(Boolean)
          .map((label) => ({ label }))
      : undefined;

    return { activatedChips };
  } catch {
    return null;
  }
}

function extractRoleSentence(value: string, keyword: string) {
  const sentences = value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return sentences.find((sentence) => sentence.toLowerCase().includes(keyword)) ?? value.trim();
}

function inferRoleFromAskMukoResponse(value: string | null): { role: CollectionRoleId; rationale: string } | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase();
  if (normalized.includes("volume driver")) {
    return { role: "volume-driver", rationale: extractRoleSentence(trimmed, "volume driver") };
  }
  if (normalized.includes("core evolution")) {
    return { role: "core-evolution", rationale: extractRoleSentence(trimmed, "core evolution") };
  }
  if (normalized.includes("directional signal")) {
    return { role: "directional", rationale: extractRoleSentence(trimmed, "directional signal") };
  }
  if (normalized.includes("directional")) {
    return { role: "directional", rationale: extractRoleSentence(trimmed, "directional") };
  }
  if (normalized.includes("hero")) {
    return { role: "hero", rationale: extractRoleSentence(trimmed, "hero") };
  }

  return null;
}

function buildSuggestedRoleRationale(suggestion: StartingPointSuggestion) {
  return (
    suggestion.description?.trim() ||
    suggestion.shortRationale?.trim() ||
    `Recommended by Muko to fill a ${getPieceRoleLabel(suggestion.role)} gap in the collection assortment.`
  );
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDirectionLabel(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized || normalized === "—") return "—";
  return toTitleCase(normalized.replace(/[-_]+/g, " "));
}

function getCategoryLabel(categories: Array<{ id: string; name: string }>, categoryId: string) {
  return categories.find((entry) => entry.id === categoryId)?.name ?? toTitleCase(categoryId.replace(/[-_]+/g, " "));
}

function getSubcategoryLabel(
  subcategories: Record<string, SubcategoryEntry[]>,
  categoryId: string,
  subcategoryId: string
) {
  const normalizedSubcategoryId = normalizeSpecSubcategoryId(subcategoryId) ?? subcategoryId;
  return (
    subcategories[categoryId]?.find((entry) => entry.id === normalizedSubcategoryId)?.name ??
    toTitleCase(subcategoryId.replace(/[-_]+/g, " "))
  );
}

function getStrategySliderLabel(value: number, labels: [string, string, string]): string {
  if (value <= 30) return labels[0];
  if (value <= 69) return labels[1];
  return labels[2];
}

const CHIP_SIGNAL_LEXICON: Record<string, string[]> = {
  tailored: ["tailored", "tailoring", "blazer", "trouser", "trousers", "coat", "structured", "sharp"],
  structure: ["structure", "structured", "tailored", "precise", "clean", "coat", "blazer", "seamed"],
  soft: ["soft", "supple", "gentle", "knit", "knitted", "relaxed", "ease"],
  precision: ["precision", "precise", "clean", "refined", "sharp", "exact"],
  fluid: ["fluid", "drape", "draped", "flow", "flowing", "ease", "skirt", "dress", "blouse"],
  contrast: ["contrast", "offset", "balance", "tension", "mix", "juxtaposition", "layered"],
  elevated: ["elevated", "refined", "polished", "luxury", "premium", "considered"],
  utility: ["utility", "cargo", "pocket", "workwear", "functional", "jacket", "outerwear"],
  modern: ["modern", "clean", "minimal", "refined", "sharp"],
  craft: ["craft", "textured", "worked", "artisan", "hand", "woven"],
  quiet: ["quiet", "subtle", "clean", "restrained", "minimal"],
  polish: ["polish", "polished", "refined", "finish", "clean"],
};

const STOP_WORDS = new Set(["and", "the", "of", "with", "for"]);
const materialNameById = new Map(
  (materialsData as Array<{ id: string; name: string }>).map((material) => [material.id, material.name])
);

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenizeChipLabel(label: string) {
  const roots = normalizeToken(label)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
  return Array.from(
    new Set(
      roots.flatMap((root) => [root, ...(CHIP_SIGNAL_LEXICON[root] ?? [])])
    )
  );
}

function buildPieceCorpus(piece: CollectionPiece) {
  return normalizeToken(
    [
      getDisplayPieceName(piece),
      piece.category,
      piece.silhouette,
      piece.aesthetic_inflection,
      piece.collection_role,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function getDisplayPieceName(piece: Pick<CollectionPiece, "piece_name" | "category" | "silhouette">) {
  return (
    piece.piece_name?.trim()
    || piece.silhouette?.trim()
    || piece.category?.trim()
    || "Untitled Piece"
  );
}

function getDisplayPieceExpression(piece: Pick<CollectionPiece, "agent_versions">) {
  return piece.agent_versions?.saved_piece_expression?.trim() || null;
}

function getDisplayPieceImage(piece: Pick<CollectionPiece, "piece_name" | "category" | "silhouette" | "agent_versions">) {
  return resolveSelectedPieceImage({
    storedImageRaw: piece.agent_versions?.selected_piece_image ?? null,
    pieceName: getDisplayPieceName(piece),
    category: piece.category,
    silhouette: piece.silhouette,
  });
}

function getDisplayPieceMaterial(piece: Pick<CollectionPiece, "material_id">) {
  const materialId = piece.material_id?.trim();
  if (!materialId) return null;
  return materialNameById.get(materialId) ?? toTitleCase(materialId.replace(/[-_]+/g, " "));
}

function getDisplayPieceRole(piece: Pick<CollectionPiece, "collection_role">) {
  const role = piece.collection_role?.trim();
  if (!role) return null;
  return getPieceRoleLabel(role as CollectionRoleId);
}

function getDisplayPieceRoleId(piece: Pick<CollectionPiece, "collection_role">): CollectionRoleId | null {
  const role = piece.collection_role?.trim();
  if (
    role === "hero"
    || role === "volume-driver"
    || role === "core-evolution"
    || role === "directional"
  ) {
    return role;
  }
  return null;
}

function getDisplayPieceRoleBadgeStyles(role: CollectionRoleId): React.CSSProperties {
  if (role === "hero") return { background: "#eef2e6", color: "#5a6e2a" };
  if (role === "volume-driver") return { background: "#e8eef2", color: "#2e4a5a" };
  if (role === "core-evolution") return { background: "#f4ecdf", color: "#7a5d2a" };
  return { background: "#f2e9ee", color: "#7a4a5d" };
}

function buildSuggestedPieceCorpus(piece: KeyPiece) {
  return normalizeToken(
    [
      piece.item,
      piece.category,
      piece.type,
      piece.note,
      ...(piece.implied_chips ?? []),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function evaluateSignalExpression(
  chipLabels: string[],
  pieces: CollectionPiece[]
): SignalExpression[] {
  if (chipLabels.length === 0) return [];

  const pieceCorpora = pieces.map(buildPieceCorpus);

  return chipLabels.map((label) => {
    const terms = tokenizeChipLabel(label);
    const hitCount = pieceCorpora.reduce((count, corpus) => {
      const hasMatch = terms.some((term) => corpus.includes(term));
      return count + (hasMatch ? 1 : 0);
    }, 0);
    const coverage = pieces.length > 0 ? hitCount / pieces.length : 0;

    let state: CollectionLanguageState = "missing";
    if (pieces.length > 0) {
      if (hitCount >= 2 || coverage >= 0.45) state = "strong";
      else if (hitCount >= 1 || coverage > 0) state = "emerging";
    }

    return { label, state, hits: hitCount, coverage };
  });
}

function getRoleSuggestion(
  piece: KeyPiece,
  roleCounts: Record<CollectionRoleId, number>
): { role: CollectionRoleId; rationale: string } {
  if (roleCounts.hero === 0 && piece.signal === "ascending") {
    return {
      role: "hero",
      rationale: "Carries enough signal to give the collection a clear focal point early",
    };
  }

  if (piece.signal === "high-volume") {
    return {
      role: "volume-driver",
      rationale: "Balances your structure and avoids over-indexing on statement pieces",
    };
  }

  if (roleCounts["core-evolution"] === 0 && (roleCounts.hero > 0 || roleCounts.directional > 0)) {
    return {
      role: "core-evolution",
      rationale: "Grounds the assortment in something recognizable before the range drifts too far out",
    };
  }

  if (piece.custom || piece.signal === "emerging") {
    return {
      role: "directional",
      rationale: "Introduces forward energy without forcing the whole assortment to carry it",
    };
  }

  if (roleCounts["volume-driver"] === 0) {
    return {
      role: "volume-driver",
      rationale: "Balances your structure and avoids over-indexing on statement pieces",
    };
  }

  return {
    role: "core-evolution",
    rationale: "Strengthens continuity so the collection reads as built, not just assembled",
  };
}

function inferCustomRoleSuggestion(
  pieceName: string,
  category: string,
  roleCounts: Record<CollectionRoleId, number>
): { role: CollectionRoleId; rationale: string } | null {
  const normalizedName = pieceName.trim();
  const normalizedCategory = category.trim();

  if (!normalizedName && !normalizedCategory) return null;

  const corpus = normalizeToken([normalizedName, normalizedCategory].filter(Boolean).join(" "));
  const scores: Record<CollectionRoleId, number> = {
    hero: 0,
    directional: 0,
    "core-evolution": 0,
    "volume-driver": 0,
  };

  const applyScore = (role: CollectionRoleId, weight: number, terms: string[]) => {
    if (terms.some((term) => corpus.includes(term))) {
      scores[role] += weight;
    }
  };

  applyScore("hero", 3, ["coat", "outerwear", "dress", "gown", "cape", "statement", "special"]);
  applyScore("directional", 3, ["asymmetric", "sculptural", "deconstructed", "sheer", "mesh", "cutout", "oversized", "experimental", "draped"]);
  applyScore("volume-driver", 3, ["tee", "t shirt", "t-shirt", "tank", "shirt", "sweater", "knit", "pant", "trouser", "jean", "denim", "everyday", "easy"]);
  applyScore("core-evolution", 3, ["blazer", "cardigan", "tailored", "classic", "updated", "refined", "core", "staple", "reworked"]);

  applyScore("hero", 2, ["jacket", "trench", "column"]);
  applyScore("directional", 2, ["bias", "volume", "layered", "fringe", "raw", "twist"]);
  applyScore("volume-driver", 2, ["skirt", "mini", "maxi", "short", "poplin"]);
  applyScore("core-evolution", 2, ["shirting", "wool", "uniform", "essential"]);

  if (normalizedName && !normalizedCategory) scores.directional += 1;
  if (normalizedCategory) scores["core-evolution"] += 1;

  if (roleCounts["volume-driver"] === 0) scores["volume-driver"] += 0.5;
  if (roleCounts["core-evolution"] === 0) scores["core-evolution"] += 0.5;
  if (roleCounts.hero === 0) scores.hero += 0.25;

  const rankedRoles = (Object.entries(scores) as Array<[CollectionRoleId, number]>).sort((a, b) => b[1] - a[1]);
  const [topRole, topScore] = rankedRoles[0];

  if (topScore <= 0) return null;

  const subject = normalizedName || normalizedCategory;
  const subjectLabel = subject ? `"${subject}"` : "this piece";

  if (topRole === "hero") {
    return {
      role: "hero",
      rationale: `${subjectLabel} reads like a focal piece that can set the collection's attitude early.`,
    };
  }

  if (topRole === "directional") {
    return {
      role: "directional",
      rationale: `${subjectLabel} feels like a forward move, so it should push the collection's edge rather than stabilize it.`,
    };
  }

  if (topRole === "volume-driver") {
    return {
      role: "volume-driver",
      rationale: `${subjectLabel} reads as a repeatable piece that can carry the line beyond a single statement.`,
    };
  }

  return {
    role: "core-evolution",
    rationale: `${subjectLabel} feels like a familiar shape you can sharpen into the collection's language.`,
  };
}

function getPriorityRole(roleCounts: Record<CollectionRoleId, number>, totalConfirmed: number): CollectionRoleId {
  if (totalConfirmed === 0) return "core-evolution";
  if (roleCounts["core-evolution"] === 0) return "core-evolution";
  if (roleCounts["volume-driver"] === 0) return "volume-driver";
  if (roleCounts.hero === 0) return "hero";
  if (roleCounts.directional === 0) return "directional";

  return (Object.entries(roleCounts).sort((a, b) => a[1] - b[1])[0]?.[0] as CollectionRoleId) ?? "core-evolution";
}

function buildAdaptationVocabulary({
  purpose,
  targetCollectionLanguage,
  targetExpressionSignal,
  complexityBias,
  directionText,
  strongestCollectionLanguage,
  strongestExpressionSignal,
}: {
  purpose: StartingPointPurpose;
  targetCollectionLanguage?: string;
  targetExpressionSignal?: string;
  complexityBias: "reduce" | "steady";
  directionText: string;
  strongestCollectionLanguage?: string;
  strongestExpressionSignal?: string;
}) {
  const directionCorpus = normalizeToken(directionText);
  const languageCorpus = normalizeToken(targetCollectionLanguage ?? strongestCollectionLanguage ?? "");
  const expressionCorpus = normalizeToken(targetExpressionSignal ?? strongestExpressionSignal ?? "");
  const hasLanguage = (value: string) => languageCorpus.includes(value) || directionCorpus.includes(value);
  const hasExpression = (value: string) => expressionCorpus.includes(value) || directionCorpus.includes(value);

  if (purpose === "execution-risk" && complexityBias === "reduce") {
    return {
      titleModifier: "reduced detailing",
      versionLabel: "simplified seams, restrained finish, easier execution",
      descriptionLead: "A cleaner execution protects the collection language while keeping the expression cues controlled.",
    };
  }

  if (hasExpression("fluid") || hasExpression("drape")) {
    if (hasLanguage("column") || hasLanguage("structured") || hasLanguage("tailored")) {
      return {
        titleModifier: "controlled drape",
        versionLabel: "fluid movement held inside a columnar, restrained frame",
        descriptionLead: "Softened movement introduces fluidity while maintaining the collection's structural discipline.",
      };
    }

    return {
      titleModifier: "softened movement",
      versionLabel: hasLanguage("tonal") || hasLanguage("quiet") ? "fluid movement with tonal restraint" : "controlled drape with quieter movement",
      descriptionLead: "Fluidity comes through the piece without letting the collection lose its restraint.",
    };
  }

  if (hasExpression("contrast") || hasExpression("lustre") || hasExpression("surface") || hasExpression("finish")) {
    if (hasLanguage("powdered") || hasLanguage("neutral") || hasLanguage("muted") || hasLanguage("tonal")) {
      return {
        titleModifier: "subtle surface tension",
        versionLabel: "matte-lustre contrast inside a muted tonal range",
        descriptionLead: "Subtle surface contrast gives the piece dimension without breaking the collection's muted tonal logic.",
      };
    }

    return {
      titleModifier: "controlled contrast",
      versionLabel: "finish contrast used sparingly, with a calmer overall read",
      descriptionLead: "Contrast is introduced through finish and surface rather than louder styling moves.",
    };
  }

  if (hasExpression("softened tailoring") || hasExpression("soft") || hasExpression("tailoring")) {
    if (hasLanguage("column") || hasLanguage("structure") || hasLanguage("tailored")) {
      return {
        titleModifier: "eased tailoring",
        versionLabel: "tailored restraint with a softened edge",
        descriptionLead: "The piece preserves the collection's line while letting softness come through the build.",
      };
    }

    return {
      titleModifier: "softened structure",
      versionLabel: "softer handfeel, eased line, restrained tailoring",
      descriptionLead: "A softer build shifts the expression without losing the collection's underlying posture.",
    };
  }

  if (hasLanguage("tailored") || hasLanguage("structure") || hasLanguage("precision")) {
    return {
      titleModifier: complexityBias === "reduce" ? "cleaner construction" : "eased proportion",
      versionLabel: complexityBias === "reduce" ? "cleaner lines, simplified detailing, sharper read" : "eased proportion with a sharper line",
      descriptionLead: "The core silhouette stays tailored, but the execution shifts enough to keep the expression from feeling static.",
    };
  }

  if (hasLanguage("soft")) {
    return {
      titleModifier: "softened structure",
      versionLabel: "softer handfeel, eased line, tonal restraint",
      descriptionLead: "A softer hand and calmer finish pull the archetype closer to the collection's tone.",
    };
  }

  if (hasLanguage("utility")) {
    return {
      titleModifier: "cleaner utility",
      versionLabel: "refined utility, stripped-back detailing, more polish",
      descriptionLead: "Utility remains the base idea, but the detailing is edited down so it feels considered rather than literal.",
    };
  }

  return {
    titleModifier: complexityBias === "reduce" ? "restrained finish" : "eased proportion",
    versionLabel: complexityBias === "reduce" ? "simplified seams, restrained finish, commercial posture" : "eased line, clearer expression, more considered posture",
    descriptionLead: "The archetype stays recognizable, but the finish is tuned to both the collection language and the way it needs to come alive.",
  };
}

function selectBestStartingPointCandidate({
  candidates,
  usedItems,
  purpose,
  targetChip,
  roleCounts,
  priorityRole,
  complexityBias,
}: {
  candidates: KeyPiece[];
  usedItems: Set<string>;
  purpose: StartingPointPurpose;
  targetChip?: string;
  roleCounts: Record<CollectionRoleId, number>;
  priorityRole: CollectionRoleId;
  complexityBias: "reduce" | "steady";
}) {
  const terms = targetChip ? tokenizeChipLabel(targetChip) : [];

  const ranked = candidates
    .filter((piece) => !usedItems.has(piece.item))
    .map((piece) => {
      const corpus = buildSuggestedPieceCorpus(piece);
      const roleSuggestion = getRoleSuggestion(piece, roleCounts);
      let score = 0;

      if (terms.length > 0 && terms.some((term) => corpus.includes(term))) score += 5;
      if (purpose === "role-balance" && roleSuggestion.role === priorityRole) score += 4;
      if (purpose === "execution-risk" && complexityBias === "reduce") {
        if (piece.signal === "high-volume") score += 3;
        if (piece.category === "tops" || piece.category === "bottoms") score += 2;
      }
      if (purpose === "language-gap" && piece.signal === "ascending") score += 2;
      if (purpose === "role-balance" && piece.signal === "high-volume") score += 1;
      if (purpose === "execution-risk" && piece.signal === "emerging") score -= 1;

      return { piece, roleSuggestion, score };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0] ?? null;
}

function buildStartingPointSuggestion({
  piece,
  purpose,
  targetCollectionLanguage,
  targetExpressionSignal,
  role,
  rank,
  complexityBias,
  directionText,
  strongestCollectionLanguage,
  strongestExpressionSignal,
}: {
  piece: KeyPiece;
  purpose: StartingPointPurpose;
  targetCollectionLanguage?: string;
  targetExpressionSignal?: string;
  role: CollectionRoleId;
  rank: number;
  complexityBias: "reduce" | "steady";
  directionText: string;
  strongestCollectionLanguage?: string;
  strongestExpressionSignal?: string;
}): StartingPointSuggestion {
  const adaptation = buildAdaptationVocabulary({
    purpose,
    targetCollectionLanguage,
    targetExpressionSignal,
    complexityBias,
    directionText,
    strongestCollectionLanguage,
    strongestExpressionSignal,
  });

  const intent =
    purpose === "language-gap" && (targetCollectionLanguage || targetExpressionSignal)
      ? `To express ${targetExpressionSignal ?? targetCollectionLanguage}`
      : purpose === "role-balance"
      ? role === "core-evolution"
        ? "To stabilize your core"
        : role === "volume-driver"
        ? "To broaden the line"
        : role === "hero"
        ? "To establish a focal point"
        : "To extend the direction"
      : complexityBias === "reduce"
      ? "To reduce complexity"
      : "To extend the direction";

  const description =
    purpose === "language-gap" && (targetCollectionLanguage || targetExpressionSignal)
      ? `${adaptation.descriptionLead} It helps ${(targetExpressionSignal ?? targetCollectionLanguage) as string} register through ${targetCollectionLanguage ?? "the collection language"} rather than sit as an abstract note.`
      : purpose === "role-balance"
      ? `${adaptation.descriptionLead} It gives the assortment a clearer ${getPieceRoleLabel(role).toLowerCase()} position.`
      : `${adaptation.descriptionLead} It protects execution without flattening the collection's point of view.`;

  const strategicRole = assignStrategicRole({
    piece,
    collectionRole: role,
    purpose,
    complexityBias,
  });
  const reasonTags = buildStrategicReasonTags({
    piece,
    strategicRole,
    purpose,
    collectionRole: role,
    complexityBias,
    targetCollectionLanguage,
    targetExpressionSignal,
  });
  const shortRationale = buildDeterministicPieceMicrocopy({
    role: strategicRole,
    reasonTags,
  });

  return {
    archetype: piece.item.toLowerCase().replace(/\s+/g, "_"),
    adapted_title: `${piece.item} with ${adaptation.titleModifier}`,
    intent,
    role,
    strategicRole,
    reasonTags,
    rank,
    shortRationale,
    adaptation_summary: adaptation.descriptionLead,
    description,
    original_label: piece.item,
    version_label: adaptation.versionLabel,
    sourcePiece: piece,
  };
}

// ── Placeholder SVG ────────────────────────────────────────────
function PiecePlaceholder({ category }: { category: string | null }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 60 80" fill="none">
      <rect x="4" y="4" width="52" height="72" rx="6" fill="#E8E3D6" />
      <path d="M14 22 Q30 14 46 22 L48 72 H12 Z" fill="#C8C2BA" opacity="0.7" />
      {category && (
        <text
          x="30"
          y="52"
          textAnchor="middle"
          fontSize="6"
          fill={MUTED}
          fontFamily="system-ui, sans-serif"
        >
          {category}
        </text>
      )}
    </svg>
  );
}

// ── Flat illustration wrapper ──────────────────────────────────
function PieceFlat({
  type,
  signal,
  category,
  pieceName,
  size = 65,
}: {
  type: string | null;
  signal: string | null;
  category: string | null;
  pieceName?: string | null;
  size?: number;
}) {
  const resolvedType = resolvePieceImageType({ type, pieceName, category });
  if (resolvedType) {
    const result = getFlatForPiece(resolvedType, signal);
    if (result) {
      const { Flat, color } = result as { Flat: React.ComponentType<{ color: string }>; color: string };
      return (
        <div style={{ width: size * 0.77, height: size }}>
          <Flat color={color} />
        </div>
      );
    }
  }
  return <PiecePlaceholder category={category} />;
}

// ── Confirmed piece card ───────────────────────────────────────
function ConfirmedPieceCard({
  piece,
  onClick,
  onRename,
  onDelete,
}: {
  piece: CollectionPiece;
  onClick: () => void;
  onRename: (nextName: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const score = piece.score;
  const scoreDotBg =
    score === null ? BG2 : score >= 70 ? "#EDF5EE" : score >= 50 ? "#FBF3EA" : "#FAECE7";
  const scoreDotColor =
    score === null ? MUTED : score >= 70 ? GREEN : score >= 50 ? AMBER : RED;
  const pieceRole = getDisplayPieceRoleId(piece);
  const roleLabel = pieceRole ? getDisplayPieceRole(piece) : null;
  const isExpanded = hovered || focused;
  const detailTokens = [
    getDisplayPieceMaterial(piece),
    [piece.category, piece.silhouette].filter(Boolean).join(" • "),
  ].filter(Boolean) as string[];
  const expression = getDisplayPieceExpression(piece);
  const pieceName = getDisplayPieceName(piece);
  const pieceImage = getDisplayPieceImage(piece);

  const beginRename = () => {
    setDraftName(pieceName);
    setIsEditingName(true);
    setMenuOpen(false);
    setIsConfirmingDelete(false);
  };

  const cancelRename = () => {
    setDraftName(pieceName);
    setIsEditingName(false);
    setIsSavingName(false);
  };

  const confirmRename = async () => {
    const nextName = draftName.trim();
    if (!nextName || nextName === pieceName || isSavingName) {
      if (!nextName) {
        setDraftName(pieceName);
      }
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      await onRename(nextName);
      setIsEditingName(false);
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div
      onClick={() => {
        if (isEditingName) return;
        onClick();
      }}
      onKeyDown={(e) => {
        if (isEditingName) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setMenuOpen(false);
        setIsConfirmingDelete(false);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      role="button"
      tabIndex={0}
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: "white",
        border: hovered ? "1px solid #C4BDB5" : `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 0,
        textAlign: "left",
        cursor: "pointer",
        boxShadow: hovered ? "0 6px 20px rgba(0,0,0,0.07)" : "none",
        transform: hovered ? "translateY(-1px)" : "none",
        transition: "border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease",
        overflow: "hidden",
      }}
    >
      {/* Illustration area */}
      <div
        style={{
          height: 120,
          background: BG2,
          borderBottom: `1px solid ${BORDER}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <PieceFlat
          type={pieceImage?.pieceType ?? null}
          signal={pieceImage?.signal ?? null}
          category={piece.category}
          pieceName={pieceName}
          size={65}
        />
        {/* Score pill */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: scoreDotBg,
            color: scoreDotColor,
            fontSize: 10,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: inter,
          }}
        >
          {score !== null ? score : "—"}
        </div>

        {(hovered || menuOpen) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 26,
              height: 26,
              borderRadius: 8,
              background: "rgba(255,255,255,0.92)",
              border: "0.5px solid rgba(67,67,43,0.14)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              color: "rgba(67,67,43,0.55)",
              zIndex: 2,
              letterSpacing: "0.04em",
              lineHeight: 1,
              padding: 0,
            }}
            title="More options"
            aria-label="More options"
          >
            ···
          </button>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: "14px 18px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          {isEditingName ? (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flex: 1,
                minWidth: 0,
                padding: "4px 6px",
                borderRadius: 8,
                background: "#F7F3EE",
                border: "1px solid rgba(196,123,107,0.22)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.45)",
              }}
            >
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={() => setTimeout(() => cancelRename(), 150)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void confirmRename();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelRename();
                  }
                }}
                autoFocus
                aria-label="Rename piece"
                disabled={isSavingName}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontFamily: sohne,
                  fontWeight: 500,
                  fontSize: 15,
                  color: TEXT,
                  lineHeight: 1.24,
                  letterSpacing: "-0.02em",
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void confirmRename();
                }}
                disabled={isSavingName}
                aria-label="Confirm piece rename"
                title="Confirm rename"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  border: "none",
                  background: isSavingName ? "rgba(168,180,117,0.55)" : CHARTREUSE,
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isSavingName ? "default" : "pointer",
                  flexShrink: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ✓
              </button>
            </div>
          ) : (
            <div
              style={{
                fontFamily: sohne,
                fontWeight: 500,
                fontSize: 15,
                color: TEXT,
                lineHeight: 1.24,
                letterSpacing: "-0.02em",
              }}
            >
              {pieceName}
            </div>
          )}
          {pieceRole && roleLabel ? (
            <span
              style={{
                ...getDisplayPieceRoleBadgeStyles(pieceRole),
                fontFamily: inter,
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                borderRadius: 20,
                padding: "2px 8px",
                whiteSpace: "nowrap",
                flexShrink: 0,
                lineHeight: 1.6,
              }}
            >
              {roleLabel}
            </span>
          ) : null}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateRows: isExpanded ? "1fr" : "0fr",
            opacity: isExpanded ? 1 : 0,
            marginTop: isExpanded ? 10 : 0,
            transition: "grid-template-rows 160ms ease, opacity 140ms ease, margin-top 160ms ease",
          }}
        >
          <div style={{ overflow: "hidden" }}>
            {expression ? (
              <div
                style={{
                  ...BODY_SMALL_STYLE,
                  marginBottom: detailTokens.length > 0 ? 10 : 0,
                }}
              >
                {expression}
              </div>
            ) : null}
            {detailTokens.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {detailTokens.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontFamily: inter,
                      fontSize: 10,
                      fontWeight: 400,
                      border: "0.5px solid #E8E3D6",
                      color: "#8B837B",
                      borderRadius: 20,
                      padding: "2px 7px",
                      lineHeight: 1.5,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : !expression ? (
              <div style={BODY_SMALL_STYLE}>In development</div>
            ) : null}
          </div>
        </div>
      </div>

      {menuOpen && (
        <div
          style={{
            position: "absolute",
            top: 42,
            right: 12,
            background: "#FFFFFF",
            border: "1px solid rgba(67,67,43,0.1)",
            borderRadius: 8,
            boxShadow: "0 6px 20px rgba(25,25,25,0.1)",
            zIndex: 20,
            overflow: "hidden",
            minWidth: 140,
          }}
        >
          {isConfirmingDelete ? (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: "10px 12px 12px",
                display: "grid",
                gap: 10,
                minWidth: 188,
              }}
            >
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#6F4A43",
                  lineHeight: 1.4,
                }}
              >
                Delete this piece?
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsConfirmingDelete(false);
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(67,67,43,0.12)",
                    background: "#FFFFFF",
                    color: "#5F5953",
                    fontFamily: inter,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await onDelete();
                    setMenuOpen(false);
                    setIsConfirmingDelete(false);
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: "#C47B6B",
                    color: "#FFFFFF",
                    fontFamily: inter,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  beginRename();
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px 14px",
                  textAlign: "left",
                  fontFamily: inter,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#43432B",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 120ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#F7F3EE";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Rename piece
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsConfirmingDelete(true);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px 14px",
                  textAlign: "left",
                  fontFamily: inter,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#C47B6B",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 120ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#FAF0EF";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Delete piece
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Suggested piece card ───────────────────────────────────────
function SuggestedPieceCard({
  piece,
  microcopy,
  onBuild,
}: {
  piece: StartingPointSuggestion;
  microcopy: string;
  onBuild: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onBuild}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: "white",
        border: hovered ? "1px solid #C4BDB5" : `1px solid ${BORDER}`,
        borderRadius: 14,
        overflow: "hidden",
        cursor: "pointer",
        boxShadow: hovered ? "0 6px 20px rgba(0,0,0,0.07)" : "none",
        transform: hovered ? "translateY(-1px)" : "none",
        transition: "border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease",
      }}
    >
      {/* Illustration area */}
      <div
        style={{
          height: 120,
          background: BG2,
          borderBottom: `1px solid ${BORDER}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ opacity: 0.45 }}>
          <PieceFlat
            type={piece.sourcePiece.type}
            signal={piece.sourcePiece.signal}
            category={piece.sourcePiece.category}
            pieceName={piece.sourcePiece.item}
            size={65}
          />
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: "16px 18px 18px" }}>
        <div
          style={{
            ...EYEBROW_STYLE,
            marginBottom: 6,
            lineHeight: 1.3,
          }}
        >
          {getStrategicRoleLabel(piece.strategicRole)}
        </div>
        <div
          style={{
            ...SECTION_TITLE_STYLE,
            fontSize: 18,
            color: TEXT,
            marginBottom: 8,
            lineHeight: 1.24,
          }}
        >
          {piece.adapted_title}
        </div>
        <div
          style={{
            ...BODY_SMALL_STYLE,
            marginBottom: 14,
            color: "rgba(67,67,43,0.62)",
          }}
        >
          {microcopy}
        </div>

        {/* Build this piece CTA */}
        <div
          onClick={onBuild}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 13,
            borderTop: `1px solid ${BG2}`,
            fontFamily: inter,
            fontSize: 11.5,
            fontWeight: 500,
            color: CHARTREUSE,
            cursor: "pointer",
            letterSpacing: "0.02em",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <span>Build this piece</span>
          <span>→</span>
        </div>
      </div>
    </div>
  );
}

function InlineLoadingState({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 0",
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          flexShrink: 0,
          borderRadius: "50%",
          border: "2px solid rgba(67,67,43,0.14)",
          borderTopColor: "rgba(67,67,43,0.58)",
          animation: "mukoSpinnerRotate 0.8s linear infinite",
        }}
      />
      <div
        style={{
          fontFamily: inter,
          fontSize: 13,
          fontWeight: 500,
          color: "rgba(67,67,43,0.62)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div
      style={{
        position: "fixed",
        right: 36,
        bottom: 88,
        background: "#191919",
        color: "#FFFFFF",
        borderRadius: 8,
        padding: "10px 14px",
        fontFamily: inter,
        fontSize: 12,
        zIndex: 60,
        boxShadow: "0 8px 24px rgba(25,25,25,0.16)",
      }}
    >
      {message}
    </div>
  );
}

// ── Confirm Drawer ─────────────────────────────────────────────
function ConfirmDrawer({
  piece,
  pieceName,
  category,
  subcategory,
  categories,
  allSubcategories,
  selectedRole,
  suggestion,
  customProposal,
  customFinalExpression,
  customRefinement,
  customRefinementState,
  onPieceNameChange,
  onCategoryChange,
  onSubcategoryChange,
  onRoleSelect,
  onCustomProposalChange,
  onCustomFinalExpressionChange,
  onAcceptRefinedExpression,
  onContinueWithOriginal,
  onStartBuilding,
  onCancel,
  pieceTargetMsrp,
  onPieceTargetMsrpChange,
  showPieceTargetMsrpError,
  roleLocked,
  roleSoftSuggested,
}: {
  piece: KeyPiece;
  pieceName: string;
  category: string;
  subcategory: string;
  categories: Array<{ id: string; name: string }>;
  allSubcategories: Record<string, SubcategoryEntry[]>;
  selectedRole: CollectionRoleId | null;
  suggestion: { role: CollectionRoleId; rationale: string } | null;
  customProposal: string;
  customFinalExpression: string;
  customRefinement: CustomPieceRefinement | null;
  customRefinementState: "idle" | "loading" | "ready";
  onPieceNameChange: (name: string) => void;
  onCategoryChange: (cat: string) => void;
  onSubcategoryChange: (subcategory: string) => void;
  onRoleSelect: (role: CollectionRoleId) => void;
  onCustomProposalChange: (value: string) => void;
  onCustomFinalExpressionChange: (value: string) => void;
  onAcceptRefinedExpression: () => void;
  onContinueWithOriginal: () => void;
  onStartBuilding: () => void;
  onCancel: () => void;
  pieceTargetMsrp: number | null;
  onPieceTargetMsrpChange: (value: number | null) => void;
  showPieceTargetMsrpError: boolean;
  roleLocked: boolean;
  roleSoftSuggested: boolean;
}) {
  const isMarketSignal = piece.signal === "ascending" || piece.signal === "high-volume";
  const fitValue = piece.custom ? "From your direction" : "Translated for your collection";
  const marketValue =
    piece.signal === "high-volume"
      ? "High volume"
      : piece.signal === "emerging" || piece.signal === "ascending"
      ? "Emerging"
      : null;
  const metadataTokens = [piece.custom ? "Custom piece" : "Market archetype", fitValue, marketValue].filter(Boolean);

  const resolvedType = resolvePieceImageType({
    type: subcategory || piece.type,
    pieceName: customProposal.trim() || pieceName.trim() || piece.item,
    category,
  });
  const flatResult = resolvedType
    ? (getFlatForPiece(resolvedType, piece.signal) as {
        Flat: React.ComponentType<{ color: string }>;
        color: string;
      } | null)
    : null;
  const ctaLabel = "Start Building →";
  const finalName = piece.custom ? pieceName.trim() || customProposal.trim() : pieceName.trim() || piece.item;
  const canStart = piece.custom ? Boolean(selectedRole && finalName) : Boolean(selectedRole);
  const hasValidPieceTargetMsrp = pieceTargetMsrp != null && pieceTargetMsrp > 0;
  const canPressStart = piece.custom ? canStart && hasValidPieceTargetMsrp : canStart;
  const [isPieceTypeEditorOpen, setIsPieceTypeEditorOpen] = useState(false);
  const availableSubcategories = category ? allSubcategories[category] ?? [] : [];
  const pieceTypeLabel =
    category && subcategory
      ? `${getCategoryLabel(categories, category)} · ${getSubcategoryLabel(allSubcategories, category, subcategory)}`
      : category
        ? getCategoryLabel(categories, category)
        : "Select piece type";
  const suggestedRole = suggestion ? getPieceRoleLabel(suggestion.role) : null;

  const autoResizeTextarea = (event: React.FormEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    target.style.height = "0px";
    target.style.height = `${Math.min(target.scrollHeight, 220)}px`;
  };

  const hasCustomProposal = Boolean(customProposal.trim());
  const isCustomThinking = piece.custom && hasCustomProposal && customRefinementState === "loading";
  const hasCustomResponse = piece.custom && Boolean(customRefinement);
  const shouldShowCustomRead = piece.custom && hasCustomProposal && (isCustomThinking || hasCustomResponse);
  const customStartReady = Boolean(piece.custom && hasCustomResponse);

  if (piece.custom) {
    return (
      <>
        <style>{`
          @keyframes mukoFadeUp {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes mukoDotPulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0.5; }
            100% { transform: scale(1); opacity: 1; }
          }

          .muko-custom-overlay {
            position: fixed;
            inset: 0;
            background: rgba(25,25,25,0.34);
            z-index: 300;
          }

          .muko-custom-shell {
            position: fixed;
            inset: 0;
            z-index: 400;
            padding: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
          }

          .muko-custom-card {
            width: min(760px, calc(100vw - 32px));
            max-height: min(840px, calc(100vh - 32px));
            overflow-y: auto;
            pointer-events: auto;
          }

          @media (max-width: 720px) {
            .muko-custom-shell {
              padding: 16px;
              align-items: flex-end;
            }

            .muko-custom-card {
              width: 100%;
              max-height: calc(100vh - 20px);
            }
          }
        `}</style>

        <div className="muko-custom-overlay" onClick={onCancel} />

        <div className="muko-custom-shell">
          <div
            className="muko-custom-card"
            style={{
              background: "rgba(252,249,243,0.58)",
              backdropFilter: "blur(48px)",
              WebkitBackdropFilter: "blur(48px)",
              borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.82)",
              boxShadow: "0 24px 64px rgba(50,40,20,0.18)",
              padding: "22px 22px 18px",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 22,
              }}
            >
              <button
                type="button"
                aria-label="Close"
                onClick={onCancel}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  border: "none",
                  background: "rgba(67,67,43,0.07)",
                  color: "#43432B",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>×</span>
              </button>

              <button
                type="button"
                onClick={onStartBuilding}
                disabled={!canPressStart}
                style={{
                  borderRadius: 999,
                  border: "none",
                  background: "#191919",
                  color: "#F5F2EC",
                  padding: "11px 18px",
                  fontFamily: sohne,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  cursor: canPressStart ? "pointer" : "not-allowed",
                  textTransform: "none",
                  opacity: customStartReady ? 1 : 0.35,
                  transition: "opacity 180ms ease",
                }}
              >
                Start building →
              </button>
            </div>

            <div style={{ padding: "8px 6px 0" }}>
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(67,67,43,0.3)",
                  marginBottom: 14,
                }}
              >
                What are you thinking?
              </div>

              <textarea
                value={customProposal}
                onChange={(e) => onCustomProposalChange(e.target.value)}
                onInput={autoResizeTextarea}
                rows={1}
                placeholder="Describe the piece you want to build"
                style={{
                  width: "100%",
                  minHeight: 72,
                  resize: "none",
                  overflow: "hidden",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  fontFamily: sohne,
                  fontSize: 24,
                  fontWeight: 300,
                  letterSpacing: "-0.025em",
                  color: "#1E1C12",
                  lineHeight: 1.16,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 18,
                  marginBottom: shouldShowCustomRead ? 22 : 8,
                }}
              >
                {categories.map((entry) => {
                  const isSelected = category === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) return;
                        onCategoryChange(entry.id);
                        onSubcategoryChange("");
                      }}
                      style={{
                        borderRadius: 999,
                        border: isSelected
                          ? "0.5px solid rgba(67,67,43,0.38)"
                          : "0.5px solid rgba(67,67,43,0.13)",
                        background: isSelected ? "rgba(67,67,43,0.06)" : "transparent",
                        color: "#43432B",
                        padding: "8px 13px",
                        fontFamily: inter,
                        fontSize: 11.5,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      {entry.name}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  overflow: "hidden",
                  maxHeight: shouldShowCustomRead ? 1200 : 0,
                  opacity: shouldShowCustomRead ? 1 : 0,
                  transition: "max-height 400ms ease, opacity 240ms ease",
                }}
              >
                <div
                  style={{
                    borderTop: "0.5px solid rgba(67,67,43,0.08)",
                    paddingTop: 18,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: hasCustomResponse ? 14 : 0,
                    }}
                  >
                    <div
                      aria-hidden
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: "#A97B8F",
                        animation: isCustomThinking ? "mukoDotPulse 0.8s ease-in-out infinite" : "none",
                      }}
                    />
                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "rgba(67,67,43,0.56)",
                      }}
                    >
                      MUKO&apos;S READ
                    </div>
                  </div>

                  <div
                    style={{
                      overflow: "hidden",
                      maxHeight: hasCustomResponse ? 200 : 0,
                      opacity: hasCustomResponse ? 1 : 0,
                      transform: hasCustomResponse ? "translateY(0)" : "translateY(6px)",
                      transition: "max-height 500ms ease, opacity 500ms ease, transform 500ms ease",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 13,
                        color: "#4A4530",
                        lineHeight: 1.8,
                        animation: hasCustomResponse ? "mukoFadeUp 0.5s cubic-bezier(0.4,0,0.2,1)" : "none",
                      }}
                    >
                      {customRefinement?.read}
                    </div>
                  </div>

                  <div
                    style={{
                      overflow: "hidden",
                      maxHeight: hasCustomResponse ? 220 : 0,
                      opacity: hasCustomResponse ? 1 : 0,
                      transform: hasCustomResponse ? "translateY(0)" : "translateY(6px)",
                      transition:
                        "max-height 500ms ease 150ms, opacity 500ms ease 150ms, transform 500ms ease 150ms",
                    }}
                  >
                    <div
                      style={{
                        marginTop: hasCustomResponse ? 14 : 0,
                        fontFamily: inter,
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#1E1C12",
                        lineHeight: 1.8,
                        animation: hasCustomResponse ? "mukoFadeUp 0.5s cubic-bezier(0.4,0,0.2,1) 150ms both" : "none",
                      }}
                    >
                      {customRefinement?.refined_expression}
                    </div>
                  </div>

                  <div
                    style={{
                      overflow: "hidden",
                      maxHeight: hasCustomResponse ? 84 : 0,
                      opacity: hasCustomResponse ? 1 : 0,
                      transform: hasCustomResponse ? "translateY(0)" : "translateY(6px)",
                      transition:
                        "max-height 500ms ease 300ms, opacity 500ms ease 300ms, transform 500ms ease 300ms",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: hasCustomResponse ? 16 : 0,
                        animation: hasCustomResponse ? "mukoFadeUp 0.5s cubic-bezier(0.4,0,0.2,1) 300ms both" : "none",
                      }}
                    >
                      <button
                        type="button"
                        onClick={onAcceptRefinedExpression}
                        style={{
                          borderRadius: 999,
                          background: "#A8B475",
                          border: "none",
                          color: "#43432B",
                          fontFamily: inter,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "8px 14px",
                          cursor: "pointer",
                        }}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={onContinueWithOriginal}
                        style={{
                          borderRadius: 999,
                          background: "transparent",
                          border: "0.5px solid rgba(67,67,43,0.18)",
                          color: "#43432B",
                          fontFamily: inter,
                          fontSize: 11,
                          fontWeight: 500,
                          padding: "8px 14px",
                          cursor: "pointer",
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      overflow: "hidden",
                      maxHeight: hasCustomResponse ? 200 : 0,
                      opacity: hasCustomResponse ? 1 : 0,
                      transition:
                        "max-height 0.5s cubic-bezier(0.4,0,0.2,1) 0.5s, opacity 0.5s ease 0.5s",
                    }}
                  >
                    <div
                      role="radiogroup"
                      aria-label="Piece role"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 5,
                        marginTop: hasCustomResponse ? 18 : 0,
                      }}
                    >
                      {PIECE_ROLE_OPTIONS.map((option) => {
                        const isSelected = selectedRole === option.id;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            aria-disabled={roleLocked}
                            onClick={() => {
                              if (roleLocked) return;
                              onRoleSelect(option.id);
                            }}
                            style={{
                              border: isSelected
                                ? "0.5px solid rgba(184,135,107,0.55)"
                                : "0.5px solid rgba(67,67,43,0.1)",
                              background: isSelected ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.18)",
                              borderRadius: 9,
                              padding: "11px 12px",
                              cursor: roleLocked ? "not-allowed" : "pointer",
                              textAlign: "left",
                              width: "100%",
                              opacity: roleLocked && !isSelected ? 0.72 : 1,
                            }}
                          >
                            <div
                              style={{
                                fontFamily: sohne,
                                fontSize: 14,
                                fontWeight: 500,
                                color: "#1E1C12",
                                marginBottom: 4,
                                letterSpacing: "-0.02em",
                              }}
                            >
                              {option.label}
                            </div>
                            <div
                              style={{
                                fontFamily: inter,
                                fontSize: 10,
                                color: "#7A7260",
                                lineHeight: 1.45,
                              }}
                            >
                              {option.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div
                    style={{
                      overflow: "hidden",
                      maxHeight: hasCustomResponse ? 120 : 0,
                      opacity: hasCustomResponse ? 1 : 0,
                      transition:
                        "max-height 0.5s cubic-bezier(0.4,0,0.2,1) 0.7s, opacity 0.5s ease 0.7s",
                    }}
                  >
                    <div
                      style={{
                        marginTop: hasCustomResponse ? 18 : 0,
                        paddingTop: 14,
                        borderTop: "0.5px solid rgba(67,67,43,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: "1 1 280px" }}>
                        <div
                          style={{
                            fontFamily: inter,
                            fontSize: 10,
                            fontWeight: 500,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "rgba(67,67,43,0.48)",
                            marginBottom: 6,
                          }}
                        >
                          Target retail price
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: inter,
                              fontSize: 20,
                              fontWeight: 300,
                              color: "#1E1C12",
                            }}
                          >
                            $
                          </span>
                          <input
                            type="number"
                            min="1"
                            placeholder="285"
                            value={pieceTargetMsrp ?? ""}
                            onChange={(event) => {
                              const nextValue = Number(event.target.value);
                              if (!event.target.value) {
                                onPieceTargetMsrpChange(null);
                                return;
                              }
                              onPieceTargetMsrpChange(Number.isFinite(nextValue) && nextValue > 0 ? nextValue : null);
                            }}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              border: "none",
                              outline: "none",
                              background: "transparent",
                              padding: 0,
                              fontFamily: sohne,
                              fontSize: 20,
                              fontWeight: 300,
                              letterSpacing: "-0.02em",
                              color: "#1E1C12",
                            }}
                          />
                        </div>
                        {showPieceTargetMsrpError ? (
                          <div
                            style={{
                              marginTop: 6,
                              fontFamily: inter,
                              fontSize: 12,
                              color: "#B8876B",
                            }}
                          >
                            Set a price to unlock cost analysis
                          </div>
                        ) : null}
                      </div>

                      <div
                        style={{
                          fontFamily: inter,
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#B8876B",
                          alignSelf: "flex-start",
                          paddingTop: 16,
                        }}
                      >
                        Required
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @keyframes mukoSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @media (max-width: 920px) {
          .muko-claim-drawer {
            padding: 24px 20px 28px !important;
            gap: 20px !important;
            flex-direction: column !important;
          }

          .muko-claim-body {
            width: 100% !important;
          }

          .muko-claim-fields {
            grid-template-columns: 1fr !important;
          }

          .muko-claim-actions {
            width: 100% !important;
            padding-top: 0 !important;
            align-items: stretch !important;
          }
        }
      `}</style>

      {/* Overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(25,25,25,0.45)",
          zIndex: 300,
        }}
        onClick={onCancel}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 400,
          background: "white",
          borderTop: `1px solid ${BORDER}`,
          padding: "28px 36px 36px",
          display: "flex",
          alignItems: "flex-start",
          gap: 28,
          animation: "mukoSlideUp 200ms ease-out",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        className="muko-claim-drawer"
      >
        {/* Left: piece preview */}
        <div style={{ width: 88, flexShrink: 0 }}>
          <div
            style={{
              width: 88,
              height: 110,
              background: BG2,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {flatResult ? (
              <div style={{ width: 56, height: 72 }}>
                <flatResult.Flat color={flatResult.color} />
              </div>
            ) : (
              <PiecePlaceholder category={piece.category} />
            )}
          </div>
          <div
            style={{
              ...EYEBROW_STYLE,
              textAlign: "center",
              marginTop: 8,
            }}
          >
            {piece.custom ? "CUSTOM" : isMarketSignal ? "MARKET SIGNAL" : "MUKO EDIT"}
          </div>
        </div>

        {/* Middle: confirm fields */}
        <div style={{ flex: 1, minWidth: 0 }} className="muko-claim-body">
          <div
            style={{
              ...EYEBROW_STYLE,
              marginBottom: 6,
            }}
          >
            CLAIM THIS PIECE
          </div>
          <div
            style={{
              ...SECTION_TITLE_STYLE,
              fontSize: 24,
              color: TEXT,
              marginBottom: 8,
              lineHeight: 1.16,
            }}
          >
            {piece.custom ? pieceName.trim() || customProposal.trim() || "Custom Piece" : piece.item}
          </div>
          <div
            style={{
              ...BODY_SMALL_STYLE,
              marginBottom: 20,
            }}
          >
            {metadataTokens.join(" • ")}
          </div>

          {piece.custom ? (
            <div style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 18 }}>
                <div
                  style={{
                    ...EYEBROW_STYLE,
                    marginBottom: 8,
                  }}
                >
                  DESCRIBE THE PIECE YOU&apos;RE THINKING OF
                </div>
                <textarea
                  value={customProposal}
                  onChange={(e) => onCustomProposalChange(e.target.value)}
                  onInput={autoResizeTextarea}
                  rows={1}
                  placeholder="cigarette jean, long draped black dress, structured blazer with soft shoulder"
                  style={{
                    width: "100%",
                    minHeight: 54,
                    resize: "none",
                    overflow: "hidden",
                    background: "transparent",
                    border: "none",
                    borderBottom: `1px solid ${BORDER}`,
                    borderRadius: 0,
                    padding: "0 0 12px",
                    fontSize: 22,
                    fontWeight: 500,
                    color: TEXT,
                    fontFamily: sohne,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.22,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderBottomColor = CHARTREUSE)}
                  onBlur={(e) => (e.target.style.borderBottomColor = BORDER)}
                />
                <div
                  style={{
                    ...BODY_SMALL_STYLE,
                    marginTop: 10,
                    color: "rgba(67,67,43,0.5)",
                  }}
                >
                  Muko sharpens this against your locked collection language, material posture, and market position.
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    ...EYEBROW_STYLE,
                    marginBottom: 6,
                  }}
                >
                  PIECE EXPRESSION
                </div>
                <textarea
                  value={customFinalExpression}
                  onChange={(e) => onCustomFinalExpressionChange(e.target.value)}
                  onInput={autoResizeTextarea}
                  rows={2}
                  placeholder="Accept Muko's refinement or edit it into your own expression"
                  style={{
                    width: "100%",
                    minHeight: 76,
                    resize: "vertical",
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    padding: "11px 14px",
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: TEXT,
                    fontFamily: inter,
                    lineHeight: 1.5,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = CHARTREUSE)}
                  onBlur={(e) => (e.target.style.borderColor = BORDER)}
                />
              </div>

              {customProposal.trim() ? (
                customRefinementState === "loading" && !customRefinement ? (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ ...EYEBROW_STYLE, marginBottom: 8 }}>PIECE TYPE</div>
                    <InlineLoadingState label="Detecting piece type..." />
                  </div>
                ) : customRefinement ? (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ ...EYEBROW_STYLE, marginBottom: 8 }}>PIECE TYPE</div>
                    <div style={{ display: "grid", gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => setIsPieceTypeEditorOpen((value) => !value)}
                        style={{
                          width: "fit-content",
                          border: `1px solid ${BORDER}`,
                          background: "rgba(255,255,255,0.88)",
                          color: TEXT,
                          borderRadius: 999,
                          padding: "9px 14px",
                          fontFamily: inter,
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {`${pieceTypeLabel} ▾`}
                      </button>
                      {isPieceTypeEditorOpen ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                          <select
                            value={category}
                            onChange={(e) => {
                              onCategoryChange(e.target.value);
                              const nextSubcategories = allSubcategories[e.target.value] ?? [];
                              if (!nextSubcategories.some((entry) => entry.id === subcategory)) {
                                onSubcategoryChange(nextSubcategories[0]?.id ?? "");
                              }
                            }}
                            style={{
                              minWidth: 140,
                              padding: "8px 28px 8px 12px",
                              borderRadius: 999,
                              border: `1px solid ${BORDER}`,
                              background: "rgba(255,255,255,0.92)",
                              fontFamily: inter,
                              fontSize: 12.5,
                              fontWeight: 500,
                              color: TEXT,
                              appearance: "none",
                            }}
                          >
                            {categories.map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                {entry.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={subcategory}
                            onChange={(e) => onSubcategoryChange(e.target.value)}
                            style={{
                              minWidth: 170,
                              padding: "8px 28px 8px 12px",
                              borderRadius: 999,
                              border: `1px solid ${BORDER}`,
                              background: "rgba(255,255,255,0.92)",
                              fontFamily: inter,
                              fontSize: 12.5,
                              fontWeight: 500,
                              color: TEXT,
                              appearance: "none",
                            }}
                          >
                            {availableSubcategories.map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                {entry.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null
              ) : null}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 18,
                marginBottom: 18,
              }}
              className="muko-claim-fields"
            >
              <div>
                <div
                  style={{
                    ...EYEBROW_STYLE,
                    marginBottom: 6,
                  }}
                >
                  WHAT DO YOU CALL THIS PIECE?
                </div>
                <input
                  value={pieceName}
                  onChange={(e) => onPieceNameChange(e.target.value)}
                  placeholder={piece.item}
                  style={{
                    width: "100%",
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    padding: "11px 14px",
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: TEXT,
                    fontFamily: inter,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = CHARTREUSE)}
                  onBlur={(e) => (e.target.style.borderColor = BORDER)}
                />
              </div>

              <div>
                <div style={{ ...EYEBROW_STYLE, marginBottom: 8 }}>PIECE TYPE</div>
                <div style={{ display: "grid", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setIsPieceTypeEditorOpen((value) => !value)}
                    style={{
                      width: "fit-content",
                      border: `1px solid ${BORDER}`,
                      background: "rgba(255,255,255,0.88)",
                      color: TEXT,
                      borderRadius: 999,
                      padding: "9px 14px",
                      fontFamily: inter,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {`${pieceTypeLabel} ▾`}
                  </button>
                  {isPieceTypeEditorOpen ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      <select
                        value={category}
                        onChange={(e) => {
                          onCategoryChange(e.target.value);
                          const nextSubcategories = allSubcategories[e.target.value] ?? [];
                          if (!nextSubcategories.some((entry) => entry.id === subcategory)) {
                            onSubcategoryChange(nextSubcategories[0]?.id ?? "");
                          }
                        }}
                        style={{
                          minWidth: 140,
                          padding: "8px 28px 8px 12px",
                          borderRadius: 999,
                          border: `1px solid ${BORDER}`,
                          background: "rgba(255,255,255,0.92)",
                          fontFamily: inter,
                          fontSize: 12.5,
                          fontWeight: 500,
                          color: TEXT,
                          appearance: "none",
                        }}
                      >
                        {categories.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={subcategory}
                        onChange={(e) => onSubcategoryChange(e.target.value)}
                        style={{
                          minWidth: 170,
                          padding: "8px 28px 8px 12px",
                          borderRadius: 999,
                          border: `1px solid ${BORDER}`,
                          background: "rgba(255,255,255,0.92)",
                          fontFamily: inter,
                          fontSize: 12.5,
                          fontWeight: 500,
                          color: TEXT,
                          appearance: "none",
                        }}
                      >
                        {availableSubcategories.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              border: "0.5px solid rgba(67,67,43,0.12)",
              borderRadius: 12,
              overflow: "hidden",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                padding: "13px 20px 11px",
                borderBottom: "0.5px solid rgba(67,67,43,0.1)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: "#A8B475",
                }}
              />
              <span style={EYEBROW_STYLE}>Muko&apos;s Read</span>
            </div>

            {piece.custom && customProposal.trim() ? (
              <div
                style={{
                  padding: "15px 20px",
                  borderBottom: "0.5px solid rgba(67,67,43,0.1)",
                }}
              >
                <div style={{ ...EYEBROW_STYLE, marginBottom: 8 }}>Strategic Take</div>
                <div style={BODY_COPY_STYLE}>
                  {customRefinementState === "loading" && !customRefinement ? (
                    <InlineLoadingState label="Refining your custom piece..." />
                  ) : customRefinement ? (
                    customRefinement.read
                  ) : null}
                </div>
              </div>
            ) : null}

            {piece.custom && customProposal.trim() && customRefinement?.refined_expression ? (
              <div
                style={{
                  padding: "15px 20px",
                  borderBottom: "0.5px solid rgba(67,67,43,0.1)",
                }}
              >
                <div style={{ ...EYEBROW_STYLE, marginBottom: 10 }}>Refined Expression</div>
                <div
                  style={{
                    background: "rgba(168,180,117,0.06)",
                    border: "0.5px solid rgba(168,180,117,0.2)",
                    borderRadius: 8,
                    padding: "13px 16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 400,
                      fontStyle: "italic",
                      lineHeight: 1.65,
                      color: "rgba(67,67,43,0.85)",
                    }}
                  >
                    {customRefinement.refined_expression}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={onAcceptRefinedExpression}
                      style={{
                        borderRadius: 999,
                        background: "#A8B475",
                        border: "none",
                        color: "#3a3e1f",
                        fontSize: 12,
                        fontWeight: 500,
                        padding: "6px 16px",
                        cursor: "pointer",
                      }}
                    >
                      Accept this expression
                    </button>
                    <button
                      type="button"
                      onClick={onContinueWithOriginal}
                      style={{
                        borderRadius: 999,
                        background: "transparent",
                        border: "0.5px solid rgba(67,67,43,0.25)",
                        color: "rgba(67,67,43,0.6)",
                        fontSize: 12,
                        fontWeight: 400,
                        padding: "6px 14px",
                        cursor: "pointer",
                      }}
                    >
                      Keep my original
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div style={{ padding: "15px 20px" }}>
              <div style={{ ...EYEBROW_STYLE, marginBottom: 10 }}>Suggested Role</div>

              {suggestedRole ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: "rgba(168,180,117,0.1)",
                    borderRadius: 999,
                    padding: "3px 10px 3px 8px",
                    marginBottom: 10,
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      background: "#A8B475",
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#5a6030",
                    }}
                  >
                    {`Muko suggests: ${suggestedRole}`}
                  </div>
                </div>
              ) : null}

              <div
                role="radiogroup"
                aria-label="Piece role"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {PIECE_ROLE_OPTIONS.map((option) => {
                  const isSelected = selectedRole === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-disabled={roleLocked}
                      onClick={() => {
                        if (roleLocked) return;
                        onRoleSelect(option.id);
                      }}
                      style={{
                        border: isSelected ? "0.5px solid #A8B475" : "0.5px solid rgba(67,67,43,0.14)",
                        background: isSelected ? "rgba(168,180,117,0.07)" : "transparent",
                        borderRadius: 8,
                        padding: "11px 13px",
                        cursor: roleLocked ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 8,
                        textAlign: "left",
                        width: "100%",
                        opacity: roleLocked && !isSelected ? 0.72 : 1,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: sohne,
                            fontSize: 14,
                            fontWeight: 600,
                            color: "rgba(67,67,43,0.9)",
                            marginBottom: 2,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {option.label}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 400,
                            color: "rgba(67,67,43,0.5)",
                            lineHeight: 1.5,
                          }}
                        >
                          {option.description}
                        </div>
                      </div>
                      <div
                        aria-hidden
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          flexShrink: 0,
                          marginTop: 2,
                          background: isSelected ? "#A8B475" : "transparent",
                          border: isSelected ? "1.5px solid #A8B475" : "1.5px solid rgba(67,67,43,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isSelected ? (
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              background: "white",
                            }}
                          />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {piece.custom ? (
            <div
              style={{
                marginTop: 24,
                paddingTop: 24,
                borderTop: `1px solid ${BORDER}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: MUTED,
                  }}
                >
                  Target retail price
                </div>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#B8876B",
                  }}
                >
                  Required
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: hasValidPieceTargetMsrp ? "0.5px solid #A8B475" : `0.5px solid ${BORDER}`,
                  background: "rgba(255,255,255,0.9)",
                }}
              >
                <span
                  style={{
                    fontFamily: inter,
                    fontSize: 15,
                    color: MUTED,
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  min="1"
                  placeholder="Ex. 285"
                  value={pieceTargetMsrp ?? ""}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    if (!event.target.value) {
                      onPieceTargetMsrpChange(null);
                      return;
                    }
                    onPieceTargetMsrpChange(Number.isFinite(nextValue) && nextValue > 0 ? nextValue : null);
                  }}
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    padding: 0,
                    fontFamily: "inherit",
                    fontSize: 15,
                    color: TEXT,
                    minWidth: 0,
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontFamily: inter,
                  fontSize: 11,
                  color: MUTED,
                }}
              >
                Used to evaluate margin viability as you build
              </div>

              {showPieceTargetMsrpError ? (
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: inter,
                    fontSize: 12,
                    color: "#B8876B",
                  }}
                >
                  Set a price to unlock cost analysis
                </div>
              ) : null}
            </div>
          ) : null}

        </div>

        {/* Right: actions */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            paddingTop: 36,
            width: 230,
          }}
          className="muko-claim-actions"
        >
          <button
            onClick={onStartBuilding}
            style={{
              width: "100%",
              background: "#191919",
              color: "#FFFFFF",
              borderRadius: 999,
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 500,
              fontFamily: sohne,
              border: "none",
              cursor: canPressStart ? "pointer" : "not-allowed",
              whiteSpace: "nowrap" as const,
              letterSpacing: "0.02em",
              transition: "background 160ms ease, color 160ms ease, opacity 160ms ease",
              opacity: canPressStart ? 1 : 0.4,
            }}
            onMouseEnter={(e) => {
              if (canPressStart) e.currentTarget.style.background = "#2A2A2A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#191919";
            }}
          >
            {ctaLabel}
          </button>
          <button
            onClick={onCancel}
            style={{
              fontFamily: inter,
              fontSize: 11.5,
              color: MUTED,
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "center",
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = TEXT)}
            onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────
function PiecesPageClient() {
  const router = useRouter();
  const suggestedPiecesRef = React.useRef<HTMLDivElement | null>(null);
  const collectionContextHydrationRef = React.useRef<string | null>(null);
  const {
    collectionName,
    season,
    activeCollection,
    collectionAesthetic,
    aestheticInflection,
    directionInterpretationText,
    directionInterpretationChips,
    chipSelection,
    conceptLocked,
    conceptSilhouette,
    conceptPalette,
    moodboardImages,
    strategySummary,
    collectionContextSnapshots,
    successPriorities,
    sliderTrend,
    sliderCreative,
    sliderElevated,
    sliderNovelty,
    intentGoals,
    targetMsrp,
    targetMargin,
    identityPulse,
    resonancePulse,
    executionPulse,
    setSelectedKeyPiece,
    setCollectionName,
    setCollectionRole,
    setSeason,
    setTargetMsrp: storeSetTargetMsrp,
    setCategory,
    setSubcategory,
    setMaterial,
    setActiveCollection,
    pieceRolesById,
    setPieceRolesById,
    setActiveProductPieceId,
    setPieceBuildContext,
    setSavedAnalysisId,
    askMukoLastResponse,
    setAskMukoLastResponse,
    lastSuggestedRole,
    lastSuggestedRoleIsLocked,
    lastSuggestionRationale,
    lastAskMukoResponseTimestamp,
    setLastSuggestedRole,
    setLastSuggestedRoleIsLocked,
    setLastSuggestionRationale,
  } = useSessionStore();

  // Confirmed pieces from Supabase
  const [confirmedPieces, setConfirmedPieces] = useState<CollectionPiece[]>([]);
  const [brandProfile, setBrandProfile] = useState<BrandProfileRow | null>(null);
  const [contextRow, setContextRow] = useState<CollectionContextRow | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const storedCollectionName =
      typeof window !== "undefined" ? window.localStorage.getItem("muko_collectionName")?.trim() || "" : "";
    const storedSeason =
      typeof window !== "undefined" ? window.localStorage.getItem("muko_seasonLabel")?.trim() || "" : "";
    const resolvedCollectionName = collectionName.trim() || activeCollection?.trim() || storedCollectionName;
    const cachedContext =
      resolvedCollectionName
        ? (collectionContextSnapshots[resolvedCollectionName.trim().toLowerCase()] as CollectionContextRow | undefined) ?? null
        : null;

    if (!resolvedCollectionName) return;

    if (collectionName !== resolvedCollectionName) {
      setCollectionName(resolvedCollectionName);
    }

    if (activeCollection !== resolvedCollectionName) {
      setActiveCollection(resolvedCollectionName);
    }

    if (!season && storedSeason) {
      setSeason(storedSeason);
    }

    if (cachedContext) {
      setContextRow((previous) => {
        const merged = mergeCollectionContextRows(previous, cachedContext) as CollectionContextRow | null;
        return merged ?? previous;
      });
    }

    restoreCollectionContextFromCache(resolvedCollectionName);

    if (collectionContextHydrationRef.current === resolvedCollectionName) {
      return;
    }

    collectionContextHydrationRef.current = resolvedCollectionName;
    let cancelled = false;
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || cancelled) return;

      const data = await getLatestCollectionContextRow(user.id, resolvedCollectionName);
      if (cancelled) return;

      const mergedContext = mergeCollectionContextRows(
        data as CollectionContextRow | null,
        cachedContext
      ) as CollectionContextRow | null;

      setContextRow(mergedContext);
      if (!mergedContext) return;

      hydrateCollectionContextFromAnalysis(resolvedCollectionName, mergedContext);

      const nextSeason = mergedContext.season?.trim() || storedSeason;
      if (nextSeason) {
        setSeason(nextSeason);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeCollection,
    collectionContextSnapshots,
    collectionName,
    season,
    setActiveCollection,
    setCollectionName,
    setSeason,
  ]);

  useEffect(() => {
    if (!collectionName) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const primary = await supabase
        .from("analyses")
        .select("*")
        .eq("collection_name", collectionName)
        .eq("user_id", user.id);

      if (primary.error) {
        console.warn("[Pieces] fetch error:", primary.error);
        return;
      }

      const normalized = ((primary.data as CollectionPiece[] | null) ?? []).map((piece) => ({
        ...piece,
        piece_name: piece.piece_name ?? piece.agent_versions?.saved_piece_name ?? null,
      }));
      setConfirmedPieces(normalized);
    });
  }, [collectionName]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const { data, error } = await supabase
        .from("brand_profiles")
        .select("brand_name, keywords, price_tier, target_margin, tension_context")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) return;
      setBrandProfile(data as BrandProfileRow);
    });
  }, []);

  useEffect(() => {
    if (!toastMessage) return undefined;

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  const handleRenameConfirmedPiece = useCallback(async (id: string, nextName: string) => {
    const cleanedName = nextName.trim();
    if (!cleanedName) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("analyses")
      .update({
        piece_name: cleanedName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setToastMessage("Unable to rename piece");
      throw error;
    }

    setConfirmedPieces((prev) =>
      prev.map((piece) =>
        piece.id === id
          ? {
              ...piece,
              piece_name: cleanedName,
            }
          : piece
      )
    );
    setToastMessage("Piece renamed");
  }, []);

  const handleDeleteConfirmedPiece = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("analyses").delete().eq("id", id);

    if (error) {
      setToastMessage("Unable to delete piece");
      return;
    }

    setConfirmedPieces((prev) => prev.filter((piece) => piece.id !== id));
    setToastMessage("Piece removed from collection");
  }, []);

  const handleOpenConfirmedPiece = useCallback((piece: CollectionPiece) => {
    const resolvedCollectionName =
      piece.collection_name?.trim() ||
      collectionName.trim() ||
      activeCollection?.trim() ||
      "";

    if (!resolvedCollectionName) {
      router.push(`/spec?analysis=${encodeURIComponent(piece.id)}`);
      return;
    }

    hydrateSpecSessionFromAnalysis(
      resolvedCollectionName,
      piece as PersistedSpecAnalysisRow
    );
    router.push(`/spec?analysis=${encodeURIComponent(piece.id)}`);
  }, [activeCollection, collectionName, router]);

  // Key pieces from aesthetics data
  const keyPieces = useMemo((): KeyPiece[] => {
    if (!collectionAesthetic) return [];
    const entry = (aestheticsData as unknown as AestheticDataEntry[]).find(
      (a) =>
        a.name === collectionAesthetic ||
        a.id === collectionAesthetic.toLowerCase().replace(/\s+/g, "-")
    );
    if (!entry?.key_pieces) return [];
    const seasonKey =
      season.includes("FW") || season.includes("Fall") || season.includes("fall")
        ? "fw26"
        : "ss27";
    return (
      entry.key_pieces[seasonKey] ??
      entry.key_pieces["fw26"] ??
      Object.values(entry.key_pieces)[0] ??
      []
    );
  }, [collectionAesthetic, season]);

  // Suggested = key pieces not yet confirmed
  const suggestedPieces = useMemo((): KeyPiece[] => {
    const confirmedNames = new Set(
      confirmedPieces.map((p) => getDisplayPieceName(p).toLowerCase())
    );
    return keyPieces.filter((p) => !confirmedNames.has(p.item.toLowerCase()));
  }, [keyPieces, confirmedPieces]);

  const highComplexityCount = useMemo(
    () => confirmedPieces.filter((piece) => piece.construction_tier === "high").length,
    [confirmedPieces]
  );

  const complexityBias = useMemo<"reduce" | "steady">(() => {
    if (confirmedPieces.length === 0) return sliderCreative > 70 ? "steady" : "reduce";
    if (highComplexityCount >= 2 || highComplexityCount === confirmedPieces.length) return "reduce";
    if (sliderCreative > 72 || sliderElevated > 70) return "steady";
    return "steady";
  }, [confirmedPieces.length, highComplexityCount, sliderCreative, sliderElevated]);

  // Role counts from confirmed pieces
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {
      hero: 0,
      directional: 0,
      "core-evolution": 0,
      "volume-driver": 0,
    };
    confirmedPieces.forEach((p) => {
      if (p.collection_role && counts[p.collection_role] !== undefined) {
        counts[p.collection_role]++;
      }
    });
    return counts;
  }, [confirmedPieces]);

  const totalConfirmed = confirmedPieces.length;
  const storedDirectionChips = useMemo(
    () => parseStoredStringArray((contextRow?.agent_versions?.direction_interpretation_chips as string | null | undefined) ?? undefined),
    [contextRow]
  );
  const storedChipSelection = useMemo(
    () => parseStoredChipSelection((contextRow?.agent_versions?.chip_selection as string | null | undefined) ?? undefined),
    [contextRow]
  );
  const rawDirectionName = collectionAesthetic || contextRow?.collection_aesthetic || "—";
  const collectionEntry = useMemo(
    () =>
      (aestheticsData as unknown as AestheticDataEntry[]).find(
        (entry) =>
          entry.name === rawDirectionName ||
          entry.id === rawDirectionName?.toLowerCase().replace(/\s+/g, "-")
      ) ?? null,
    [rawDirectionName]
  );
  const directionName = collectionEntry?.name || formatDirectionLabel(rawDirectionName);
  const paletteName = useMemo(
    () =>
      collectionEntry?.palette_options?.find(
        (palette) => palette.id === (conceptPalette || contextRow?.agent_versions?.selected_palette)
      )?.name ??
      conceptPalette ??
      contextRow?.agent_versions?.selected_palette ??
      null,
    [collectionEntry, conceptPalette, contextRow?.agent_versions?.selected_palette]
  );

  const collectionLanguageLabels = useMemo(() => {
    const fromStore = getCollectionLanguageLabels(directionInterpretationChips, directionInterpretationText);
    if (fromStore.length > 0) return fromStore;

    const fromStoredChips = getCollectionLanguageLabels(storedDirectionChips, contextRow?.aesthetic_inflection ?? "");
    if (fromStoredChips.length > 0) return fromStoredChips;

    return parseStoredStringArray((contextRow?.agent_versions?.collection_language as string | null | undefined) ?? undefined);
  }, [contextRow, directionInterpretationChips, directionInterpretationText, storedDirectionChips]);

  const expressionSignalLabels = useMemo(() => {
    const fromStore = getExpressionSignalLabels(chipSelection);
    if (fromStore.length > 0) return fromStore;

    const fromStoredSelection = getExpressionSignalLabels(storedChipSelection);
    if (fromStoredSelection.length > 0) return fromStoredSelection;

    return parseStoredStringArray((contextRow?.agent_versions?.expression_signals as string | null | undefined) ?? undefined);
  }, [chipSelection, contextRow, storedChipSelection]);

  const collectionLanguageExpression = useMemo(
    () => evaluateSignalExpression(collectionLanguageLabels, confirmedPieces),
    [collectionLanguageLabels, confirmedPieces]
  );

  const expressionSignalExpression = useMemo(
    () => evaluateSignalExpression(expressionSignalLabels, confirmedPieces),
    [expressionSignalLabels, confirmedPieces]
  );

  const languageStates = useMemo(() => {
    const strong = collectionLanguageExpression.filter((chip) => chip.state === "strong");
    const emerging = collectionLanguageExpression.filter((chip) => chip.state === "emerging");
    const missing = collectionLanguageExpression.filter((chip) => chip.state === "missing");
    const strongest = [...collectionLanguageExpression].sort((a, b) => b.coverage - a.coverage)[0];
    return { strong, emerging, missing, strongest };
  }, [collectionLanguageExpression]);

  const expressionStates = useMemo(() => {
    const strong = expressionSignalExpression.filter((chip) => chip.state === "strong");
    const emerging = expressionSignalExpression.filter((chip) => chip.state === "emerging");
    const missing = expressionSignalExpression.filter((chip) => chip.state === "missing");
    const strongest = [...expressionSignalExpression].sort((a, b) => b.coverage - a.coverage)[0];
    return { strong, emerging, missing, strongest };
  }, [expressionSignalExpression]);

  const startingPointSuggestions = useMemo((): StartingPointSuggestion[] => {
    if (suggestedPieces.length === 0) return [];

    const usedItems = new Set<string>();
    const suggestions: StartingPointSuggestion[] = [];
    const missingLanguage = languageStates.missing[0]?.label;
    const emergingLanguage = [...languageStates.emerging].sort((a, b) => a.coverage - b.coverage)[0]?.label;
    const strongestLanguage = languageStates.strongest?.label;
    const missingExpression = expressionStates.missing[0]?.label;
    const emergingExpression = [...expressionStates.emerging].sort((a, b) => a.coverage - b.coverage)[0]?.label;
    const strongestExpression = expressionStates.strongest?.label;
    const priorityRole = getPriorityRole(roleCounts as Record<CollectionRoleId, number>, totalConfirmed);

    const languageCandidate = selectBestStartingPointCandidate({
      candidates: suggestedPieces,
      usedItems,
      purpose: "language-gap",
      targetChip: missingLanguage ?? emergingLanguage ?? missingExpression ?? emergingExpression,
      roleCounts: roleCounts as Record<CollectionRoleId, number>,
      priorityRole,
      complexityBias,
    });

    if (languageCandidate) {
      usedItems.add(languageCandidate.piece.item);
      suggestions.push(
        buildStartingPointSuggestion({
          piece: languageCandidate.piece,
          purpose: "language-gap",
          targetCollectionLanguage: missingLanguage ?? emergingLanguage ?? strongestLanguage,
          targetExpressionSignal: missingExpression ?? emergingExpression ?? strongestExpression,
          role: languageCandidate.roleSuggestion.role,
          rank: suggestions.length + 1,
          complexityBias,
          directionText: directionInterpretationText,
          strongestCollectionLanguage: strongestLanguage,
          strongestExpressionSignal: strongestExpression,
        })
      );
    }

    const roleCandidate = selectBestStartingPointCandidate({
      candidates: suggestedPieces,
      usedItems,
      purpose: "role-balance",
      roleCounts: roleCounts as Record<CollectionRoleId, number>,
      priorityRole,
      complexityBias,
    });

    if (roleCandidate) {
      usedItems.add(roleCandidate.piece.item);
      suggestions.push(
        buildStartingPointSuggestion({
          piece: roleCandidate.piece,
          purpose: "role-balance",
          role: priorityRole,
          rank: suggestions.length + 1,
          complexityBias,
          directionText: directionInterpretationText,
          strongestCollectionLanguage: strongestLanguage,
          strongestExpressionSignal: strongestExpression,
        })
      );
    }

    const executionCandidate = selectBestStartingPointCandidate({
      candidates: suggestedPieces,
      usedItems,
      purpose: "execution-risk",
      targetChip: strongestExpression ?? strongestLanguage,
      roleCounts: roleCounts as Record<CollectionRoleId, number>,
      priorityRole,
      complexityBias,
    });

    if (executionCandidate) {
      suggestions.push(
        buildStartingPointSuggestion({
          piece: executionCandidate.piece,
          purpose: "execution-risk",
          role: executionCandidate.roleSuggestion.role,
          rank: suggestions.length + 1,
          complexityBias,
          directionText: directionInterpretationText,
          strongestCollectionLanguage: strongestLanguage,
          strongestExpressionSignal: strongestExpression,
        })
      );
    }

    return suggestions.slice(0, 3);
  }, [complexityBias, directionInterpretationText, expressionStates, languageStates, roleCounts, suggestedPieces, totalConfirmed]);

  const confirmedPieceNames = useMemo(
    () => confirmedPieces.map((piece) => getDisplayPieceName(piece)),
    [confirmedPieces]
  );

  const confirmedCategories = useMemo(
    () =>
      Array.from(
        new Set(
          confirmedPieces
            .map((piece) => piece.category?.trim())
            .filter((category): category is string => Boolean(category))
        )
      ),
    [confirmedPieces]
  );

  const silhouetteLeaders = useMemo(() => {
    return Object.entries(
      confirmedPieces.reduce<Record<string, number>>((acc, piece) => {
        const silhouette = piece.silhouette?.trim();
        if (!silhouette) return acc;
        acc[silhouette] = (acc[silhouette] ?? 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]);
  }, [confirmedPieces]);

  const materialSignals = useMemo(() => {
    return Object.entries(
      confirmedPieces.reduce<Record<string, number>>((acc, piece) => {
        const material = getDisplayPieceMaterial(piece);
        if (!material) return acc;
        acc[material] = (acc[material] ?? 0) + 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([material]) => material);
  }, [confirmedPieces]);

  const coverageGaps = useMemo(() => {
    const gaps: string[] = [];
    const categoryCounts = confirmedPieces.reduce<Record<string, number>>((acc, piece) => {
      const category = piece.category?.trim().toLowerCase();
      if (!category) return acc;
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    }, {});

    if (totalConfirmed === 0 || roleCounts.hero === 0) gaps.push("needs_anchor_piece");
    if (expressionStates.missing.length > 0 || expressionStates.strong.length === 0) {
      gaps.push("needs_visible_surface_expression");
    }
    if (roleCounts["core-evolution"] === 0 || roleCounts["volume-driver"] === 0) {
      gaps.push("needs_commercial_base");
    }
    if ((categoryCounts.tops ?? 0) > Math.max(1, totalConfirmed / 2)) gaps.push("too_top_heavy");
    if ((categoryCounts.tops ?? 0) === 0 || (categoryCounts.bottoms ?? 0) === 0) {
      gaps.push("needs_core_daywear");
    }

    return gaps;
  }, [confirmedPieces, expressionStates.missing.length, expressionStates.strong.length, roleCounts, totalConfirmed]);

  const coverageGapLabels = useMemo(
    () =>
      coverageGaps.map((gap) => {
        if (gap === "needs_anchor_piece") return "a clear anchor piece is missing";
        if (gap === "needs_visible_surface_expression") return "the surface signal is still too weak";
        if (gap === "needs_commercial_base") return "the commercial base is still thin";
        if (gap === "too_top_heavy") return "the assortment is too top-heavy";
        if (gap === "needs_core_daywear") return "daywear coverage is incomplete";
        return gap.replace(/_/g, " ");
      }),
    [coverageGaps]
  );

  const scoreSignals = useMemo(() => {
    const scoredPieces = confirmedPieces.filter((piece): piece is CollectionPiece & { score: number } => typeof piece.score === "number");
    const averageScore =
      scoredPieces.length > 0
        ? scoredPieces.reduce((sum, piece) => sum + piece.score, 0) / scoredPieces.length
        : null;
    const strongestPiece = scoredPieces.slice().sort((a, b) => b.score - a.score)[0];
    const weakestPiece = scoredPieces.slice().sort((a, b) => a.score - b.score)[0];

    return {
      averageScore,
      strongestPiece: strongestPiece ? getDisplayPieceName(strongestPiece) : null,
      weakestPiece: weakestPiece ? getDisplayPieceName(weakestPiece) : null,
    };
  }, [confirmedPieces]);

  const piecesReadConfirmedPieces = useMemo(
    () =>
      confirmedPieces.map((piece) => ({
        name: getDisplayPieceName(piece),
        category: piece.category?.trim() || null,
        silhouette: piece.silhouette?.trim() || null,
        material: getDisplayPieceMaterial(piece),
        role: getDisplayPieceRole(piece),
        score: piece.score ?? null,
        identityScore: piece.dimensions?.identity ?? null,
        resonanceScore: piece.dimensions?.resonance ?? null,
        executionScore: piece.dimensions?.execution ?? null,
        expression: getDisplayPieceExpression(piece),
      })),
    [confirmedPieces]
  );

  const deterministicSuggestedPieces = useMemo<DeterministicSuggestedPiece[]>(
    () =>
      startingPointSuggestions.map((piece) => ({
        name: piece.adapted_title,
        category: piece.sourcePiece.category ?? undefined,
        role: piece.strategicRole,
        rank: piece.rank,
        reasonTags: piece.reasonTags,
        shortRationale: piece.shortRationale,
      })),
    [startingPointSuggestions]
  );

  const recommendedStartPiece = useMemo(
    () =>
      selectRecommendedStartPiece({
        suggestedPieces: deterministicSuggestedPieces,
        confirmedCategories,
        confirmedPieceNames,
        coverageGaps,
      }),
    [confirmedCategories, confirmedPieceNames, coverageGaps, deterministicSuggestedPieces]
  );

  const recommendedStartSuggestion = useMemo(
    () =>
      recommendedStartPiece
        ? startingPointSuggestions.find((piece) => piece.adapted_title === recommendedStartPiece.name) ?? null
        : startingPointSuggestions[0] ?? null,
    [recommendedStartPiece, startingPointSuggestions]
  );

  const askMukoContext: AskMukoContext = useMemo(
    () => ({
      step: "pieces",
      brand: {
        brandName: brandProfile?.brand_name ?? undefined,
        keywords: brandProfile?.keywords ?? undefined,
        priceTier: brandProfile?.price_tier ?? undefined,
        targetMargin: brandProfile?.target_margin ?? targetMargin ?? undefined,
        tensionContext: brandProfile?.tension_context ?? undefined,
      },
      intent: {
        season: season || undefined,
        collectionName: collectionName || undefined,
      },
      aesthetic: {
        matchedId: collectionAesthetic ?? undefined,
        inflection: aestheticInflection || directionInterpretationText || undefined,
      },
      scores: {
        identity: identityPulse?.score ?? undefined,
        resonance: resonancePulse?.score ?? undefined,
        execution: executionPulse?.score ?? undefined,
        overall:
          scoreSignals.averageScore != null
            ? Math.round(scoreSignals.averageScore)
            : undefined,
      },
      gates: {
        msrp: targetMsrp ?? undefined,
      },
      silhouette: conceptSilhouette || undefined,
      collectionLanguage: collectionLanguageLabels,
      expressionSignals: expressionSignalLabels,
      brandInterpretation: directionInterpretationText || undefined,
      pieces: {
        confirmedPieceCount: totalConfirmed,
        suggestedPieceCount: startingPointSuggestions.length,
        confirmedPieceNames: confirmedPieceNames.slice(0, 8),
        confirmedCategories: confirmedCategories.slice(0, 6),
        coverageGaps: coverageGapLabels,
        recommendedStartPiece: recommendedStartPiece?.name ?? recommendedStartSuggestion?.adapted_title ?? undefined,
        averageScore:
          scoreSignals.averageScore != null
            ? Number(scoreSignals.averageScore.toFixed(1))
            : undefined,
        strongestPiece: scoreSignals.strongestPiece ?? undefined,
        weakestPiece: scoreSignals.weakestPiece ?? undefined,
        dominantSilhouette: silhouetteLeaders[0]?.[0] ?? undefined,
        materialSignals,
        suggestedStartingPoints: startingPointSuggestions.map((piece) => piece.adapted_title).slice(0, 5),
      },
    }),
    [
      aestheticInflection,
      brandProfile?.brand_name,
      brandProfile?.keywords,
      brandProfile?.price_tier,
      brandProfile?.target_margin,
      brandProfile?.tension_context,
      collectionAesthetic,
      collectionLanguageLabels,
      collectionName,
      conceptSilhouette,
      confirmedCategories,
      confirmedPieceNames,
      coverageGapLabels,
      directionInterpretationText,
      executionPulse?.score,
      expressionSignalLabels,
      identityPulse?.score,
      materialSignals,
      recommendedStartPiece?.name,
      recommendedStartSuggestion?.adapted_title,
      resonancePulse?.score,
      scoreSignals.averageScore,
      scoreSignals.strongestPiece,
      scoreSignals.weakestPiece,
      season,
      silhouetteLeaders,
      startingPointSuggestions,
      targetMargin,
      targetMsrp,
      totalConfirmed,
    ]
  );

  const piecesReadInput = useMemo(
    () =>
      buildPiecesReadInput({
        season,
        collectionName,
        movementName: directionName,
        trendVelocity: collectionEntry?.trend_velocity ?? null,
        saturationScore: collectionEntry?.saturation_score ?? null,
        seenIn: collectionEntry?.seen_in ?? [],
        silhouette: [conceptSilhouette],
        palette: [paletteName as string],
        expression: [...collectionLanguageLabels, ...expressionSignalLabels].slice(0, 6),
        interpretationText: directionInterpretationText || null,
        confirmedPieceCount: totalConfirmed,
        confirmedCategories,
        coverageGaps,
        coverageGapLabels,
        dominantSilhouette: silhouetteLeaders[0]?.[0] ?? null,
        materialSignals,
        roleBalance: {
          hero: roleCounts.hero,
          directional: roleCounts.directional,
          coreEvolution: roleCounts["core-evolution"],
          volumeDriver: roleCounts["volume-driver"],
        },
        scoreSignals,
        confirmedPieces: piecesReadConfirmedPieces,
        suggestedPieces: deterministicSuggestedPieces,
        recommendedStartPiece,
      }),
    [
      collectionEntry?.saturation_score,
      collectionEntry?.seen_in,
      collectionEntry?.trend_velocity,
      collectionLanguageLabels,
      collectionName,
      conceptSilhouette,
      confirmedCategories,
      coverageGaps,
      coverageGapLabels,
      deterministicSuggestedPieces,
      directionInterpretationText,
      directionName,
      expressionSignalLabels,
      materialSignals,
      paletteName,
      piecesReadConfirmedPieces,
      recommendedStartPiece,
      roleCounts,
      season,
      silhouetteLeaders,
      scoreSignals,
      totalConfirmed,
    ]
  );

  const piecesReadFallback = useMemo(
    () => buildPiecesReadFallback(piecesReadInput),
    [piecesReadInput]
  );

  const [synthesizedPiecesRead, setSynthesizedPiecesRead] = useState<PiecesReadOutput | null>(null);
  const [piecesReadStatus, setPiecesReadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [piecesReadMeta, setPiecesReadMeta] = useState<PiecesReadResponseMeta | null>(null);

  const piecesReadRequestBody = useMemo(
    () => JSON.stringify(piecesReadInput),
    [piecesReadInput]
  );

  useEffect(() => {
    const controller = new AbortController();
    setSynthesizedPiecesRead(null);
    setPiecesReadStatus("loading");
    setPiecesReadMeta(null);

    const run = async () => {
      try {
        const response = await fetch("/api/pieces-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: piecesReadRequestBody,
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to synthesize pieces read");
        }

        const data = (await response.json()) as PiecesReadOutput & {
          _meta?: PiecesReadResponseMeta;
        };

        if (controller.signal.aborted) return;

        React.startTransition(() => {
          setSynthesizedPiecesRead({
            read_headline: data.read_headline,
            read_body: data.read_body,
            ...(data.how_to_lean_in?.trim() ? { how_to_lean_in: data.how_to_lean_in } : {}),
            start_here_title: data.start_here_title,
            start_here_body: data.start_here_body,
            piece_microcopy: data.piece_microcopy,
          });
          setPiecesReadMeta(data._meta ?? null);
          setPiecesReadStatus("ready");
        });

        if (process.env.NODE_ENV !== "production") {
          console.debug(
            data._meta?.source === "fallback" ? "[Pieces Read] fallback response" : "[Pieces Read] synthesized",
            {
              source: data._meta?.source,
              reason: data._meta?.reason,
              detail: data._meta?.detail,
              latencyMs: data._meta?.latency_ms,
              input: piecesReadInput,
            }
          );
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;

        const message = error instanceof Error ? error.message : String(error);
        setSynthesizedPiecesRead(null);
        setPiecesReadMeta({
          source: "fallback",
          reason: "network_error",
          detail: [message],
        });
        setPiecesReadStatus("error");

        if (process.env.NODE_ENV !== "production") {
          console.debug("[Pieces Read] fallback", {
            error: message,
            input: piecesReadInput,
          });
        }
      }
    };

    run();
    return () => controller.abort();
  }, [piecesReadInput, piecesReadRequestBody]);

  const piecesReadContent = synthesizedPiecesRead ?? piecesReadFallback;
  const rightRailPiecesRead =
    synthesizedPiecesRead ?? (piecesReadStatus === "error" ? piecesReadFallback : null);
  const collectionReadPillTitle =
    piecesReadMeta?.source === "fallback"
      ? ["Pieces read is using fallback copy", piecesReadMeta.reason, ...(piecesReadMeta.detail ?? [])]
          .filter(Boolean)
          .join(" • ")
      : undefined;
  const askMukoDirectionalGap = Math.max(
    0,
    piecesReadInput.currentCollectionState.roleTargets.directional -
      piecesReadInput.currentCollectionState.roleBalance.directional
  );
  const askMukoCoverageGapLabel =
    piecesReadInput.currentCollectionState.coverageGapLabels.find((label) =>
      label.toLowerCase().includes("top-heavy")
    ) ??
    piecesReadInput.currentCollectionState.coverageGapLabels[0] ??
    null;

  const pieceMicrocopyByName = useMemo(
    () =>
      Object.fromEntries(
        (piecesReadContent.piece_microcopy ?? []).map((entry) => [entry.piece_name, entry.microcopy])
      ),
    [piecesReadContent.piece_microcopy]
  );

  // Drawer state
  const [drawerPiece, setDrawerPiece] = useState<KeyPiece | null>(null);
  const [drawerSuggestion, setDrawerSuggestion] = useState<StartingPointSuggestion | null>(null);
  const [drawerPieceName, setDrawerPieceName] = useState("");
  const [drawerCategory, setDrawerCategory] = useState("");
  const [drawerSubcategory, setDrawerSubcategory] = useState("");
  const [drawerRole, setDrawerRole] = useState<CollectionRoleId | null>(null);
  const [pieceTargetMsrp, setPieceTargetMsrp] = useState<number | null>(null);
  const [pieceTargetMsrpError, setPieceTargetMsrpError] = useState(false);
  const [suggestedSheetOpen, setSuggestedSheetOpen] = useState(false);
  const [selectedSuggestedPiece, setSelectedSuggestedPiece] = useState<SuggestedPiece | null>(null);
  const [suggestedMsrp, setSuggestedMsrp] = useState<number | null>(null);
  const [suggestedRole, setSuggestedRole] = useState<CollectionRoleId | null>(null);
  const [suggestedMsrpError, setSuggestedMsrpError] = useState(false);
  const [customProposal, setCustomProposal] = useState("");
  const [customFinalExpression, setCustomFinalExpression] = useState("");
  const [customRefinement, setCustomRefinement] = useState<CustomPieceRefinement | null>(null);
  const [customRefinementState, setCustomRefinementState] = useState<"idle" | "loading" | "ready">("idle");
  const [isAskMukoOpen, setIsAskMukoOpen] = useState(false);
  const [askMukoOpeningMessage, setAskMukoOpeningMessage] = useState<string | null>(null);
  const [askMukoOpeningMessageVersion, setAskMukoOpeningMessageVersion] = useState(0);
  const refinementAbortRef = React.useRef<AbortController | null>(null);
  const isInferredPieceTypeUpdateRef = React.useRef(false);
  const lastInferredDrawerCategoryRef = React.useRef("");
  const lastInferredDrawerSubcategoryRef = React.useRef("");

  const handleOpenAskMukoStartingPoint = useCallback(() => {
    const collectionLabel = collectionName || "this collection";
    const movementLabel =
      piecesReadInput.movement.name ||
      directionName ||
      rightRailPiecesRead?.start_here_title ||
      "this aesthetic direction";
    const coverageGapClause = askMukoCoverageGapLabel
      ? /^(a|an|the)\b/i.test(askMukoCoverageGapLabel)
        ? askMukoCoverageGapLabel
        : `a ${askMukoCoverageGapLabel}`
      : "a coverage gap";
    const openingContext =
      totalConfirmed === 0
        ? `I'm starting to build this collection. The direction is set.`
        : askMukoDirectionalGap > 0
        ? `The collection has ${totalConfirmed} piece${totalConfirmed === 1 ? "" : "s"} so far and could use more directional pieces.`
        : `The collection has ${totalConfirmed} piece${totalConfirmed === 1 ? "" : "s"} taking shape.`;
    const openingMessage = `${openingContext} What specific pieces should I make for ${collectionLabel} in ${movementLabel}?`;

    setAskMukoOpeningMessage(openingMessage);
    setAskMukoOpeningMessageVersion((version) => version + 1);
    setIsAskMukoOpen(true);
  }, [
    askMukoCoverageGapLabel,
    askMukoDirectionalGap,
    collectionName,
    directionName,
    piecesReadInput.movement.name,
    rightRailPiecesRead?.start_here_title,
    totalConfirmed,
  ]);
  const inferredDrawerSuggestion = useMemo(() => {
    if (!drawerPiece) return null;
    if (drawerPiece.custom) {
      return inferCustomRoleSuggestion(
        customFinalExpression || customProposal || drawerPieceName,
        drawerCategory,
        roleCounts as Record<CollectionRoleId, number>
      );
    }
    return getRoleSuggestion(drawerPiece, roleCounts as Record<CollectionRoleId, number>);
  }, [customFinalExpression, customProposal, drawerCategory, drawerPiece, drawerPieceName, roleCounts]);

  const collectionMaterials = useMemo(() => {
    const materials = (chipSelection?.activatedChips ?? [])
      .map((chip) => chip.material?.trim())
      .filter((material): material is string => Boolean(material));

    return Array.from(new Set(materials));
  }, [chipSelection]);

  const collectionPriorities = useMemo(() => {
    if (successPriorities.length > 0) return successPriorities;
    if (intentGoals.length > 0) return intentGoals;
    return ["brand expression", "commercial performance"];
  }, [intentGoals, successPriorities]);

  const commercialContext = useMemo(
    () => ({
      target_msrp: targetMsrp != null && targetMsrp > 0 ? targetMsrp : null,
      margin: targetMargin || null,
      cost_ceiling: targetMsrp != null && targetMsrp > 0 && targetMargin > 0
        ? Math.round(targetMsrp * (1 - targetMargin / 100))
        : null,
    }),
    [targetMargin, targetMsrp]
  );

  const customRefinementRequestBody = useMemo(
    () =>
      JSON.stringify({
        collection: {
          direction: directionInterpretationText || collectionAesthetic || "Collection direction not resolved",
          silhouette: conceptSilhouette || "controlled proportion",
          palette: paletteName || "palette not resolved",
          materials: collectionMaterials,
          elements: collectionLanguageLabels,
          priorities: collectionPriorities,
          tradeoffs: {
            trend_exposure: getStrategySliderLabel(sliderTrend, ["high", "balanced", "low"]),
            expression: getStrategySliderLabel(sliderCreative, ["assertive", "balanced", "restrained"]),
            value: getStrategySliderLabel(sliderElevated, ["premium", "balanced", "accessible"]),
            innovation: getStrategySliderLabel(sliderNovelty, ["novelty-led", "balanced", "continuity-aware"]),
          },
          commercial: commercialContext,
        },
        market: {
          season: season || "current season",
          direction: collectionAesthetic || directionInterpretationText || "",
        },
        user_input: customProposal.trim(),
        selected_category: drawerCategory || undefined,
        selected_subcategory: drawerSubcategory || undefined,
        selected_role: lastSuggestedRoleIsLocked ? lastSuggestedRole ?? undefined : undefined,
        source_rationale: lastSuggestedRoleIsLocked ? lastSuggestionRationale ?? undefined : undefined,
        existing_pieces: confirmedPieces.map((p) => ({
          name: getDisplayPieceName(p),
          role: p.collection_role ? getPieceRoleLabel(p.collection_role as CollectionRoleId) : "",
          category: p.category ?? "",
        })),
        ...(askMukoLastResponse?.trim()
          ? { ask_muko_context: askMukoLastResponse.trim() }
          : {}),
      }),
    [
      askMukoLastResponse,
      collectionAesthetic,
      collectionLanguageLabels,
      collectionMaterials,
      collectionPriorities,
      commercialContext,
      conceptSilhouette,
      customProposal,
      directionInterpretationText,
      drawerCategory,
      drawerSubcategory,
      lastSuggestedRole,
      lastSuggestedRoleIsLocked,
      lastSuggestionRationale,
      paletteName,
      season,
      confirmedPieces,
      sliderCreative,
      sliderElevated,
      sliderNovelty,
      sliderTrend,
    ]
  );

  const openDrawer = useCallback((piece: KeyPiece, suggestion: StartingPointSuggestion | null = null) => {
    const askMukoSuggestion =
      piece.custom && lastAskMukoResponseTimestamp != null
        ? inferRoleFromAskMukoResponse(askMukoLastResponse)
        : null;
    const lockedRole = suggestion?.role ?? askMukoSuggestion?.role ?? null;
    const lockedRationale = suggestion
      ? buildSuggestedRoleRationale(suggestion)
      : askMukoSuggestion?.rationale ?? null;
    const isLocked = Boolean(suggestion?.role);

    setDrawerPiece(piece);
    setDrawerSuggestion(suggestion);
    setDrawerPieceName(piece.item);
    setDrawerCategory(piece.category ?? "");
    setDrawerSubcategory(normalizeSpecSubcategoryId(piece.type) ?? piece.type ?? "");
    setDrawerRole(lockedRole);
    setPieceTargetMsrp(null);
    setPieceTargetMsrpError(false);
    setCustomProposal(piece.custom ? piece.item : "");
    setCustomFinalExpression(piece.custom ? piece.item : "");
    setCustomRefinement(null);
    setCustomRefinementState("idle");
    setLastSuggestedRole(lockedRole);
    setLastSuggestedRoleIsLocked(isLocked);
    setLastSuggestionRationale(lockedRationale);
  }, [
    askMukoLastResponse,
    lastAskMukoResponseTimestamp,
    setLastSuggestedRole,
    setLastSuggestedRoleIsLocked,
    setLastSuggestionRationale,
  ]);

  const closeDrawer = useCallback(() => {
    refinementAbortRef.current?.abort();
    refinementAbortRef.current = null;
    setDrawerPiece(null);
    setDrawerSuggestion(null);
    setDrawerPieceName("");
    setDrawerCategory("");
    setDrawerSubcategory("");
    setDrawerRole(null);
    setPieceTargetMsrp(null);
    setPieceTargetMsrpError(false);
    setCustomProposal("");
    setCustomFinalExpression("");
    setCustomRefinement(null);
    setCustomRefinementState("idle");
    setAskMukoLastResponse(null);
    setLastSuggestedRole(null);
    setLastSuggestedRoleIsLocked(false);
    setLastSuggestionRationale(null);
  }, [
    setAskMukoLastResponse,
    setLastSuggestedRole,
    setLastSuggestedRoleIsLocked,
    setLastSuggestionRationale,
  ]);

  const closeSuggestedSheet = useCallback(() => {
    setSuggestedSheetOpen(false);
    setSelectedSuggestedPiece(null);
    setSuggestedMsrp(null);
    setSuggestedRole(null);
    setSuggestedMsrpError(false);
  }, []);

  const openSuggestedSheet = useCallback((piece: SuggestedPiece) => {
    setSelectedSuggestedPiece(piece);
    setSuggestedRole(piece.role ?? "volume-driver");
    setSuggestedMsrp(null);
    setSuggestedMsrpError(false);
    setSuggestedSheetOpen(true);
  }, []);

  const handleStartSuggestedPiece = useCallback(() => {
    if (!selectedSuggestedPiece || !suggestedRole) return;
    if (!suggestedMsrp || suggestedMsrp <= 0) {
      setSuggestedMsrpError(true);
      return;
    }

    const sourcePiece = selectedSuggestedPiece.sourcePiece;
    const finalPieceName = sourcePiece.item;
    const pieceBuildContext: PieceBuildContext = {
      adaptedTitle: selectedSuggestedPiece.adapted_title ?? finalPieceName,
      role: suggestedRole,
      archetype: selectedSuggestedPiece.archetype ?? sourcePiece.item.toLowerCase().replace(/\s+/g, "_"),
      originalLabel: selectedSuggestedPiece.original_label ?? sourcePiece.item,
      expression: null,
      translation: (selectedSuggestedPiece.version_label ?? directionInterpretationText) || null,
      collectionLanguage: collectionLanguageExpression.map((chip) => ({
        label: chip.label,
        state: chip.state,
      })),
      expressionSignals: expressionSignalExpression.map((chip) => ({
        label: chip.label,
        state: chip.state,
      })),
      complexityBias,
    };

    setSelectedKeyPiece(sourcePiece);
    setCollectionRole(suggestedRole);
    storeSetTargetMsrp(suggestedMsrp);
    setPieceBuildContext(pieceBuildContext);
    setSavedAnalysisId(null);
    setPieceRolesById({
      ...pieceRolesById,
      [finalPieceName]: suggestedRole,
    });
    setActiveProductPieceId(finalPieceName);
    setLastSuggestedRole(null);
    setLastSuggestedRoleIsLocked(false);
    setLastSuggestionRationale(null);
    setCategory(sourcePiece.category || "");
    setSubcategory(sourcePiece.type || "");
    setSuggestedSheetOpen(false);
    router.push("/spec");
  }, [
    collectionLanguageExpression,
    complexityBias,
    directionInterpretationText,
    expressionSignalExpression,
    pieceRolesById,
    router,
    selectedSuggestedPiece,
    setActiveProductPieceId,
    setCategory,
    setCollectionRole,
    setLastSuggestedRole,
    setLastSuggestedRoleIsLocked,
    setLastSuggestionRationale,
    setPieceBuildContext,
    setPieceRolesById,
    setSavedAnalysisId,
    setSelectedKeyPiece,
    setSubcategory,
    storeSetTargetMsrp,
    suggestedMsrp,
    suggestedRole,
  ]);

  useEffect(() => {
    if (!drawerPiece?.custom) return;
    const proposal = customProposal.trim();

    if (!proposal) {
      refinementAbortRef.current?.abort();
      refinementAbortRef.current = null;
      setCustomRefinement(null);
      setCustomRefinementState("idle");
      lastInferredDrawerCategoryRef.current = "";
      lastInferredDrawerSubcategoryRef.current = "";
      setDrawerRole(lastSuggestedRole ? (lastSuggestedRole as CollectionRoleId) : null);
      return;
    }

    if (isInferredPieceTypeUpdateRef.current) {
      isInferredPieceTypeUpdateRef.current = false;
      return;
    }

    refinementAbortRef.current?.abort();
    const controller = new AbortController();
    refinementAbortRef.current = controller;
    setCustomRefinement(null);
    setCustomRefinementState("loading");

    const timeoutId = window.setTimeout(async () => {

      try {
        const response = await fetch("/api/piece-refine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: customRefinementRequestBody,
        });

        if (!response.ok) throw new Error("Failed to refine piece");
        const data = (await response.json()) as CustomPieceRefinement;
        if (controller.signal.aborted) return;

        setCustomRefinement(data);
        setCustomRefinementState("ready");
        setDrawerRole((current) => {
          if (lastSuggestedRoleIsLocked && lastSuggestedRole) {
            return lastSuggestedRole as CollectionRoleId;
          }
          if (current) return current;
          if (lastSuggestedRole) return lastSuggestedRole as CollectionRoleId;
          return mapRoleLabelToId(data.role);
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setCustomRefinement(null);
        setCustomRefinementState("idle");
      } finally {
        if (refinementAbortRef.current === controller) {
          refinementAbortRef.current = null;
        }
      }
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
      if (refinementAbortRef.current === controller) {
        refinementAbortRef.current = null;
      }
    };
  }, [
    customRefinementRequestBody,
    customProposal,
    drawerPiece?.custom,
    lastSuggestedRole,
    lastSuggestedRoleIsLocked,
  ]);

  useEffect(() => {
    if (!drawerPiece?.custom || !customRefinement) return;

    const nextCategory = customRefinement.category ?? "";
    const nextSubcategory = normalizeSpecSubcategoryId(customRefinement.subcategory) ?? customRefinement.subcategory ?? "";
    const shouldUpdateCategory = !drawerCategory || drawerCategory === lastInferredDrawerCategoryRef.current;
    const shouldUpdateSubcategory = !drawerSubcategory || drawerSubcategory === lastInferredDrawerSubcategoryRef.current;

    if (shouldUpdateCategory || shouldUpdateSubcategory) {
      isInferredPieceTypeUpdateRef.current = true;
    }

    setDrawerCategory((current) => {
      if (!current || current === lastInferredDrawerCategoryRef.current) return nextCategory;
      return current;
    });
    setDrawerSubcategory((current) => {
      if (!current || current === lastInferredDrawerSubcategoryRef.current) return nextSubcategory;
      return current;
    });

    lastInferredDrawerCategoryRef.current = nextCategory;
    lastInferredDrawerSubcategoryRef.current = nextSubcategory;
  }, [customRefinement, drawerCategory, drawerPiece?.custom, drawerSubcategory]);

  const handleStartBuilding = useCallback(() => {
    if (!drawerPiece || !drawerRole) return;
    if (drawerPiece.custom && (!pieceTargetMsrp || pieceTargetMsrp <= 0)) {
      setPieceTargetMsrpError(true);
      return;
    }
    const finalPieceName = drawerPiece.custom
      ? drawerPieceName.trim() || customProposal.trim()
      : drawerPieceName.trim() || drawerPiece.item;
    if (!finalPieceName) return;
    const inferredType = drawerSubcategory || customRefinement?.subcategory || resolvePieceImageType({
      type: drawerPiece.type,
      pieceName: finalPieceName,
      category: drawerCategory,
    });
    const inferredCategory = customRefinement?.category ||
      (inferredType === "straight-pant" || inferredType === "trouser" || inferredType === "skirt" || inferredType === "mini-skirt"
        ? "bottoms"
        : inferredType?.includes("dress")
          ? "dresses"
          : inferredType === "jacket" || inferredType === "trench" || inferredType === "coat" || inferredType === "parka" || inferredType === "puffer" || inferredType === "raincoat"
            ? "outerwear"
            : inferredType === "knit-sweater" || inferredType === "cardigan"
              ? "knitwear"
              : inferredType
                ? "tops"
                : drawerPiece.category);
    const finalPiece: KeyPiece = {
      ...drawerPiece,
      item: finalPieceName,
      category: (drawerCategory || inferredCategory) ?? null,
      type: drawerSubcategory || inferredType,
    };
    const pieceBuildContext: PieceBuildContext = {
      adaptedTitle:
        drawerPiece.custom
          ? finalPieceName
          : drawerSuggestion?.adapted_title ?? finalPieceName,
      role: drawerRole,
      archetype:
        drawerPiece.custom
          ? (customFinalExpression.trim() || finalPieceName).toLowerCase().replace(/\s+/g, "_")
          : drawerSuggestion?.archetype ?? drawerPiece.item.toLowerCase().replace(/\s+/g, "_"),
      originalLabel:
        drawerPiece.custom
          ? customProposal.trim() || finalPieceName
          : (drawerSuggestion?.original_label ?? drawerPiece.item),
      expression:
        drawerPiece.custom && customFinalExpression.trim() && customFinalExpression.trim() !== finalPieceName
          ? customFinalExpression.trim()
          : null,
      translation:
        (drawerPiece.custom
          ? customRefinement?.read || directionInterpretationText
          : (drawerSuggestion?.version_label ?? directionInterpretationText)) || null,
      collectionLanguage: collectionLanguageExpression.map((chip) => ({
        label: chip.label,
        state: chip.state,
      })),
      expressionSignals: expressionSignalExpression.map((chip) => ({
        label: chip.label,
        state: chip.state,
      })),
      complexityBias,
    };
    setSelectedKeyPiece(finalPiece);
    setCollectionRole(drawerRole);
    setPieceBuildContext(pieceBuildContext);
    setSavedAnalysisId(null);
    if (drawerPiece.custom && pieceTargetMsrp && pieceTargetMsrp > 0) {
      storeSetTargetMsrp(pieceTargetMsrp);
    }
    setPieceRolesById({
      ...pieceRolesById,
      [finalPieceName]: drawerRole,
    });
    setActiveProductPieceId(finalPieceName);
    setLastSuggestedRole(null);
    setLastSuggestedRoleIsLocked(false);
    setLastSuggestionRationale(null);
    if (drawerPiece.custom) {
      setMaterial("");
      setCategory(drawerCategory || inferredCategory || "");
      setSubcategory(drawerSubcategory || inferredType || "");
    } else {
      setCategory(drawerCategory || drawerPiece.category || "");
      setSubcategory(drawerSubcategory || drawerPiece.type || "");
    }
    router.push("/spec");
  }, [
    drawerPiece,
    drawerPieceName,
    drawerCategory,
    drawerSubcategory,
    drawerRole,
    customFinalExpression,
    customProposal,
    customRefinement?.read,
    customRefinement?.category,
    customRefinement?.subcategory,
    pieceTargetMsrp,
    setSelectedKeyPiece,
    setCollectionRole,
    setPieceTargetMsrpError,
    setPieceBuildContext,
    setSavedAnalysisId,
    pieceRolesById,
    setPieceRolesById,
    setActiveProductPieceId,
    setCategory,
    setMaterial,
    setSubcategory,
    storeSetTargetMsrp,
    router,
    drawerSuggestion,
    setLastSuggestedRole,
    setLastSuggestedRoleIsLocked,
    setLastSuggestionRationale,
    directionInterpretationText,
    collectionLanguageExpression,
    expressionSignalExpression,
    complexityBias,
  ]);

  const categories = (categoriesData as CategoriesData).categories;
  const allSubcategories = subcategoriesData as Record<string, SubcategoryEntry[]>;

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: BG, fontFamily: inter }}>
      <MukoNav
        activeTab="pieces"
        setupComplete={conceptLocked}
        collectionName={collectionName || undefined}
        seasonLabel={season || undefined}
        onBack={() => router.push("/concept")}
        onSaveClose={() => router.push("/collections")}
      />

      {/* ── Collection context strip ─────────────────────────── */}
      <div
        style={{
          position: "fixed",
          top: 72,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: 0,
        }}
      >
        <CollectionContextBar
          strategySummary={(strategySummary || contextRow?.agent_versions?.strategy_summary || undefined) as string | undefined}
          collectionName={collectionName}
          season={season}
          direction={directionName}
          pointOfView={aestheticInflection || directionInterpretationText || contextRow?.aesthetic_inflection || undefined}
          collectionLanguage={collectionLanguageLabels}
          silhouette={conceptSilhouette || contextRow?.silhouette || undefined}
          palette={(paletteName as string) || undefined}
          expressionSignals={expressionSignalLabels}
          moodboardImages={moodboardImages.length > 0 ? moodboardImages : contextRow?.mood_board_images ?? []}
          action={
            <button
              onClick={() => router.push("/concept")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: 0,
                border: "none",
                background: "none",
                fontFamily: inter,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#4D302F",
                cursor: "pointer",
                opacity: 0.72,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.72")}
            >
              Change direction
            </button>
          }
        />
      </div>

      {/* ── Main content area ──────────────────────────────── */}
      <div
        style={{
          paddingTop: 72 + COLLECTION_CONTEXT_BAR_OFFSET,
          display: "flex",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* Left panel */}
        <div style={{ flex: 1, padding: "36px 40px", overflowY: "auto" }}>
          {/* "Your Collection" section header */}
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                ...EYEBROW_STYLE,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.18em",
                color: "#888078",
                marginBottom: 10,
              }}
            >
              build piece by piece
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  ...SECTION_TITLE_STYLE,
                  fontSize: 32,
                  color: "#43432B",
                  letterSpacing: "-0.04em",
                  lineHeight: 0.98,
                }}
              >
                Your vision is set. Let&apos;s make it wearable.
              </div>
              <button
                type="button"
                onClick={() =>
                  openDrawer({
                    item: "",
                    signal: null,
                    category: null,
                    type: null,
                    recommended_material_id: null,
                    redirect_material_id: null,
                    custom: true,
                  })
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  minHeight: 38,
                  padding: "0 16px",
                  borderRadius: 999,
                  border: `1px solid ${STEEL_BLUE}`,
                  background: "transparent",
                  boxShadow: "none",
                  fontFamily: sohne,
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: STEEL_BLUE,
                  cursor: "pointer",
                  flexShrink: 0,
                  marginLeft: 16,
                  transition: "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease, background 140ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 10px 24px rgba(125,150,172,0.14)";
                  e.currentTarget.style.borderColor = "rgba(125,150,172,0.72)";
                  e.currentTarget.style.background = "rgba(125,150,172,0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = STEEL_BLUE;
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: 13, lineHeight: 1 }}>+</span>
                Add your own
              </button>
            </div>
            <div
              style={{
                ...BODY_COPY_STYLE,
                marginTop: 6,
                maxWidth: 620,
              }}
            >
              Start building piece by piece — Muko will keep you honest.
            </div>
          </div>

          {/* Confirmed pieces grid or empty state */}
          {totalConfirmed === 0 ? (
            <div
              style={{
                background: "white",
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: "52px 40px",
                textAlign: "center",
                marginBottom: 48,
              }}
            >
              <div
                style={{
                  ...EYEBROW_STYLE,
                  color: BORDER,
                  marginBottom: 12,
                }}
              >
                No pieces yet
              </div>
              <div
                style={{
                  ...BODY_COPY_STYLE,
                  maxWidth: 340,
                  margin: "0 auto",
                }}
              >
                The collection frame is set. Pick a starting point below or add your own piece to begin building into it.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
                marginBottom: 32,
              }}
            >
              {confirmedPieces.map((piece) => (
                <ConfirmedPieceCard
                  key={piece.id}
                  piece={piece}
                  onClick={() => handleOpenConfirmedPiece(piece)}
                  onRename={(nextName) => handleRenameConfirmedPiece(piece.id, nextName)}
                  onDelete={() => handleDeleteConfirmedPiece(piece.id)}
                />
              ))}
            </div>
          )}

          {/* Section divider */}
          <div
            ref={suggestedPiecesRef}
            style={{
              display: "flex",
              alignItems: "center",
              margin: "4px 0 22px",
            }}
          >
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span
              style={{
                ...EYEBROW_STYLE,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.18em",
                color: "#888078",
                padding: "0 16px",
                whiteSpace: "nowrap" as const,
              }}
            >
              Muko&apos;s Starting Points
            </span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                ...SECTION_TITLE_STYLE,
                fontSize: 24,
                color: "#43432B",
                lineHeight: 1.1,
                marginBottom: 8,
              }}
            >
              Starting points for your collection
            </div>
            <div
              style={{
                ...BODY_COPY_STYLE,
              }}
            >
              Based on current market signals, translated through your direction
            </div>
          </div>

          {/* Suggested pieces grid */}
          {startingPointSuggestions.length === 0 ? (
            collectionAesthetic ? (
              <div
                style={{
                  background: "white",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 14,
                  padding: "56px 40px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 82,
                    height: 82,
                    borderRadius: 28,
                    margin: "0 auto 22px",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,249,246,0.96) 100%)",
                    border: "1px solid rgba(226,221,214,0.95)",
                    boxShadow: "0 18px 34px rgba(67,67,43,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="6" y="3.5" width="12" height="17" rx="2.5" stroke="rgba(67,67,43,0.58)" strokeWidth="1.5" />
                    <path d="M9 9.5H15" stroke="rgba(67,67,43,0.58)" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M9 13.5H15" stroke="rgba(67,67,43,0.58)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#191919",
                    marginBottom: 12,
                    letterSpacing: "-0.02em",
                  }}
                >
                  All key pieces added
                </div>
                <div
                  style={{
                    maxWidth: 430,
                    margin: "0 auto",
                    fontFamily: inter,
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: "#888078",
                  }}
                >
                  You&apos;ve already added every recommended starting point for this collection. Add your own piece to keep building from here.
                </div>
              </div>
            ) : (
              <div
                style={{
                  ...BODY_SMALL_STYLE,
                }}
              >
                Set a collection direction to see starting points.
              </div>
            )
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
              }}
            >
              {startingPointSuggestions.map((piece) => (
                <SuggestedPieceCard
                  key={piece.original_label}
                  piece={piece}
                  microcopy={pieceMicrocopyByName[piece.adapted_title] ?? piece.shortRationale}
                  onBuild={() => openSuggestedSheet(piece)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right panel ───────────────────────────────────── */}
        <div
          style={{
            width: 320,
            padding: "34px 28px 28px",
            background: BG,
            borderLeft: `1px solid ${BORDER}`,
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          {/* Muko's Read */}
          <div
            style={{
              marginBottom: 20,
            }}
          >
            <div
              style={{
                ...READ_ZONE_LABEL_STYLE,
                marginBottom: 8,
              }}
            >
              MUKO&apos;S READ
            </div>
            {rightRailPiecesRead ? (
              <>
                <MukoTypedLoadingState
                  key={`pieces-read-${rightRailPiecesRead.read_headline}-${rightRailPiecesRead.read_body}`}
                  headline={rightRailPiecesRead.read_headline}
                  body={rightRailPiecesRead.read_body}
                  showFooter={false}
                  headlineStyle={{
                    ...SECTION_TITLE_STYLE,
                    marginBottom: 0,
                    fontSize: 18,
                    lineHeight: 1.26,
                  }}
                  bodyContainerStyle={{ marginTop: 10 }}
                  bodyStyle={{ ...READ_BODY_STYLE, lineHeight: 1.68 }}
                />
                <div style={{ display: "grid", gap: 30 }}>
                  {rightRailPiecesRead.how_to_lean_in?.trim() ? (
                    <div style={{ paddingTop: 14 }}>
                      <div style={{ ...READ_ZONE_LABEL_STYLE, marginBottom: 16 }}>How to Lean In</div>
                      <div style={{ ...READ_BODY_STYLE, lineHeight: 1.68 }}>{rightRailPiecesRead.how_to_lean_in}</div>
                    </div>
                  ) : null}
                  <div
                    style={{
                      padding: "8px 0 0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: "7px",
                    }}
                  >
                    <span style={{ fontSize: "20px", color: "rgba(77,48,47,0.52)", lineHeight: "1", marginTop: "-2px" }}>✳</span>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "11px",
                        color: "rgba(77,48,47,0.52)",
                        lineHeight: "1.4",
                        fontFamily: inter,
                      }}
                    >
                      Muko uses AI — always apply your own judgment.
                    </p>
                  </div>
                  <div>
                    <div style={{ height: 1, background: "rgba(67,67,43,0.08)", margin: "18px 0 18px" }} />
                    <div
                      style={{
                        ...READ_ZONE_LABEL_STYLE,
                        marginBottom: 6,
                      }}
                    >
                      Start Here
                    </div>
                    <div
                      style={{
                        ...SECTION_TITLE_STYLE,
                        fontSize: 18,
                        color: "#43432B",
                        lineHeight: 1.26,
                        marginBottom: 0,
                      }}
                    >
                      {rightRailPiecesRead.start_here_title?.trim()
                        ? rightRailPiecesRead.start_here_title
                        : recommendedStartPiece?.name ?? "Lead with the clearest piece"}
                    </div>
                    {rightRailPiecesRead.start_here_body ? (
                      <div style={{ marginTop: 8, marginBottom: 16 }}>
                        <p
                          style={{
                            ...READ_BODY_STYLE,
                            color: TEXT,
                            lineHeight: 1.68,
                          }}
                        >
                          {rightRailPiecesRead.start_here_body}
                        </p>
                      </div>
                    ) : null}
                    <div style={{ display: "grid", gap: 14, justifyItems: "start" }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!recommendedStartSuggestion) return;
                          openSuggestedSheet(recommendedStartSuggestion);
                        }}
                        style={{
                          padding: 0,
                          border: "none",
                          background: "none",
                          fontFamily: inter,
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: CHARTREUSE,
                          letterSpacing: "0.01em",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.76")}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                      >
                        Build this starting point →
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenAskMukoStartingPoint}
                        style={{
                          padding: 0,
                          border: "none",
                          background: "none",
                          fontFamily: inter,
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: "#B07C88",
                          letterSpacing: "0.01em",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.76")}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                      >
                        Ask Muko what to make →
                      </button>
                    </div>
                  </div>
                </div>
              </>
	            ) : (
	              <div style={{ display: "grid", gap: 22 }}>
                <div style={{ display: "grid", gap: 14 }}>
                  <div
                    style={{
                      height: 24,
                      width: "78%",
                      borderRadius: 8,
                      background: "rgba(67,67,43,0.06)",
                      animation: "skeleton-loading 1.4s ease-in-out infinite",
                    }}
                  />
                  <div
                    style={{
                      height: 96,
                      borderRadius: 16,
                      background: "rgba(67,67,43,0.06)",
                      animation: "skeleton-loading 1.4s ease-in-out infinite",
                    }}
                  />
                  <div
                    style={{
                      height: 126,
                      borderRadius: 16,
                      background: "rgba(67,67,43,0.06)",
                      animation: "skeleton-loading 1.4s ease-in-out infinite",
                    }}
                  />
	                </div>
	              </div>
	            )}
	          </div>
	        </div>
	        <AskMuko
          step="pieces"
          context={askMukoContext}
          isOpen={isAskMukoOpen}
          onOpenChange={setIsAskMukoOpen}
          openingMessage={askMukoOpeningMessage}
          openingMessageVersion={askMukoOpeningMessageVersion}
        />
      </div>

      <style>{`
        .pieces-read-ready-pill {
          position: fixed;
          bottom: 24px;
          right: var(--pieces-read-pill-right, 68px);
          z-index: 50;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 100px;
          font-family: "Söhne Breit", sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.01em;
          cursor: pointer;
          white-space: nowrap;
          border: none;
          background: #c8cc9e;
          color: #3a3d20;
          box-shadow: 0 10px 30px rgba(67,67,43,0.12);
          transition: background 160ms ease, border-color 160ms ease;
        }

        .pieces-read-ready-pill:hover {
          background: #c8cc9e;
        }

        .pieces-read-ready-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 1px 7px;
          border-radius: 100px;
          background: rgba(0,0,0,0.08);
          font-size: 11px;
          line-height: 1.2;
        }
      `}</style>

      {/* Floating readiness chip */}
      {totalConfirmed >= 5 ? (
        <button
          onClick={() => {
            trackEvent(null, "step_completed", {
              from_step: "pieces",
              to_step: "report",
              collection_id: activeCollection || collectionName || null,
            });
            router.push("/report");
          }}
          className="pieces-read-ready-pill"
          title={collectionReadPillTitle}
          style={
            {
              "--pieces-read-pill-right": isAskMukoOpen ? "320px" : "68px",
            } as React.CSSProperties
          }
        >
          <span className="pieces-read-ready-count">{totalConfirmed}</span>
          <span>{`${totalConfirmed} pieces · Generate report →`}</span>
        </button>
      ) : null}

      {/* ── Confirm Drawer ─────────────────────────────────── */}
      {drawerPiece && (
        <ConfirmDrawer
          piece={drawerPiece}
          pieceName={drawerPieceName}
          category={drawerCategory}
          subcategory={drawerSubcategory}
          categories={categories}
          allSubcategories={allSubcategories}
          selectedRole={drawerRole}
          suggestion={
            lastSuggestedRole
              ? {
                  role: lastSuggestedRole as CollectionRoleId,
                  rationale:
                    lastSuggestionRationale ??
                    (drawerSuggestion?.description || inferredDrawerSuggestion?.rationale || "Recommended by Muko for this collection context."),
                }
              : drawerPiece.custom
              ? inferredDrawerSuggestion
              : drawerSuggestion
              ? { role: drawerSuggestion.role, rationale: drawerSuggestion.description }
              : inferredDrawerSuggestion
          }
          customProposal={customProposal}
          customFinalExpression={customFinalExpression}
          customRefinement={customRefinement}
          customRefinementState={customRefinementState}
          onPieceNameChange={setDrawerPieceName}
          onCategoryChange={(value) => {
            setDrawerCategory(value);
            setCustomRefinement(null);
            setCustomRefinementState("idle");
            if (!lastSuggestedRoleIsLocked) {
              setDrawerRole(lastSuggestedRole ? (lastSuggestedRole as CollectionRoleId) : null);
            }
          }}
          onSubcategoryChange={(value) => {
            setDrawerSubcategory(value);
            setCustomRefinement(null);
            setCustomRefinementState("idle");
            if (!lastSuggestedRoleIsLocked) {
              setDrawerRole(lastSuggestedRole ? (lastSuggestedRole as CollectionRoleId) : null);
            }
          }}
          onRoleSelect={setDrawerRole}
          onCustomProposalChange={(value) => {
            setCustomProposal(value);
            setCustomRefinement(null);
            setCustomRefinementState("idle");
            if (!lastSuggestedRoleIsLocked) {
              setDrawerRole(lastSuggestedRole ? (lastSuggestedRole as CollectionRoleId) : null);
            }
          }}
          onCustomFinalExpressionChange={setCustomFinalExpression}
          onAcceptRefinedExpression={() => {
            if (!customRefinement) return;
            setCustomFinalExpression(customRefinement.refined_expression);
            setDrawerRole((current) => {
              if (lastSuggestedRoleIsLocked && lastSuggestedRole) {
                return lastSuggestedRole as CollectionRoleId;
              }
              return current ?? (lastSuggestedRole ? (lastSuggestedRole as CollectionRoleId) : mapRoleLabelToId(customRefinement.role));
            });
          }}
          onContinueWithOriginal={() => {
            const original = customProposal.trim();
            if (!original) return;
            setCustomFinalExpression(original);
            if (lastSuggestedRoleIsLocked && lastSuggestedRole) {
              setDrawerRole(lastSuggestedRole as CollectionRoleId);
            } else if (!drawerRole && lastSuggestedRole) {
              setDrawerRole(lastSuggestedRole as CollectionRoleId);
            } else if (!drawerRole && customRefinement) {
              setDrawerRole(mapRoleLabelToId(customRefinement.role));
            }
          }}
          onStartBuilding={handleStartBuilding}
          onCancel={closeDrawer}
          pieceTargetMsrp={pieceTargetMsrp}
          onPieceTargetMsrpChange={(value) => {
            setPieceTargetMsrp(value);
            setPieceTargetMsrpError(false);
          }}
          showPieceTargetMsrpError={pieceTargetMsrpError}
          roleLocked={Boolean(lastSuggestedRole && lastSuggestedRoleIsLocked)}
          roleSoftSuggested={Boolean(lastSuggestedRole && !lastSuggestedRoleIsLocked)}
        />
      )}

      {suggestedSheetOpen && selectedSuggestedPiece ? (
        <div
          onClick={closeSuggestedSheet}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(25,25,25,0.34)",
            zIndex: 300,
          }}
        >
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 400,
              padding: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "min(760px, calc(100vw - 32px))",
                maxHeight: "min(840px, calc(100vh - 32px))",
                overflowY: "auto",
                pointerEvents: "auto",
                background: "rgba(252,249,243,0.58)",
                backdropFilter: "blur(48px)",
                WebkitBackdropFilter: "blur(48px)",
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.82)",
                boxShadow: "0 24px 64px rgba(50,40,20,0.18)",
                padding: "22px 22px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  marginBottom: 22,
                }}
              >
                <button
                  type="button"
                  aria-label="Close"
                  onClick={closeSuggestedSheet}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 999,
                    border: "none",
                    background: "rgba(67,67,43,0.07)",
                    color: "#43432B",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>×</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartSuggestedPiece}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    padding: "11px 18px",
                    background: "#191919",
                    color: "#F5F2EC",
                    fontFamily: sohne,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    cursor: suggestedMsrp != null && suggestedMsrp > 0 ? "pointer" : "not-allowed",
                    opacity: suggestedMsrp != null && suggestedMsrp > 0 ? 1 : 0.35,
                    transition: "opacity 180ms ease, background 160ms ease",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(event) => {
                    if (suggestedMsrp != null && suggestedMsrp > 0) {
                      event.currentTarget.style.background = "#2A2A2A";
                    }
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = "#191919";
                  }}
                >
                  Start building →
                </button>
              </div>

              <div style={{ padding: "8px 6px 0" }}>
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    alignItems: "center",
                    marginBottom: 18,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 90,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 58,
                      }}
                    >
                      {(() => {
                        const previewType = resolvePieceImageType({
                          type: selectedSuggestedPiece.sourcePiece.type,
                          pieceName: selectedSuggestedPiece.adapted_title,
                          category: selectedSuggestedPiece.sourcePiece.category ?? undefined,
                        });
                        const previewFlat = previewType
                          ? getFlatForPiece(previewType, selectedSuggestedPiece.sourcePiece.signal) as {
                              Flat: React.ComponentType<{ color: string }>;
                              color: string;
                            } | null
                          : null;
                        if (!previewFlat) return null;
                        const PreviewFlat = previewFlat.Flat;
                        return <PreviewFlat color={previewFlat.color} />;
                      })()}
                    </div>
                  </div>

                  <div
                    style={{
                      minWidth: 0,
                      flex: "1 1 360px",
                      display: "flex",
                      alignItems: "center",
                      minHeight: 90,
                    }}
                  >
                    <div
                      style={{
                        ...SECTION_TITLE_STYLE,
                        fontSize: 24,
                        color: "#1E1C12",
                        lineHeight: 1.16,
                      }}
                    >
                      {selectedSuggestedPiece.adapted_title}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "rgba(67,67,43,0.48)",
                      marginBottom: 10,
                    }}
                  >
                    Piece role
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 5,
                    }}
                  >
                    {PIECE_ROLE_OPTIONS.map((option) => {
                      const isSelected = suggestedRole === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSuggestedRole(option.id)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "11px 12px",
                            borderRadius: 9,
                            border: isSelected
                              ? "0.5px solid rgba(184,135,107,0.55)"
                              : "0.5px solid rgba(67,67,43,0.1)",
                            background: isSelected ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.18)",
                            cursor: "pointer",
                            transition: "background 160ms ease, border-color 160ms ease",
                          }}
                        >
                          <div
                            style={{
                              fontFamily: sohne,
                              fontSize: 14,
                              fontWeight: 500,
                              color: "#1E1C12",
                              marginBottom: 4,
                              letterSpacing: "-0.02em",
                            }}
                          >
                            {option.label}
                          </div>
                          <div
                            style={{
                              fontFamily: inter,
                              fontSize: 10,
                              color: "#7A7260",
                              lineHeight: 1.45,
                            }}
                          >
                            {option.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  style={{
                    paddingTop: 14,
                    borderTop: "0.5px solid rgba(67,67,43,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0, flex: "1 1 280px" }}>
                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "rgba(67,67,43,0.48)",
                        marginBottom: 6,
                      }}
                    >
                      Target retail price
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: inter,
                          fontSize: 20,
                          fontWeight: 300,
                          color: "#1E1C12",
                        }}
                      >
                        $
                      </span>
                      <input
                        type="number"
                        min="1"
                        placeholder="285"
                        value={suggestedMsrp ?? ""}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          if (!event.target.value) {
                            setSuggestedMsrp(null);
                            setSuggestedMsrpError(false);
                            return;
                          }
                          setSuggestedMsrp(Number.isFinite(nextValue) && nextValue > 0 ? nextValue : null);
                          setSuggestedMsrpError(false);
                        }}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          padding: 0,
                          fontFamily: sohne,
                          fontSize: 20,
                          fontWeight: 300,
                          letterSpacing: "-0.02em",
                          color: "#1E1C12",
                        }}
                      />
                    </div>
                    {suggestedMsrpError ? (
                      <div
                        style={{
                          marginTop: 6,
                          fontFamily: inter,
                          fontSize: 12,
                          color: "#B8876B",
                        }}
                      >
                        Set a price to unlock cost analysis
                      </div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#B8876B",
                      alignSelf: "flex-start",
                      paddingTop: 16,
                    }}
                  >
                    Required
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage ? <Toast message={toastMessage} /> : null}
    </div>
  );
}

export default dynamic(() => Promise.resolve(PiecesPageClient), {
  ssr: false,
  loading: () => <div style={{ minHeight: "100vh", background: BG }} />,
});
