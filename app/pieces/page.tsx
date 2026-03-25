"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/store/sessionStore";
import type { CollectionRoleId, KeyPiece, PieceBuildContext } from "@/lib/store/sessionStore";
import { getFlatForPiece } from "@/components/flats";
import { MukoNav } from "@/components/MukoNav";
import { createClient } from "@/lib/supabase/client";
import { getCollectionLanguageLabels, getExpressionSignalLabels } from "@/lib/collection-signals";
import aestheticsData from "@/data/aesthetics.json";
import categoriesData from "@/data/categories.json";
import { CollectionContextBar, COLLECTION_CONTEXT_BAR_OFFSET } from "@/components/collection/CollectionContextBar";

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

// ── Types ──────────────────────────────────────────────────────
interface CollectionPiece {
  id: string;
  piece_name: string;
  score: number | null;
  dimensions: Record<string, number> | null;
  collection_role: string | null;
  category: string | null;
  silhouette: string | null;
  aesthetic_matched_id: string | null;
  aesthetic_inflection: string | null;
  construction_tier: string | null;
}

interface AestheticDataEntry {
  id?: string;
  name: string;
  keywords?: string[];
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
  adaptation_summary: string;
  description: string;
  original_label: string;
  version_label: string;
  sourcePiece: KeyPiece;
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
      piece.piece_name,
      piece.category,
      piece.silhouette,
      piece.aesthetic_inflection,
      piece.collection_role,
    ]
      .filter(Boolean)
      .join(" ")
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

function formatChipList(labels: string[]) {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function getRecommendedPiecePrompt(
  targetChip: SignalExpression | undefined,
  suggestedPieces: KeyPiece[],
  directionName: string,
  expressionSignal?: string
) {
  if (!targetChip) {
    if (expressionSignal) {
      return `Add the next piece where ${expressionSignal} can register clearly so the collection does not stay conceptually defined but under-expressed.`;
    }
    return "Add the next piece where category coverage is still thin so the collection continues to build with intention.";
  }

  const terms = tokenizeChipLabel(targetChip.label);
  const matchedSuggestion = suggestedPieces.find((piece) => {
    const corpus = normalizeToken([piece.item, piece.category, piece.type, piece.note].filter(Boolean).join(" "));
    return terms.some((term) => corpus.includes(term));
  });

  if (matchedSuggestion) {
    const pieceLabel = matchedSuggestion.item.toLowerCase();
    return `Add a ${pieceLabel} to carry ${targetChip.label} while giving ${expressionSignal ?? "the collection"} a clearer read inside ${directionName}.`;
  }

  if (targetChip.label.toLowerCase().includes("fluid")) {
    return `Add a fluid blouse, draped dress, or soft knit to bring ${targetChip.label} into the assortment and offset the current structure.`;
  }

  if (targetChip.label.toLowerCase().includes("utility")) {
    return `Add a utility jacket or pocketed bottom so ${targetChip.label} reads as intentional rather than implied.`;
  }

  if (targetChip.label.toLowerCase().includes("tailored") || targetChip.label.toLowerCase().includes("structure")) {
    return `Add a tailored jacket or precise trouser to make ${targetChip.label} feel built into the line rather than left to one piece.`;
  }

  if (expressionSignal) {
    return `Add a piece that carries ${expressionSignal} through ${targetChip.label} so the collection reads as expressed rather than only defined.`;
  }

  return `Add a piece that clearly carries ${targetChip.label} so the collection language resolves across more than one silhouette.`;
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

  return {
    archetype: piece.item.toLowerCase().replace(/\s+/g, "_"),
    adapted_title: `${piece.item} with ${adaptation.titleModifier}`,
    intent,
    role,
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
  size = 65,
}: {
  type: string | null;
  signal: string | null;
  category: string | null;
  size?: number;
}) {
  if (type) {
    const result = getFlatForPiece(type, signal);
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
        <PieceFlat type={null} signal={null} category={piece.category} size={65} />
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
          {piece.piece_name}
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
  onBuild,
}: {
  piece: StartingPointSuggestion;
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
          {piece.intent}
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
            marginBottom: 12,
          }}
        >
          {piece.description}
        </div>
        <div
          style={{
            fontFamily: inter,
            fontSize: 11.5,
            color: "rgba(67,67,43,0.54)",
            lineHeight: 1.6,
            marginBottom: 14,
          }}
        >
          <span style={{ color: "rgba(67,67,43,0.5)" }}>Original trend:</span> {piece.original_label}
          <br />
          <span style={{ color: "rgba(67,67,43,0.5)" }}>Your version:</span> {piece.version_label}
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

// ── Confirm Drawer ─────────────────────────────────────────────
function ConfirmDrawer({
  piece,
  pieceName,
  category,
  categories,
  selectedRole,
  suggestedRole,
  suggestedRationale,
  structureCounts,
  onPieceNameChange,
  onCategoryChange,
  onRoleSelect,
  onStartBuilding,
  onCancel,
}: {
  piece: KeyPiece;
  pieceName: string;
  category: string;
  categories: Array<{ id: string; name: string }>;
  selectedRole: CollectionRoleId | null;
  suggestedRole: CollectionRoleId;
  suggestedRationale: string;
  structureCounts: Record<CollectionRoleId, number>;
  onPieceNameChange: (name: string) => void;
  onCategoryChange: (cat: string) => void;
  onRoleSelect: (role: CollectionRoleId) => void;
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

  const flatResult = piece.type
    ? (getFlatForPiece(piece.type, piece.signal) as {
        Flat: React.ComponentType<{ color: string }>;
        color: string;
      } | null)
    : null;
  const ctaLabel = selectedRole ? `Start Building as ${getPieceRoleLabel(selectedRole)} →` : "Start Building →";

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
            {piece.item}
          </div>
          <div
            style={{
              ...BODY_SMALL_STYLE,
              marginBottom: 20,
            }}
          >
            {metadataTokens.join(" • ")}
          </div>

          {/* 2-col field grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginBottom: 18,
            }}
            className="muko-claim-fields"
          >
            {/* Name field */}
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
              <div
                style={{
                  ...BODY_SMALL_STYLE,
                  marginTop: 4,
                }}
              >
                Name it in your own language
              </div>
            </div>

            {/* Category field */}
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

          {/* Piece role */}
          <div
            style={{
              marginBottom: 8,
              ...EYEBROW_STYLE,
            }}
          >
            Piece role
          </div>
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
                  color: "#A97B8F",
                  fontWeight: 600,
                }}
              >
                Muko Suggests:
              </span>{" "}
              <span style={{ fontWeight: 600 }}>{getPieceRoleLabel(suggestedRole)}</span>
            </div>
            <div
              style={{
                ...BODY_SMALL_STYLE,
                marginTop: 4,
              }}
            >
              {suggestedRationale}
            </div>
          </div>

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

          <div
            style={{
              marginTop: 14,
              ...BODY_SMALL_STYLE,
            }}
          >
            <span style={{ color: "#6F6A63", fontWeight: 500 }}>Collection structure:</span>{" "}
            Hero {structureCounts.hero} • Volume {structureCounts["volume-driver"]} • Core {structureCounts["core-evolution"]} • Directional {structureCounts.directional}
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
            disabled={!selectedRole}
            style={{
              background: selectedRole ? CHARTREUSE : "#ECE8E0",
              color: selectedRole ? "#3A4020" : "#9A9388",
              borderRadius: 100,
              padding: "11px 22px",
              fontSize: 11.5,
              fontWeight: 500,
              fontFamily: inter,
              border: "none",
              cursor: selectedRole ? "pointer" : "not-allowed",
              whiteSpace: "nowrap" as const,
              letterSpacing: "0.02em",
              transition: "background 160ms ease, color 160ms ease, opacity 160ms ease",
              opacity: selectedRole ? 1 : 0.86,
            }}
            onMouseEnter={(e) => {
              if (selectedRole) e.currentTarget.style.background = "#95A164";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = selectedRole ? CHARTREUSE : "#ECE8E0";
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
    sliderCreative,
    sliderElevated,
    setSelectedKeyPiece,
    setCollectionRole,
    setCategory,
    pieceRolesById,
    setPieceRolesById,
    setActiveProductPieceId,
    setPieceBuildContext,
  } = useSessionStore();

  // Confirmed pieces from Supabase
  const [confirmedPieces, setConfirmedPieces] = useState<CollectionPiece[]>([]);

  useEffect(() => {
    if (!collectionName) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("analyses")
        .select(
          "id, piece_name, score, dimensions, collection_role, category, silhouette, aesthetic_matched_id, aesthetic_inflection, construction_tier"
        )
        .eq("collection_name", collectionName)
        .eq("user_id", user.id)
        .then(({ data, error }) => {
          if (error) console.warn("[Pieces] fetch error:", error);
          if (data) setConfirmedPieces(data.filter((p) => p.piece_name));
        });
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
      confirmedPieces.map((p) => (p.piece_name ?? "").toLowerCase())
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

  const mukosReadData = useMemo(() => {
    if (collectionLanguageExpression.length === 0 && expressionSignalExpression.length === 0) {
      return {
        headline: "Your collection language will resolve as pieces accumulate.",
        body: "Lock the direction in Setup, then build pieces that define what the collection is and how it should come alive.",
      };
    }

    if (totalConfirmed === 0) {
      const languageLine = collectionLanguageLabels.length > 0 ? formatChipList(collectionLanguageLabels) : "the collection direction";
      const expressionLine = expressionSignalLabels.length > 0 ? formatChipList(expressionSignalLabels) : "its expression signals";
      return {
        headline: `You’ve defined ${languageLine}, but ${expressionLine} still needs to be realized through the first pieces.`,
        body: "The opening assortment should establish the collection language and its expression together so the line reads as intentional rather than theoretical.",
      };
    }

    const strongLabels = languageStates.strong.map((chip) => chip.label);
    const missingLabels = languageStates.missing.map((chip) => chip.label);
    const strongExpressionLabels = expressionStates.strong.map((chip) => chip.label);
    const missingExpressionLabels = expressionStates.missing.map((chip) => chip.label);
    const emergingExpressionLabels = expressionStates.emerging.map((chip) => chip.label);

    if (strongLabels.length > 0 && missingExpressionLabels.length > 0) {
      return {
        headline: `The collection is clearly defined through ${formatChipList(strongLabels)}, but ${formatChipList(missingExpressionLabels)} has not yet been realized in the current pieces.`,
        body: emergingExpressionLabels.length > 0
          ? `${formatChipList(emergingExpressionLabels)} is starting to register, but the next additions need to make the intended tension legible earlier in the assortment.`
          : "The line is directionally coherent, but it still reads under-expressed rather than fully authored.",
      };
    }

    if (strongLabels.length > 0 && strongExpressionLabels.length > 0) {
      return {
        headline: `${formatChipList(strongLabels)} is defining the collection, while ${formatChipList(strongExpressionLabels)} is now giving it visible life across the assortment.`,
        body: missingLabels.length > 0
          ? `${formatChipList(missingLabels)} still needs to be broadened so the expression does not resolve around too narrow a frame.`
          : "The assortment is beginning to hold both identity and expression with enough clarity to feel intentional.",
      };
    }

    return {
      headline: `${languageStates.strongest?.label ?? "The collection language"} is establishing the foundation of the line.`,
      body: expressionStates.strongest?.label
        ? `${expressionStates.strongest.label} is the clearest expression cue so far, but it still needs more distribution to shape the collection rather than just one piece.`
        : "The line is beginning to cohere, but the expression signals still need to move from setup intent into visible execution.",
    };
  }, [collectionLanguageExpression.length, collectionLanguageLabels, expressionSignalExpression.length, expressionSignalLabels, expressionStates, languageStates, totalConfirmed]);

  const structureBalanceLines = useMemo(() => {
    if (totalConfirmed === 0) {
      return "No structure is established yet. The first claimed piece will set the collection’s opening balance.";
    }
    if (roleCounts["core-evolution"] === 0) {
      return "You have shape and direction, but no stabilizing core yet.";
    }
    if (roleCounts.hero > 1) {
      return "The line has more than one focal point, which is diluting the hero read.";
    }
    if (roleCounts["volume-driver"] === 0) {
      return "The assortment still needs a volume anchor to broaden the line.";
    }
    if (roleCounts.hero === 0) {
      return "The collection is building evenly, but it still lacks a clear focal piece.";
    }
    return "The current role mix is holding with enough structure to keep the line legible.";
  }, [roleCounts, totalConfirmed]);

  const gapsAndTensionLines = useMemo(() => {
    const lines: string[] = [];

    languageStates.missing.forEach((chip) => {
      lines.push(`${chip.label} is not yet represented in the current pieces.`);
    });

    expressionStates.missing.forEach((chip) => {
      if (lines.length < 3) {
        lines.push(`${chip.label} has not yet been introduced as an expression signal.`);
      }
    });

    if (languageStates.strong.length === 1 && languageStates.emerging.length > 0) {
      lines.push(`${languageStates.strong[0].label} is carrying most of the read, which risks repetition if the next piece follows the same posture.`);
    }

    if (expressionStates.strong.length === 0 && expressionStates.emerging.length > 0 && lines.length < 3) {
      lines.push(`${expressionStates.emerging[0].label} is beginning to appear, but it still reads as incidental rather than intentional.`);
    }

    if (languageStates.strong.length > 0 && expressionStates.missing.length > 0 && lines.length < 3) {
      lines.push(`${languageStates.strong[0].label} is clear, but the collection still lacks softness or tension in how it is being expressed.`);
    }

    if (languageStates.emerging.length > 0 && lines.length < 3) {
      lines.push(`${languageStates.emerging[0].label} is emerging, but not yet anchoring the assortment.`);
    }

    if (roleCounts["core-evolution"] === 0 && lines.length < 3) {
      lines.push("The collection lacks a core anchor.");
    }

    if (roleCounts.hero > 1 && lines.length < 3) {
      lines.push("Hero pieces are beginning to overlap.");
    }

    if (highComplexityCount >= 2 && highComplexityCount === totalConfirmed && lines.length < 3) {
      lines.push("Current pieces skew toward higher complexity.");
    }

    if (lines.length === 0 && languageStates.strong.length > 0) {
      lines.push(
        expressionStates.strong.length > 0
          ? `${languageStates.strong[0].label} is holding clearly, and ${expressionStates.strong[0].label} is beginning to give the line its intended expression.`
          : `${languageStates.strong[0].label} is reading clearly without creating obvious tension yet.`
      );
    }

    return lines.slice(0, 3);
  }, [expressionStates, highComplexityCount, languageStates, roleCounts, totalConfirmed]);

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
          complexityBias,
          directionText: directionInterpretationText,
          strongestCollectionLanguage: strongestLanguage,
          strongestExpressionSignal: strongestExpression,
        })
      );
    }

    return suggestions.slice(0, 3);
  }, [complexityBias, directionInterpretationText, expressionStates, languageStates, roleCounts, suggestedPieces, totalConfirmed]);

  const recommendedNextPiece = useMemo(() => {
    const priorityChip =
      expressionStates.missing[0] ??
      languageStates.missing[0] ??
      [...expressionStates.emerging].sort((a, b) => a.coverage - b.coverage)[0] ??
      [...languageStates.emerging].sort((a, b) => a.coverage - b.coverage)[0];
    return getRecommendedPiecePrompt(priorityChip, suggestedPieces, directionName, expressionStates.missing[0]?.label ?? expressionStates.emerging[0]?.label);
  }, [directionName, expressionStates, languageStates, suggestedPieces]);

  // Drawer state
  const [drawerPiece, setDrawerPiece] = useState<KeyPiece | null>(null);
  const [drawerSuggestion, setDrawerSuggestion] = useState<StartingPointSuggestion | null>(null);
  const [drawerPieceName, setDrawerPieceName] = useState("");
  const [drawerCategory, setDrawerCategory] = useState("");
  const [drawerRole, setDrawerRole] = useState<CollectionRoleId | null>(null);
  const inferredDrawerSuggestion = useMemo(() => {
    if (!drawerPiece) return null;
    return getRoleSuggestion(drawerPiece, roleCounts as Record<CollectionRoleId, number>);
  }, [drawerPiece, roleCounts]);

  const openDrawer = useCallback((piece: KeyPiece, suggestion: StartingPointSuggestion | null = null) => {
    setDrawerPiece(piece);
    setDrawerSuggestion(suggestion);
    setDrawerPieceName(piece.item);
    setDrawerCategory(piece.category ?? "");
    setDrawerRole(null);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerPiece(null);
    setDrawerSuggestion(null);
    setDrawerPieceName("");
    setDrawerCategory("");
    setDrawerRole(null);
  }, []);

  const handleStartBuilding = useCallback(() => {
    if (!drawerPiece || !drawerRole) return;
    const finalPieceName = drawerPieceName.trim() || drawerPiece.item;
    const finalPiece: KeyPiece = { ...drawerPiece, item: finalPieceName };
    const pieceBuildContext: PieceBuildContext = {
      adaptedTitle: drawerSuggestion?.adapted_title ?? finalPieceName,
      role: drawerRole,
      archetype: drawerSuggestion?.archetype ?? drawerPiece.item.toLowerCase().replace(/\s+/g, "_"),
      originalLabel: drawerSuggestion?.original_label ?? drawerPiece.item,
      translation: (drawerSuggestion?.version_label ?? directionInterpretationText) || null,
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
    setPieceRolesById({
      ...pieceRolesById,
      [finalPieceName]: drawerRole,
    });
    setActiveProductPieceId(finalPieceName);
    if (drawerCategory) setCategory(drawerCategory);
    router.push("/spec");
  }, [
    drawerPiece,
    drawerPieceName,
    drawerCategory,
    drawerRole,
    setSelectedKeyPiece,
    setCollectionRole,
    setPieceBuildContext,
    pieceRolesById,
    setPieceRolesById,
    setActiveProductPieceId,
    setCategory,
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
              Pieces Studio
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
                  fontSize: 38,
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
                fontSize: 28,
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
              marginBottom: 22,
            }}
          >
            <div
              style={{
                ...EYEBROW_STYLE,
                marginBottom: 10,
              }}
            >
              MUKO&apos;S READ
            </div>
            <div
              style={{
                ...SECTION_TITLE_STYLE,
                fontSize: 21,
                color: "#43432B",
                lineHeight: 1.24,
                marginBottom: 10,
              }}
            >
              {mukosReadData.headline}
            </div>
            <div style={BODY_SMALL_STYLE}>
              {mukosReadData.body}
            </div>
          </div>

          <div style={{ height: 1, background: "rgba(67,67,43,0.08)", margin: "0 0 18px" }} />

          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                ...EYEBROW_STYLE,
                marginBottom: 10,
              }}
            >
              Structure Balance
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
              {[
                { label: "Hero", value: roleCounts.hero },
                { label: "Volume", value: roleCounts["volume-driver"] },
                { label: "Core", value: roleCounts["core-evolution"] },
                { label: "Directional", value: roleCounts.directional },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    ...BODY_SMALL_STYLE,
                    color: TEXT,
                    gap: 12,
                  }}
                >
                  <span style={{ color: MUTED }}>{row.label}</span>
                  <span style={{ fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div
              style={{
                ...BODY_SMALL_STYLE,
                color: TEXT,
              }}
            >
              {structureBalanceLines}
            </div>
          </div>

          <div style={{ height: 1, background: "rgba(67,67,43,0.08)", margin: "0 0 18px" }} />

          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                ...EYEBROW_STYLE,
                marginBottom: 10,
              }}
            >
              Gaps + Tension
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {gapsAndTensionLines.map((line) => (
                <div
                  key={line}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    ...BODY_SMALL_STYLE,
                    color: TEXT,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "rgba(67,67,43,0.34)",
                      marginTop: 7,
                      flexShrink: 0,
                    }}
                  />
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: "rgba(67,67,43,0.08)", margin: "0 0 18px" }} />

          <div style={{ marginBottom: 0 }}>
            <div
              style={{
                ...EYEBROW_STYLE,
                marginBottom: 10,
              }}
            >
              Recommended Next Piece
            </div>
            <div
              style={{
                ...BODY_SMALL_STYLE,
                color: TEXT,
                marginBottom: 10,
              }}
            >
              {recommendedNextPiece}
            </div>
            <button
              type="button"
              onClick={() => suggestedPiecesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
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
              Explore starting points →
            </button>
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
          suggestedRole={(drawerSuggestion ?? inferredDrawerSuggestion)?.role ?? "volume-driver"}
          suggestedRationale={
            inferredDrawerSuggestion?.rationale ??
            "Balances your structure and avoids over-indexing on statement pieces"
          }
          structureCounts={roleCounts as Record<CollectionRoleId, number>}
          onPieceNameChange={setDrawerPieceName}
          onCategoryChange={setDrawerCategory}
          onRoleSelect={setDrawerRole}
          onStartBuilding={handleStartBuilding}
          onCancel={closeDrawer}
        />
      )}
    </div>
  );
}
