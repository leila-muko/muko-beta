"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useSessionStore } from "@/lib/store/sessionStore";
import type { CollectionRoleId } from "@/lib/store/sessionStore";
import type { ActivatedChip } from "@/lib/store/sessionStore";
import type {
  Material,
  Category,
  ConstructionTier,
  ConceptContext as ConceptContextType,
} from "@/lib/types/spec-studio";
import { calculateCOGS, generateInsight, checkExecutionFeasibility, applyRoleModifiers } from "@/lib/spec-studio/calculator";
import { findAlternativeMaterial, findUpgradeMaterial, checkSelectedMaterialConflict } from "@/lib/spec-studio/material-matcher";
import { getMaterialProperties } from "@/lib/spec-studio/material-properties";
import {
  CONSTRUCTION_INFO,
  getOverrideWarning,
  getSmartDefault,
  getSmartDefaultForSubcategory,
  normalizeSpecSubcategoryId,
} from "@/lib/spec-studio/smart-defaults";
import type { SubcategoryEntry } from "@/lib/spec-studio/smart-defaults";

import categoriesData from "@/data/categories.json";
import materialsData from "@/data/materials.json";
import subcategoriesData from "@/data/subcategories.json";
import aestheticsData from "@/data/aesthetics.json";
import designLanguageData from "@/data/design-language.json";
import AskMuko from "@/components/AskMuko";
import type { AskMukoContext } from "@/lib/synthesizer/askMukoResponse";
import { AESTHETIC_CONTENT } from "@/lib/concept-studio/constants";
import { PulseSection } from "@/components/ui/PulseSection";
import { MukoStreamingParagraph } from "@/components/ui/MukoStreamingParagraph";
import type { PulseChipProps } from "@/components/ui/PulseChip";
import type { InsightData, SpecInsightMode } from "@/lib/types/insight";
import { buildReportBlackboard, buildSpecBlackboard } from "@/lib/synthesizer/assemble";
import {
  buildFallbackSpecRail,
  deriveSpecDiagnostics,
  shouldShowBetterPath,
  type SpecRailInsight,
} from "@/lib/synthesizer/specDecision";
import { buildAnalysisRow, AGENT_VERSIONS } from "@/lib/agents/orchestrator-shared";
import type { PipelineBlackboard, AnalysisResult as AnalysisResultOrch } from "@/lib/agents/orchestrator-shared";
import { createClient } from "@/lib/supabase/client";
import type { SpecSuggestion } from "@/lib/types/next-move";
import { ScorecardModal } from "@/components/spec-studio/ScorecardModal";
import { ResizableSplitPanel } from "@/components/ui/ResizableSplitPanel";
import { MukoNav } from "@/components/MukoNav";
import { CollectionContextBar, COLLECTION_CONTEXT_BAR_OFFSET } from "@/components/collection/CollectionContextBar";
import { getFlatForPiece } from "@/components/flats";
import type { SelectedPieceImage } from "@/lib/piece-image";
import { buildSelectedPieceImage } from "@/lib/piece-image";
import { getCollectionLanguageLabels, getExpressionSignalLabels } from "@/lib/collection-signals";
import { buildSpecPulseInsight, buildSpecPulseTelemetry, getSpecMarketSaturationSignal } from "@/lib/pulse/specPulseInsight";

/* ─── Icons: matched to Concept Studio (star, users, cog) ─── */
function IconIdentity({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconResonance({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="9"
        cy="7"
        r="4"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23 21V19C22.99 17.18 21.8 15.58 20 15.13"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 3.13C17.8 3.58 18.99 5.18 18.99 7C18.99 8.82 17.8 10.42 16 10.87"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const BRAND = {
  chartreuse: "#ABAB63",
  rose: "#A97B8F",
  steelBlue: "#A9BFD6",
  camel: "#B8876B",
  oliveInk: "#43432B",
  cream: "#E8E3D6",
  warmWhite: "#F5F2EB",
  parchment: "#FAF9F6",
};

/* ─── Design tokens matching Concept Studio ─── */
const CHARTREUSE = "#A8B475";
const STEEL = "#7D96AC";
const OLIVE = "#43432B";
const PULSE_GREEN = "#4D7A56";
const PULSE_RED = "#8A3A3A";
const PULSE_YELLOW = "#B8876B";
const sohne = "var(--font-sohne-breit), system-ui, sans-serif";
const inter = "var(--font-inter), system-ui, sans-serif";

/* ─── Icons ─── */
function IconExecution({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Reusable styles ─── */
const sectionHeading: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 650,
  color: BRAND.oliveInk,
  fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
};

function serializePersistError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const serializedRecord = (() => {
      try {
        return JSON.stringify(error);
      } catch {
        return undefined;
      }
    })();

    return {
      name: typeof record.name === "string" ? record.name : undefined,
      code: typeof record.code === "string" ? record.code : undefined,
      message: typeof record.message === "string" ? record.message : undefined,
      details: typeof record.details === "string" ? record.details : undefined,
      hint: typeof record.hint === "string" ? record.hint : undefined,
      status: typeof record.status === "number" ? record.status : undefined,
      raw: serializedRecord && serializedRecord !== "{}" ? serializedRecord : undefined,
    };
  }

  return { message: String(error) };
}

function isMissingPieceNameColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  return (
    record.code === "PGRST204" &&
    typeof record.message === "string" &&
    record.message.includes("'piece_name' column")
  );
}

function getMissingSchemaColumn(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const record = error as Record<string, unknown>;
  if (record.code !== "PGRST204" || typeof record.message !== "string") return null;
  const match = record.message.match(/'([^']+)' column/);
  return match?.[1] ?? null;
}

async function runAnalysisMutationWithSchemaFallback(
  payload: Record<string, unknown>,
  execute: (nextPayload: Record<string, unknown>) => Promise<{ data: { id?: string } | null; error: unknown }>
) {
  let nextPayload = { ...payload };

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const result = await execute(nextPayload);
    const missingColumn = getMissingSchemaColumn(result.error);
    if (!missingColumn) {
      return { result, payload: nextPayload };
    }

    if (!(missingColumn in nextPayload)) {
      return { result, payload: nextPayload };
    }

    const { [missingColumn]: _removed, ...rest } = nextPayload;
    nextPayload = rest;
  }

  return {
    result: {
      data: null,
      error: new Error("Exceeded schema fallback attempts while saving analysis."),
    },
    payload: nextPayload,
  };
}

function readCollectionContextFromBrowser() {
  if (typeof window === "undefined") {
    return { collectionName: "", season: "" };
  }

  try {
    return {
      collectionName: window.localStorage.getItem("muko_collectionName")?.trim() ?? "",
      season: window.localStorage.getItem("muko_seasonLabel")?.trim() ?? "",
    };
  } catch {
    return { collectionName: "", season: "" };
  }
}

/* ─── Aesthetic palettes (3 options per aesthetic) ─── */
/* ─── Aesthetic keywords for matching ─── */
const AESTHETIC_KEYWORDS: Record<string, string[]> = {
  "quiet-structure": [
    "minimal",
    "structural",
    "refined",
    "modern",
    "clean",
    "tailored",
    "architectural",
    "polished",
  ],
  "terrain-luxe": ["earthy", "utility", "rugged", "technical", "outdoor", "layered"],
  "romantic-analog": ["romantic", "moody", "feminine", "vintage", "dramatic", "literary"],
  "heritage-hand": ["artisanal", "handmade", "natural", "textured", "sustainable", "craft"],
  "undone-glam": ["edgy", "distressed", "indie", "raw", "layered", "nostalgic"],
  "haptic-play": ["playful", "tactile", "bouncy", "squishy", "sensory", "plastic"],
  "high-voltage": ["bold", "maximalist", "glamour", "metallic", "statement", "power"],
  "sweet-subversion": ["cute", "kawaii", "soft", "colorful", "adorable", "whimsical"],
  default: ["modern", "clean", "versatile"],
};

/* ─── Complexity (formerly Construction) ─── */
const COMPLEXITY_CONTEXT: Record<
  ConstructionTier,
  { label: string; description: string; note: string }
> = {
  low: {
    label: "Low",
    description: "Clean build with minimal seam complexity.",
    note: "Stable for cost and production timelines.",
  },
  moderate: {
    label: "Moderate",
    description: "Balanced seam work and detailing.",
    note: "Maintains design clarity while preserving production flexibility.",
  },
  high: {
    label: "High",
    description: "Elevated construction with structural detail.",
    note: "Increases sampling sensitivity and production complexity.",
  },
};

/* ─── Per-option contextual descriptions ─── */
const MATERIAL_DESCRIPTIONS: Record<string, string> = {
  "organic-cotton": "Clean, breathable, and GOTS-certified — lowest cost natural option that still carries a sustainability story.",
  "conventional-cotton": "The most margin-friendly fabric in the lineup — high availability, but no sustainability narrative and tariff-sensitive.",
  tencel: "Fluid drape with closed-loop credentials — reads elevated on-body; Lenzing trademark adds a small premium worth it.",
  linen: "Natural slub texture that gets better with wear — long lead at 13 weeks, so plan sampling early.",
  silk: "The sharpest identity signal in the sheet — fluid, luminous, expensive. Watch the 15-week lead and high complexity cost.",
  "wool-merino": "Fine, itch-free, temperature-regulating — the easiest premium-feeling fabric to sell at this price tier.",
  "cashmere-blend": "The softest handle in the lineup — a 18-week lead and $40/yd means it should be a hero SKU, not a basic.",
  "recycled-polyester": "Lowest cost with a credible sustainability angle — best in layering or outerwear where drape is secondary.",
  "virgin-polyester": "Cheapest option on the sheet — fast lead, no sustainability story. Use only where function justifies it.",
  nylon: "Structured drape, durable, and mid-cost — works where the garment needs to hold shape without tailoring.",
  leather: "High identity, long lead, complex construction — genuinely premium read, but expensive to execute correctly.",
  "vegan-leather": "Leather's structure at lower cost — easier compliance story, but sustainability score is low; be transparent.",
  "rayon-viscose": "Fluid and affordable — similar drape to Tencel at a lower price, but the environmental story is weak.",
  "deadstock-fabric": "The fastest lead in the lineup at 2 weeks — lot-based availability means you can't reorder; size the run carefully.",
  hemp: "Highest sustainability score in the sheet — structured drape, improving softness, and a strong provenance story to tell.",
};

/* ─── Material swatch system ─── */
const MATERIAL_CATEGORY_MAP: Record<string, string> = {
  "organic-cotton": "natural",
  "conventional-cotton": "natural",
  tencel: "natural",
  linen: "natural",
  hemp: "natural",
  silk: "luxury",
  "cashmere-blend": "luxury",
  "wool-merino": "luxury",
  leather: "luxury",
  nylon: "synthetic",
  "recycled-polyester": "synthetic",
  "virgin-polyester": "synthetic",
  "vegan-leather": "synthetic",
  "rayon-viscose": "synthetic",
  "denim-conventional": "synthetic",
  "denim-raw-selvedge": "synthetic",
  "deadstock-fabric": "deadstock",
};

const MATERIAL_SWATCH_BG: Record<string, string> = {
  "organic-cotton":
    "repeating-linear-gradient(0deg,rgba(255,255,255,0.3) 0,rgba(255,255,255,0.3) 1px,transparent 1px,transparent 3px),repeating-linear-gradient(90deg,rgba(0,0,0,0.04) 0,rgba(0,0,0,0.04) 1px,transparent 1px,transparent 3px),#E8DDD0",
  "conventional-cotton":
    "repeating-linear-gradient(0deg,rgba(255,255,255,0.3) 0,rgba(255,255,255,0.3) 1px,transparent 1px,transparent 4px),repeating-linear-gradient(90deg,rgba(0,0,0,0.04) 0,rgba(0,0,0,0.04) 1px,transparent 1px,transparent 4px),#DDD5C8",
  tencel:
    "repeating-linear-gradient(45deg,rgba(255,255,255,0.25) 0,rgba(255,255,255,0.25) 1px,transparent 1px,transparent 4px),repeating-linear-gradient(-45deg,rgba(0,0,0,0.08) 0,rgba(0,0,0,0.08) 1px,transparent 1px,transparent 4px),#D8C8A8",
  silk: "linear-gradient(105deg,#F5F0EC,#E8E0D8,#F0EAE4,#E0D8D0,#F5F0EC)",
  "cashmere-blend":
    "radial-gradient(ellipse at 30% 30%,rgba(255,255,255,0.2) 0%,transparent 60%),radial-gradient(ellipse at 70% 70%,rgba(255,255,255,0.15) 0%,transparent 60%),#D8C8B8",
  "wool-merino":
    "repeating-linear-gradient(45deg,rgba(255,255,255,0.1) 0,rgba(255,255,255,0.1) 1px,transparent 1px,transparent 6px),#C8C0B0",
  leather:
    "radial-gradient(ellipse at 40% 35%,rgba(255,255,255,0.08) 0%,transparent 50%),radial-gradient(ellipse at 60% 65%,rgba(0,0,0,0.1) 0%,transparent 55%),#8B6855",
  nylon: "linear-gradient(160deg,#C0C8D0,#B0B8C0,#C8D0D8)",
  "recycled-polyester":
    "repeating-linear-gradient(120deg,rgba(255,255,255,0.1) 0,rgba(255,255,255,0.1) 1px,transparent 1px,transparent 5px),#B8C0C8",
  "virgin-polyester": "linear-gradient(135deg,#C8D0D8,#B8C0C8)",
  "vegan-leather":
    "radial-gradient(ellipse at 35% 35%,rgba(255,255,255,0.12) 0%,transparent 55%),#808890",
  "denim-conventional":
    "repeating-linear-gradient(45deg,rgba(255,255,255,0.08) 0,rgba(255,255,255,0.08) 1px,transparent 1px,transparent 6px),repeating-linear-gradient(-45deg,rgba(0,0,0,0.1) 0,rgba(0,0,0,0.1) 1px,transparent 1px,transparent 6px),#6878A0",
  "rayon-viscose": "linear-gradient(125deg,#C8C0D8,#B8B0C8,#C8C0D8)",
  "deadstock-fabric":
    "repeating-linear-gradient(30deg,rgba(255,255,255,0.1) 0,rgba(255,255,255,0.1) 1px,transparent 1px,transparent 8px),repeating-linear-gradient(-30deg,rgba(0,0,0,0.05) 0,rgba(0,0,0,0.05) 1px,transparent 1px,transparent 8px),#A8B890",
  hemp:
    "repeating-linear-gradient(0deg,rgba(0,0,0,0.06) 0,rgba(0,0,0,0.06) 1px,transparent 1px,transparent 4px),repeating-linear-gradient(90deg,rgba(0,0,0,0.04) 0,rgba(0,0,0,0.04) 1px,transparent 1px,transparent 4px),#C0B898",
  "denim-raw-selvedge":
    "repeating-linear-gradient(42deg,rgba(255,255,255,0.12) 0,rgba(255,255,255,0.12) 1px,transparent 1px,transparent 5px),repeating-linear-gradient(-42deg,rgba(0,0,0,0.15) 0,rgba(0,0,0,0.15) 1px,transparent 1px,transparent 5px),#4A5A78",
};

const CATEGORY_META: Record<string, { dotColor: string; badgeColor: string; badgeBg: string; badgeBorder: string }> = {
  natural:   { dotColor: "#A8B475", badgeColor: "#6B7A40", badgeBg: "rgba(168,180,117,0.094)", badgeBorder: "rgba(168,180,117,0.25)" },
  luxury:    { dotColor: "#B8876B", badgeColor: "#8B5E3C", badgeBg: "rgba(184,135,107,0.094)", badgeBorder: "rgba(184,135,107,0.25)" },
  synthetic: { dotColor: "#7D96AC", badgeColor: "#4A6A7A", badgeBg: "rgba(125,150,172,0.094)", badgeBorder: "rgba(125,150,172,0.25)" },
  deadstock: { dotColor: "#CDAAB3", badgeColor: "#6B5A7A", badgeBg: "rgba(205,170,179,0.094)", badgeBorder: "rgba(205,170,179,0.25)" },
};

const SILHOUETTE_DESCRIPTIONS: Record<string, string> = {
  cocoon: "Volume through shape rather than fit — fabric drape and weight are critical to the read.",
  belted: "Structure via cinching — adds waist definition without complex seaming; works across sizes.",
  straight: "The cleanest read — no distraction, lets fabric and colorway carry the concept.",
  cropped: "Proportion game — pairs with high-waisted bottoms; reads deliberate when executed tightly.",
  relaxed: "Ease with intention — comfort-forward without losing editorial quality or polish.",
  fitted: "Body-aware cut — amplifies the fabric's drape and surface characteristics directly.",
  oversized: "Statement through scale — requires confident fabric weight to avoid reading as shapeless.",
  boxy: "Architectural precision — the hem and shoulder seam are everything; finishing matters most.",
  "wide-leg": "Fluid volume at the leg — posture and fabric weight shift the whole body language.",
  "straight-leg": "Versatile and enduring — works across aesthetics, reads cleanest in structured fabrics.",
  slim: "Streamlined and surface-focused — fit and fabric quality are both immediately visible.",
  flare: "Strong market memory from retro references — works best in fluid, structured-drape fabrics.",
  column: "Elongating and editorial — minimal seaming means the fabric surface does all the work.",
  "a-line": "The most universally flattering geometry — gently structured, works in most fabric weights.",
  wrap: "Adjustable and versatile — the overlap adds visual interest without extra construction cost.",
  shift: "Modernist geometry — the seam lines and hem are the design; no room for shortcuts.",
};

const PALETTE_DESCRIPTIONS: Record<string, string> = {
  "Monochrome Authority": "High-contrast discipline — neutrals at their most considered; commands attention without color.",
  "Warm Neutrals": "Grounded and tactile — earthy warmth that works across skin tones and delivery windows.",
  "Cool Mineral": "Restrained and architectural — the restraint reads expensive; strong sellthrough story.",
  "Signature Muko": "The house palette — internally coherent, spans a full collection without effort.",
  "Earth & Stone": "Terrain-rooted naturals — credible sustainability story with broad commercial appeal.",
  "Muted Jewel": "Saturated but not loud — the right amount of color for an elevated fashion context.",
};

const COMPLEXITY_DESCRIPTIONS: Record<ConstructionTier, { hover: string; why: string }> = {
  low: {
    hover: "Fewer labor touchpoints — keeps COGS tight and production lead times shorter overall.",
    why: "Matches the category's natural production standard — no over-engineering, no margin risk.",
  },
  moderate: {
    hover: "Balanced build — enough craft to feel considered, manageable at most factory tiers.",
    why: "The sweet spot for this category — executes well without adding factory constraints.",
  },
  high: {
    hover: "Full construction — hardware, tailoring, structural seaming. Adds real labor cost; plan margin accordingly.",
    why: "Delivers the craft your concept signals — construction becomes part of the identity.",
  },
};

/* ─── Concept silhouette yardage modifiers ─── */
const SILHOUETTE_YARDAGE_MODIFIERS: Record<string, number> = {
  straight: 0,
  relaxed: 0.3,
  structured: 0.2,
  oversized: 0.5,
};

const CATEGORY_BASE_YARDAGE: Record<string, number> = {
  outerwear: 3.5,
  tops: 2.0,
  bottoms: 2.5,
  dresses: 3.0,
  knitwear: 2.5,
};

/* ─── Slug helper ─── */
function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function normalizeMaterialText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function buildMaterialAliases(material: Material): string[] {
  const aliases = new Set<string>();
  const add = (value: string | null | undefined) => {
    const normalized = normalizeMaterialText(value);
    if (normalized) aliases.add(normalized);
  };

  add(material.id);
  add(material.name);

  if (material.id === "vegan-leather") {
    ["vegan leather", "pu leather", "faux leather", "pleather", "polyurethane leather"].forEach(add);
  } else if (material.id === "leather") {
    ["leather", "genuine leather", "real leather"].forEach(add);
  } else if (material.id === "denim-conventional") {
    ["denim", "jean", "jeans", "blue jean", "conventional denim"].forEach(add);
  } else if (material.id === "denim-raw-selvedge") {
    ["raw denim", "selvedge", "selvedge denim", "raw selvedge denim", "rigid denim"].forEach(add);
  } else if (material.id === "organic-cotton") {
    ["organic cotton", "cotton"].forEach(add);
  } else if (material.id === "conventional-cotton") {
    ["conventional cotton", "cotton poplin", "cotton woven"].forEach(add);
  } else if (material.id === "rayon-viscose") {
    ["rayon", "viscose"].forEach(add);
  } else if (material.id === "wool-merino") {
    ["wool", "merino", "merino wool"].forEach(add);
  } else if (material.id === "cashmere-blend") {
    ["cashmere", "cashmere blend"].forEach(add);
  } else if (material.id === "deadstock-fabric") {
    ["deadstock", "deadstock fabric", "deadstock material"].forEach(add);
  }

  return Array.from(aliases);
}

function findMaterialMention(
  source: string,
  materials: Material[],
): Material | null {
  const normalized = normalizeMaterialText(source);
  if (!normalized) return null;

  let bestMatch: { material: Material; score: number } | null = null;

  for (const material of materials) {
    for (const alias of buildMaterialAliases(material)) {
      if (!alias) continue;
      let score = 0;

      if (normalized === alias) {
        score = 100;
      } else if (normalized.includes(alias)) {
        score = alias.split(" ").length * 10 + alias.length;
      } else {
        continue;
      }

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { material, score };
      }
    }
  }

  return bestMatch?.material ?? null;
}

function scoreMaterialForPiece(options: {
  material: Material;
  categoryId: string | null | undefined;
  typeId: string | null | undefined;
  pieceText: string;
  chipMaterialId: string | null;
  aestheticKeywords: string[];
}): number {
  const { material, categoryId, typeId, pieceText, chipMaterialId, aestheticKeywords } = options;
  const normalizedText = normalizeMaterialText(pieceText);
  let score = 20 - material.cost_per_yard * 0.15 - material.lead_time_weeks * 0.9;

  if (chipMaterialId === material.id) score += 18;

  const explicitMention = findMaterialMention(pieceText, [material]);
  if (explicitMention?.id === material.id) score += 100;

  const isBottom = categoryId === "bottoms";
  const isJean =
    /\bjean|jeans|denim|cigarette\b/.test(normalizedText) ||
    typeId === "straight-pant";

  if (isJean) {
    if (material.id === "denim-raw-selvedge") score += 65;
    if (material.id === "denim-conventional") score += 55;
    if (material.id === "organic-cotton") score += 10;
    if (material.id === "conventional-cotton") score += 6;
    if (material.id === "vegan-leather") score -= 45;
    if (material.id === "leather") score -= 25;
  } else if (isBottom) {
    if (["denim-raw-selvedge", "denim-conventional", "linen", "hemp", "wool-merino", "organic-cotton"].includes(material.id)) score += 12;
    if (material.id === "vegan-leather" && !/\bskirt|mini skirt|trouser coated|coated\b/.test(normalizedText)) score -= 18;
  }

  if (aestheticKeywords.includes("clean") || aestheticKeywords.includes("tailored") || aestheticKeywords.includes("structural")) {
    if (["linen", "tencel", "wool-merino", "organic-cotton", "denim-raw-selvedge", "denim-conventional"].includes(material.id)) score += 6;
  }

  if (aestheticKeywords.includes("soft") || aestheticKeywords.includes("fluid")) {
    if (["tencel", "rayon-viscose", "silk"].includes(material.id)) score += 5;
  }

  return score;
}

/* ─── Fallback concept data ─── */
const FALLBACK_CONCEPT: ConceptContextType = {
  aestheticName: "Quiet Structure",
  aestheticMatchedId: "quiet-structure",
  identityScore: 88,
  resonanceScore: 92,
  moodboardImages: [],
  recommendedPalette: [],
};

/* ─────────────────────────────────────────────────────────────── */
/* Helpers: recommended + deltas + compact score clusters           */
/* ─────────────────────────────────────────────────────────────── */
type Deltas = { identity: number; commercialPotential: number; execution: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fmtDelta(n: number) {
  if (n === 0) return "0";
  return n > 0 ? `+${n}` : `${n}`;
}

function deltaColor({
  isHoverOrActive,
  isRecommended,
}: {
  isHoverOrActive: boolean;
  isRecommended: boolean;
}) {
  if (isRecommended) return BRAND.rose;
  return isHoverOrActive ? "rgba(67,67,43,0.82)" : "rgba(67,67,43,0.38)";
}

function getAggregateDeltaStatus(deltas: Deltas): "good" | "bad" {
  const total = deltas.identity + deltas.commercialPotential + deltas.execution;
  return total > 0 ? "good" : "bad";
}

function aggregateDeltaDot({ deltas }: { deltas: Deltas }) {
  const total =
    deltas.identity + deltas.commercialPotential + deltas.execution;

  // ✨ No signal = no dot
  if (total === 0) return null;

  const status = total > 0 ? "good" : "bad";
  const color = status === "good" ? CHARTREUSE : BRAND.rose;

  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 0 3px ${color}22`,
      }}
    />
  );
}


function compactDeltaCluster({
  deltas,
}: {
  deltas: Deltas;
  isHoverOrActive: boolean;
  isRecommended: boolean;
}) {
  const dc = (v: number) => v > 0 ? PULSE_GREEN : v < 0 ? PULSE_RED : "rgba(67,67,43,0.35)";

  const deltaItems = [
    { icon: (c: string) => <IconIdentity size={10} color={c} />, value: deltas.identity, key: "identity" },
    { icon: (c: string) => <IconResonance size={10} color={c} />, value: deltas.commercialPotential, key: "commercial-potential" },
    { icon: (c: string) => <IconExecution size={10} color={c} />, value: deltas.execution, key: "execution" },
  ].filter((item) => item.value !== 0);

  if (deltaItems.length === 0) return null;

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {deltaItems.map((item) => {
        const c = dc(item.value);
        return (
          <span key={item.key} style={{ display: "inline-flex", alignItems: "center", gap: 2, fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 10, fontWeight: 650, color: c, fontVariantNumeric: "tabular-nums" as const }}>
            {item.icon(c)}{fmtDelta(item.value)}
          </span>
        );
      })}
    </div>
  );
}

// ─── Spec insight mode helper — Synthesizer replaces in Week 5 ───────────────
function getSpecInsightData(
  executionScore: number,
  marginGatePassed: boolean,
  timelineBuffer: number
): InsightData {
  let mode: SpecInsightMode;

  if (executionScore < 60 || !marginGatePassed || timelineBuffer < 2) {
    mode = 'constrain';
  } else if (executionScore >= 70 && marginGatePassed && timelineBuffer >= 4) {
    mode = 'invest';
  } else {
    mode = 'constrain';
  }

  if (mode === 'invest') {
    return {
      mode,
      editLabel: 'THE OPPORTUNITY',
      statements: [
        'You have margin headroom — room to invest without breaking the gate.',
        'Construction complexity is comfortable within your timeline.',
        'Current specs leave room to elevate without risk.',
      ],
      edit: [
        'Upgrade to hand-woven texture for artisan authenticity',
        'Add raw edge finishing — minimal cost, high visual impact',
        'Consider natural dye treatment on the hero fabrication',
      ],
    };
  }

  // constrain (default)
  return {
    mode: 'constrain',
    editLabel: 'THE EDIT',
    statements: [
      'Margin is under pressure at current specs.',
      'Construction complexity is creating timeline risk.',
      'One or more inputs need to change before this is viable.',
    ],
    edit: [
      'Switch to Tencel — maintains drape, reduces COGS by ~12%',
      'Reduce construction to Moderate tier to recover timeline buffer',
      'Verify material lead time against your season deadline',
    ],
  };
}
// ─────────────────────────────────────────────────────────────────────────────

/* ─── Design Language helpers ─── */
function chipToKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s*&\s*/g, "-and-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

interface DesignLanguageSuggestion {
  chip: string;
  detail: string;
  cost_note: string;
  complexity_flag: string;
  avoid: string;
}

function getDesignLanguageSuggestions(
  aestheticId: string,
  selectedChips: string[],
  category: string
): DesignLanguageSuggestion[] {
  const data = designLanguageData as unknown as Record<string, Record<string, Record<string, { detail: string; cost_note: string; complexity_flag: string; avoid: string }>>>;
  const entry = data[aestheticId];
  if (!entry) return [];
  return selectedChips
    .map((label) => {
      const key = chipToKey(label);
      const chipEntry = entry[key];
      if (!chipEntry) return null;
      const suggestion = chipEntry[category] || chipEntry[Object.keys(chipEntry)[0]];
      if (!suggestion) return null;
      return { chip: label, ...suggestion } as DesignLanguageSuggestion;
    })
    .filter((s): s is DesignLanguageSuggestion => s !== null)
    .slice(0, 3);
}

function getFirstSentence(text: string): string {
  const match = text.match(/^[^.!?]*[.!?]/);
  return match ? match[0] : text;
}

function getCompactGuidance(text: string): string {
  const firstSentence = getFirstSentence(text).replace(/[.!?]\s*$/, "");
  return firstSentence
    .replace(/^For\s+[^,]+,\s*/i, "")
    .replace(/^To\s+[^,]+,\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCostBadge(costNote: string): { label: string; variant: 'neutral' | 'added' } {
  if (!costNote) return { label: "+ 0", variant: 'neutral' };
  const lower = costNote.toLowerCase();
  if (
    lower.includes("identical") || lower.includes("zero additional") ||
    lower.includes("no additional") || lower.includes("is minimal") ||
    lower.includes("+0") || lower.includes("no cost") ||
    lower.includes("just a direction") || lower.includes("net construction cost")
  ) {
    return { label: "+ 0", variant: 'neutral' };
  }
  return { label: "Cost premium", variant: 'added' };
}

function parseRiskLevel(complexityFlag: string): 'Low' | 'Med' | 'High' {
  const f = (complexityFlag || "").toLowerCase();
  if (f === 'high') return 'High';
  if (f === 'medium' || f === 'moderate' || f === 'med') return 'Med';
  return 'Low';
}

function RemoveSignalButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: inter,
        fontSize: 11,
        color: hovered ? "#9a6845" : "#a09888",
        background: "none",
        border: hovered ? "1px solid rgba(184,135,107,0.5)" : "1px solid rgba(200,194,182,0.5)",
        borderRadius: 6,
        padding: "3px 8px",
        cursor: "pointer",
        flexShrink: 0,
        transition: "color 150ms ease, border-color 150ms ease",
      }}
    >
      ✕ Remove signal
    </button>
  );
}

function formatConceptPhrase(value: string | null | undefined) {
  if (!value) return null;
  return value
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/*
Frame the headline and body as an execution brief, not a warning.
The user has made an informed concept decision - this section should help them
understand what that decision requires in production, not alarm them about it.
Tone: precise, technical, advisory. The headline should state the key production
consideration as a fact, not a risk. The body should give specific, actionable
craft guidance.
*/
function PieceFlatPreview({
  selectedPieceImage,
}: {
  selectedPieceImage: SelectedPieceImage | null;
}) {
  const flatResult = selectedPieceImage?.pieceType
    ? getFlatForPiece(selectedPieceImage.pieceType, selectedPieceImage.signal)
    : null;

  return (
    <div
      style={{
        height: 238,
        borderRadius: 28,
        background: "radial-gradient(circle at 50% 18%, rgba(255,255,255,0.94) 0%, rgba(245,242,235,0.92) 42%, rgba(237,232,223,0.82) 100%)",
        border: "1px solid rgba(67,67,43,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        position: "relative",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.78)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "auto 20% 18px",
          height: 28,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(67,67,43,0.14) 0%, rgba(67,67,43,0.06) 48%, rgba(67,67,43,0) 76%)",
          filter: "blur(10px)",
        }}
      />
      {flatResult ? (
        <div style={{ position: "relative", zIndex: 1, width: 164, height: 200 }}>
          <flatResult.Flat color={flatResult.color} />
        </div>
      ) : (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: 132,
            height: 176,
            borderRadius: 22,
            border: "1px solid rgba(67,67,43,0.08)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(232,227,214,0.88) 100%)",
          }}
        />
      )}
    </div>
  );
}

function getRoleLabel(role: CollectionRoleId | null | undefined) {
  if (role === "volume-driver") return "Volume Driver";
  if (role === "core-evolution") return "Core Evolution";
  if (role === "directional") return "Directional Signal";
  if (role === "hero") return "Hero";
  return "Piece";
}

export default function SpecStudioPage() {
  const contextBarRef = useRef<HTMLDivElement | null>(null);
  const [contextBarHeight, setContextBarHeight] = useState(COLLECTION_CONTEXT_BAR_OFFSET);
  const router = useRouter();
  const previousMaterialIdRef = useRef<string | null>(null);
  const materialDeltaTimeoutRef = useRef<number | null>(null);
  const { setCategory, setSubcategory: setStoreSubcategory, setMaterial, setSilhouette, setConstructionTier: setStoreTier, setColorPalette, setCurrentStep, setChipSelection, updateExecutionPulse, intentGoals, intentTradeoff, collectionRole: storeCollectionRole, savedAnalysisId, setSavedAnalysisId, setSelectedKeyPiece, setActiveProductPieceId, setPieceBuildContext, setCollectionName, setSeason, setActiveCollection } = useSessionStore();
  // parent_analysis_id — deferred to Phase 2
  const categories: Category[] = categoriesData.categories as unknown as Category[];
  const materials: Material[] = materialsData as unknown as Material[];
  const allSubcategories = subcategoriesData as Record<string, SubcategoryEntry[]>;

  // Restore local state from store so navigation back preserves selections
  const [categoryId, setCategoryId] = useState(() => {
    const storeCat = useSessionStore.getState().category;
    if (storeCat) {
      const match = categories.find((c) => c.name === storeCat);
      if (match) return match.id;
    }
    return categories[0].id;
  });
  const [subcategoryId, setSubcategoryId] = useState(() => {
    return useSessionStore.getState().subcategory || "";
  });
  const constructionTierOverride = useSessionStore((s) => s.constructionTierOverride);
  // targetMSRP is now set in the Intent step — read-only here
  const targetMSRP = useSessionStore((s) => s.targetMsrp) ?? 0;
  const [materialId, setMaterialId] = useState(() => {
    return useSessionStore.getState().materialId || "";
  });
  const [constructionTier, setConstructionTier] = useState<ConstructionTier | null>(() => {
    const stored = useSessionStore.getState().constructionTier;
    // Only restore if something was previously saved (not the default 'moderate' with no category set)
    if (useSessionStore.getState().category) return stored;
    return null;
  });
  const [overrideWarning, setOverrideWarning] = useState<string | null>(null);
  const [timelineWeeks, setTimelineWeeks] = useState<number>(() => {
    const season = useSessionStore.getState().season;
    const isFW = season && (season.toLowerCase().includes('fw') || season.toLowerCase().includes('fall'));
    return isFW ? 24 : 20;
  });

  // Scorecard modal state
  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);

  const [hasInitialized, setHasInitialized] = useState(false);

  const [userManuallySelected, setUserManuallySelected] = useState(false);

  const [hoveredMaterialId, setHoveredMaterialId] = useState<string | null>(null);
  const [materialCategory, setMaterialCategory] = useState<string>("all");
  const [hoveredComplexity, setHoveredComplexity] = useState<ConstructionTier | null>(null);
  const [constructionConfirmed, setConstructionConfirmed] = useState(false);
  const [showAllMaterials, setShowAllMaterials] = useState(false);
  const [specStep, setSpecStep] = useState<"material" | "construction" | "execution">("material");
  const [specStepDirection, setSpecStepDirection] = useState<1 | -1>(1);
  const [executionNotes, setExecutionNotes] = useState<string[]>([]);
  const [selectedLevers, setSelectedLevers] = useState<Set<string>>(new Set());
  const [leverNotesSaved, setLeverNotesSaved] = useState(false);
  const [showBetterPathConfirm, setShowBetterPathConfirm] = useState(false);
  const [materialSelectionDelta, setMaterialSelectionDelta] = useState<{
    cogs: number;
    leadTime: number;
  } | null>(null);

  const stageTransitionProps = {
    initial: (direction: 1 | -1) => ({ opacity: 0, y: direction > 0 ? 24 : -18 }),
    animate: { opacity: 1, y: 0 },
    exit: (direction: 1 | -1) => ({ opacity: 0, y: direction > 0 ? -20 : 18 }),
    transition: { duration: 0.28, ease: [0.22, 0.8, 0.2, 1] },
  };

  const advanceToConstruction = useCallback(() => {
    setSpecStepDirection(1);
    setSpecStep("construction");
  }, []);

  const backToMaterial = useCallback(() => {
    setSpecStepDirection(-1);
    setSpecStep("material");
  }, []);

  const advanceToExecution = useCallback(() => {
    setSpecStepDirection(1);
    setSpecStep("execution");
  }, []);

  const backToConstruction = useCallback(() => {
    setSpecStepDirection(-1);
    setSpecStep("construction");
  }, []);

  const storeAesthetic = useSessionStore((s) => s.aestheticMatchedId);
  const storeAestheticName = useSessionStore((s) => s.aestheticInput);
  const storeModifiers = useSessionStore((s) => s.refinementModifiers);
  const selectedKeyPiece = useSessionStore((s) => s.selectedKeyPiece);
  const pieceBuildContext = useSessionStore((s) => s.pieceBuildContext);
  const selectedPieceImage = useSessionStore((s) => s.selectedPieceImage);
  const storeMoodboard = useSessionStore((s) => s.moodboardImages);
  const chipSelection = useSessionStore((s) => s.chipSelection);
  const conceptSilhouette = useSessionStore((s) => s.conceptSilhouette);
  const conceptPalette = useSessionStore((s) => s.conceptPalette);
  const directionInterpretationText = useSessionStore((s) => s.directionInterpretationText);
  const directionInterpretationChips = useSessionStore((s) => s.directionInterpretationChips);

  const conceptContext = useMemo<ConceptContextType>(() => {
    if (!storeAesthetic) return FALLBACK_CONCEPT;
    const scores = AESTHETIC_CONTENT[storeAesthetic];
    return {
      aestheticName: storeAestheticName,
      aestheticMatchedId: toSlug(storeAesthetic),
      identityScore: scores?.identityScore ?? 88,
      resonanceScore: scores?.resonanceScore ?? 92,
      moodboardImages: storeMoodboard || [],
      recommendedPalette: [],
    };
  }, [storeAesthetic, storeAestheticName, storeMoodboard]);

  const storeTargetMargin = useSessionStore((s) => s.targetMargin);
  const brandTargetMargin = storeTargetMargin > 0 ? storeTargetMargin / 100 : 0.60;

  const storeCollectionName = useSessionStore((s) => s.collectionName);
  const storeSeason = useSessionStore((s) => s.season);
  const refinementModifiers = useSessionStore((s) => s.refinementModifiers);

  const [brandProfileName, setBrandProfileName] = useState<string | null>(null);
  const [brandProfileId, setBrandProfileId] = useState<string | null>(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('brand_profiles')
        .select('brand_name, id')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.brand_name) setBrandProfileName(data.brand_name);
          if (data?.id) setBrandProfileId(data.id as string);
        });
    });
  }, []);

  const [headerCollectionName, setHeaderCollectionName] = useState("Desert Mirage");
  const [headerSeasonLabel, setHeaderSeasonLabel] = useState("SS26");
  useEffect(() => {
    if (storeCollectionName) {
      setHeaderCollectionName(storeCollectionName);
    } else {
      try {
        const n = window.localStorage.getItem("muko_collectionName");
        if (n) setHeaderCollectionName(n);
      } catch {}
    }
    if (storeSeason) {
      setHeaderSeasonLabel(storeSeason);
    } else {
      try {
        const s = window.localStorage.getItem("muko_seasonLabel");
        if (s) setHeaderSeasonLabel(s);
      } catch {}
    }
  }, [storeCollectionName, storeSeason]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) || categories[0],
    [categoryId, categories]
  );
  const selectedMaterial = useMemo(
    () => materials.find((m) => m.id === materialId) || null,
    [materialId, materials]
  );
  // Subcategory lookups
  const categorySubcategories = useMemo(
    () => allSubcategories[categoryId] ?? [],
    [categoryId, allSubcategories]
  );
  const selectedSubcategory = useMemo(
    () => {
      const normalizedSubcategoryId = normalizeSpecSubcategoryId(subcategoryId);
      return categorySubcategories.find((s) => s.id === normalizedSubcategoryId) || null;
    },
    [subcategoryId, categorySubcategories]
  );
  const pieceAnchorName = useMemo(() => {
    if (selectedKeyPiece?.item) return selectedKeyPiece.item;
    if (selectedSubcategory?.name) return selectedSubcategory.name;
    return selectedCategory.name;
  }, [selectedKeyPiece, selectedSubcategory, selectedCategory]);
  // Compute yardage from subcategory base_yardage + silhouette modifier (falls back to category base)
  const conceptYardage = useMemo(() => {
    const base = selectedSubcategory
      ? selectedSubcategory.base_yardage
      : CATEGORY_BASE_YARDAGE[categoryId] ?? 2.5;
    const mod = SILHOUETTE_YARDAGE_MODIFIERS[conceptSilhouette] ?? 0;
    return Math.round((base + mod) * 10) / 10;
  }, [categoryId, conceptSilhouette, selectedSubcategory]);
  const formattedSilhouette = useMemo(
    () => formatConceptPhrase(conceptSilhouette),
    [conceptSilhouette]
  );
  const pieceSignalLabel = useMemo(() => {
    if (!selectedKeyPiece?.signal) return null;
    const normalized = selectedKeyPiece.signal.replace(/-/g, " ");
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }, [selectedKeyPiece?.signal]);
  const pieceCategoryLabel = useMemo(() => {
    if (!selectedKeyPiece?.category) return null;
    return selectedKeyPiece.category.charAt(0).toUpperCase() + selectedKeyPiece.category.slice(1);
  }, [selectedKeyPiece?.category]);
  const pieceSubtitle = useMemo(() => {
    if (!selectedKeyPiece) return null;
    const parts = [pieceSignalLabel, pieceCategoryLabel].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [pieceCategoryLabel, pieceSignalLabel, selectedKeyPiece]);
  const pieceRoleLabel = useMemo(
    () => getRoleLabel(pieceBuildContext?.role ?? storeCollectionRole),
    [pieceBuildContext?.role, storeCollectionRole]
  );
  const originalTrendLabel = useMemo(
    () => pieceBuildContext?.originalLabel ?? selectedKeyPiece?.item ?? selectedSubcategory?.name ?? selectedCategory.name,
    [pieceBuildContext?.originalLabel, selectedKeyPiece?.item, selectedSubcategory?.name, selectedCategory.name]
  );
  const pieceTitleBarName = useMemo(
    () => selectedKeyPiece?.item ?? selectedSubcategory?.name ?? selectedCategory.name,
    [selectedKeyPiece?.item, selectedSubcategory?.name, selectedCategory.name]
  );
  const pieceContextTitle = useMemo(() => {
    if (selectedKeyPiece?.custom) {
      return selectedKeyPiece?.item ?? pieceBuildContext?.originalLabel ?? pieceAnchorName;
    }

    return pieceBuildContext?.adaptedTitle ?? pieceAnchorName;
  }, [pieceAnchorName, pieceBuildContext?.adaptedTitle, pieceBuildContext?.originalLabel, selectedKeyPiece?.custom, selectedKeyPiece?.item]);
  const contextBarTitle = useMemo(
    () => `${headerCollectionName} · ${pieceContextTitle}`.toLowerCase(),
    [headerCollectionName, pieceContextTitle]
  );
  const specHeaderTitle = useMemo(
    () => `${headerCollectionName} · ${pieceTitleBarName}`.toLowerCase(),
    [headerCollectionName, pieceTitleBarName]
  );
  const collectionLanguageContext = useMemo(() => {
    if (pieceBuildContext?.collectionLanguage?.length) return pieceBuildContext.collectionLanguage;
    return getCollectionLanguageLabels(directionInterpretationChips, directionInterpretationText).map((label) => ({
      label,
      state: "emerging" as const,
    }));
  }, [directionInterpretationChips, directionInterpretationText, pieceBuildContext?.collectionLanguage]);
  const expressionSignalContext = useMemo(() => {
    if (pieceBuildContext?.expressionSignals?.length) return pieceBuildContext.expressionSignals;
    return getExpressionSignalLabels(chipSelection).map((label) => ({
      label,
      state: "emerging" as const,
    }));
  }, [chipSelection, pieceBuildContext?.expressionSignals]);
  const strongExpressionLabels = useMemo(
    () => expressionSignalContext.filter((chip) => chip.state === "strong").map((chip) => chip.label),
    [expressionSignalContext]
  );
  const missingExpressionLabels = useMemo(
    () => expressionSignalContext.filter((chip) => chip.state === "missing").map((chip) => chip.label),
    [expressionSignalContext]
  );
  const aestheticKws =
    AESTHETIC_KEYWORDS[conceptContext.aestheticMatchedId] ||
    AESTHETIC_KEYWORDS.default;
  const customPieceMaterialSource = useMemo(
    () => [
      selectedKeyPiece?.item,
      pieceBuildContext?.originalLabel,
      pieceBuildContext?.translation,
      pieceBuildContext?.adaptedTitle,
    ]
      .filter(Boolean)
      .join(" "),
    [
      pieceBuildContext?.adaptedTitle,
      pieceBuildContext?.originalLabel,
      pieceBuildContext?.translation,
      selectedKeyPiece?.item,
    ]
  );
  const chipMaterialId = chipSelection?.activatedChips.find((c) => c.material != null)?.material ?? null;

  const recommendedMaterialId = useMemo(() => {
    // If a key piece specifies a recommended material, prefer it
    if (selectedKeyPiece?.recommended_material_id && materials.find((m) => m.id === selectedKeyPiece.recommended_material_id)) {
      return selectedKeyPiece.recommended_material_id;
    }

    if (selectedKeyPiece?.custom) {
      const explicitMaterial = findMaterialMention(customPieceMaterialSource, materials);
      if (explicitMaterial) {
        return explicitMaterial.id;
      }

      const scored = materials
        .map((material) => ({
          id: material.id,
          score: scoreMaterialForPiece({
            material,
            categoryId: selectedKeyPiece.category ?? categoryId,
            typeId: selectedKeyPiece.type,
            pieceText: customPieceMaterialSource,
            chipMaterialId,
            aestheticKeywords: aestheticKws,
          }),
        }))
        .sort((a, b) => b.score - a.score);

      return scored[0]?.id || "";
    }

    // If a chip specifies a material, prefer it (first chip with a material wins)
    if (chipMaterialId && materials.find((m) => m.id === chipMaterialId)) {
      return chipMaterialId;
    }

    const mats = materials.slice();
    const score = (m: Material) => {
      const cost = m.cost_per_yard || 0;
      const lt = m.lead_time_weeks || 0;

      const cleanBoost =
        aestheticKws.includes("clean") || aestheticKws.includes("tailored")
          ? ["cotton-twill", "linen", "tencel", "modal"].includes(m.id)
            ? 6
            : 0
          : 0;

      const premiumPenalty = cost > 60 ? -10 : cost > 40 ? -5 : 0;
      const leadPenalty = lt >= 8 ? -6 : lt >= 6 ? -3 : 0;
      const base = 20 - cost * 0.15 - lt * 0.9;

      return base + cleanBoost + premiumPenalty + leadPenalty;
    };

    mats.sort((a, b) => score(b) - score(a));
    return mats[0]?.id || "";
  }, [materials, selectedKeyPiece, customPieceMaterialSource, categoryId, chipMaterialId, aestheticKws]);

  const alternativeMaterial = useMemo(
    () => (selectedMaterial ? findAlternativeMaterial(selectedMaterial, materials, 1, conceptSilhouette || undefined) : null),
    [selectedMaterial, materials, conceptSilhouette]
  );

  // ─── Chip match lookups for spec indicators ───────────────────────────────
  const chipsByMaterial = useMemo((): Record<string, ActivatedChip[]> => {
    const map: Record<string, ActivatedChip[]> = {};
    if (!chipSelection) return map;
    for (const chip of chipSelection.activatedChips) {
      if (chip.material && !chip.isCustom) {
        map[chip.material] = [...(map[chip.material] || []), chip];
      }
    }
    return map;
  }, [chipSelection]);

  const chipsForHighComplexity = useMemo((): ActivatedChip[] => {
    if (!chipSelection) return [];
    return chipSelection.activatedChips.filter((c) => c.complexity_mod > 0);
  }, [chipSelection]);

  const insight = useMemo(() => {
    if (!selectedMaterial || !constructionTier) return null;
    const yardage = conceptYardage;
    const silName = conceptSilhouette ? conceptSilhouette.charAt(0).toUpperCase() + conceptSilhouette.slice(1) : "Standard";
    const breakdown = calculateCOGS(
      selectedMaterial,
      yardage,
      constructionTier,
      false,
      targetMSRP,
      brandTargetMargin
    );
    return generateInsight(
      breakdown,
      selectedMaterial,
      silName,
      constructionTier,
      false,
      yardage,
      alternativeMaterial
    );
  }, [
    selectedMaterial,
    conceptYardage,
    conceptSilhouette,
    constructionTier,
    targetMSRP,
    brandTargetMargin,
    alternativeMaterial,
  ]);

  const upgradeMaterial = useMemo(() => {
    if (!selectedMaterial || !insight) return null;
    return findUpgradeMaterial(
      selectedMaterial,
      materials,
      conceptYardage,
      insight.cogs,
      insight.ceiling,
      1,
      conceptSilhouette || undefined,
    );
  }, [selectedMaterial, materials, conceptYardage, insight]);

  // Cost gate signal
  const costStatus: 'green' | 'yellow' | 'red' | null = !insight
    ? null
    : insight.type === "warning" ? "red"
    : insight.type === "viable"  ? "yellow"
    : "green";

  // Timeline feasibility signal
  const timelineFeasibility = constructionTier && selectedMaterial
    ? checkExecutionFeasibility({
        construction_tier: constructionTier,
        material: selectedMaterial,
        timeline_weeks: timelineWeeks,
      })
    : null;
  const timelineStatus = timelineFeasibility?.status ?? null;

  // Blended execution status — worst of the two signals wins
  const executionStatus: 'green' | 'yellow' | 'red' | null = (() => {
    if (!costStatus && !timelineStatus) return null;
    if (!costStatus) return timelineStatus;
    if (!timelineStatus) return costStatus;
    if (costStatus === 'red' || timelineStatus === 'red') return 'red';
    if (costStatus === 'yellow' || timelineStatus === 'yellow') return 'yellow';
    return 'green';
  })();

  const executionColor =
    executionStatus === "green"
      ? CHARTREUSE
      : executionStatus === "yellow"
        ? BRAND.rose
        : executionStatus === "red"
          ? BRAND.camel
          : "rgba(67, 67, 43, 0.22)";

  const handleCategoryChange = (newId: string) => {
    setCategoryId(newId);
    setSubcategoryId(""); // reset type when category changes
    setStoreSubcategory("");
    setConstructionTier(getSmartDefault(newId, conceptSilhouette || undefined));
    setConstructionConfirmed(false);
    setOverrideWarning(null);
    setUserManuallySelected(false);
  };

  const handleMaterialSelection = (nextMaterialId: string) => {
    setMaterialId(nextMaterialId);
    setUserManuallySelected(true);
    setConstructionConfirmed(false);
  };

  const handleComplexityChange = (tier: ConstructionTier) => {
    setConstructionTier(tier);
    setUserManuallySelected(true);
    setConstructionConfirmed(true);
    setOverrideWarning(
      getOverrideWarning(
        categoryId,
        selectedCategory.name,
        tier,
        getSmartDefault(categoryId, conceptSilhouette || undefined)
      )
    );
  };

  const activeImplications = useMemo(() => {
    const activeChips = chipSelection?.activatedChips.map((c) => c.label) ?? [];
    if (activeChips.length === 0 || !storeAesthetic) return [];
    const aestheticId = storeAesthetic.toLowerCase().replace(/\s+/g, "-");
    return getDesignLanguageSuggestions(aestheticId, activeChips, categoryId);
  }, [chipSelection, storeAesthetic, categoryId]);
  const buildInsightContent = useMemo(() => {
    if (activeImplications.length === 0) return null;
    const primary = activeImplications[0];
    const secondary = activeImplications[1] ?? null;
    const primaryGuidance = getCompactGuidance(primary.detail).replace(/[.!?]\s*$/, "");
    const secondaryGuidance = secondary ? getCompactGuidance(secondary.detail).replace(/[.!?]\s*$/, "") : null;
    const primaryRisk = parseRiskLevel(primary.complexity_flag);
    const primaryCost = parseCostBadge(primary.cost_note);

    const signalLead = secondary
      ? `${primary.chip} and ${secondary.chip} push this piece toward higher construction complexity.`
      : `${primary.chip.charAt(0).toUpperCase() + primary.chip.slice(1)} pushes this piece toward higher construction complexity.`;

    const text = [signalLead, `${primaryGuidance}.`, secondaryGuidance ? `${secondaryGuidance}.` : null]
      .filter(Boolean)
      .join(" ");
    const parts = text.match(/[^.!?]+[.!?]?/g)?.map((part) => part.trim()).filter(Boolean) ?? [text];
    const lead = parts[0] ?? text;
    const body = parts.slice(1).join(" ").trim();

    const tags = [
      primaryCost.label,
      primaryRisk === "High"
        ? "Elevated sampling required"
        : primaryRisk === "Med"
          ? "Moderate sampling required"
          : "Standard sampling required",
      timelineStatus === "red" ? "Extended lead time" : timelineStatus === "yellow" ? "Tight lead time" : null,
    ].filter(Boolean) as string[];

    return { text, lead, body, tags };
  }, [activeImplications, timelineStatus]);

  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<Map<string, () => void>>(new Map());
  const isApplyingRef = useRef(false);

  // Clear applied state when inputs change (but not during programmatic apply)
  useEffect(() => {
    if (isApplyingRef.current) return;
    setAppliedSuggestions(new Set());
    setUndoStack(new Map());
  }, [materialId, constructionTier]);

  const applySuggestion = (id: string, suggestions: SpecSuggestion[]) => {
    const suggestion = suggestions.find((s) => s.id === id);
    if (!suggestion) return;

    isApplyingRef.current = true;
    suggestion.action();
    setAppliedSuggestions((prev) => new Set([...prev, id]));
    setUndoStack((prev) => new Map([...prev, [id, suggestion.undoAction]]));
    requestAnimationFrame(() => { isApplyingRef.current = false; });
  };

  const undoSuggestion = (id: string) => {
    const undoFn = undoStack.get(id);
    if (undoFn) {
      isApplyingRef.current = true;
      undoFn();
      setAppliedSuggestions((prev) => { const next = new Set(prev); next.delete(id); return next; });
      setUndoStack((prev) => { const next = new Map(prev); next.delete(id); return next; });
      requestAnimationFrame(() => { isApplyingRef.current = false; });
    }
  };

  const removeSpecChip = (chipLabel: string) => {
    if (!chipSelection) return;
    setChipSelection({
      ...chipSelection,
      activatedChips: chipSelection.activatedChips.filter((c) => c.label !== chipLabel),
    });
  };

  const isComplete = materialId && constructionTier;

  const baselineComplexity: ConstructionTier = useMemo(() => {
    const base: ConstructionTier = getSmartDefaultForSubcategory(
      categoryId,
      conceptSilhouette || undefined,
      subcategoryId,
      categorySubcategories,
    );
    // If any complexity chip is active, recommend High
    if (chipSelection?.activatedChips.some((c) => c.complexity_mod > 0 && !c.isCustom)) {
      return "high";
    }
    return base;
  }, [categoryId, conceptSilhouette, chipSelection, subcategoryId, categorySubcategories]);

  useEffect(() => {
    const previousMaterialId = previousMaterialIdRef.current;
    previousMaterialIdRef.current = materialId || null;

    if (!previousMaterialId || !materialId || previousMaterialId === materialId) {
      return;
    }

    const previousMaterial = materials.find((material) => material.id === previousMaterialId);
    const nextMaterial = materials.find((material) => material.id === materialId);
    const comparisonTier = constructionTier ?? baselineComplexity ?? "moderate";

    if (!previousMaterial || !nextMaterial) return;

    const previousBreakdown = calculateCOGS(
      previousMaterial,
      conceptYardage,
      comparisonTier,
      false,
      targetMSRP,
      brandTargetMargin
    );
    const nextBreakdown = calculateCOGS(
      nextMaterial,
      conceptYardage,
      comparisonTier,
      false,
      targetMSRP,
      brandTargetMargin
    );

    setMaterialSelectionDelta({
      cogs: Math.round(nextBreakdown.totalCOGS - previousBreakdown.totalCOGS),
      leadTime: (nextMaterial.lead_time_weeks ?? 0) - (previousMaterial.lead_time_weeks ?? 0),
    });

    if (materialDeltaTimeoutRef.current) {
      window.clearTimeout(materialDeltaTimeoutRef.current);
    }

    materialDeltaTimeoutRef.current = window.setTimeout(() => {
      setMaterialSelectionDelta(null);
      materialDeltaTimeoutRef.current = null;
    }, 1800);
  }, [materialId, materials, constructionTier, baselineComplexity, conceptYardage, targetMSRP, brandTargetMargin]);

  const baselineMaterial = useMemo(() => {
    const id = recommendedMaterialId || materialId || "";
    return materials.find((m) => m.id === id) || null;
  }, [materials, recommendedMaterialId, materialId]);
  const selectedMaterialIsRecommended = materialId === recommendedMaterialId;
  const displayMaterial = selectedMaterial ?? baselineMaterial;
  const resolvedSelectedPieceImage = useMemo(
    () =>
      buildSelectedPieceImage({
        type: selectedKeyPiece?.type ?? selectedSubcategory?.id ?? null,
        pieceName:
          selectedKeyPiece?.item ??
          pieceBuildContext?.adaptedTitle ??
          pieceBuildContext?.originalLabel ??
          selectedSubcategory?.name ??
          selectedCategory.name,
        category: selectedKeyPiece?.category ?? categoryId,
        silhouette: selectedSubcategory?.name ?? conceptSilhouette,
        signal: selectedKeyPiece?.signal ?? null,
      }) ?? selectedPieceImage,
    [
      categoryId,
      conceptSilhouette,
      pieceBuildContext?.adaptedTitle,
      pieceBuildContext?.originalLabel,
      selectedCategory.name,
      selectedKeyPiece?.category,
      selectedKeyPiece?.item,
      selectedKeyPiece?.signal,
      selectedKeyPiece?.type,
      selectedPieceImage,
      selectedSubcategory?.id,
      selectedSubcategory?.name,
    ]
  );

  // Set step indicator and pre-select Muko's recommended values on first mount
  useEffect(() => { setCurrentStep(3); }, [setCurrentStep]);

  useEffect(() => {
    if (!hasInitialized && recommendedMaterialId) {
      setHasInitialized(true);
    }
  }, [hasInitialized, recommendedMaterialId]);

  // Sync local spec selections to Zustand store so they persist across navigation
  useEffect(() => {
    const cat = categories.find(c => c.id === categoryId);
    setCategory(cat?.name ?? categoryId);
  }, [categoryId, categories, setCategory]);

  useEffect(() => {
    if (materialId) setMaterial(materialId);
  }, [materialId, setMaterial]);

  useEffect(() => {
    if (constructionTier) setStoreTier(constructionTier);
  }, [constructionTier, setStoreTier]);

  // Auto-populate from selected key piece when it changes
  useEffect(() => {
    setSpecStep("material");
    setSpecStepDirection(1);
    if (selectedKeyPiece?.custom) {
      const matchedCat = selectedKeyPiece.category
        ? categories.find(
            (c) => c.id === selectedKeyPiece.category ||
              c.name.toLowerCase() === selectedKeyPiece.category?.toLowerCase()
          )
        : null;
      const resolvedCategoryId = matchedCat?.id ?? categoryId;
      const resolvedSubcategoryId = normalizeSpecSubcategoryId(selectedKeyPiece.type) ?? selectedKeyPiece.type ?? "";
      const resolvedSubcategories = allSubcategories[resolvedCategoryId] ?? [];
      if (matchedCat) setCategoryId(matchedCat.id);
      setSubcategoryId(resolvedSubcategoryId);
      setStoreSubcategory(resolvedSubcategoryId);
      setMaterialId("");
      setConstructionConfirmed(false);
      setOverrideWarning(null);
      setUserManuallySelected(false);
      setConstructionTier(
        getSmartDefaultForSubcategory(
          resolvedCategoryId,
          conceptSilhouette || undefined,
          resolvedSubcategoryId,
          resolvedSubcategories,
        )
      );
      return;
    }
    if (selectedKeyPiece && !selectedKeyPiece.custom) {
      if (selectedKeyPiece.category) {
        const matchedCat = categories.find(
          (c) => c.id === selectedKeyPiece.category ||
            c.name.toLowerCase() === selectedKeyPiece.category?.toLowerCase()
        );
        if (matchedCat) handleCategoryChange(matchedCat.id);
      }
      if (selectedKeyPiece.type) {
        const normalizedSubcategoryId = normalizeSpecSubcategoryId(selectedKeyPiece.type) ?? selectedKeyPiece.type;
        setSubcategoryId(normalizedSubcategoryId);
        setStoreSubcategory(normalizedSubcategoryId);
      }
      if (selectedKeyPiece.recommended_material_id) {
        setMaterialId(selectedKeyPiece.recommended_material_id);
        setUserManuallySelected(true);
      }
    }
  // Only run when selectedKeyPiece changes (not on every render)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKeyPiece]);

  useEffect(() => {
    if (!selectedKeyPiece?.custom || materialId || !recommendedMaterialId) return;
    setMaterialId(recommendedMaterialId);
  }, [materialId, recommendedMaterialId, selectedKeyPiece?.custom]);

  function getBaselineMaterialCost() {
    if (!baselineMaterial) {
      const recMat = materials.find((m) => m.id === recommendedMaterialId);
      return recMat?.cost_per_yard || 25;
    }
    return baselineMaterial.cost_per_yard || 25;
  }

  function scoreMaterialDeltas(m: Material): Deltas {
    const kws = aestheticKws;
    const isClean =
      kws.includes("clean") || kws.includes("tailored") || kws.includes("structural");
    const isSoft = kws.includes("soft") || kws.includes("fluid");

    let id = 0;
    let res = 0;

    if (isClean) {
      if (["cotton-twill", "linen", "tencel", "modal"].includes(m.id)) id += 2;
      if (["wool", "cashmere", "silk"].includes(m.id)) id += 1;
    }
    if (isSoft) {
      if (["tencel", "modal", "silk", "silk-blend"].includes(m.id)) res += 2;
    }

    const base = getBaselineMaterialCost();
    const diff = (m.cost_per_yard || 0) - base;
    const exec = clamp(Math.round(-diff / 10), -6, 6);

    const lt = m.lead_time_weeks || 0;
    const ltExec = lt >= 8 ? -2 : lt >= 6 ? -1 : 0;

    return {
      identity: clamp(id, -3, 4),
      commercialPotential: clamp(res, -3, 4),
      execution: clamp(exec + ltExec, -6, 6),
    };
  }

  function scoreComplexityDeltas(tier: ConstructionTier): Deltas {
    const base = baselineComplexity;
    const map: Record<ConstructionTier, number> = { low: 0, moderate: 1, high: 2 };
    const d = map[tier] - map[base];
    const id = clamp(d, -2, 2);
    const res = clamp(0, -1, 1);
    const exec = clamp(-d * 2, -4, 4);
    // Each chip with complexity_mod > 0 adds overhead (execution cost)
    const chipComplexityCount = chipSelection?.activatedChips.filter((c) => c.complexity_mod > 0).length ?? 0;
    return { identity: id, commercialPotential: res, execution: clamp(exec - chipComplexityCount, -6, 4) };
  }

  function addDeltas(a: Deltas, b: Deltas): Deltas {
    return {
      identity: a.identity + b.identity,
      commercialPotential: a.commercialPotential + b.commercialPotential,
      execution: a.execution + b.execution,
    };
  }

  const dynamicIdentityScore = useMemo(() => {
    if (!selectedMaterial) return conceptContext.identityScore;

    const baseScore = conceptContext.identityScore;
    const materialDelta = selectedMaterial ? scoreMaterialDeltas(selectedMaterial).identity : 0;
    const complexityDelta = constructionTier ? scoreComplexityDeltas(constructionTier).identity : 0;
    // Key piece: building the exact category the direction calls for reinforces identity
    const keyPieceDelta = (selectedKeyPiece && !selectedKeyPiece.custom && selectedKeyPiece.category && categoryId &&
      (selectedKeyPiece.category === categoryId || selectedKeyPiece.category.toLowerCase() === categoryId.toLowerCase()))
      ? 3 : 0;

    return clamp(
      baseScore + materialDelta + complexityDelta + keyPieceDelta,
      0,
      100
    );
  }, [
    selectedMaterial,
    constructionTier,
    conceptContext.identityScore,
    baselineMaterial,
    baselineComplexity,
    recommendedMaterialId,
    categoryId,
    materials,
    aestheticKws,
    selectedKeyPiece,
  ]);

  const commercialPotentialScore = useMemo(() => {
    if (!selectedMaterial) return conceptContext.resonanceScore;

    const baseScore = conceptContext.resonanceScore;
    const materialDelta = selectedMaterial ? scoreMaterialDeltas(selectedMaterial).commercialPotential : 0;
    const complexityDelta = constructionTier ? scoreComplexityDeltas(constructionTier).commercialPotential : 0;
    // Key piece signal reflects market momentum for this piece type
    const keyPieceDelta = selectedKeyPiece && !selectedKeyPiece.custom
      ? selectedKeyPiece.signal === 'ascending' ? 6
        : selectedKeyPiece.signal === 'high-volume' ? 4
        : selectedKeyPiece.signal === 'emerging' ? 2
        : 0
      : 0;

    return clamp(
      baseScore + materialDelta + complexityDelta + keyPieceDelta,
      0,
      100
    );
  }, [
    selectedMaterial,
    constructionTier,
    conceptContext.resonanceScore,
    baselineMaterial,
    baselineComplexity,
    recommendedMaterialId,
    categoryId,
    materials,
    aestheticKws,
    selectedKeyPiece,
  ]);

  const identityColor =
    dynamicIdentityScore >= 80
      ? CHARTREUSE
      : dynamicIdentityScore >= 60
        ? BRAND.rose
        : BRAND.camel;

  const commercialPotentialColor =
    commercialPotentialScore >= 80
      ? CHARTREUSE
      : commercialPotentialScore >= 60
        ? BRAND.rose
        : BRAND.camel;

  // ─── Pulse chip data ───────────────────────────────────────────────────────
  const identityChipData: PulseChipProps =
    dynamicIdentityScore >= 80
      ? { variant: "green", status: "On-brand", consequence: "Reinforces core DNA" }
      : dynamicIdentityScore >= 60
        ? { variant: "amber", status: "Adjacent", consequence: "Not core territory" }
        : { variant: "red", status: "Misaligned", consequence: "Review brand fit" };

  const aestheticEntry = (aestheticsData as Array<{ id: string; name: string; trend_velocity: string; saturation_score: number }>)
    .find((a) => a.id === conceptContext.aestheticMatchedId || a.name === conceptContext.aestheticName);

  const marketSaturationSignal = useMemo(() => getSpecMarketSaturationSignal({
    trendVelocity: aestheticEntry?.trend_velocity,
    saturationScore: aestheticEntry?.saturation_score,
  }), [aestheticEntry?.saturation_score, aestheticEntry?.trend_velocity]);

  const commercialPotentialChipData: PulseChipProps =
    commercialPotentialScore >= 80
      ? { variant: "green", status: "High upside", consequence: "Commercially attractive" }
      : commercialPotentialScore >= 60
        ? { variant: "amber", status: "Promising", consequence: "Viable with sharper distinction" }
        : { variant: "red", status: "Limited pull", consequence: "Needs a stronger commercial hook" };

  // Blended execution chip: lead with cost if both fail; show timeline message if only timeline fails
  const executionChipData: PulseChipProps | null = (() => {
    if (overrideWarning) {
      return { variant: "amber", status: "Complexity mismatch", consequence: overrideWarning.split(".")[0] };
    }
    if (!executionStatus) return null;

    const costFailed = costStatus === 'red';
    const timelineFailed = timelineStatus === 'red';
    const timelineTight  = timelineStatus === 'yellow';

    if (costFailed && timelineFailed) {
      return { variant: "red", status: "Not feasible", consequence: "Adjust cost and timeline to proceed" };
    }
    if (costFailed) {
      return { variant: "red", status: "Not feasible", consequence: "Adjust specs to proceed" };
    }
    if (timelineFailed) {
      return { variant: "red", status: "Timeline risk", consequence: timelineFeasibility?.message ?? "Significant timeline risk" };
    }
    if (timelineTight && costStatus === 'yellow') {
      return { variant: "amber", status: "Tight margin + timeline", consequence: "Reduce complexity or extend deadline" };
    }
    if (timelineTight) {
      return { variant: "amber", status: "Tight timeline", consequence: timelineFeasibility?.message ?? "Tight but possible" };
    }
    if (costStatus === 'yellow') {
      return { variant: "amber", status: "Tight margin", consequence: "Reduce complexity" };
    }
    return { variant: "green", status: "Feasible", consequence: "Good margin headroom" };
  })();
  // ─────────────────────────────────────────────────────────────────────────

  // Blended execution score: both fail = 35, one fails = 50, yellow = 65, green = 80
  const baseExecutionScore = (() => {
    const costRed      = costStatus === 'red';
    const timelineRed  = timelineStatus === 'red';
    const timelineYellow = timelineStatus === 'yellow';
    if (costRed && timelineRed) return 35;
    if (costRed || timelineRed) return 50;
    if (timelineYellow) return 65;
    if (executionStatus === 'yellow') return 55;
    if (executionStatus === 'green') return 80;
    return 0;
  })();

  const marginGatePassed = !insight || insight.type !== "warning";

  const executionScore = applyRoleModifiers(
    baseExecutionScore,
    storeCollectionRole ?? '',
    { cost: marginGatePassed },
    constructionTier ?? ''
  );

  const timelineBuffer = selectedMaterial
    ? (selectedMaterial.lead_time_weeks ?? 0) <= 6 ? 6
      : (selectedMaterial.lead_time_weeks ?? 0) <= 8 ? 3
      : 1
    : 6;

  const specInsightData = getSpecInsightData(executionScore, marginGatePassed, timelineBuffer);

  // ─── Synthesizer: reactive MUKO INSIGHT (streaming) ──────────────────────
  const specAbortRef = useRef<AbortController | null>(null);
  const reportAbortRef = useRef<AbortController | null>(null);
  const specRawJsonRef = useRef<string>('');
  const leverNotesSavedTimeoutRef = useRef<number | null>(null);
  const [specSynthInsightData, setSpecSynthInsightData] = useState<InsightData | null>(null);
  const [specRailInsight, setSpecRailInsight] = useState<SpecRailInsight | null>(null);


  useEffect(() => {
    if (!userManuallySelected || !materialId || !conceptContext.aestheticMatchedId || !specFallbackRail) {
      setSpecRailInsight(null);
      return;
    }

    const tensionToNum = (v: string) => v === 'left' ? 75 : v === 'right' ? 25 : 50;
    let intentPayload: import('@/lib/synthesizer/blackboard').IntentCalibration | undefined;
    try {
      const raw = window.localStorage.getItem('muko_intent');
      if (raw) {
        const parsed = JSON.parse(raw) as { tensions?: Record<string, string> };
        const t = parsed.tensions ?? {};
        intentPayload = {
          primary_goals: intentGoals,
          tradeoff: intentTradeoff,
          piece_role: storeCollectionRole ?? '',
          tension_sliders: {
            trend_forward: tensionToNum(t.trendForward_vs_timeless ?? 'center'),
            creative_expression: tensionToNum(t.creative_vs_commercial ?? 'center'),
            elevated_design: tensionToNum(t.elevated_vs_accessible ?? 'center'),
            novelty: tensionToNum(t.novelty_vs_continuity ?? 'center'),
          },
        };
      }
    } catch { /* no intent stored — omit from payload */ }

    const blackboard = buildSpecBlackboard({
      aestheticSlug: conceptContext.aestheticMatchedId,
      brandKeywords: refinementModifiers,
      collectionDirection: storeAestheticName || conceptContext.aestheticName,
      collectionLanguage: collectionLanguageContext.map((chip) => chip.label),
      expressionSignals: expressionSignalContext.map((chip) => chip.label),
      brandInterpretation: directionInterpretationText || null,
      identity_score: dynamicIdentityScore,
      resonance_score: commercialPotentialScore,
      execution_score: executionScore,
      materialId,
      cogs_usd: insight?.cogs ?? 0,
      target_msrp: targetMSRP,
      targetMargin: brandTargetMargin,
      marginBuffer,
      margin_pass: marginGatePassed,
      construction_tier: constructionTier ?? 'moderate',
      timeline_weeks: timelineWeeks,
      requiredTimelineWeeks: timelineFeasibility?.required_weeks ?? null,
      timelineGapWeeks: timelineFeasibility?.timeline_gap ?? null,
      season: storeSeason || 'SS27',
      collectionName: brandProfileName || '',
      silhouette: conceptSilhouette || undefined,
      category: categoryId || undefined,
      currentStep: specStep,
      constructionOverride: constructionTierOverride || Boolean(overrideWarning),
      pulse: {
        identity: specPulseTelemetry.identity.label.replace(/\s+/g, "_"),
        commercial_potential: specPulseTelemetry.commercial_potential.label.replace(/\s+/g, "_"),
        execution: specPulseTelemetry.execution.label.replace(/\s+/g, "_"),
        saturation: specPulseTelemetry.saturation.label.replace(/\s+/g, "_"),
      },
      diagnostics: specDiagnostics,
      keyPiece: selectedKeyPiece && !selectedKeyPiece.custom && selectedKeyPiece.type
        ? { item: selectedKeyPiece.item, type: selectedKeyPiece.type, signal: selectedKeyPiece.signal ?? '' }
        : undefined,
      currentPieceSet: {
        collection_language: collectionLanguageContext.filter((chip) => chip.state !== "missing").map((chip) => chip.label),
        expression_signals: expressionSignalContext.filter((chip) => chip.state !== "missing").map((chip) => chip.label),
      },
      gapState: [
        ...collectionLanguageContext.filter((chip) => chip.state === "missing").map((chip) => `${chip.label} is not yet established across the current assortment.`),
        ...expressionSignalContext.filter((chip) => chip.state === "missing").map((chip) => `${chip.label} has not yet been realized through the current pieces.`),
      ],
      tensionState: [
        ...expressionSignalContext.filter((chip) => chip.state === "emerging").map((chip) => `${chip.label} is emerging but still reads as incidental.`),
      ],
      intent: intentPayload,
    });
    if (!blackboard) return;

    specAbortRef.current?.abort();
    const controller = new AbortController();
    specAbortRef.current = controller;
    setSpecRailInsight(null);

    const timer = window.setTimeout(async () => {
      specRawJsonRef.current = '';
      try {
        const res = await fetch('/api/synthesizer/spec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blackboard),
          signal: controller.signal,
        });
        if (!res.ok || !res.body || controller.signal.aborted) return;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';
        let currentData = '';

        const processMessage = (event: string, data: string) => {
          if (event === 'chunk') {
            try {
              const parsed = JSON.parse(data) as { text: string };
              const chunk = parsed.text ?? '';
              specRawJsonRef.current += chunk;
            } catch { /* ignore parse errors on partial chunks */ }
          } else if (event === 'complete' || event === 'fallback') {
            try {
              const result = JSON.parse(data) as { rail: SpecRailInsight; data: InsightData; meta: { method: string } };
              if (!controller.signal.aborted) {
                setSpecRailInsight(result.rail);
                setSpecSynthInsightData(result.data);
                // Persist analysis — awaited inside async IIFE so the stream loop is not blocked
                void (async () => {
                  try {
                    const supabase = createClient();
                    const { data: authData } = await supabase.auth.getUser();
                    const userId = authData.user?.id ?? null;

                    const session = useSessionStore.getState();
                    const finalScore = Math.round(
                      (dynamicIdentityScore + commercialPotentialScore + executionScore) / 3
                    );
                    let reportNarrative = result.data.statements?.join('\n\n') ?? '';

                    const reportBlackboard = buildReportBlackboard({
                      aestheticSlug: conceptContext.aestheticMatchedId || '',
                      brandKeywords: refinementModifiers,
                      identity_score: dynamicIdentityScore,
                      resonance_score: commercialPotentialScore,
                      execution_score: executionScore,
                      overall_score: finalScore,
                      materialId: materialId || '',
                      cogs_usd: insight?.cogs ?? 0,
                      target_msrp: targetMSRP,
                      margin_pass: marginGatePassed,
                      construction_tier: constructionTier ?? 'moderate',
                      timeline_weeks: timelineWeeks,
                      season: storeSeason || 'SS27',
                      collectionName: storeCollectionName || brandProfileName || '',
                      brandName: brandProfileName ?? undefined,
                      collection_role: storeCollectionRole ?? null,
                      priceTier: 'Contemporary',
                      targetMargin: brandTargetMargin,
                      keyPiece: selectedKeyPiece && !selectedKeyPiece.custom && selectedKeyPiece.type
                        ? { item: selectedKeyPiece.item, type: selectedKeyPiece.type, signal: selectedKeyPiece.signal ?? '' }
                        : undefined,
                      conceptInsightTitle: session.conceptInsightTitle,
                      conceptInsightPositioning: session.conceptInsightPositioning,
                      isProxyMatch: session.isProxyMatch,
                    });

                    if (reportBlackboard) {
                      try {
                        reportAbortRef.current?.abort();
                        reportAbortRef.current = new AbortController();
                        const reportResponse = await fetch('/api/synthesizer/report', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(reportBlackboard),
                          signal: reportAbortRef.current.signal,
                        });

                        if (reportResponse.ok) {
                          const reportResult = await reportResponse.json() as { data?: InsightData };
                          const reportStatements = reportResult.data?.statements?.filter(Boolean) ?? [];
                          if (reportStatements.length > 0) {
                            reportNarrative = reportStatements.join('\n\n');
                          }
                        }
                      } catch (err) {
                        if ((err as Error)?.name === 'AbortError') return;
                        console.error('[Spec] Report narrative synthesis failed:', err);
                      }
                    }

                    const bb: PipelineBlackboard = {
                      input: {
                        aesthetic_input:   conceptContext.aestheticName || '',
                        material_id:       materialId || '',
                        silhouette:        conceptSilhouette || '',
                        construction_tier: constructionTier ?? 'moderate',
                        category:          categoryId || '',
                        target_msrp:       targetMSRP,
                        season:            storeSeason || '',
                        collection_name:   storeCollectionName || brandProfileName || '',
                        timeline_weeks:    timelineWeeks,
                      },
                      brand: {
                        id:               brandProfileId,
                        brand_name:       brandProfileName ?? '',
                        keywords:         [],
                        customer_profile: null,
                        price_tier:       'Contemporary',
                        target_margin:    brandTargetMargin,
                        tension_context:  null,
                      },
                      session: {
                        collectionName:    storeCollectionName || '',
                        season:            storeSeason || '',
                        selectedAesthetic: conceptContext.aestheticMatchedId || null,
                        selectedElements:  [],
                        category:          categoryId || null,
                        targetMSRP:        targetMSRP,
                        materialId:        materialId || null,
                        silhouette:        conceptSilhouette || null,
                        constructionTier:  constructionTier ?? null,
                        timelineWeeks:     timelineWeeks,
                        collectionRole:    storeCollectionRole ?? null,
                        // Extra fields read by buildAnalysisRow via [key: string]: unknown
                        savedAnalysisId:             session.savedAnalysisId,
                        // parent_analysis_id removed — branching deferred to Phase 2
                        collectionAesthetic:         session.collectionAesthetic,
                        aestheticInflection:         session.aestheticInflection,
                        directionInterpretationText: session.directionInterpretationText,
                        intent:                      intentPayload,
                        selectedKeyPiece:           session.selectedKeyPiece,
                        pieceBuildContext:          session.pieceBuildContext,
                        selectedPieceImage:         session.selectedPieceImage,
                      },
                      aesthetic_matched_id:     conceptContext.aestheticMatchedId || null,
                      is_proxy_match:           false,
                      aesthetic_keywords:       [],
                      saturation_score:         50,
                      trend_velocity:           'stable',
                      category_saturation:      50,
                      category_velocity:        'stable',
                      identity_score:           dynamicIdentityScore,
                      tension_flags:            [],
                      critic_conflict_detected: false,
                      critic_conflict_ids:      [],
                      critic_llm_used:          false,
                      critic_reasoning:         '',
                      resonance_score:          commercialPotentialScore,
                      execution_score:          executionScore,
                      timeline_buffer:          timelineBuffer,
                      cogs:                     insight?.cogs ?? 0,
                      gate_passed:              marginGatePassed,
                      cogs_delta:               0,
                      final_score:              finalScore,
                      redirect:                 null,
                      narrative:                reportNarrative,
                    };

                    const analysisResult: AnalysisResultOrch = {
                      score:      finalScore,
                      dimensions: {
                        identity:  dynamicIdentityScore,
                        resonance: commercialPotentialScore,
                        execution: executionScore,
                      },
                      gates_passed: { cost: marginGatePassed, sustainability: null },
                      narrative:            bb.narrative,
                      redirect:             null,
                      agent_versions:       AGENT_VERSIONS,
                      aesthetic_matched_id: bb.aesthetic_matched_id,
                      errors:               [],
                      analysis_id:          null,
                    };

                    const row = buildAnalysisRow(bb, analysisResult, userId);
                    const { data: upsertData, error: upsertError } = await persistAnalysisRow(supabase, row);

                    if (upsertError) {
                      console.error('[Spec] Analysis persist failed:', serializePersistError(upsertError));
                    } else if (upsertData?.id) {
                      setSavedAnalysisId(upsertData.id as string);
                    }
                  } catch (err) {
                    console.error('[Spec] Analysis persist threw:', serializePersistError(err));
                  }
                })();
              }
            } catch { /* ignore */ }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done || controller.signal.aborted) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              currentData = line.slice(6);
            } else if (line === '') {
              if (currentEvent && currentData) processMessage(currentEvent, currentData);
              currentEvent = '';
              currentData = '';
            }
          }
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      } finally {
        if (controller.signal.aborted) return;
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
      reportAbortRef.current?.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId, constructionTier, categoryId, targetMSRP, userManuallySelected]);


  // ─── Fix #1: Write execution state to store so report page gets real data ──
  useEffect(() => {
    if (!executionStatus) return;
    updateExecutionPulse({
      status: executionStatus as 'green' | 'yellow' | 'red',
      score: executionScore,
      message: executionChipData?.consequence ?? '',
    });
  }, [executionStatus, executionScore, executionChipData?.consequence]);
  useEffect(() => () => {
    if (materialDeltaTimeoutRef.current) {
      window.clearTimeout(materialDeltaTimeoutRef.current);
    }
  }, []);
  // ──────────────────────────────────────────────────────────────────────────

  const selectedImpact: Deltas = useMemo(() => {
    if (!selectedMaterial) return { identity: 0, commercialPotential: 0, execution: 0 };
    const m = scoreMaterialDeltas(selectedMaterial);
    const c = constructionTier ? scoreComplexityDeltas(constructionTier) : { identity: 0, commercialPotential: 0, execution: 0 };
    return addDeltas(m, c);
  }, [selectedMaterial, constructionTier]);

  const mukoSynthesis = useMemo(() => {
    if (!selectedMaterial) return null;
    if (!insight) {
      return {
        headline: "Select a material and complexity to see full cost analysis",
        overall: `You've selected ${selectedMaterial.name} — this material ${
          scoreMaterialDeltas(selectedMaterial).identity > 0
            ? "supports"
            : scoreMaterialDeltas(selectedMaterial).identity < 0
              ? "creates tension with"
              : "is neutral for"
        } your ${conceptContext.aestheticName} direction.`,
        detail: `At $${selectedMaterial.cost_per_yard}/yd with ${selectedMaterial.lead_time_weeks} week lead time, ${selectedMaterial.name} ${
          (selectedMaterial.cost_per_yard || 0) > 30
            ? "is a premium choice that will impact your margin ceiling"
            : (selectedMaterial.cost_per_yard || 0) > 20
              ? "sits at a moderate price point"
              : "is cost-effective and helps preserve margin"
        }. Select complexity to see the full COGS breakdown.`,
        suggestions: [],
      };
    }

    const ceiling = insight.ceiling;
    const cogs = insight.cogs;
    const overBy = cogs - ceiling;

    const isOnRecommendedMaterial = materialId === recommendedMaterialId;
    const isOnRecommendedComplexity = constructionTier === baselineComplexity;

    const idLine =
      selectedImpact.identity >= 3
        ? "very on-brand"
        : selectedImpact.identity >= 1
          ? "on-brand"
          : selectedImpact.identity <= -1
            ? "drifting off-brand"
            : "brand-neutral";

    const commercialLine =
      selectedImpact.commercialPotential >= 2
        ? "commercially attractive"
        : selectedImpact.commercialPotential >= 1
          ? "commercially supportive"
          : selectedImpact.commercialPotential <= -1
            ? "less persuasive commercially"
            : "commercially steady";

    const execLine =
      overBy > 0
        ? "with execution risk"
        : insight.type === "strong"
          ? "with strong execution headroom"
          : "with manageable execution headroom";

    const overall = `Overall: ${idLine} + ${commercialLine}, ${execLine}.`;

    const currentCogs = cogs;
    const currentTier = constructionTier!;
    const currentMatId = materialId;

    const projCOGS = (mat: Material, yardage: number, tier: ConstructionTier) =>
      calculateCOGS(mat, yardage, tier, false, targetMSRP, brandTargetMargin).totalCOGS;

    const suggestions: SpecSuggestion[] = [];

    if (overBy > 0) {
      if (constructionTier === "high" && !isOnRecommendedComplexity) {
        const projected = projCOGS(selectedMaterial, conceptYardage, "moderate");
        suggestions.push({
          id: "complexity-moderate",
          label: "Reduce complexity to Moderate",
          kind: "complexity",
          action: () => handleComplexityChange("moderate"),
          undoAction: () => handleComplexityChange(currentTier),
          sub: `Reduces cost by ~$${Math.round(currentCogs - projected)} and lowers build risk`,
          before: { label: "High", cogs: Math.round(currentCogs) },
          after: { label: "Moderate", projectedCogs: Math.round(projected), saving: Math.round(currentCogs - projected) },
        });
      } else if (constructionTier === "moderate" && !isOnRecommendedComplexity) {
        const projected = projCOGS(selectedMaterial, conceptYardage, "low");
        suggestions.push({
          id: "complexity-low",
          label: "Reduce complexity to Low",
          kind: "complexity",
          action: () => handleComplexityChange("low"),
          undoAction: () => handleComplexityChange(currentTier),
          sub: `Simplifies construction and reduces cost by ~$${Math.round(currentCogs - projected)}`,
          before: { label: "Moderate", cogs: Math.round(currentCogs) },
          after: { label: "Low", projectedCogs: Math.round(projected), saving: Math.round(currentCogs - projected) },
        });
      }

      if (alternativeMaterial && !isOnRecommendedMaterial) {
        const projected = projCOGS(alternativeMaterial, conceptYardage, constructionTier!);
        suggestions.push({
          id: `material-${alternativeMaterial.id}`,
          label: `Swap material to ${alternativeMaterial.name}`,
          kind: "material",
          action: () => {
            const alt = materials.find((m) => m.id === alternativeMaterial.id);
            if (alt) { setMaterialId(alt.id); setUserManuallySelected(true); }
          },
          undoAction: () => { setMaterialId(currentMatId); if (!currentMatId) setUserManuallySelected(false); },
          sub: `Reduces cost by ~$${Math.round(currentCogs - projected)} at $${alternativeMaterial.cost_per_yard}/yd`,
          before: { label: selectedMaterial.name, cogs: Math.round(currentCogs) },
          after: { label: alternativeMaterial.name, projectedCogs: Math.round(projected), saving: Math.round(currentCogs - projected) },
        });
      }

      // Silhouette is locked from Concept Studio — no silhouette suggestions
    }

    // ── Under-budget: suggest upgrades to invest remaining headroom ──
    if (overBy <= 0) {
      const buffer = -overBy;

      // Suggest upgrading complexity if not already at high
      if (constructionTier !== "high") {
        const nextTier: ConstructionTier = constructionTier === "low" ? "moderate" : "high";
        const projected = projCOGS(selectedMaterial, conceptYardage, nextTier);
        if (projected <= ceiling) {
          const extraCost = projected - currentCogs;
          suggestions.push({
            id: `upgrade-complexity-${nextTier}`,
            label: `Push complexity to ${nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}`,
            kind: "upgrade-complexity",
            action: () => handleComplexityChange(nextTier),
            undoAction: () => handleComplexityChange(currentTier),
            sub: `+$${Math.round(extraCost)} COGS — adds detail and finishing quality while staying within ceiling`,
            before: { label: currentTier.charAt(0).toUpperCase() + currentTier.slice(1), cogs: Math.round(currentCogs) },
            after: { label: nextTier.charAt(0).toUpperCase() + nextTier.slice(1), projectedCogs: Math.round(projected), saving: -Math.round(extraCost) },
          });
        }
      }

      // Suggest upgrading to a premium material that fits within headroom
      if (upgradeMaterial) {
        const projected = projCOGS(upgradeMaterial, conceptYardage, constructionTier!);
        const extraCost = projected - currentCogs;
        const upgradeDeltas = scoreMaterialDeltas(upgradeMaterial);
        const currentDeltas = scoreMaterialDeltas(selectedMaterial);
        const identityGain = upgradeDeltas.identity - currentDeltas.identity;
        const qualityNote = identityGain > 0
          ? "stronger brand alignment"
          : "elevated hand-feel";
        suggestions.push({
          id: `upgrade-material-${upgradeMaterial.id}`,
          label: `Upgrade to ${upgradeMaterial.name}`,
          kind: "upgrade-material",
          action: () => {
            const mat = materials.find((m) => m.id === upgradeMaterial.id);
            if (mat) { setMaterialId(mat.id); setUserManuallySelected(true); }
          },
          undoAction: () => { setMaterialId(currentMatId); if (!currentMatId) setUserManuallySelected(false); },
          sub: `+$${Math.round(extraCost)} COGS at $${upgradeMaterial.cost_per_yard}/yd — ${qualityNote}`,
          before: { label: selectedMaterial.name, cogs: Math.round(currentCogs) },
          after: { label: upgradeMaterial.name, projectedCogs: Math.round(projected), saving: -Math.round(extraCost) },
        });
      }

      // If nothing else, suggest they're in a strong position
      if (suggestions.length === 0 && buffer > 15) {
        suggestions.push({
          id: "invest-finishing",
          label: "Invest in finishing details",
          kind: "upgrade-complexity",
          action: () => {},
          undoAction: () => {},
          sub: `$${Math.round(buffer)} buffer available — consider custom trims, branded hardware, or specialty finishing`,
          before: { label: "Current", cogs: Math.round(currentCogs) },
          after: { label: "Enhanced", projectedCogs: Math.round(currentCogs), saving: 0 },
        });
      }
    }

    // Palette is locked from Concept Studio — no palette suggestions

    // ── Silhouette-material conflict warning for the SELECTED material ───────
    const silhouetteConflict = checkSelectedMaterialConflict(selectedMaterial, conceptSilhouette || undefined);
    if (silhouetteConflict) {
      suggestions.push({
        id: 'silhouette-material-warning',
        label: `Material may not suit ${conceptSilhouette} construction`,
        kind: 'warning',
        sub: silhouetteConflict.reason,
        before: { label: selectedMaterial.name, cogs: Math.round(currentCogs) },
        after: { label: selectedMaterial.name, projectedCogs: Math.round(currentCogs), saving: 0 },
        action: () => {},
        undoAction: () => {},
        materialSilhouetteWarning: true,
        warningReason: silhouetteConflict.reason,
      });
    }

    const headline =
      overBy > 0
        ? `$${cogs} estimated COGS — $${overBy} over your $${ceiling} ceiling`
        : `$${cogs} estimated COGS — within your $${ceiling} ceiling`;

    const detail =
      overBy > 0
        ? `Your biggest cost driver is ${selectedMaterial.name} at $${selectedMaterial.cost_per_yard}/yd. Pull cost back through complexity or material first.`
        : `You're in a safe zone. If you want to push the piece into more "statement" territory, you have room to invest in finishing details without breaking margin.`;

    return { headline, overall, detail, suggestions };
  }, [
    insight,
    selectedMaterial,
    selectedImpact,
    constructionTier,
    alternativeMaterial,
    upgradeMaterial,
    materials,
    materialId,
    recommendedMaterialId,
    baselineComplexity,
    conceptContext.aestheticName,
    conceptContext.aestheticMatchedId,
    conceptYardage,
    targetMSRP,
    conceptSilhouette,
  ]);


  const displayConstruction = constructionConfirmed && constructionTier
    ? CONSTRUCTION_INFO[constructionTier].label
    : "—";
  const displayLeadTime = selectedMaterial ? `${selectedMaterial.lead_time_weeks} weeks` : "—";
  const displayEstimatedCogs = insight ? `$${insight.cogs}` : "—";
  const marginBuffer = insight ? insight.ceiling - insight.cogs : null;
  const activeRole = pieceBuildContext?.role ?? storeCollectionRole;
  const selectedMaterialProperties = useMemo(
    () => getMaterialProperties(selectedMaterial),
    [selectedMaterial]
  );
  const materialBehavior = useMemo(() => {
    if (!selectedMaterial) return null;
    if (
      selectedMaterialProperties.some((property) => /drape|fluid|soft|silky|slinky/i.test(property)) ||
      /tencel|silk|rayon|viscose/i.test(selectedMaterial.id)
    ) {
      return "fluid";
    }
    if (
      selectedMaterialProperties.some((property) => /structured|crisp|firm|body|hold/i.test(property)) ||
      /linen|hemp|nylon|leather|vegan-leather/i.test(selectedMaterial.id)
    ) {
      return "structured";
    }
    if (selectedMaterialProperties.some((property) => /texture|slub|grain|tactile|brushed/i.test(property))) {
      return "textural";
    }
    return "balanced";
  }, [selectedMaterial, selectedMaterialProperties]);
  const specDiagnostics = useMemo(() => {
    const targetCogs = insight?.ceiling ?? (targetMSRP > 0 ? Math.round(targetMSRP * (1 - brandTargetMargin)) : null);
    return deriveSpecDiagnostics({
      pieceRole: activeRole,
      specStep,
      silhouette: conceptSilhouette ?? selectedSubcategory?.name ?? selectedCategory.name,
      constructionTier: constructionTier ?? "moderate",
      constructionOverride: constructionTierOverride || Boolean(overrideWarning),
      materialBehavior: materialBehavior ?? "balanced",
      materialProperties: selectedMaterialProperties,
      marginBuffer,
      targetCogs,
      timelineGapWeeks: timelineFeasibility?.timeline_gap ?? null,
      requiredTimelineWeeks: timelineFeasibility?.required_weeks ?? null,
      availableTimelineWeeks: timelineWeeks,
      identityScore: dynamicIdentityScore,
      resonanceScore: commercialPotentialScore,
      executionScore,
      strongExpressionLabels,
      missingExpressionLabels,
      collectionLanguageLabels: collectionLanguageContext.map((chip) => chip.label),
      expressionSignals: expressionSignalContext.map((chip) => chip.label),
    });
  }, [
    activeRole,
    brandTargetMargin,
    collectionLanguageContext,
    commercialPotentialScore,
    conceptSilhouette,
    constructionTier,
    constructionTierOverride,
    dynamicIdentityScore,
    executionScore,
    expressionSignalContext,
    insight?.ceiling,
    marginBuffer,
    materialBehavior,
    missingExpressionLabels,
    overrideWarning,
    selectedCategory.name,
    selectedMaterialProperties,
    selectedSubcategory?.name,
    specStep,
    strongExpressionLabels,
    targetMSRP,
    timelineFeasibility?.required_weeks,
    timelineFeasibility?.timeline_gap,
    timelineWeeks,
  ]);
  const specFallbackRail = useMemo(() => {
    if (!selectedMaterial || !insight) return null;
    return buildFallbackSpecRail({
      material_name: selectedMaterial.name,
      material_id: selectedMaterial.id,
      category: categoryId || selectedCategory.name,
      silhouette: conceptSilhouette || selectedSubcategory?.name || selectedCategory.name,
      construction_tier: constructionTier ?? "moderate",
      target_msrp: targetMSRP,
      cogs_usd: insight.cogs,
      timeline_weeks: timelineWeeks,
      required_timeline_weeks: timelineFeasibility?.required_weeks ?? undefined,
      timeline_gap_weeks: timelineFeasibility?.timeline_gap ?? undefined,
      brand_name: brandProfileName ?? undefined,
      keyPiece: selectedKeyPiece && !selectedKeyPiece.custom && selectedKeyPiece.type
        ? { item: selectedKeyPiece.item, type: selectedKeyPiece.type, signal: selectedKeyPiece.signal ?? "" }
        : undefined,
      diagnostics: specDiagnostics,
      resolved_redirects: {
        cost_reduction: alternativeMaterial
          ? { material_id: alternativeMaterial.id, reason: "Lower-cost option preserving key behavior." }
          : null,
      },
    });
  }, [
    alternativeMaterial,
    brandProfileName,
    categoryId,
    conceptSilhouette,
    constructionTier,
    insight,
    selectedCategory.name,
    selectedKeyPiece,
    selectedMaterial,
    selectedSubcategory?.name,
    specDiagnostics,
    timelineFeasibility?.required_weeks,
    timelineFeasibility?.timeline_gap,
    timelineWeeks,
    targetMSRP,
  ]);
  const activeSpecRail = specRailInsight ?? specFallbackRail;
  const showBetterPath = activeSpecRail ? shouldShowBetterPath(activeSpecRail) : false;

  useEffect(() => {
    const nextLevers = activeSpecRail?.execution_levers ?? [];
    setSelectedLevers(new Set(nextLevers));
    setShowBetterPathConfirm(false);
  }, [activeSpecRail?.execution_levers]);

  useEffect(() => () => {
    if (leverNotesSavedTimeoutRef.current) {
      window.clearTimeout(leverNotesSavedTimeoutRef.current);
    }
  }, []);

  const displayCogs = insight ? `$${insight.cogs}` : "—";
  const executionSubLabel = selectedMaterial
    ? [
        timelineStatus === "red"
          ? "Timeline Risk"
          : timelineStatus === "yellow"
            ? "Timeline Tight"
            : "Timeline Stable",
        `Score ${executionScore}`,
        `COGS ${displayCogs}`,
      ].join(" · ")
    : "Select a material to activate execution.";
  const specPulseTelemetry = useMemo(() => buildSpecPulseTelemetry({
    commercialPotentialScore,
    marketSaturation: marketSaturationSignal,
    identityStatus: dynamicIdentityScore >= 80 ? "green" : dynamicIdentityScore >= 60 ? "yellow" : "red",
    executionStatus: executionChipData?.variant === "green" ? "green" : executionChipData?.variant === "red" ? "red" : executionChipData?.variant === "amber" ? "yellow" : null,
    executionPending: !selectedMaterial,
  }), [
    commercialPotentialScore,
    dynamicIdentityScore,
    executionChipData?.variant,
    marketSaturationSignal,
    selectedMaterial,
  ]);
  const pulseRows = [
    {
      key: "identity",
      label: "Identity",
      icon: <IconIdentity color={identityColor} />,
      displayScore: String(dynamicIdentityScore),
      numericPercent: dynamicIdentityScore,
      scoreColor: identityColor,
      pill: { variant: identityChipData.variant, label: identityChipData.status },
      subLabel: `Signal ${specPulseTelemetry.identity.label}`,
      whatItMeans: "Identity telemetry tracks how clearly the piece still carries the collection's intended point of view.",
      howCalculated: "Built from concept alignment, anchor-piece context, and continuity between the selected spec and the locked direction.",
      isPending: false,
    },
    {
      key: "commercial-potential",
      label: "Commercial Potential",
      icon: <IconResonance color={commercialPotentialColor} />,
      displayScore: String(commercialPotentialScore),
      numericPercent: commercialPotentialScore,
      scoreColor: commercialPotentialColor,
      pill: { variant: commercialPotentialChipData.variant, label: commercialPotentialChipData.status },
      subLabel: `${specPulseTelemetry.commercial_potential.label} · ${specPulseTelemetry.saturation.label}`,
      whatItMeans: "Commercial telemetry shows likely pull once the concept becomes product, with market saturation held as supporting evidence.",
      howCalculated: "Built from concept resonance, product relevance, piece signal, and market state telemetry.",
      isPending: false,
    },
    {
      key: "execution",
      label: "Execution",
      icon: <IconExecution color={executionColor} />,
      displayScore: String(executionScore),
      numericPercent: executionScore,
      scoreColor: executionColor,
      pill: executionChipData ? { variant: executionChipData.variant, label: executionChipData.status } : null,
      subLabel: `Signal ${specPulseTelemetry.execution.label} · ${executionSubLabel}`,
      whatItMeans: "Execution telemetry tracks how much production pressure the current material, construction, cost, and calendar are creating.",
      howCalculated: "Derived from cost gate status, timeline feasibility, and the selected build path.",
      isPending: !selectedMaterial,
    },
  ];
  const collapsedPulseInsight = useMemo(() => buildSpecPulseInsight({
    commercialPotentialScore,
    marketSaturation: marketSaturationSignal,
    identityStatus: dynamicIdentityScore >= 80 ? "green" : dynamicIdentityScore >= 60 ? "yellow" : "red",
    executionStatus: executionChipData?.variant === "green" ? "green" : executionChipData?.variant === "red" ? "red" : executionChipData?.variant === "amber" ? "yellow" : null,
    executionPending: !selectedMaterial,
  }), [
    dynamicIdentityScore,
    commercialPotentialScore,
    executionChipData,
    marketSaturationSignal,
    selectedMaterial,
  ]);

  const buildOutcomeRows = useMemo(() => [
    { label: "Material", value: selectedMaterial?.name ?? "—" },
    { label: "Construction", value: displayConstruction },
    { label: "Estimated COGS", value: displayEstimatedCogs },
    { label: "Lead Time", value: displayLeadTime },
    {
      label: "Margin Buffer",
      value: marginBuffer == null ? "—" : marginBuffer >= 0 ? `$${marginBuffer}` : `-$${Math.abs(marginBuffer)}`,
    },
  ], [selectedMaterial, displayConstruction, displayEstimatedCogs, displayLeadTime, marginBuffer]);

  /* ─── RENDER ───────────────────────────────────────────────────────────── */
  const overallScore = Math.round((dynamicIdentityScore + commercialPotentialScore + executionScore) / 3);
  const specInsightNarrative = specInsightData.statements.join(" ");

  const persistAnalysisRow = useCallback(async (
    supabase: ReturnType<typeof createClient>,
    row: Record<string, unknown>,
  ) => {
    const existingId = typeof row.id === "string" && row.id.trim().length > 0 ? row.id : null;

    if (existingId) {
      const { id: _id, ...updateRow } = row;
      const { result: updateResult, payload: sanitizedUpdateRow } = await runAnalysisMutationWithSchemaFallback(
        updateRow,
        async (nextPayload) => supabase
          .from("analyses")
          .update(nextPayload)
          .eq("id", existingId)
          .select("id")
          .maybeSingle()
      );

      if (updateResult.error) {
        throw updateResult.error;
      }

      if (updateResult.data?.id) {
        return updateResult;
      }

      const { result: insertResult } = await runAnalysisMutationWithSchemaFallback(
        sanitizedUpdateRow,
        async (nextPayload) => supabase
          .from("analyses")
          .insert(nextPayload)
          .select("id")
          .single()
      );

      return insertResult;
    }

    const { result: insertResult } = await runAnalysisMutationWithSchemaFallback(
      row,
      async (nextPayload) => supabase
        .from("analyses")
        .insert(nextPayload)
        .select("id")
        .single()
    );

    return insertResult;
  }, []);

  const persistExecutionNotes = useCallback(async (notes: string[]) => {
    if (!savedAnalysisId || notes.length === 0) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("analyses")
      .update({
        execution_notes: notes.join("\n"),
      })
      .eq("id", savedAnalysisId);

    if (error) {
      console.error("[Spec] Failed to persist execution notes:", serializePersistError(error));
    }
  }, [savedAnalysisId]);

  const showLeverNotesSavedConfirmation = useCallback(() => {
    setLeverNotesSaved(true);
    if (leverNotesSavedTimeoutRef.current) {
      window.clearTimeout(leverNotesSavedTimeoutRef.current);
    }
    leverNotesSavedTimeoutRef.current = window.setTimeout(() => {
      setLeverNotesSaved(false);
      leverNotesSavedTimeoutRef.current = null;
    }, 2000);
  }, []);

  const handleApplySelectedLevers = useCallback(async () => {
    const checkedLevers = (activeSpecRail?.execution_levers ?? []).filter((item) => selectedLevers.has(item));
    if (checkedLevers.length === 0) return;

    const nextNotes = Array.from(new Set([...executionNotes, ...checkedLevers]));
    setExecutionNotes(nextNotes);
    await persistExecutionNotes(nextNotes);
    showLeverNotesSavedConfirmation();
  }, [activeSpecRail?.execution_levers, executionNotes, persistExecutionNotes, selectedLevers, showLeverNotesSavedConfirmation]);

  const handleConfirmBetterPath = useCallback(async () => {
    if (!activeSpecRail) return;

    const nextNote = `${activeSpecRail.alternative_path.title}: ${activeSpecRail.alternative_path.description}`;
    const nextNotes = Array.from(new Set([...executionNotes, nextNote]));
    setExecutionNotes(nextNotes);
    await persistExecutionNotes(nextNotes);

    const description = activeSpecRail.alternative_path.description.toLowerCase();
    if (description.includes("low-moderate")) {
      setConstructionTier("low");
    } else if (description.includes(" moderate") && !description.includes("low-moderate")) {
      setConstructionTier("moderate");
    }

    setShowBetterPathConfirm(false);
  }, [activeSpecRail, executionNotes, persistExecutionNotes, setConstructionTier]);

  const persistCurrentPiece = useCallback(async () => {
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const userId = authData.user?.id ?? null;
    if (!userId) {
      return;
    }

    const browserCollectionContext = readCollectionContextFromBrowser();
    const resolvedCollectionName =
      storeCollectionName.trim()
      || browserCollectionContext.collectionName
      || headerCollectionName.trim()
      || brandProfileName?.trim()
      || "";
    const resolvedSeason =
      storeSeason.trim()
      || browserCollectionContext.season
      || headerSeasonLabel.trim()
      || "";

    if (!resolvedCollectionName) {
      throw new Error("No collection name available for piece save.");
    }

    const intentPayload = {
      primary_goals: intentGoals,
      tradeoff: intentTradeoff,
      tension_sliders: {
        trend_forward: useSessionStore.getState().sliderTrend,
        creative_expression: useSessionStore.getState().sliderCreative,
        elevated_design: useSessionStore.getState().sliderElevated,
        novelty: useSessionStore.getState().sliderNovelty,
      },
    };

    const bb: PipelineBlackboard = {
      input: {
        aesthetic_input: conceptContext.aestheticName || "",
        material_id: materialId || "",
        silhouette: conceptSilhouette || "",
        construction_tier: constructionTier ?? "moderate",
        category: categoryId || "",
        target_msrp: targetMSRP,
        season: resolvedSeason,
        collection_name: resolvedCollectionName,
        timeline_weeks: timelineWeeks,
      },
      brand: {
        id: brandProfileId,
        brand_name: brandProfileName ?? "",
        keywords: [],
        customer_profile: null,
        price_tier: "Contemporary",
        target_margin: brandTargetMargin,
        tension_context: null,
      },
      session: {
        collectionName: resolvedCollectionName,
        season: resolvedSeason,
        selectedAesthetic: conceptContext.aestheticMatchedId || null,
        selectedElements: [],
        category: categoryId || null,
        targetMSRP: targetMSRP,
        materialId: materialId || null,
        silhouette: conceptSilhouette || null,
        constructionTier: constructionTier ?? null,
        timelineWeeks: timelineWeeks,
        collectionRole: storeCollectionRole ?? null,
        savedAnalysisId: savedAnalysisId,
        collectionAesthetic: useSessionStore.getState().collectionAesthetic,
        aestheticInflection: useSessionStore.getState().aestheticInflection,
        directionInterpretationText: useSessionStore.getState().directionInterpretationText,
        intent: intentPayload,
        selectedKeyPiece,
        pieceBuildContext,
        selectedPieceImage,
      },
      aesthetic_matched_id: conceptContext.aestheticMatchedId || null,
      is_proxy_match: false,
      aesthetic_keywords: [],
      saturation_score: 50,
      trend_velocity: "stable",
      category_saturation: 50,
      category_velocity: "stable",
      identity_score: dynamicIdentityScore,
      tension_flags: [],
      critic_conflict_detected: false,
      critic_conflict_ids: [],
      critic_llm_used: false,
      critic_reasoning: "",
      resonance_score: commercialPotentialScore,
      execution_score: executionScore,
      timeline_buffer: timelineBuffer,
      cogs: insight?.cogs ?? 0,
      gate_passed: marginGatePassed,
      cogs_delta: 0,
      final_score: overallScore,
      redirect: null,
      narrative: specInsightNarrative,
    };

    const analysisResult: AnalysisResultOrch = {
      score: overallScore,
      dimensions: {
        identity: dynamicIdentityScore,
        resonance: commercialPotentialScore,
        execution: executionScore,
      },
      gates_passed: { cost: marginGatePassed, sustainability: null },
      narrative: bb.narrative,
      redirect: null,
      agent_versions: AGENT_VERSIONS,
      aesthetic_matched_id: bb.aesthetic_matched_id,
      errors: [],
      analysis_id: null,
    };

    const row = buildAnalysisRow(bb, analysisResult, userId);
    if (executionNotes.length > 0) {
      row.execution_notes = executionNotes.join("\n");
    }
    const { data: upsertData, error: upsertError } = await persistAnalysisRow(supabase, row);

    if (upsertError) throw upsertError;
    setCollectionName(resolvedCollectionName);
    setActiveCollection(resolvedCollectionName);
    if (resolvedSeason) {
      setSeason(resolvedSeason);
    }
    try {
      window.localStorage.setItem("muko_collectionName", resolvedCollectionName);
      if (resolvedSeason) {
        window.localStorage.setItem("muko_seasonLabel", resolvedSeason);
      }
    } catch {}
    if (upsertData?.id) {
      setSavedAnalysisId(upsertData.id as string);
    }
  }, [
    brandProfileId,
    brandProfileName,
    brandTargetMargin,
    categoryId,
    commercialPotentialScore,
    conceptContext.aestheticMatchedId,
    conceptContext.aestheticName,
    conceptSilhouette,
    constructionTier,
    dynamicIdentityScore,
    executionScore,
    insight?.cogs,
    intentGoals,
    intentTradeoff,
    headerCollectionName,
    headerSeasonLabel,
    marginGatePassed,
    materialId,
    overallScore,
    pieceBuildContext,
    persistAnalysisRow,
    savedAnalysisId,
    selectedKeyPiece,
    selectedPieceImage,
    setActiveCollection,
    setCollectionName,
    setSavedAnalysisId,
    setSeason,
    specInsightNarrative,
    storeCollectionName,
    storeCollectionRole,
    storeSeason,
    targetMSRP,
    executionNotes,
    timelineBuffer,
    timelineWeeks,
  ]);

  const askMukoContext: AskMukoContext = {
    step: "spec",
    brand: {
      brandName: brandProfileName ?? undefined,
    },
    intent: {
      season: storeSeason,
      collectionName: storeCollectionName,
      collectionRole: storeCollectionRole ?? undefined,
    },
    aesthetic: {
      matchedId: storeAesthetic ?? undefined,
      inflection: directionInterpretationText || undefined,
    },
    scores: {
      identity: dynamicIdentityScore ?? undefined,
      resonance: commercialPotentialScore ?? undefined,
      execution: executionScore ?? undefined,
      overall: overallScore,
    },
    material: {
      name: selectedMaterial?.name ?? undefined,
      costPerYard: selectedMaterial?.cost_per_yard ?? undefined,
      leadTimeWeeks: selectedMaterial?.lead_time_weeks ?? undefined,
      complexityTier: constructionTier ?? undefined,
    },
    gates: {
      costPassed: marginGatePassed ?? undefined,
      cogs: insight?.cogs ?? undefined,
      msrp: targetMSRP ?? undefined,
    },
    pieceRole: storeCollectionRole ?? undefined,
    silhouette: conceptSilhouette ?? undefined,
    constructionTier: constructionTier ?? undefined,
    collectionLanguage: collectionLanguageContext.map((chip) => chip.label),
    expressionSignals: expressionSignalContext.map((chip) => chip.label),
    brandInterpretation: directionInterpretationText || undefined,
  };

  useEffect(() => {
    const node = contextBarRef.current;
    if (!node) return;

    const updateHeight = () => {
      setContextBarHeight(Math.ceil(node.getBoundingClientRect().height) || COLLECTION_CONTEXT_BAR_OFFSET);
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#FAF9F6", overflowX: "hidden" }}>
      <MukoNav
        activeTab="pieces"
        setupComplete={true}
        piecesComplete={false}
        collectionName={headerCollectionName}
        seasonLabel={headerSeasonLabel}
        onBack={() => window.history.back()}
        onSaveClose={() => {}}
      />

      <div
        ref={contextBarRef}
        style={{
          position: "fixed",
          top: 72,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        <CollectionContextBar
          collectionName={headerCollectionName}
          season={headerSeasonLabel}
          titleOverride={contextBarTitle || specHeaderTitle}
          direction={conceptContext.aestheticName || undefined}
          pointOfView={directionInterpretationText || undefined}
          collectionLanguage={collectionLanguageContext.map((chip) => chip.label)}
          silhouette={formattedSilhouette || undefined}
          palette={conceptPalette || undefined}
          expressionSignals={expressionSignalContext.map((chip) => chip.label)}
          moodboardImages={storeMoodboard}
          forceLowercase
        />
      </div>

      <div
        className="specStudioLayout"
        style={{
          marginTop: 72 + contextBarHeight,
          minHeight: `calc(100vh - 72px - ${contextBarHeight}px)`,
        }}
      >
        <aside className="specStudioColumn specStudioLeft">
          <div className="specStudioSticky" style={{ padding: "36px 24px 44px" }}>

            {/* ── Section A: Piece Identity ──────────────────────────────── */}
            <div
              style={{
                background: "rgba(245,242,235,0.72)",
                borderRadius: 16,
                padding: 20,
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <PieceFlatPreview
                selectedPieceImage={resolvedSelectedPieceImage}
              />
              <div style={{ marginTop: 14, fontFamily: sohne, fontSize: 22, fontWeight: 500, color: OLIVE, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                {pieceAnchorName}
              </div>
              {pieceRoleLabel || pieceSignalLabel || pieceCategoryLabel ? (
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: "4px 8px", alignItems: "center" }}>
                  {[pieceRoleLabel !== "Piece" ? pieceRoleLabel : null, pieceSignalLabel, pieceCategoryLabel]
                    .filter(Boolean)
                    .map((item, index, items) => (
                      <React.Fragment key={`${item}-${index}`}>
                        <span
                          style={{
                            fontFamily: inter,
                            fontSize: 12,
                            fontWeight: 500,
                            color: "rgba(67,67,43,0.52)",
                            lineHeight: 1.45,
                            textTransform: "lowercase",
                          }}
                        >
                          {String(item).toLowerCase()}
                        </span>
                        {index < items.length - 1 ? (
                          <span
                            aria-hidden="true"
                            style={{
                              color: "rgba(67,67,43,0.22)",
                              fontSize: 12,
                              fontWeight: 700,
                              lineHeight: 1,
                            }}
                          >
                            ·
                          </span>
                        ) : null}
                      </React.Fragment>
                    ))}
                </div>
              ) : null}
            </div>

            {/* Divider — only if material selected */}
            {displayMaterial && (
              <div style={{ height: 1, background: "rgba(67,67,43,0.08)", margin: "18px 0" }} />
            )}

            {/* ── Section C: Material ────────────────────────────────────── */}
            {displayMaterial && (
              <div style={{ animation: "fadeIn 220ms ease both" }}>
                <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(67,67,43,0.36)", marginBottom: 8 }}>
                  Material
                </div>
                <div style={{ fontFamily: sohne, fontSize: 15, fontWeight: 500, color: OLIVE }}>
                  {displayMaterial.name}
                </div>
                <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.52)", marginTop: 3 }}>
                  ${displayMaterial.cost_per_yard}/yd · {displayMaterial.lead_time_weeks}wk lead
                </div>
              </div>
            )}

            {/* Divider — only if construction confirmed */}
            {constructionConfirmed && constructionTier && (
              <div style={{ height: 1, background: "rgba(67,67,43,0.08)", margin: "18px 0" }} />
            )}

            {/* ── Section D: Construction ────────────────────────────────── */}
            {constructionConfirmed && constructionTier && (
              <div style={{ animation: "fadeIn 220ms ease both" }}>
                <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(67,67,43,0.36)", marginBottom: 8 }}>
                  Construction
                </div>
                <div style={{ fontFamily: sohne, fontSize: 15, fontWeight: 500, color: OLIVE }}>
                  {CONSTRUCTION_INFO[constructionTier].label}
                </div>
              </div>
            )}

            {/* Divider — only if both selected */}
            {displayMaterial && constructionConfirmed && constructionTier && insight && (
              <div style={{ height: 1, background: "rgba(67,67,43,0.08)", margin: "18px 0" }} />
            )}

            {/* ── Section E: Build Numbers ───────────────────────────────── */}
            {displayMaterial && constructionConfirmed && constructionTier && insight && (
              <div style={{ animation: "fadeIn 220ms ease both" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: inter, fontSize: 8, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: "rgba(67,67,43,0.36)", marginBottom: 3 }}>
                      COGS
                    </div>
                    <div style={{ fontFamily: sohne, fontSize: 15, color: OLIVE }}>
                      ${insight.cogs}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: inter, fontSize: 8, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: "rgba(67,67,43,0.36)", marginBottom: 3 }}>
                      Lead
                    </div>
                    <div style={{ fontFamily: sohne, fontSize: 15, color: OLIVE }}>
                      {displayMaterial.lead_time_weeks}wks
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: inter, fontSize: 8, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: "rgba(67,67,43,0.36)", marginBottom: 3 }}>
                      Buffer
                    </div>
                    <div style={{ fontFamily: sohne, fontSize: 15, color: marginBuffer != null && marginBuffer < 0 ? BRAND.camel : OLIVE }}>
                      {marginBuffer == null ? "—" : marginBuffer >= 0 ? `$${marginBuffer}` : `-$${Math.abs(marginBuffer)}`}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </aside>

        <ResizableSplitPanel
          defaultLeftPercent={50}
          storageKey="muko_spec_splitPanel"
          topOffset={0}
          constrainToViewport={false}
          leftContent={
            <main className="specStudioColumn specStudioCenter">
          <div style={{ padding: "36px 32px 56px" }}>
            <div style={{ maxWidth: 920, margin: "0 auto" }}>
              {/* ── Progress stepper ──────────────────────────────────────── */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  marginBottom: 38,
                }}
              >
                {[
                  { id: "material", label: "Material" },
                  { id: "construction", label: "Construction" },
                  { id: "execution", label: "Execution" },
                ].map((step, index) => (
                  <React.Fragment key={step.id}>
                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: specStep === step.id ? "#191919" : "#888078",
                      }}
                    >
                      {step.label}
                    </div>
                    {index < 2 && <div style={{ width: 34, height: 1, background: "#E2DDD6" }} />}
                  </React.Fragment>
                ))}
              </div>

              <div
                style={{
                  fontFamily: inter,
                  fontSize: 12,
                  lineHeight: 1.55,
                  color: "rgba(67,67,43,0.52)",
                  marginBottom: 26,
                  maxWidth: 560,
                }}
              >
                Concept tested the direction. Spec tests how that direction holds once it becomes product.
              </div>

              <div style={{ position: "relative", minHeight: 760 }}>
                <AnimatePresence mode="wait" custom={specStepDirection}>
                  <motion.div
                    key={specStep}
                    custom={specStepDirection}
                    variants={stageTransitionProps}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    style={{ padding: "8px 0 28px" }}
                  >
                    {specStep === "material" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
                <section id="material-section" style={{ animation: "fadeIn 240ms ease-out" }}>
                  <div style={{ marginBottom: 34 }}>
                    <div style={{ fontFamily: sohne, fontSize: 24, fontWeight: 500, color: OLIVE, letterSpacing: "-0.03em" }}>
                      Material direction
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                    {(["all", "natural", "luxury", "synthetic", "deadstock"] as const).map((cat) => {
                      const isActive = materialCategory === cat;
                      const label = cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1);
                      return (
                        <button
                          key={cat}
                          onClick={() => { setMaterialCategory(cat); setShowAllMaterials(false); }}
                          style={{ padding: "4px 10px", borderRadius: 999, fontSize: 10.5, fontWeight: isActive ? 600 : 500, fontFamily: inter, cursor: "pointer", border: "1px solid rgba(67,67,43,0.07)", background: isActive ? "rgba(245,242,235,0.9)" : "transparent", color: isActive ? "rgba(67,67,43,0.72)" : "rgba(67,67,43,0.44)" }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="specMaterialGrid">
                    {materials
                      .filter((mat) => materialCategory === "all" || MATERIAL_CATEGORY_MAP[mat.id] === materialCategory)
                      .slice(0, showAllMaterials ? undefined : 6)
                      .map((mat) => {
                        const isSel = materialId === mat.id;
                        const isRecommended = mat.id === recommendedMaterialId;
                        return (
                          <button
                            key={mat.id}
                            onClick={() => handleMaterialSelection(mat.id)}
                            onMouseEnter={() => setHoveredMaterialId(mat.id)}
                            onMouseLeave={() => setHoveredMaterialId(null)}
                          style={{
                              padding: 0,
                              textAlign: "left",
                              borderRadius: 16,
                              border: isSel ? "1px solid rgba(168,180,117,0.42)" : "1px solid rgba(67,67,43,0.05)",
                              background: hoveredMaterialId === mat.id ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.72)",
                              overflow: "hidden",
                              cursor: "pointer",
                              transition: "background 180ms ease, border-color 180ms ease, transform 180ms ease",
                              transform: hoveredMaterialId === mat.id ? "translateY(-1px)" : "translateY(0)",
                            }}
                          >
                            <div style={{ height: 34, position: "relative", background: MATERIAL_SWATCH_BG[mat.id] || "#D0C8B8" }}>
                              {isSel && <div style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: "50%", background: CHARTREUSE }} />}
                              {isRecommended && (
                                <span
                                  style={{
                                    position: "absolute",
                                    top: 8,
                                    left: 8,
                                    padding: "2px 7px",
                                    borderRadius: 999,
                                    border: "1px solid rgba(168,180,117,0.28)",
                                    background: "rgba(255,255,255,0.72)",
                                    color: "#6B7A40",
                                    fontFamily: inter,
                                    fontSize: 9,
                                    fontWeight: 700,
                                    letterSpacing: "0.06em",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Muko Pick
                                </span>
                              )}
                            </div>
                            <div style={{ padding: "8px 10px" }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: OLIVE, fontFamily: inter, lineHeight: 1.35 }}>{mat.name}</div>
                              <div style={{ marginTop: 5, display: "grid", gap: 3, fontSize: 10.5, color: "rgba(67,67,43,0.46)", fontFamily: inter }}>
                                <span>Cost per yard: ${mat.cost_per_yard}</span>
                                <span>Lead time: {mat.lead_time_weeks} weeks</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                  {!showAllMaterials && materials.filter((mat) => materialCategory === "all" || MATERIAL_CATEGORY_MAP[mat.id] === materialCategory).length > 6 && (
                    <button
                      onClick={() => setShowAllMaterials(true)}
                      style={{ marginTop: 10, background: "none", border: "none", padding: 0, fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.48)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
                    >
                      Show all materials
                    </button>
                  )}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                    <button
                      onClick={() => {
                        if (!selectedMaterial) return;
                        advanceToConstruction();
                      }}
                      disabled={!selectedMaterial}
                      style={{
                        padding: "12px 18px",
                        borderRadius: 999,
                        border: selectedMaterial ? "1.5px solid #7D96AC" : "1px solid rgba(67,67,43,0.10)",
                        background: selectedMaterial ? "rgba(125,150,172,0.08)" : "rgba(255,255,255,0.6)",
                        color: selectedMaterial ? "#7D96AC" : "rgba(67,67,43,0.30)",
                        fontFamily: sohne,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: selectedMaterial ? "pointer" : "not-allowed",
                      }}
                    >
                      Continue to Construction →
                    </button>
                  </div>
                </section>
                      </div>
                    )}

                    {specStep === "construction" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
                      <section id="complexity-section" style={{ }}>
                    <div style={{ marginBottom: 34 }}>
                    <div style={{ fontFamily: sohne, fontSize: 24, fontWeight: 500, color: OLIVE, letterSpacing: "-0.03em" }}>
                        Construction complexity
                      </div>
                    </div>
                    <div className="specConstructionGrid">
                      {(["low", "moderate", "high"] as ConstructionTier[]).map((tier) => {
                        const info = COMPLEXITY_CONTEXT[tier];
                        const isSel = constructionConfirmed && constructionTier === tier;
                        const isRec = tier === baselineComplexity;
                        return (
                          <button
                            key={tier}
                            onClick={() => handleComplexityChange(tier)}
                            onMouseEnter={() => setHoveredComplexity(tier)}
                            onMouseLeave={() => setHoveredComplexity(null)}
                            style={{
                              textAlign: "left",
                              borderRadius: 18,
                              padding: "16px 16px 17px",
                              background: hoveredComplexity === tier ? "rgba(255,255,255,0.84)" : "rgba(255,255,255,0.72)",
                              border: isSel ? "1px solid rgba(168,180,117,0.46)" : "1px solid rgba(67,67,43,0.06)",
                              cursor: "pointer",
                              transition: "background 180ms ease, border-color 180ms ease, transform 180ms ease",
                              transform: hoveredComplexity === tier ? "translateY(-1px)" : "translateY(0)",
                              boxShadow: isSel ? "0 16px 28px rgba(67,67,43,0.06)" : "none",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8, alignItems: "center" }}>
                              <div style={{ fontFamily: sohne, fontSize: 17, fontWeight: 600, color: OLIVE }}>{info.label}</div>
                              {(isRec || isSel) && (
                                <span className="specSelectionChip">
                                  {isSel ? "Selected" : "Default"}
                                </span>
                              )}
                            </div>
                            <div style={{ fontFamily: inter, fontSize: 12.1, color: "rgba(67,67,43,0.66)", lineHeight: 1.58, marginBottom: 7 }}>{info.description}</div>
                            <div style={{ fontFamily: inter, fontSize: 11.4, color: "rgba(67,67,43,0.48)", lineHeight: 1.58 }}>
                              {info.note}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {overrideWarning && <div style={{ marginTop: 12, fontSize: 12, color: "rgba(67,67,43,0.56)", fontFamily: inter }}>{overrideWarning}</div>}
                  </section>

                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <button
                            onClick={backToMaterial}
                            style={{ padding: "12px 18px", borderRadius: 999, border: "1px solid rgba(67,67,43,0.14)", background: "transparent", color: "rgba(67,67,43,0.62)", fontFamily: sohne, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                          >
                            ← Back to Material
                          </button>
                          <button
                            onClick={advanceToExecution}
                            disabled={!selectedMaterial || !constructionConfirmed}
                            style={{
                              padding: "11px 24px",
                              borderRadius: 999,
                              border: "none",
                              background: (selectedMaterial && constructionConfirmed) ? "#191919" : "#E2DDD6",
                              color: (selectedMaterial && constructionConfirmed) ? "#FFFFFF" : "#888078",
                              fontFamily: inter,
                              fontSize: 13,
                              fontWeight: 500,
                              letterSpacing: "0.02em",
                              cursor: (selectedMaterial && constructionConfirmed) ? "pointer" : "not-allowed",
                            }}
                            onMouseEnter={(e) => { if (selectedMaterial && constructionConfirmed) e.currentTarget.style.background = "#2A2622"; }}
                            onMouseLeave={(e) => { if (selectedMaterial && constructionConfirmed) e.currentTarget.style.background = "#191919"; }}
                          >
                            Continue to Execution →
                          </button>
                        </div>
                      </div>
                    )}
                    {specStep === "execution" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                        <section id="execution-section">
                          <div style={{ marginBottom: 28 }}>
                            <div style={{ fontFamily: sohne, fontSize: 24, fontWeight: 500, color: OLIVE, letterSpacing: "-0.03em" }}>
                              Execution direction
                            </div>
                          </div>

                          <div style={{ display: "grid", gap: 18 }}>
                            <div style={{ display: "grid", gap: 10 }}>
                              {buildOutcomeRows.map((row) => (
                                <div key={row.label} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12 }}>
                                  <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(67,67,43,0.34)" }}>
                                    {row.label}
                                  </div>
                                  <div style={{ fontFamily: inter, fontSize: 12.5, color: "rgba(67,67,43,0.72)", lineHeight: 1.5 }}>
                                    {row.value}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {executionNotes.length > 0 ? (
                              <div style={{ paddingTop: 18, borderTop: "1px solid rgba(67,67,43,0.08)" }}>
                                <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(67,67,43,0.34)", marginBottom: 10 }}>
                                  Execution Notes
                                </div>
                                <div style={{ display: "grid", gap: 10 }}>
                                  {executionNotes.map((note) => (
                                    <div
                                      key={note}
                                      style={{
                                        padding: "10px 12px",
                                        borderRadius: 12,
                                        background: "#F9F7F4",
                                        fontFamily: inter,
                                        fontSize: 12.5,
                                        color: "rgba(67,67,43,0.72)",
                                        lineHeight: 1.5,
                                      }}
                                    >
                                      {note}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </section>

                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <button
                            onClick={backToConstruction}
                            style={{ padding: "12px 18px", borderRadius: 999, border: "1px solid rgba(67,67,43,0.14)", background: "transparent", color: "rgba(67,67,43,0.62)", fontFamily: sohne, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                          >
                            ← Back to Construction
                          </button>
                          <button
                            onClick={async () => {
                              const cat = categories.find(c => c.id === categoryId);
                              setCategory(cat?.name ?? categoryId);
                              setMaterial(materialId);
                              setSilhouette(conceptSilhouette ? conceptSilhouette.charAt(0).toUpperCase() + conceptSilhouette.slice(1) : "");
                              setStoreTier(constructionTier!);
                              if (conceptPalette) {
                                const entry = (aestheticsData as unknown as Array<{ id: string; palette_options?: Array<{ id: string; name: string; swatches: string[] }> }>).find(
                                  (a) => a.id === conceptContext.aestheticMatchedId
                                );
                                const palOption = entry?.palette_options?.find((p) => p.id === conceptPalette);
                                if (palOption) {
                                  setColorPalette(palOption.swatches, palOption.name);
                                }
                              }
                              try {
                                await persistCurrentPiece();
                              } catch (error) {
                                console.error("[Spec] Failed to save piece before returning to pieces:", serializePersistError(error));
                                return;
                              }
                              setSelectedKeyPiece(null);
                              setActiveProductPieceId(null);
                              setPieceBuildContext(null);
                              router.push('/pieces');
                            }}
                            disabled={!selectedMaterial || !constructionConfirmed}
                            style={{
                              padding: "11px 24px",
                              borderRadius: 999,
                              border: "none",
                              background: (selectedMaterial && constructionConfirmed) ? "#191919" : "#E2DDD6",
                              color: (selectedMaterial && constructionConfirmed) ? "#FFFFFF" : "#888078",
                              fontFamily: inter,
                              fontSize: 13,
                              fontWeight: 500,
                              letterSpacing: "0.02em",
                              cursor: (selectedMaterial && constructionConfirmed) ? "pointer" : "not-allowed",
                            }}
                          >
                            Save Piece &amp; Return to Pieces →
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
            </main>
          }
          rightContent={
            <div style={{ display: "flex", flexDirection: "row", alignItems: "stretch", height: "100%", minHeight: 0 }}>
            <aside
              className="specStudioColumn specStudioRight"
              style={{
                flex: 1,
                minWidth: 0,
                overscrollBehavior: "contain",
                position: "sticky",
                top: 0,
                height: `calc(100vh - ${72 + contextBarHeight}px)`,
                overflowY: "auto",
              }}
            >
          <div style={{ padding: "36px 28px 44px" }}>
            <section style={{ marginBottom: 30 }}>
              <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888078", marginBottom: 20 }}>Muko&apos;s Read</div>
              <div style={{ fontFamily: sohne, fontSize: 20, fontWeight: 700, lineHeight: 1.3, color: "#191919", letterSpacing: "-0.01em" }}>
                {activeSpecRail?.headline ?? "Select a material and build path to activate the spec read."}
              </div>
              {activeSpecRail && (
                <div style={{ marginTop: 12, fontFamily: inter, fontSize: 11, lineHeight: 1.55, color: "rgba(67,67,43,0.66)" }}>
                  {activeSpecRail.decision.reason}
                </div>
              )}
            </section>

            {materialSelectionDelta && (
              <div
                style={{
                  marginTop: 20,
                  marginBottom: 18,
                  paddingTop: 10,
                  borderTop: "1px solid rgba(67,67,43,0.08)",
                  borderBottom: "1px solid rgba(67,67,43,0.05)",
                  animation: "fadeIn 240ms cubic-bezier(0.22,0.8,0.2,1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9 }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(168,180,117,0.9)", display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontFamily: inter, fontSize: 8, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "rgba(67,67,43,0.34)" }}>
                    Material Switch Impact
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 14 }}>
                  <div style={{ padding: "0 0 10px" }}>
                    <div style={{ fontFamily: inter, fontSize: 7.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(67,67,43,0.3)", marginBottom: 5 }}>
                      Cost / Garment
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ fontFamily: sohne, fontSize: 16, fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1, color: materialSelectionDelta.cogs > 0 ? PULSE_RED : materialSelectionDelta.cogs < 0 ? PULSE_GREEN : OLIVE }}>
                        {materialSelectionDelta.cogs === 0 ? "—" : `${materialSelectionDelta.cogs > 0 ? "+" : "−"}$${Math.abs(materialSelectionDelta.cogs)}`}
                      </span>
                      <span style={{ fontFamily: inter, fontSize: 8, color: "rgba(67,67,43,0.3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                        cogs
                      </span>
                    </div>
                  </div>
                  <div style={{ padding: "0 0 10px" }}>
                    <div style={{ fontFamily: inter, fontSize: 7.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(67,67,43,0.3)", marginBottom: 5 }}>
                      Lead Time
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ fontFamily: sohne, fontSize: 16, fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1, color: materialSelectionDelta.leadTime > 0 ? PULSE_RED : materialSelectionDelta.leadTime < 0 ? PULSE_GREEN : OLIVE }}>
                        {materialSelectionDelta.leadTime === 0 ? "—" : `${materialSelectionDelta.leadTime > 0 ? "+" : ""}${materialSelectionDelta.leadTime}`}
                      </span>
                      <span style={{ fontFamily: inter, fontSize: 8, color: "rgba(67,67,43,0.3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                        wks
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ height: 1, background: "#E2DDD6", margin: "0 0 24px" }} />
            <section style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888078", marginBottom: 14 }}>What to get right</div>
              <div style={{ display: "grid", gap: 12 }}>
                {(activeSpecRail?.execution_levers ?? []).map((item) => (
                  <div key={item} style={{ display: "flex", gap: 10, alignItems: "start" }}>
                    <input
                      type="checkbox"
                      checked={selectedLevers.has(item)}
                      onChange={() => {
                        setSelectedLevers((prev) => {
                          const next = new Set(prev);
                          if (next.has(item)) {
                            next.delete(item);
                          } else {
                            next.add(item);
                          }
                          return next;
                        });
                      }}
                      style={{ accentColor: "#43432B", width: 13, height: 13, marginTop: 3, cursor: "pointer", flexShrink: 0 }}
                    />
                    <label style={{ fontFamily: inter, fontSize: 12, color: "#191919", lineHeight: 1.58, cursor: "pointer" }}>
                      {item}
                    </label>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={() => { void handleApplySelectedLevers(); }}
                  disabled={selectedLevers.size === 0}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    border: "none",
                    background: selectedLevers.size === 0 ? "#E2DDD6" : "#191919",
                    color: selectedLevers.size === 0 ? "#888078" : "#FFFFFF",
                    fontFamily: inter,
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: selectedLevers.size === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  Apply Selected
                </button>
                {leverNotesSaved ? (
                  <div style={{ marginTop: 8, fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.5)" }}>
                    Notes saved
                  </div>
                ) : null}
              </div>
            </section>

            <div style={{ height: 1, background: "#E2DDD6", margin: "0 0 24px" }} />
            <section style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888078", marginBottom: 14 }}>Feasibility tension</div>
              <div style={{ fontFamily: inter, fontSize: 12, color: "#191919", lineHeight: 1.62 }}>
                {activeSpecRail?.core_tension ?? "The rail will sharpen once feasibility numbers and execution context are in place."}
              </div>
              {activeSpecRail && (
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {[
                    `Cost: ${activeSpecRail.feasibility_breakdown.cost.replace(/_/g, " ")}`,
                    `Timeline: ${activeSpecRail.feasibility_breakdown.timeline.replace(/_/g, " ")}`,
                    `Complexity: ${activeSpecRail.feasibility_breakdown.complexity}`,
                  ].map((label) => (
                    <span
                      key={label}
                      style={{
                        borderRadius: 999,
                        padding: "5px 9px",
                        border: "1px solid rgba(67,67,43,0.08)",
                        background: "rgba(250,249,246,0.88)",
                        fontFamily: inter,
                        fontSize: 10,
                        lineHeight: 1,
                        color: "rgba(67,67,43,0.62)",
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {showBetterPath && activeSpecRail && (
              <>
                <div style={{ height: 1, background: "#E2DDD6", margin: "0 0 24px" }} />
                <section style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888078", marginBottom: 14 }}>Better path</div>
                  <div style={{ fontFamily: sohne, fontSize: 15, fontWeight: 600, lineHeight: 1.35, color: "#191919", marginBottom: 8 }}>
                    {activeSpecRail.alternative_path.title}
                  </div>
                  <div style={{ fontFamily: inter, fontSize: 12, color: "#191919", lineHeight: 1.58 }}>
                    {activeSpecRail.alternative_path.description}
                  </div>
                  <button
                    onClick={() => setShowBetterPathConfirm(true)}
                    style={{
                      marginTop: 12,
                      padding: "7px 14px",
                      borderRadius: 999,
                      border: "1px solid rgba(67,67,43,0.25)",
                      background: "transparent",
                      color: "#43432B",
                      fontFamily: inter,
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Apply
                  </button>
                  {showBetterPathConfirm ? (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.7)", lineHeight: 1.58, marginBottom: 10 }}>
                        This will update your construction detail. Apply better path?
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                          onClick={() => { void handleConfirmBetterPath(); }}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 999,
                            border: "none",
                            background: "#191919",
                            color: "#FFFFFF",
                            fontFamily: inter,
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowBetterPathConfirm(false)}
                          style={{
                            padding: "7px 14px",
                            borderRadius: 999,
                            border: "1px solid rgba(67,67,43,0.25)",
                            background: "transparent",
                            color: "#43432B",
                            fontFamily: inter,
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </section>
              </>
            )}

            <PulseSection
              collapsedInsight={collapsedPulseInsight}
              items={pulseRows.map((row) => ({
                dimensionKey: row.key,
                label: row.label,
                icon: row.icon,
                displayScore: row.displayScore,
                numericPercent: row.numericPercent,
                scoreColor: row.scoreColor,
                pill: row.pill,
                subLabel: row.subLabel,
                whatItMeans: row.whatItMeans,
                howCalculated: row.howCalculated,
                isPending: row.isPending,
              }))}
              helperText={!selectedMaterial ? "Pulse activates once material and build inputs are in play." : "Telemetry only: Pulse shows the current signal state; Muko’s Read makes the call."}
            />

          </div>
            </aside>
            <AskMuko
              step="spec"
              context={askMukoContext}
            />
            </div>
          }
        />
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes specReveal { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes continueReady { 0% { transform: translateY(4px); opacity: 0.6; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
        @keyframes railShift { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .specStudioLayout {
          display: flex;
          flex: 1;
          min-height: 0;
        }
        .specStudioColumn {
          overflow-y: auto;
          min-height: 0;
        }
        .specStudioLeft {
          width: 320px;
          flex-shrink: 0;
          border-right: 1px solid rgba(67,67,43,0.07);
        }
        .specStudioRight {
          background:
            radial-gradient(circle at top left, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0) 34%),
            linear-gradient(180deg, rgba(250,249,246,0.9) 0%, rgba(245,242,235,0.96) 100%);
          position: relative;
        }
        .specStudioSticky {
          position: sticky;
          top: 0;
        }
        .specMaterialGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          column-gap: 10px;
          row-gap: 7px;
        }
        .specConstructionGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .specSelectionChip {
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #6B7A40;
          background: rgba(255,255,255,0.72);
          border: 1px solid rgba(168,180,117,0.26);
          border-radius: 999px;
          padding: 3px 7px;
          font-family: ${inter};
        }
        .specNextMoveRow:hover {
          background: rgba(255,255,255,0.72);
        }
        @media (max-width: 1180px) {
          .specStudioLayout {
            grid-template-columns: 1fr;
          }
          .specStudioLeft,
          .specStudioRight {
            border: 0;
            width: auto !important;
          }
          .specStudioColumn {
            min-height: auto;
            overflow: visible;
          }
          .specStudioSticky {
            position: static;
          }
          .specRailDivider {
            display: none;
          }
        }
        @media (max-width: 860px) {
          .specMaterialGrid,
          .specConstructionGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>


      {/* ═══ ANALYSIS LOADING OVERLAY ═══ */}
      {isRunningAnalysis && (() => {
        const phases = ["Scoring identity…", "Calibrating commercial pull…", "Analyzing execution…", "Finalizing…"];
        return (
          <div style={{
            position: "fixed", inset: 0,
            background: "rgba(250,249,246,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 8000,
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 13, fontWeight: 600,
                fontFamily: sohne,
                color: OLIVE,
                letterSpacing: "0.04em",
                minHeight: 20,
              }}>
                {phases[Math.min(loadingPhase, phases.length - 1)]}
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 6, justifyContent: "center" }}>
                {phases.map((_, i) => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: i < loadingPhase ? CHARTREUSE : "rgba(67,67,43,0.18)",
                    transition: "background 300ms ease",
                  }} />
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ SCORECARD MODAL ═══ */}
      {showScorecardModal && (() => {
        const mukoScore = Math.round((dynamicIdentityScore + commercialPotentialScore + executionScore) / 3);
        return (
          <ScorecardModal
            identityScore={dynamicIdentityScore}
            resonanceScore={commercialPotentialScore}
            executionScore={executionScore}
            mukoScore={mukoScore}
            marginGatePassed={marginGatePassed}
            insight={insight ? { cogs: insight.cogs, ceiling: insight.ceiling } : null}
            targetMsrp={targetMSRP}
            mukoInsight={specSynthInsightData?.statements?.[0] ?? null}
            suggestions={mukoSynthesis?.suggestions ?? []}
            onRevise={() => setShowScorecardModal(false)}
            brandName={brandProfileName}
          />
        );
      })()}
    </div>
  );
}
