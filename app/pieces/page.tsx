"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/store/sessionStore";
import type { CollectionRoleId, KeyPiece, PieceBuildContext } from "@/lib/store/sessionStore";
import { getFlatForPiece } from "@/components/flats";
import { MukoNav } from "@/components/MukoNav";
import { createClient } from "@/lib/supabase/client";
import { getCollectionLanguageLabels, getExpressionSignalLabels } from "@/lib/collection-signals";
import { resolvePieceImageType } from "@/lib/piece-image";
import aestheticsData from "@/data/aesthetics.json";
import categoriesData from "@/data/categories.json";
import { CollectionContextBar, COLLECTION_CONTEXT_BAR_OFFSET } from "@/components/collection/CollectionContextBar";
import { buildPiecesReadFallback } from "@/lib/pieces/buildPiecesReadFallback";
import { buildPiecesReadInput } from "@/lib/pieces/buildPiecesReadInput";
import {
  assignStrategicRole,
  buildDeterministicPieceMicrocopy,
  buildStrategicReasonTags,
  getStrategicRoleLabel,
} from "@/lib/pieces/roleAssignment";
import { selectRecommendedStartPiece } from "@/lib/pieces/selectRecommendedStartPiece";
import type { DeterministicSuggestedPiece, PiecesReadOutput, PieceStrategicRole } from "@/lib/pieces/types";

// ── Design tokens ──────────────────────────────────────────────
const BG = "#FAF9F6";
const BG2 = "#F2EFE9";
const TEXT = "#191919";
const MUTED = "#888078";
const BORDER = "#E2DDD6";
const CHARTREUSE = "#A8B475";
const GREEN = "#7A9E7E";
const AMBER = "#C4955A";
const RED = "#B85C5C";

const sohne = "var(--font-sohne-breit), -ui-sans-serif, sans-serif";
const inter = "var(--font-inter), -ui-sans-serif, sans-serif";
const EYEBROW_STYLE = {
  fontFamily: inter,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase" as const,
  color: "rgba(67,67,43,0.4)",
};
const SECTION_TITLE_STYLE = {
  fontFamily: sohne,
  fontWeight: 500,
  color: "#43432B",
  letterSpacing: "-0.03em",
};
const BODY_COPY_STYLE = {
  fontFamily: inter,
  fontSize: 13.5,
  color: "rgba(67,67,43,0.56)",
  lineHeight: 1.62,
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
  piece_name: string | null;
  score: number | null;
  dimensions: Record<string, number> | null;
  collection_role: string | null;
  category: string | null;
  silhouette: string | null;
  aesthetic_matched_id: string | null;
  aesthetic_inflection: string | null;
  construction_tier: string | null;
  agent_versions?: {
    saved_piece_name?: string | null;
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

type CategoriesData = { categories: Array<{ id: string; name: string }> };
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

type CustomPieceRoleLabel = "Hero" | "Volume Driver" | "Core Evolution" | "Directional Signal";

type CustomPieceRefinement = {
  read: string;
  refined_expression: string;
  role: CustomPieceRoleLabel;
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

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function deriveCustomPieceName(value: string) {
  const normalized = value
    .replace(/[.;:,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "";

  const token = normalized.toLowerCase();

  if (token.includes("cigarette") && (token.includes("jean") || token.includes("denim"))) return "Cigarette Jean";
  if (token.includes("straight") && token.includes("jean")) return "Straight Jean";
  if (token.includes("blazer") && token.includes("soft shoulder")) return "Soft Shoulder Blazer";
  if (token.includes("blazer")) return "Tailored Blazer";
  if (token.includes("draped") && token.includes("dress")) return "Draped Dress";
  if (token.includes("slip") && token.includes("dress")) return "Slip Dress";
  if (token.includes("trouser")) return token.includes("wide") ? "Wide Trouser" : "Straight Trouser";
  if (token.includes("jean") || token.includes("denim")) return "Jean";
  if (token.includes("dress")) return "Dress";
  if (token.includes("coat")) return "Coat";
  if (token.includes("jacket")) return "Jacket";
  if (token.includes("skirt")) return "Skirt";
  if (token.includes("shirt")) return "Shirt";
  if (token.includes("knit") || token.includes("sweater")) return "Knit";

  return toTitleCase(normalized.split(" ").slice(0, 3).join(" "));
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
}: {
  piece: CollectionPiece;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const score = piece.score;
  const scoreDotBg =
    score === null ? BG2 : score >= 70 ? "#EDF5EE" : score >= 50 ? "#FBF3EA" : "#FAECE7";
  const scoreDotColor =
    score === null ? MUTED : score >= 70 ? GREEN : score >= 50 ? AMBER : RED;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
        <PieceFlat type={null} signal={null} category={piece.category} pieceName={getDisplayPieceName(piece)} size={65} />
        {/* Score dot */}
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
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
      </div>

      {/* Card body */}
      <div style={{ padding: "16px 18px 18px" }}>
        <div
          style={{
            fontFamily: sohne,
            fontWeight: 500,
            fontSize: 15,
            color: TEXT,
            marginBottom: 8,
            lineHeight: 1.24,
            letterSpacing: "-0.02em",
          }}
        >
          {getDisplayPieceName(piece)}
        </div>
        <div
          style={{
            ...BODY_SMALL_STYLE,
          }}
        >
          {[piece.category, piece.silhouette].filter(Boolean).join(" • ") || "In development"}
        </div>
      </div>
    </button>
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

function GlassLoadOrb() {
  return (
    <>
      <style>{`
        @keyframes mukoGlassOrbRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes mukoGlassOrbPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.06); opacity: 1; }
        }
      `}</style>
      <div
        style={{
          width: 56,
          height: 56,
          position: "relative",
          borderRadius: "50%",
          background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.42) 26%, rgba(232,227,214,0.3) 58%, rgba(232,227,214,0.16) 100%)",
          border: "1px solid rgba(67,67,43,0.08)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.82), 0 10px 22px rgba(67,67,43,0.08)",
          backdropFilter: "blur(14px) saturate(120%)",
          WebkitBackdropFilter: "blur(14px) saturate(120%)",
          animation: "mukoGlassOrbPulse 1.8s ease-in-out infinite",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 4,
            borderRadius: "50%",
            borderTop: "1.5px solid rgba(67,67,43,0.35)",
            borderRight: "1.5px solid rgba(67,67,43,0.08)",
            borderBottom: "1.5px solid rgba(67,67,43,0.08)",
            borderLeft: "1.5px solid rgba(67,67,43,0.14)",
            animation: "mukoGlassOrbRotate 1s linear infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 14,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.24) 55%, rgba(255,255,255,0) 100%)",
          }}
        />
      </div>
    </>
  );
}

// ── Confirm Drawer ─────────────────────────────────────────────
function ConfirmDrawer({
  piece,
  pieceName,
  category,
  categories,
  selectedRole,
  suggestion,
  customProposal,
  customFinalExpression,
  customRefinement,
  customRefinementState,
  onPieceNameChange,
  onCategoryChange,
  onRoleSelect,
  onCustomProposalChange,
  onCustomFinalExpressionChange,
  onAcceptRefinedExpression,
  onContinueWithOriginal,
  onStartBuilding,
  onCancel,
}: {
  piece: KeyPiece;
  pieceName: string;
  category: string;
  categories: Array<{ id: string; name: string }>;
  selectedRole: CollectionRoleId | null;
  suggestion: { role: CollectionRoleId; rationale: string } | null;
  customProposal: string;
  customFinalExpression: string;
  customRefinement: CustomPieceRefinement | null;
  customRefinementState: "idle" | "loading" | "ready";
  onPieceNameChange: (name: string) => void;
  onCategoryChange: (cat: string) => void;
  onRoleSelect: (role: CollectionRoleId) => void;
  onCustomProposalChange: (value: string) => void;
  onCustomFinalExpressionChange: (value: string) => void;
  onAcceptRefinedExpression: () => void;
  onContinueWithOriginal: () => void;
  onStartBuilding: () => void;
  onCancel: () => void;
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
    type: piece.type,
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
  const finalName = piece.custom ? customProposal.trim() : pieceName.trim() || piece.item;
  const canStart = piece.custom ? Boolean(selectedRole && finalName) : Boolean(selectedRole);

  const autoResizeTextarea = (event: React.FormEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    target.style.height = "0px";
    target.style.height = `${Math.min(target.scrollHeight, 220)}px`;
  };

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
                <div style={{ marginBottom: 22 }}>
                  {customRefinementState === "loading" ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-start",
                        padding: "8px 0 12px",
                        marginBottom: 14,
                      }}
                    >
                      <GlassLoadOrb />
                    </div>
                  ) : null}

                  {customRefinement ? (
                    <div style={{ display: "grid", gap: 14 }}>
                      <div
                        style={{
                          ...EYEBROW_STYLE,
                          color: "#6E675F",
                        }}
                      >
                        Muko&apos;s Take
                      </div>
                      <div>
                        <div style={BODY_COPY_STYLE}>{customRefinement.read}</div>
                      </div>
                      <div>
                        <div style={{ ...EYEBROW_STYLE, marginBottom: 6 }}>Suggested expression</div>
                        <div
                          style={{
                            fontFamily: sohne,
                            fontSize: 18,
                            fontWeight: 400,
                            color: "#43432B",
                            letterSpacing: "-0.035em",
                            lineHeight: 1.4,
                          }}
                        >
                          {`— ${customRefinement.refined_expression}`}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        <button
                          type="button"
                          onClick={onAcceptRefinedExpression}
                          style={{
                            border: "none",
                            background: "rgba(168,180,117,0.16)",
                            color: "#4F5B28",
                            borderRadius: 999,
                            padding: "9px 14px",
                            fontFamily: inter,
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Accept suggestion
                        </button>
                        <button
                          type="button"
                          onClick={onContinueWithOriginal}
                          style={{
                            border: `1px solid ${BORDER}`,
                            background: "transparent",
                            color: TEXT,
                            borderRadius: 999,
                            padding: "9px 14px",
                            fontFamily: inter,
                            fontSize: 11.5,
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                        >
                          Continue with original input
                        </button>
                      </div>
                      <div>
                        <div style={{ ...EYEBROW_STYLE, marginBottom: 6 }}>Recommended role</div>
                        <div
                          style={{
                            ...BODY_COPY_STYLE,
                            color: TEXT,
                            lineHeight: 1.35,
                            marginBottom: 4,
                          }}
                        >
                          {customRefinement.role}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
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
                <div
                  style={{
                    ...EYEBROW_STYLE,
                    marginBottom: 6,
                  }}
                >
                  CATEGORY
                </div>
                <select
                  value={category}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  style={{
                    width: "100%",
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    padding: "11px 14px",
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: category ? TEXT : MUTED,
                    fontFamily: inter,
                    outline: "none",
                    boxSizing: "border-box",
                    cursor: "pointer",
                    appearance: "none",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = CHARTREUSE)}
                  onBlur={(e) => (e.target.style.borderColor = BORDER)}
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Piece role */}
          <div
            style={{
              marginBottom: 8,
              ...EYEBROW_STYLE,
            }}
          >
            Piece role
          </div>
          {suggestion && !piece.custom && (
            <div style={{ marginBottom: 16, padding: "0 2px" }}>
              <div
                style={{
                  ...BODY_COPY_STYLE,
                  color: TEXT,
                }}
              >
                <span
                  style={{
                    fontFamily: sohne,
                    color: "#43432B",
                    fontWeight: 600,
                  }}
                >
                  Muko Suggests:
                </span>{" "}
                <span style={{ fontWeight: 600 }}>{getPieceRoleLabel(suggestion.role)}</span>
              </div>
              <div
                style={{
                  fontFamily: sohne,
                  fontSize: 12,
                  fontWeight: 400,
                  color: "#43432B",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.4,
                  marginTop: 6,
                }}
              >
                {`— ${suggestion.rationale}`}
              </div>
            </div>
          )}

          <div
            role="radiogroup"
            aria-label="Piece role"
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            {PIECE_ROLE_OPTIONS.map((option) => {
              const isSelected = selectedRole === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onRoleSelect(option.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: isSelected ? "1px solid rgba(168,180,117,0.52)" : `1px solid ${BORDER}`,
                    background: isSelected ? "rgba(168,180,117,0.11)" : "rgba(250,249,246,0.92)",
                    boxShadow: isSelected ? "0 0 0 1px rgba(168,180,117,0.08), 0 8px 20px rgba(67,67,43,0.05)" : "none",
                    cursor: "pointer",
                    transition: "background 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 16,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          ...SECTION_TITLE_STYLE,
                          fontSize: 18,
                          color: TEXT,
                          lineHeight: 1.2,
                          marginBottom: 4,
                        }}
                      >
                        {option.label}
                      </div>
                      <div
                        style={{
                          ...BODY_SMALL_STYLE,
                          color: isSelected ? "#6F6A63" : "rgba(67,67,43,0.56)",
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
                        marginTop: 3,
                        borderRadius: "50%",
                        border: isSelected ? "1px solid rgba(122,158,126,0.75)" : `1px solid ${BORDER}`,
                        background: isSelected ? "rgba(168,180,117,0.22)" : "transparent",
                        boxShadow: isSelected ? "inset 0 0 0 4px rgba(122,158,126,0.58)" : "none",
                        flexShrink: 0,
                        transition: "background 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

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
            disabled={!canStart}
            style={{
              background: canStart ? CHARTREUSE : "#ECE8E0",
              color: canStart ? "#3A4020" : "#9A9388",
              borderRadius: 100,
              padding: "11px 22px",
              fontSize: 11.5,
              fontWeight: 500,
              fontFamily: inter,
              border: "none",
              cursor: canStart ? "pointer" : "not-allowed",
              whiteSpace: "nowrap" as const,
              letterSpacing: "0.02em",
              transition: "background 160ms ease, color 160ms ease, opacity 160ms ease",
              opacity: canStart ? 1 : 0.86,
            }}
            onMouseEnter={(e) => {
              if (canStart) e.currentTarget.style.background = "#95A164";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = canStart ? CHARTREUSE : "#ECE8E0";
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
export default function PiecesPage() {
  const router = useRouter();
  const suggestedPiecesRef = React.useRef<HTMLDivElement | null>(null);
  const {
    collectionName,
    season,
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
    successPriorities,
    sliderTrend,
    sliderCreative,
    sliderElevated,
    sliderNovelty,
    intentGoals,
    targetMsrp,
    targetMargin,
    setSelectedKeyPiece,
    setCollectionRole,
    setCategory,
    setSubcategory,
    setMaterial,
    pieceRolesById,
    setPieceRolesById,
    setActiveProductPieceId,
    setPieceBuildContext,
    setSavedAnalysisId,
  } = useSessionStore();

  // Confirmed pieces from Supabase
  const [confirmedPieces, setConfirmedPieces] = useState<CollectionPiece[]>([]);

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
  const directionName = collectionAesthetic ?? "—";
  const collectionEntry = useMemo(
    () =>
      (aestheticsData as unknown as AestheticDataEntry[]).find(
        (entry) =>
          entry.name === collectionAesthetic ||
          entry.id === collectionAesthetic?.toLowerCase().replace(/\s+/g, "-")
      ) ?? null,
    [collectionAesthetic]
  );
  const paletteName = useMemo(
    () => collectionEntry?.palette_options?.find((palette) => palette.id === conceptPalette)?.name ?? conceptPalette ?? null,
    [collectionEntry, conceptPalette]
  );

  const collectionLanguageLabels = useMemo(() => {
    return getCollectionLanguageLabels(directionInterpretationChips, directionInterpretationText);
  }, [directionInterpretationChips, directionInterpretationText]);

  const expressionSignalLabels = useMemo(() => getExpressionSignalLabels(chipSelection), [chipSelection]);

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
        palette: [paletteName],
        expression: [...collectionLanguageLabels, ...expressionSignalLabels].slice(0, 6),
        interpretationText: directionInterpretationText || null,
        confirmedPieceCount: totalConfirmed,
        confirmedCategories,
        coverageGaps,
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
      deterministicSuggestedPieces,
      directionInterpretationText,
      directionName,
      expressionSignalLabels,
      paletteName,
      recommendedStartPiece,
      season,
      totalConfirmed,
    ]
  );

  const piecesReadFallback = useMemo(
    () => buildPiecesReadFallback(piecesReadInput),
    [piecesReadInput]
  );

  const [synthesizedPiecesRead, setSynthesizedPiecesRead] = useState<PiecesReadOutput | null>(null);

  const piecesReadRequestBody = useMemo(
    () => JSON.stringify(piecesReadInput),
    [piecesReadInput]
  );

  useEffect(() => {
    const controller = new AbortController();
    setSynthesizedPiecesRead(null);

    if (piecesReadInput.suggestedPieces.length === 0) return () => controller.abort();

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
          _meta?: { latency_ms?: number };
        };

        if (controller.signal.aborted) return;

        React.startTransition(() => {
          setSynthesizedPiecesRead({
            read_headline: data.read_headline,
            read_body: data.read_body,
            how_to_lean_in: data.how_to_lean_in,
            start_here_title: data.start_here_title,
            start_here_body: data.start_here_body,
            piece_microcopy: data.piece_microcopy,
          });
        });

        if (process.env.NODE_ENV !== "production") {
          console.debug("[Pieces Read] synthesized", {
            latencyMs: data._meta?.latency_ms,
            input: piecesReadInput,
          });
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;

        const message = error instanceof Error ? error.message : String(error);
        setSynthesizedPiecesRead(null);

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
  const [drawerRole, setDrawerRole] = useState<CollectionRoleId | null>(null);
  const [customProposal, setCustomProposal] = useState("");
  const [customFinalExpression, setCustomFinalExpression] = useState("");
  const [customRefinement, setCustomRefinement] = useState<CustomPieceRefinement | null>(null);
  const [customRefinementState, setCustomRefinementState] = useState<"idle" | "loading" | "ready">("idle");
  const refinementAbortRef = React.useRef<AbortController | null>(null);
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
      target_msrp: targetMsrp || null,
      margin: targetMargin || null,
      cost_ceiling: (targetMsrp ?? 0) > 0 && targetMargin > 0 ? Math.round((targetMsrp ?? 0) * (1 - targetMargin / 100)) : null,
    }),
    [targetMargin, targetMsrp]
  );

  const openDrawer = useCallback((piece: KeyPiece, suggestion: StartingPointSuggestion | null = null) => {
    setDrawerPiece(piece);
    setDrawerSuggestion(suggestion);
    setDrawerPieceName(piece.custom ? "" : piece.item);
    setDrawerCategory(piece.category ?? "");
    setDrawerRole(null);
    setCustomProposal(piece.custom ? piece.item : "");
    setCustomFinalExpression(piece.custom ? piece.item : "");
    setCustomRefinement(null);
    setCustomRefinementState("idle");
  }, []);

  const closeDrawer = useCallback(() => {
    refinementAbortRef.current?.abort();
    refinementAbortRef.current = null;
    setDrawerPiece(null);
    setDrawerSuggestion(null);
    setDrawerPieceName("");
    setDrawerCategory("");
    setDrawerRole(null);
    setCustomProposal("");
    setCustomFinalExpression("");
    setCustomRefinement(null);
    setCustomRefinementState("idle");
  }, []);

  useEffect(() => {
    if (!drawerPiece?.custom) return;
    const proposal = customProposal.trim();

    if (!proposal) {
      refinementAbortRef.current?.abort();
      refinementAbortRef.current = null;
      setCustomRefinement(null);
      setCustomRefinementState("idle");
      setDrawerRole(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      refinementAbortRef.current?.abort();
      refinementAbortRef.current = controller;
      setCustomRefinementState("loading");

      try {
        const response = await fetch("/api/piece-refine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
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
            user_input: proposal,
            selected_role: drawerRole ? getPieceRoleLabel(drawerRole) : undefined,
            existing_pieces: confirmedPieces.map((p) => ({
              name: getDisplayPieceName(p),
              role: p.collection_role ? getPieceRoleLabel(p.collection_role as CollectionRoleId) : "",
              category: p.category ?? "",
            })),
          }),
        });

        if (!response.ok) throw new Error("Failed to refine piece");
        const data = (await response.json()) as CustomPieceRefinement;
        if (controller.signal.aborted) return;

        setCustomRefinement(data);
        setCustomRefinementState("ready");
        setDrawerRole(mapRoleLabelToId(data.role));
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setCustomRefinement(null);
        setCustomRefinementState("idle");
      } finally {
        if (refinementAbortRef.current === controller) {
          refinementAbortRef.current = null;
        }
      }
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    collectionAesthetic,
    collectionLanguageLabels,
    collectionMaterials,
    collectionPriorities,
    commercialContext,
    conceptSilhouette,
    customProposal,
    directionInterpretationText,
    drawerPiece?.custom,
    paletteName,
    season,
    sliderCreative,
    sliderElevated,
    sliderNovelty,
    sliderTrend,
  ]);

  const handleStartBuilding = useCallback(() => {
    if (!drawerPiece || !drawerRole) return;
    const finalPieceName = drawerPiece.custom
      ? drawerPieceName.trim() || deriveCustomPieceName(customFinalExpression.trim() || customProposal.trim())
      : drawerPieceName.trim() || drawerPiece.item;
    if (!finalPieceName) return;
    const inferredType = resolvePieceImageType({
      type: drawerPiece.type,
      pieceName: finalPieceName,
      category: drawerCategory,
    });
    const inferredCategory =
      drawerCategory ||
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
      category: inferredCategory ?? null,
      type: inferredType,
    };
    const pieceBuildContext: PieceBuildContext = {
      adaptedTitle:
        drawerPiece.custom
          ? customFinalExpression.trim() || finalPieceName
          : drawerSuggestion?.adapted_title ?? finalPieceName,
      role: drawerRole,
      archetype:
        drawerPiece.custom
          ? (customFinalExpression.trim() || finalPieceName).toLowerCase().replace(/\s+/g, "_")
          : drawerSuggestion?.archetype ?? drawerPiece.item.toLowerCase().replace(/\s+/g, "_"),
      originalLabel: drawerPiece.custom ? customProposal.trim() || finalPieceName : drawerSuggestion?.original_label ?? drawerPiece.item,
      translation:
        (drawerPiece.custom
          ? customRefinement?.read || directionInterpretationText
          : drawerSuggestion?.version_label ?? directionInterpretationText) || null,
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
    setPieceRolesById({
      ...pieceRolesById,
      [finalPieceName]: drawerRole,
    });
    setActiveProductPieceId(finalPieceName);
    if (drawerPiece.custom) {
      setMaterial("");
      setSubcategory(inferredType ?? "");
    } else if (drawerCategory) {
      setCategory(drawerCategory);
    }
    router.push("/spec");
  }, [
    drawerPiece,
    drawerPieceName,
    drawerCategory,
    drawerRole,
    customFinalExpression,
    customProposal,
    customRefinement?.read,
    setSelectedKeyPiece,
    setCollectionRole,
    setPieceBuildContext,
    setSavedAnalysisId,
    pieceRolesById,
    setPieceRolesById,
    setActiveProductPieceId,
    setCategory,
    setMaterial,
    setSubcategory,
    router,
    drawerSuggestion,
    directionInterpretationText,
    collectionLanguageExpression,
    expressionSignalExpression,
    complexityBias,
  ]);

  const categories = (categoriesData as CategoriesData).categories;

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: inter }}>
      <MukoNav
        activeTab="pieces"
        setupComplete={conceptLocked}
        collectionName={collectionName || undefined}
        seasonLabel={season || undefined}
        onBack={() => router.push("/concept")}
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
          strategySummary={strategySummary}
          collectionName={collectionName}
          season={season}
          direction={directionName}
          pointOfView={aestheticInflection || directionInterpretationText || undefined}
          collectionLanguage={collectionLanguageLabels}
          silhouette={conceptSilhouette || undefined}
          palette={paletteName || undefined}
          expressionSignals={expressionSignalLabels}
          moodboardImages={moodboardImages}
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
                Build from the locked collection frame.
              </div>
              <button
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
                  fontFamily: inter,
                  fontSize: 11.5,
                  color: CHARTREUSE,
                  fontWeight: 500,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  flexShrink: 0,
                  marginLeft: 16,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                + Add your own
              </button>
            </div>
            <div
              style={{
                ...BODY_COPY_STYLE,
                marginTop: 6,
                maxWidth: 620,
              }}
            >
              Your direction and language are set. Start translating them piece by piece.
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
                  onClick={() => router.push("/spec")}
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
            <div
              style={{
                ...BODY_SMALL_STYLE,
              }}
            >
              {collectionAesthetic
                ? "All current market starting points have already been translated into your collection."
                : "Set a collection direction to see starting points."}
            </div>
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
                  onBuild={() => openDrawer(piece.sourcePiece, piece)}
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
            <div
              style={{
                ...READ_HEADLINE_STYLE,
                marginBottom: 10,
                fontSize: 18,
                lineHeight: 1.22,
              }}
            >
              {piecesReadContent.read_headline}
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ ...READ_BODY_STYLE, lineHeight: 1.68 }}>{piecesReadContent.read_body}</div>
              <div>
                <div style={{ ...READ_ZONE_LABEL_STYLE, marginBottom: 8 }}>How to Lean In</div>
                <div style={{ ...READ_BODY_STYLE, lineHeight: 1.68 }}>{piecesReadContent.how_to_lean_in}</div>
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
                    ...EYEBROW_STYLE,
                    marginBottom: 8,
                    color: "rgba(67,67,43,0.44)",
                  }}
                >
                  {piecesReadContent.start_here_title}
                </div>
                <div
                  style={{
                    ...SECTION_TITLE_STYLE,
                    fontSize: 18,
                    color: "#43432B",
                    lineHeight: 1.26,
                    marginBottom: 8,
                  }}
                >
                  {recommendedStartPiece?.name ?? recommendedStartSuggestion?.adapted_title ?? "Lead with the clearest piece"}
                </div>
                <div
                  style={{
                    ...READ_BODY_STYLE,
                    color: TEXT,
                    marginBottom: 10,
                    lineHeight: 1.68,
                  }}
                >
                  {piecesReadContent.start_here_body}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!recommendedStartSuggestion?.sourcePiece) return;
                    openDrawer(recommendedStartSuggestion.sourcePiece, recommendedStartSuggestion);
                  }}
                  style={{
                    padding: 0,
                    border: "none",
                    background: "none",
                    fontFamily: inter,
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: CHARTREUSE,
                    letterSpacing: "0.01em",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.76")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  Build this starting point →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirm Drawer ─────────────────────────────────── */}
      {drawerPiece && (
        <ConfirmDrawer
          piece={drawerPiece}
          pieceName={drawerPieceName}
          category={drawerCategory}
          categories={categories}
          selectedRole={drawerRole}
          suggestion={
            drawerPiece.custom
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
          onCategoryChange={setDrawerCategory}
          onRoleSelect={setDrawerRole}
          onCustomProposalChange={setCustomProposal}
          onCustomFinalExpressionChange={setCustomFinalExpression}
          onAcceptRefinedExpression={() => {
            if (!customRefinement) return;
            setCustomFinalExpression(customRefinement.refined_expression);
            setDrawerPieceName(deriveCustomPieceName(customRefinement.refined_expression));
            setDrawerRole(mapRoleLabelToId(customRefinement.role));
          }}
          onContinueWithOriginal={() => {
            const original = customProposal.trim();
            if (!original) return;
            setCustomFinalExpression(original);
            if (customRefinement) {
              setDrawerRole(mapRoleLabelToId(customRefinement.role));
            }
          }}
          onStartBuilding={handleStartBuilding}
          onCancel={closeDrawer}
        />
      )}
    </div>
  );
}
