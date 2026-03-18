"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useSessionStore } from "@/lib/store/sessionStore";
import type { ActivatedChip } from "@/lib/store/sessionStore";
import type {
  Material,
  Category,
  ConstructionTier,
  ConceptContext as ConceptContextType,
} from "@/lib/types/spec-studio";
import { calculateCOGS, generateInsight, checkExecutionFeasibility, applyRoleModifiers } from "@/lib/spec-studio/calculator";
import { findAlternativeMaterial, findUpgradeMaterial, checkSelectedMaterialConflict } from "@/lib/spec-studio/material-matcher";
import {
  CONSTRUCTION_INFO,
  getOverrideWarning,
  getSmartDefault,
} from "@/lib/spec-studio/smart-defaults";
import type { SubcategoryEntry } from "@/lib/spec-studio/smart-defaults";

import categoriesData from "@/data/categories.json";
import materialsData from "@/data/materials.json";
import subcategoriesData from "@/data/subcategories.json";
import aestheticsData from "@/data/aesthetics.json";
import designLanguageData from "@/data/design-language.json";
import materialConstructionImplications from "@/data/material_construction_implications.json";
import AskMuko from "@/components/AskMuko";
import type { AskMukoContext } from "@/lib/synthesizer/askMukoResponse";
import { AESTHETIC_CONTENT } from "@/lib/concept-studio/constants";
import { PulseScoreRow } from "@/components/ui/PulseScoreRow";
import { MukoStreamingParagraph } from "@/components/ui/MukoStreamingParagraph";
import type { PulseChipProps } from "@/components/ui/PulseChip";
import type { InsightData, SpecInsightMode } from "@/lib/types/insight";
import { buildReportBlackboard, buildSpecBlackboard } from "@/lib/synthesizer/assemble";
import { buildAnalysisRow, AGENT_VERSIONS } from "@/lib/agents/orchestrator-shared";
import type { PipelineBlackboard, AnalysisResult as AnalysisResultOrch } from "@/lib/agents/orchestrator-shared";
import { createClient } from "@/lib/supabase/client";
import type { SpecSuggestion } from "@/lib/types/next-move";
import { ScorecardModal } from "@/components/spec-studio/ScorecardModal";
import { ResizableSplitPanel } from "@/components/ui/ResizableSplitPanel";
import { getFlatForPiece } from "@/components/flats";
import type { SelectedPieceImage } from "@/lib/piece-image";

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

function extractPartialJsonString(raw: string, key: string): string {
  const match = raw.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)`));
  if (!match) return "";

  return match[1]
    .replace(/\\"/g, '"')
    .replace(/\\n/g, " ")
    .trim();
}

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

const microLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.10em",
  textTransform: "uppercase" as const,
  color: "rgba(67, 67, 43, 0.42)",
  fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
};

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

/* ─── Fallback concept data ─── */
const FALLBACK_CONCEPT: ConceptContextType = {
  aestheticName: "Quiet Structure",
  aestheticMatchedId: "quiet-structure",
  identityScore: 88,
  resonanceScore: 92,
  moodboardImages: [],
  recommendedPalette: [],
};
const FALLBACK_REFINEMENT = {
  base: "Quiet Structure",
  modifiers: [] as string[],
};

/* ─────────────────────────────────────────────────────────────── */
/* Helpers: recommended + deltas + compact score clusters           */
/* ─────────────────────────────────────────────────────────────── */
type Deltas = { identity: number; resonance: number; execution: number };

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
  const total = deltas.identity + deltas.resonance + deltas.execution;
  return total > 0 ? "good" : "bad";
}

function aggregateDeltaDot({ deltas }: { deltas: Deltas }) {
  const total =
    deltas.identity + deltas.resonance + deltas.execution;

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
    { icon: (c: string) => <IconResonance size={10} color={c} />, value: deltas.resonance, key: "resonance" },
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
function buildConstructionImplication(options: {
  materialName: string;
  constructionTier: "low" | "moderate" | "high";
  topChips: string[];
  complexityChipCount: number;
  leadTimeWeeks: number;
  deliveryWindowWeeks: number;
}): string {
  const { materialName, constructionTier, topChips, complexityChipCount, leadTimeWeeks, deliveryWindowWeeks } = options;
  const chipText = topChips.length > 0
    ? `${topChips.slice(0, 2).join(" and ")} stay legible`
    : "the design language stays legible";
  const buffer = deliveryWindowWeeks - leadTimeWeeks;
  const timeNote = buffer >= 4
    ? `${leadTimeWeeks}-week lead time leaves a ${buffer}-week development buffer.`
    : buffer >= 0
    ? `${leadTimeWeeks}-week lead time is workable but leaves no room for sampling revision.`
    : `${leadTimeWeeks}-week lead time exceeds the ${deliveryWindowWeeks}-week delivery window — this needs immediate action.`;
  const chipPressure = complexityChipCount >= 3
    ? ` ${complexityChipCount} active signals are adding construction demand.`
    : complexityChipCount === 2
    ? ` 2 active signals are pushing complexity upward.`
    : complexityChipCount === 1
    ? ` 1 active signal is adding construction demand.`
    : "";

  if (constructionTier === "low") {
    return `Low construction keeps ${materialName} costs and timelines stable.${chipPressure ? ` Note:${chipPressure}` : ""} ${chipText} at this complexity tier without forcing unnecessary production strain. ${timeNote}`;
  }
  if (constructionTier === "moderate") {
    return `Moderate construction introduces structured seam work with ${materialName}.${chipPressure ? `${chipPressure}` : ""} Assembly demand is present but stays within a workable production window — ${chipText} without overcommitting the build. ${timeNote}`;
  }
  return `High construction pushes ${materialName} into hero-piece territory.${chipPressure ? `${chipPressure}` : ""} Structured seam work and finishing intensity become part of the build expectation — ${chipText} but production feasibility becomes an active decision. ${timeNote}`;
}

function getConstructionImplicationCopy(options: {
  tier: ConstructionTier | null;
  material: Material | null;
  silhouette: string | null;
  timelineStatus: "green" | "yellow" | "red" | null;
  selectedSignals: string[];
}) {
  const { tier, material, silhouette, timelineStatus, selectedSignals } = options;
  if (!tier) return null;

  const silhouetteText = silhouette ? `${silhouette.toLowerCase()} silhouette` : "piece language";
  const signalLead = selectedSignals.length > 0
    ? `${selectedSignals.slice(0, 2).join(" and ")}`
    : "the concept language";

  if (tier === "low") {
    return `Low construction keeps seam work disciplined and finishing demand minimal. That protects assembly speed and cost control, but it leaves ${signalLead} carrying most of the definition in the ${silhouetteText}.`;
  }

  if (tier === "high") {
    const hardwareLine = material?.id === "leather" || material?.id === "vegan-leather"
      ? "Hardware and reinforced finishing become part of the build expectation"
      : "Structured seam work and finishing detail become part of the build expectation";
    const feasibilityLine = timelineStatus === "red"
      ? "and the current delivery window is unlikely to absorb that assembly load cleanly."
      : timelineStatus === "yellow"
        ? "and the current delivery window leaves limited recovery room if sampling slips."
        : "while still remaining viable if approvals stay tight.";
    return `High construction pushes seam complexity and finishing intensity into hero-piece territory. ${hardwareLine}, ${feasibilityLine} This sharpens ${signalLead} but turns production feasibility into an active decision, not a background assumption.`;
  }

  const materialLine = material?.id === "deadstock-fabric"
    ? "Deadstock keeps the calendar fast, but it reduces reorder flexibility and raises the importance of early commitment."
    : material
      ? `${material.name} can support this level without forcing unnecessary construction inflation.`
      : "This level keeps the build balanced across craft and feasibility.";
  const timelineLine = timelineStatus === "red"
    ? "The current delivery window is under pressure, so moderation is doing real protective work."
    : timelineStatus === "yellow"
      ? "Assembly demand stays present, but still within a workable production window."
      : "Assembly demand stays intentional without pushing the piece beyond the current delivery window.";

  return `Moderate construction introduces structured seam work and light finishing demand. ${materialLine} ${timelineLine} It keeps ${signalLead} legible in the ${silhouetteText} without overcommitting the build.`;
}

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

function getMaterialConstructionImplication(
  materialId: string | null | undefined,
  constructionTier: string | null | undefined
): string | null {
  if (!materialId || !constructionTier) return null;
  const tierKey = constructionTier.toLowerCase() as "low" | "moderate" | "high";
  const entry = (materialConstructionImplications as Record<string, Record<string, string>>)[materialId];
  return entry?.[tierKey] ?? null;
}

export default function SpecStudioPage() {
  const router = useRouter();
  const previousMaterialIdRef = useRef<string | null>(null);
  const materialDeltaTimeoutRef = useRef<number | null>(null);
  const { setCategory, setSubcategory: setStoreSubcategory, setTargetMsrp, setMaterial, setSilhouette, setConstructionTier: setStoreTier, setColorPalette, setCurrentStep, setChipSelection, updateExecutionPulse, intentGoals, intentTradeoff, collectionRole: storeCollectionRole, savedAnalysisId, setSavedAnalysisId, setParentAnalysisId } = useSessionStore();
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
  const [targetMSRP, setTargetMSRP] = useState(() => {
    return useSessionStore.getState().targetMsrp ?? 450;
  });
  const [targetMSRPInput, setTargetMSRPInput] = useState(() => {
    const stored = useSessionStore.getState().targetMsrp;
    return stored ? String(stored) : "";
  });
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
  const [timelineWeeksInput, setTimelineWeeksInput] = useState(() => {
    const season = useSessionStore.getState().season;
    const isFW = season && (season.toLowerCase().includes('fw') || season.toLowerCase().includes('fall'));
    return String(isFW ? 24 : 20);
  });
  const [constraintPromptVisible, setConstraintPromptVisible] = useState(false);
  const [pulseUpdated, setPulseUpdated] = useState(false);

  // Scorecard modal state
  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);

  const [hasInitialized, setHasInitialized] = useState(false);

  const [userManuallySelected, setUserManuallySelected] = useState(false);

  const [hoveredMaterialId, setHoveredMaterialId] = useState<string | null>(null);
  const [materialCategory, setMaterialCategory] = useState<string>("all");
  const [hoveredComplexity, setHoveredComplexity] = useState<ConstructionTier | null>(null);
  const [pulseExpandedRow, setPulseExpandedRow] = useState<string | null>(null);
  const [constructionConfirmed, setConstructionConfirmed] = useState(false);
  const [showAllMaterials, setShowAllMaterials] = useState(false);
  const [specAnalysisExpanded, setSpecAnalysisExpanded] = useState(false);
  const [specStep, setSpecStep] = useState<"material" | "construction">("material");
  const [specStepDirection, setSpecStepDirection] = useState<1 | -1>(1);
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

  const storeAesthetic = useSessionStore((s) => s.aestheticMatchedId);
  const storeAestheticName = useSessionStore((s) => s.aestheticInput);
  const storeModifiers = useSessionStore((s) => s.refinementModifiers);
  const selectedKeyPiece = useSessionStore((s) => s.selectedKeyPiece);
  const selectedPieceImage = useSessionStore((s) => s.selectedPieceImage);
  const storeMoodboard = useSessionStore((s) => s.moodboardImages);
  const chipSelection = useSessionStore((s) => s.chipSelection);
  const conceptSilhouette = useSessionStore((s) => s.conceptSilhouette);
  const conceptPalette = useSessionStore((s) => s.conceptPalette);

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

  const refinement = useMemo(() => {
    if (!storeAesthetic) return FALLBACK_REFINEMENT;
    return { base: storeAesthetic, modifiers: [] as string[] };
  }, [storeAesthetic]);
  const brandTargetMargin = 0.60;

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
    () => categorySubcategories.find((s) => s.id === subcategoryId) || null,
    [subcategoryId, categorySubcategories]
  );
  const pieceAnchorName = useMemo(() => {
    if (selectedKeyPiece?.item) return selectedKeyPiece.item;
    if (selectedSubcategory?.name) return selectedSubcategory.name;
    return selectedCategory.name;
  }, [selectedKeyPiece, selectedSubcategory, selectedCategory]);
  const piecePaletteName = useMemo(() => {
    if (!conceptPalette) return null;
    const entry = (aestheticsData as unknown as Array<{ id: string; palette_options?: Array<{ id: string; name: string }> }>).find(
      (a) => a.id === conceptContext.aestheticMatchedId
    );
    return entry?.palette_options?.find((p) => p.id === conceptPalette)?.name ?? conceptPalette;
  }, [conceptPalette, conceptContext.aestheticMatchedId]);
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


  const hasUserSelection = userManuallySelected && (materialId !== "" || constructionTier !== null);

  const aestheticKws =
    AESTHETIC_KEYWORDS[conceptContext.aestheticMatchedId] ||
    AESTHETIC_KEYWORDS.default;

  const recommendedMaterialId = useMemo(() => {
    // If a key piece specifies a recommended material, prefer it
    if (selectedKeyPiece?.recommended_material_id && materials.find((m) => m.id === selectedKeyPiece.recommended_material_id)) {
      return selectedKeyPiece.recommended_material_id;
    }
    // If a chip specifies a material, prefer it (first chip with a material wins)
    const chipMaterial = chipSelection?.activatedChips.find((c) => c.material != null)?.material;
    if (chipMaterial && materials.find((m) => m.id === chipMaterial)) {
      return chipMaterial;
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
  }, [materials, aestheticKws, chipSelection]);

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

  useEffect(() => {
    if (insight) {
      setPulseUpdated(true);
      const t = setTimeout(() => setPulseUpdated(false), 1200);
      return () => clearTimeout(t);
    }
  }, [insight?.cogs, insight?.type]);

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

  const handleSubcategoryChange = (newSubId: string) => {
    setSubcategoryId(newSubId);
    setStoreSubcategory(newSubId);
    // Update smart complexity based on subcategory affinity
    const sub = (allSubcategories[categoryId] ?? []).find((s) => s.id === newSubId);
    if (sub) {
      const smartTier = getSmartDefault(categoryId, conceptSilhouette || undefined, sub.complexity_affinity as 'low' | 'moderate' | 'high');
      setConstructionTier(smartTier);
      setConstructionConfirmed(false);
      setOverrideWarning(null);
    }
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

  useEffect(() => {
    setSpecAnalysisExpanded(false);
  }, [materialId]);

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
  const marginCeiling = Math.round(targetMSRP * (1 - brandTargetMargin));

  const baselineComplexity: ConstructionTier = useMemo(() => {
    const subAffinity = selectedSubcategory?.complexity_affinity as 'low' | 'moderate' | 'high' | undefined;
    const base: ConstructionTier = getSmartDefault(categoryId, conceptSilhouette || undefined, subAffinity);
    // If any complexity chip is active, recommend High
    if (chipSelection?.activatedChips.some((c) => c.complexity_mod > 0 && !c.isCustom)) {
      return "high";
    }
    return base;
  }, [categoryId, conceptSilhouette, chipSelection, selectedSubcategory]);

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
    setTargetMsrp(targetMSRP);
  }, [targetMSRP, setTargetMsrp]);

  useEffect(() => {
    if (targetMSRPInput.trim() && timelineWeeksInput.trim()) {
      setConstraintPromptVisible(false);
    }
  }, [targetMSRPInput, timelineWeeksInput]);

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
    if (selectedKeyPiece && !selectedKeyPiece.custom) {
      if (selectedKeyPiece.category) {
        const matchedCat = categories.find(
          (c) => c.id === selectedKeyPiece.category ||
            c.name.toLowerCase() === selectedKeyPiece.category?.toLowerCase()
        );
        if (matchedCat) handleCategoryChange(matchedCat.id);
      }
      if (selectedKeyPiece.type) {
        setSubcategoryId(selectedKeyPiece.type);
        setStoreSubcategory(selectedKeyPiece.type);
      }
      if (selectedKeyPiece.recommended_material_id) {
        setMaterialId(selectedKeyPiece.recommended_material_id);
        setUserManuallySelected(true);
      }
    }
  // Only run when selectedKeyPiece changes (not on every render)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKeyPiece]);

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
      resonance: clamp(res, -3, 4),
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
    return { identity: id, resonance: res, execution: clamp(exec - chipComplexityCount, -6, 4) };
  }

  function addDeltas(a: Deltas, b: Deltas): Deltas {
    return {
      identity: a.identity + b.identity,
      resonance: a.resonance + b.resonance,
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

  const dynamicResonanceScore = useMemo(() => {
    if (!selectedMaterial) return conceptContext.resonanceScore;

    const baseScore = conceptContext.resonanceScore;
    const materialDelta = selectedMaterial ? scoreMaterialDeltas(selectedMaterial).resonance : 0;
    const complexityDelta = constructionTier ? scoreComplexityDeltas(constructionTier).resonance : 0;
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

  const resonanceColor =
    dynamicResonanceScore >= 80
      ? CHARTREUSE
      : dynamicResonanceScore >= 60
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

  const resonanceChipData: PulseChipProps = aestheticEntry
    ? aestheticEntry.trend_velocity === "emerging"
      ? { variant: "green", status: "Ascending", consequence: "Differentiation window open" }
      : aestheticEntry.trend_velocity === "peak"
        ? aestheticEntry.saturation_score < 60
          ? { variant: "amber", status: "Peak saturation", consequence: "Differentiation required" }
          : { variant: "red", status: "Peak saturation", consequence: "High risk of blending" }
        : aestheticEntry.trend_velocity === "declining"
          ? { variant: "red", status: "Declining", consequence: "High risk of feeling dated" }
          : { variant: "amber", status: "Ascending", consequence: "Differentiation window open" }
    : { variant: "amber", status: "Ascending", consequence: "Differentiation window open" };

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
  const specRawJsonRef = useRef<string>('');
  const [specSynthInsightData, setSpecSynthInsightData] = useState<InsightData | null>(null);
  const [specInsightLoading, setSpecInsightLoading] = useState(false);
  const [specStreamingText, setSpecStreamingText] = useState('');
  const [specStreamingParagraph, setSpecStreamingParagraph] = useState('');
  const [specIsParagraphStreaming, setSpecIsParagraphStreaming] = useState(false);


  useEffect(() => {
    if (!userManuallySelected || !materialId || !conceptContext.aestheticMatchedId) return;

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
      identity_score: dynamicIdentityScore,
      resonance_score: dynamicResonanceScore,
      execution_score: executionScore,
      materialId,
      cogs_usd: insight?.cogs ?? 0,
      target_msrp: targetMSRP,
      margin_pass: marginGatePassed,
      construction_tier: constructionTier ?? 'moderate',
      timeline_weeks: timelineWeeks,
      season: storeSeason || 'SS27',
      collectionName: brandProfileName || '',
      silhouette: conceptSilhouette || undefined,
      category: categoryId || undefined,
      keyPiece: selectedKeyPiece && !selectedKeyPiece.custom && selectedKeyPiece.type
        ? { item: selectedKeyPiece.item, type: selectedKeyPiece.type, signal: selectedKeyPiece.signal ?? '' }
        : undefined,
      intent: intentPayload,
    });
    if (!blackboard) return;

    specAbortRef.current?.abort();
    const controller = new AbortController();
    specAbortRef.current = controller;

    const timer = window.setTimeout(async () => {
      setSpecInsightLoading(true);
      setSpecStreamingText('');
      setSpecStreamingParagraph('');
      setSpecIsParagraphStreaming(true);
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
              const accumulated = specRawJsonRef.current;
              // Extract partial insight_title value for display
              const match = accumulated.match(/"insight_title"\s*:\s*"([^"]*)/);
              setSpecStreamingText(match ? match[1] : (accumulated.length > 10 ? '...' : ''));
              setSpecStreamingParagraph(extractPartialJsonString(accumulated, 'insight_description'));
            } catch { /* ignore parse errors on partial chunks */ }
          } else if (event === 'complete' || event === 'fallback') {
            try {
              const result = JSON.parse(data) as { data: InsightData; meta: { method: string } };
              if (!controller.signal.aborted) {
                setSpecSynthInsightData(result.data);
                setSpecStreamingText('');
                setSpecStreamingParagraph(result.data.statements?.slice(0, 2).join(' ').trim() ?? '');
                setSpecIsParagraphStreaming(false);
                // Persist analysis — awaited inside async IIFE so the stream loop is not blocked
                void (async () => {
                  try {
                    const supabase = createClient();
                    const { data: authData } = await supabase.auth.getUser();
                    const userId = authData.user?.id ?? null;

                    const session = useSessionStore.getState();
                    const finalScore = Math.round(
                      (dynamicIdentityScore + dynamicResonanceScore + executionScore) / 3
                    );
                    let reportNarrative = result.data.statements?.join('\n\n') ?? '';

                    const reportBlackboard = buildReportBlackboard({
                      aestheticSlug: conceptContext.aestheticMatchedId || '',
                      brandKeywords: refinementModifiers,
                      identity_score: dynamicIdentityScore,
                      resonance_score: dynamicResonanceScore,
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
                        const reportResponse = await fetch('/api/synthesizer/report', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(reportBlackboard),
                        });

                        if (reportResponse.ok) {
                          const reportResult = await reportResponse.json() as { data?: InsightData };
                          const reportStatements = reportResult.data?.statements?.filter(Boolean) ?? [];
                          if (reportStatements.length > 0) {
                            reportNarrative = reportStatements.join('\n\n');
                          }
                        }
                      } catch (err) {
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
                        parentAnalysisId:            session.parentAnalysisId,
                        collectionAesthetic:         session.collectionAesthetic,
                        aestheticInflection:         session.aestheticInflection,
                        directionInterpretationText: session.directionInterpretationText,
                        intent:                      intentPayload,
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
                      resonance_score:          dynamicResonanceScore,
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
                        resonance: dynamicResonanceScore,
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
                    const { data: upsertData, error: upsertError } = await supabase
                      .from('analyses')
                      .upsert(row, { onConflict: 'id' })
                      .select('id')
                      .single();

                    if (upsertError) {
                      console.error('[Spec] Analysis persist failed:', upsertError);
                    } else if (upsertData?.id) {
                      setSavedAnalysisId(upsertData.id as string);
                    }
                  } catch (err) {
                    console.error('[Spec] Analysis persist threw:', err);
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
        setSpecIsParagraphStreaming(false);
        if (!controller.signal.aborted) {
          setSpecInsightLoading(false);
          setSpecStreamingText('');
        }
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
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
    if (!selectedMaterial) return { identity: 0, resonance: 0, execution: 0 };
    const m = scoreMaterialDeltas(selectedMaterial);
    const c = constructionTier ? scoreComplexityDeltas(constructionTier) : { identity: 0, resonance: 0, execution: 0 };
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

    const resLine =
      selectedImpact.resonance >= 2
        ? "market-aligned"
        : selectedImpact.resonance >= 1
          ? "market-positive"
          : selectedImpact.resonance <= -1
            ? "higher risk commercially"
            : "commercially neutral";

    const execLine =
      overBy > 0
        ? "with execution risk"
        : insight.type === "strong"
          ? "with strong execution headroom"
          : "with manageable execution headroom";

    const overall = `Overall: ${idLine} + ${resLine}, ${execLine}.`;

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


  /* ─── Spec insight content ─────────────────────────────────────────────── */
  const specInsightContent = useMemo(() => {
    const mat = selectedMaterial ?? baselineMaterial;
    const dir = conceptContext.aestheticName;
    const ceiling = marginCeiling;

    if (!mat) {
      return {
        headline: `Choose a material to start your ${dir} spec.`,
        p1: `The rose glow on the material grid marks Muko's recommendation for this direction — the starting point with the best fit across brand alignment, margin, and lead time.`,
        p2: `Your margin ceiling is $${ceiling} — that's the maximum COGS at your target margin. Material cost × yardage + construction multiplier must stay within this.`,
        p3: `Select a material and silhouette to see your full execution readout. Identity and Resonance carry forward from Concept Studio — Execution is the score to optimize here.`,
        opportunity: [] as string[],
        editItems: [] as string[],
      };
    }

    const cost = mat.cost_per_yard || 0;
    const leadTime = mat.lead_time_weeks || 0;
    const isOver = insight ? insight.cogs > insight.ceiling : false;
    const overBy = isOver && insight ? insight.cogs - insight.ceiling : 0;

    const matP1Map: Record<string, string> = {
      "organic-cotton": `Organic cotton reads cleanly within ${dir}'s visual language — honest material, GOTS-certified, with a provenance story your customer can verify. The fabrication lets the design carry the concept without competing for attention.`,
      "tencel": `Tencel's fluid drape reads elevated on-body for ${dir} — the Lenzing trademark adds a sustainability credential at a price point that doesn't strain margin. Premium-feeling material that doesn't demand premium cost.`,
      "linen": `Linen's natural slub texture is one of the most authentic fabrication signals for ${dir} — it improves with wear and reads honest in a way synthetic blends can't replicate. The 13-week lead is your primary planning constraint.`,
      "silk": `Silk is the highest-identity material signal available for ${dir} — luminous, fluid, and immediately readable as a hero fabrication. Watch the 15-week lead and factor genuine complexity into your production calendar.`,
      "wool-merino": `Merino wool is itch-free, temperature-regulating, and premium-feeling without announcing itself — for ${dir}, it's the easiest fabrication upgrade with the clearest commercial proposition.`,
      "cashmere-blend": `Cashmere signals luxury before the garment is worn — for ${dir}, it elevates the entire concept. An 18-week lead and $40/yd cost means this should be a hero SKU, not a basic.`,
      "recycled-polyester": `Recycled polyester gives ${dir} a credible sustainability angle without premium cost — best positioned in layering or outerwear where surface texture is secondary to function.`,
      "deadstock-fabric": `Deadstock fits ${dir}'s restraint ethos — the material story becomes part of the design story, and your customer responds to that kind of intentionality. Lot-based availability is the trade-off: size the run carefully.`,
      "hemp": `Hemp has the highest sustainability score in the lineup for ${dir} — structured drape, improving softness, and a strong provenance story that carries real commercial credibility now.`,
      "leather": `Leather is a high-identity, long-lead choice for ${dir} — a genuinely premium read that requires the production depth and complexity budget to execute correctly. Half-measures won't register.`,
      "vegan-leather": `Vegan leather gives ${dir} leather's structure at lower cost with easier compliance — the sustainability score is lower than organic materials, so be transparent rather than leaning on the eco story.`,
      "rayon-viscose": `Rayon viscose gives ${dir} Tencel's fluid drape at a lower price point — affordable and commercial, though the environmental story is weaker. Best where drape and cost take priority over provenance.`,
    };

    const p1 = matP1Map[mat.id] ?? `${mat.name} aligns with ${dir}'s fabrication language — the material weight and surface carry the direction's signals clearly without requiring additional explanation.`;

    const p2 = insight
      ? isOver
        ? `At $${cost}/yd, your COGS comes in at $${insight.cogs} — $${overBy} over your $${ceiling} ceiling. The fastest recovery is construction tier or silhouette yardage, not a material swap.`
        : `At $${cost}/yd with a $${ceiling} ceiling, you're at $${insight.cogs} COGS — $${ceiling - insight.cogs} within margin. That's real room to invest in construction quality without pressure.`
      : `At $${cost}/yd with a $${ceiling} ceiling, select a silhouette to see your full COGS breakdown. Material cost is your biggest lever — the rest is construction and yardage.`;

    const p3 = leadTime <= 4
      ? `${leadTime}-week lead time is your sharpest production advantage — short enough to course-correct on anything in the spec without calendar risk.`
      : leadTime <= 8
        ? `${leadTime}-week lead gives you a workable window — plan sampling now and confirm construction approval early to stay ahead of deadline risk.`
        : leadTime <= 12
          ? `${leadTime}-week lead is tight against a typical season calendar. Confirm factory alignment and don't let sampling stretch — any slip compounds quickly.`
          : `${leadTime}-week lead is your biggest risk flag. Confirm material receipt and factory capacity before committing to the range plan.`;

    const opportunity: string[] = !isOver
      ? [
          `${mat.name} is the most legible fabrication signal for this direction — let it carry the concept`,
          insight && (ceiling - insight.cogs) > 30
            ? `You have $${ceiling - insight.cogs} in margin headroom — room to invest in finishing detail or construction quality`
            : `Keep construction at Moderate to preserve margin flexibility`,
          leadTime <= 6
            ? `Short lead means fast iteration — confirm silhouette and move`
            : `Confirm yardage and spec early to protect against lead time risk`,
        ]
      : [
          `Reduce complexity to Moderate — fastest route to recover $${Math.round(overBy * 0.6)} without touching the material`,
          alternativeMaterial
            ? `Consider ${alternativeMaterial.name} at $${alternativeMaterial.cost_per_yard}/yd — comparable properties, lower cost`
            : `Review silhouette yardage — lower volume cut reduces COGS without changing the design language`,
          `Lock silhouette and confirm lead time before committing to production quantities`,
        ];

    const editItems: string[] = isOver
      ? [
          `A lower-cost fabrication would bring COGS back within your $${ceiling} ceiling`,
          `Reducing construction complexity is the fastest route to recover margin headroom`,
        ]
      : leadTime > 10
        ? [
            `Confirm material lead time against your season deadline before locking the spec`,
            `A shorter-lead alternative would reduce calendar risk without changing the design language`,
          ]
        : [];

    return {
      headline: `${mat.name} is your starting point for ${dir}.`,
      p1, p2, p3, opportunity, editItems,
    };
  }, [selectedMaterial, baselineMaterial, conceptContext.aestheticName, marginCeiling, insight, alternativeMaterial, baselineComplexity]);

  const suggestedQuestions = useMemo(() => {
    const qs = [
      "What's the biggest execution risk here?",
      "Is there a better material for this direction?",
    ];
    if (insight && insight.cogs <= insight.ceiling) qs.push("How much complexity can I add before I'm at risk?");
    else if (insight && insight.cogs > insight.ceiling) qs.push("What's the fastest way to get back within margin?");
    if (selectedMaterial && (selectedMaterial.lead_time_weeks ?? 0) > 14) qs.push("Is there a material with a shorter lead time?");
    if (constructionTier === "high") qs.push("Is High complexity worth the margin cost for this direction?");
    return qs.slice(0, 3);
  }, [insight, selectedMaterial, constructionTier]);

  const displayConstruction = constructionConfirmed && constructionTier
    ? CONSTRUCTION_INFO[constructionTier].label
    : "—";
  const displayLeadTime = selectedMaterial ? `${selectedMaterial.lead_time_weeks} weeks` : "—";
  const displayEstimatedCogs = insight ? `$${insight.cogs}` : "—";
  const marginBuffer = insight ? insight.ceiling - insight.cogs : null;
  const hasMaterialSelection = Boolean(selectedMaterial);
  const hasConstructionSelection = Boolean(selectedMaterial && constructionConfirmed && constructionTier);
  const showInterpretationLayer = hasConstructionSelection;
  const activeSignalLabels = useMemo(
    () => (chipSelection?.activatedChips ?? []).map((chip) => chip.label),
    [chipSelection]
  );
  const constructionImplication = useMemo(
    () =>
      getConstructionImplicationCopy({
        tier: constructionConfirmed ? constructionTier : null,
        material: selectedMaterial,
        silhouette: formattedSilhouette,
        timelineStatus,
        selectedSignals: activeSignalLabels,
      }),
    [constructionConfirmed, constructionTier, selectedMaterial, formattedSilhouette, timelineStatus, activeSignalLabels]
  );
  const structuredReadouts = useMemo(() => {
    const trendWindow = selectedKeyPiece?.signal === "ascending"
      ? "Anti-fit tailoring still has forward movement, but speed matters more than novelty now."
      : selectedKeyPiece?.signal === "high-volume"
        ? "The market already understands this shape, so execution quality is the differentiator."
        : "The concept still has room, but weak delivery timing will compress the opportunity quickly.";

    return [
      {
        label: "Execution Risk",
        body: !selectedMaterial
          ? "Material selection unlocks the real execution read on delivery and feasibility."
          : timelineStatus === "red"
            ? `${selectedMaterial.lead_time_weeks}-week lead time is the binding constraint against the current delivery window.`
            : timelineStatus === "yellow"
              ? `${selectedMaterial.lead_time_weeks}-week lead time is workable, but development drift will use the remaining buffer quickly.`
              : `${selectedMaterial.lead_time_weeks}-week lead time keeps the delivery window intact if approvals stay disciplined.`,
      },
      {
        label: "Margin Buffer",
        body: marginBuffer == null
          ? `Margin ceiling is $${marginCeiling} once the build is defined.`
          : marginBuffer < 0
            ? `$${Math.abs(marginBuffer)} over the margin ceiling, so the current build has no recovery room without adjustment.`
            : marginBuffer === 0
              ? "At the ceiling now, so any added complexity needs a compensating trade-off elsewhere."
              : `$${marginBuffer} of headroom absorbs one measured iteration, but not repeated development drift.`,
      },
      {
        label: "Production Sensitivity",
        body: constructionImplication ?? "Construction selection will determine how much sampling sensitivity and QA intensity the piece can absorb.",
      },
      {
        label: "Trend Window",
        body: trendWindow,
      },
    ];
  }, [selectedMaterial, timelineStatus, marginBuffer, marginCeiling, constructionImplication, selectedKeyPiece]);

  const displayExecutionStatus = executionChipData?.status ?? "Pending";
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

  const stageSummaries = useMemo(() => ({
    "material-reality": selectedMaterial?.name ?? "Choose material",
    "construction-discipline": constructionConfirmed && constructionTier
      ? CONSTRUCTION_INFO[constructionTier].label
      : "Choose construction",
  }), [selectedMaterial, constructionConfirmed, constructionTier]);

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

  const mukoRead = useMemo(() => {
    const signalNames = (chipSelection?.activatedChips ?? []).slice(0, 3).map((chip) => chip.label);
    const signalClause = signalNames.length > 0 ? `Signals like ${signalNames.join(", ")} still read clearly in the build.` : "";

    if (!selectedMaterial) {
      return {
        headline: "Material choice will determine whether this piece holds its concept under production pressure.",
        body: `${pieceAnchorName} already has a defined identity through ${[piecePaletteName, formattedSilhouette].filter(Boolean).join(" and ") || "its concept framing"}. Choose a material to see where cost and delivery start to reshape that expression. ${signalClause}`.trim(),
      };
    }

    if (selectedMaterial.id === "deadstock-fabric") {
      return {
        headline: "Deadstock accelerates delivery but removes reorder flexibility, placing pressure on early commitment decisions.",
        body: `${selectedMaterial.name} shortens the calendar to ${selectedMaterial.lead_time_weeks} weeks, but the lot-based supply means commitment timing matters as much as the fabric itself. ${insight ? `Current COGS land at $${insight.cogs} against a $${insight.ceiling} ceiling.` : ""} ${signalClause}`.trim(),
      };
    }

    if (insight && insight.cogs > insight.ceiling) {
      return {
        headline: `${selectedMaterial.name} supports the direction, but the current build is overrunning the margin gate.`,
        body: `At $${insight.cogs} COGS against a $${insight.ceiling} ceiling, this material-construction pairing needs a tighter decision before the concept reaches production. ${timelineStatus === "red" ? "Delivery is also under visible pressure." : "Delivery is still recoverable if the build stays disciplined."} ${signalClause}`.trim(),
      };
    }

    if (timelineStatus === "red") {
      return {
        headline: `${selectedMaterial.name} keeps the concept intact, but the build is colliding with the delivery window.`,
        body: `${selectedMaterial.lead_time_weeks} weeks of material lead time leaves limited recovery room once construction is locked. ${constructionTier ? `${CONSTRUCTION_INFO[constructionTier].label} construction currently ${executionStatus === "green" ? "remains feasible" : "needs a tighter execution plan"}.` : "Construction discipline will decide whether the window can hold."} ${signalClause}`.trim(),
      };
    }

    if (constructionConfirmed && constructionTier === "high") {
      return {
        headline: `${selectedMaterial.name} and high construction sharpen the piece, but they narrow your margin recovery room.`,
        body: `${insight ? `COGS are currently $${insight.cogs}, which ${insight.type === "strong" ? "stays controlled" : "sits close to the ceiling"}.` : ""} The concept remains legible, but this is no longer a forgiving build. ${signalClause}`.trim(),
      };
    }

    return {
      headline: `${selectedMaterial.name} preserves the concept while keeping execution in a controlled range.`,
      body: `${constructionConfirmed && constructionTier ? `${CONSTRUCTION_INFO[constructionTier].label} construction` : "This build"} keeps the piece readable without forcing unnecessary production strain. ${insight ? `COGS are $${insight.cogs} against a $${insight.ceiling} ceiling, and material lead time is ${selectedMaterial.lead_time_weeks} weeks.` : ""} ${signalClause}`.trim(),
    };
  }, [
    chipSelection,
    pieceAnchorName,
    piecePaletteName,
    formattedSilhouette,
    selectedMaterial,
    insight,
    timelineStatus,
    constructionConfirmed,
    constructionTier,
    executionStatus,
  ]);

  /* ─── RENDER ───────────────────────────────────────────────────────────── */
  const overallScore = Math.round((dynamicIdentityScore + dynamicResonanceScore + executionScore) / 3);

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
    },
    scores: {
      identity: dynamicIdentityScore ?? undefined,
      resonance: dynamicResonanceScore ?? undefined,
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
    pieceRole: selectedKeyPiece?.item ?? undefined,
    silhouette: conceptSilhouette ?? undefined,
    constructionTier: constructionTier ?? undefined,
  };

  const isTargetMsrpEmpty = targetMSRPInput.trim().length === 0;
  const isTimelineEmpty = timelineWeeksInput.trim().length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#FAF9F6", overflow: "hidden" }}>
      {/* ── Fixed Header ──────────────────────────────────────────────────── */}
      <header
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
          height: 72,
          background: "rgba(250,249,246,0.92)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          borderBottom: "1px solid rgba(67,67,43,0.09)",
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          padding: "0 40px",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        {/* Left: logo + stepper */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <button
            type="button"
            onClick={() => router.push("/entry")}
            aria-label="Go to entry page"
            style={{ fontFamily: sohne, fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", color: OLIVE, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}
          >
            muko
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {[
              { label: "Intent", done: true, active: false },
              { label: "Concept", done: true, active: false },
              { label: "Spec", done: false, active: true },
              { label: "Report", done: false, active: false },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: s.done ? `1.5px solid ${CHARTREUSE}` : s.active ? `1.5px solid ${STEEL}` : "1.5px solid rgba(67,67,43,0.10)",
                  background: s.done ? "rgba(168,180,117,0.08)" : s.active ? "rgba(125,150,172,0.07)" : "rgba(67,67,43,0.03)",
                  fontFamily: sohne, fontSize: 11, fontWeight: 600, letterSpacing: "0.01em",
                  color: s.done ? "rgba(67,67,43,0.70)" : s.active ? OLIVE : "rgba(67,67,43,0.35)",
                }}
              >
                {s.done ? (
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path d="M4.5 7.2L6.2 8.8L9.5 5.5" stroke={CHARTREUSE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : s.active ? (
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: STEEL, boxShadow: `0 0 0 3px rgba(125,150,172,0.20)` }} />
                ) : (
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: "rgba(67,67,43,0.18)" }} />
                )}
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Right: season/collection + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: sohne, fontSize: 12, fontWeight: 600, color: "rgba(67,67,43,0.50)", letterSpacing: "0.03em" }}>
            {headerSeasonLabel}<span style={{ padding: "0 7px", opacity: 0.35 }}>·</span>{headerCollectionName}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => window.history.back()}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 13px 7px 10px", borderRadius: 999, border: "1px solid rgba(67,67,43,0.14)", background: "transparent", fontFamily: sohne, fontSize: 11, fontWeight: 600, color: "rgba(67,67,43,0.62)", cursor: "pointer", letterSpacing: "0.01em" }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Back
            </button>
            <button
              onClick={() => {}}
              style={{ padding: "7px 14px", borderRadius: 999, border: "none", background: OLIVE, fontFamily: sohne, fontSize: 11, fontWeight: 600, color: "#F5F0E8", cursor: "pointer", letterSpacing: "0.01em" }}
            >
              SAVE & CLOSE
            </button>
          </div>
        </div>
      </header>

      <div className="specStudioLayout">
        <aside className="specStudioColumn specStudioLeft" style={{ paddingTop: 72 }}>
          <div className="specStudioSticky" style={{ padding: "0 24px 44px" }}>

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
                selectedPieceImage={selectedPieceImage}
              />
              <div style={{ marginTop: 14, fontFamily: sohne, fontSize: 22, fontWeight: 500, color: OLIVE, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                {pieceAnchorName}
              </div>
              {pieceSubtitle && (
                <div style={{ marginTop: 4, fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.52)", lineHeight: 1.45 }}>
                  {pieceSubtitle}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(67,67,43,0.08)", margin: "18px 0" }} />

            {/* ── Section B: Collection Direction ───────────────────────── */}
            <div>
              <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(67,67,43,0.36)", marginBottom: 8 }}>
                Collection Direction
              </div>
              {storeAesthetic ? (
                <>
                  <div style={{ fontFamily: sohne, fontSize: 15, fontWeight: 500, color: OLIVE }}>
                    {conceptContext.aestheticName}
                  </div>
                  {formattedSilhouette && (
                    <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.52)", marginTop: 3 }}>
                      {formattedSilhouette} silhouette
                    </div>
                  )}
                  {(chipSelection?.activatedChips ?? []).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                      {(chipSelection?.activatedChips ?? []).slice(0, 2).map((chip) => (
                        <span
                          key={chip.label}
                          style={{
                            display: "inline-block",
                            padding: "3px 9px",
                            borderRadius: 999,
                            background: "rgba(168,180,117,0.10)",
                            border: "1px solid rgba(168,180,117,0.28)",
                            fontFamily: inter,
                            fontSize: 10.5,
                            fontWeight: 500,
                            color: "#6B7A40",
                          }}
                        >
                          {chip.label}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontFamily: inter, fontSize: 11.5, color: "rgba(67,67,43,0.32)", fontStyle: "italic" }}>
                  Direction locked in Concept Studio
                </div>
              )}
            </div>

            {/* Divider — only if material selected */}
            {selectedMaterial && (
              <div style={{ height: 1, background: "rgba(67,67,43,0.08)", margin: "18px 0" }} />
            )}

            {/* ── Section C: Material ────────────────────────────────────── */}
            {selectedMaterial && (
              <div style={{ animation: "fadeIn 220ms ease both" }}>
                <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(67,67,43,0.36)", marginBottom: 8 }}>
                  Material
                </div>
                <div style={{ fontFamily: sohne, fontSize: 15, fontWeight: 500, color: OLIVE }}>
                  {selectedMaterial.name}
                </div>
                <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.52)", marginTop: 3 }}>
                  ${selectedMaterial.cost_per_yard}/yd · {selectedMaterial.lead_time_weeks}wk lead
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
            {selectedMaterial && constructionConfirmed && constructionTier && insight && (
              <div style={{ height: 1, background: "rgba(67,67,43,0.08)", margin: "18px 0" }} />
            )}

            {/* ── Section E: Build Numbers ───────────────────────────────── */}
            {selectedMaterial && constructionConfirmed && constructionTier && insight && (
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
                      {selectedMaterial.lead_time_weeks}wks
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
          topOffset={72}
          leftContent={
            <main className="specStudioColumn specStudioCenter">
          <div style={{ padding: "36px 32px 56px" }}>
            <div style={{ maxWidth: 920, margin: "0 auto" }}>
              <div style={{ marginBottom: 26 }}>
                <h1 style={{ margin: 0, fontFamily: sohne, fontWeight: 500, fontSize: 28, color: OLIVE, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
                  Spec Studio
                </h1>
              </div>

              {/* ── Step tracker ──────────────────────────────────────────── */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
                  gap: 14,
                  marginBottom: 32,
                  paddingTop: 18,
                  borderTop: "1px solid rgba(67,67,43,0.08)",
                  alignItems: "start",
                }}
              >
                {/* Step 1: Material */}
                <button
                  onClick={() => backToMaterial()}
                  style={{
                    textAlign: "left",
                    border: "none",
                    borderTop: specStep === "material" ? "2px solid rgba(168,180,117,0.55)" : "2px solid rgba(67,67,43,0.08)",
                    background: "transparent",
                    padding: "14px 0 0",
                    cursor: "pointer",
                    opacity: 1,
                  }}
                >
                  <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: specStep === "material" ? "#6B7A40" : (selectedMaterial ? "#6B7A40" : "rgba(67,67,43,0.36)"), marginBottom: 6 }}>
                    {selectedMaterial ? "Complete" : specStep === "material" ? "Current" : "Upcoming"}
                  </div>
                  <div style={{ fontFamily: sohne, fontSize: 16, fontWeight: 500, color: OLIVE, lineHeight: 1.15, marginBottom: 6 }}>
                    Material
                  </div>
                  <div style={{ fontFamily: inter, fontSize: 11, lineHeight: 1.55, color: "rgba(67,67,43,0.48)" }}>
                    Choose the fabric that anchors the build.
                  </div>
                </button>
                {/* Arrow */}
                <div
                  style={{
                    alignSelf: "center",
                    paddingTop: 28,
                    fontFamily: sohne,
                    fontSize: 16,
                    color: "rgba(67,67,43,0.24)",
                    lineHeight: 1,
                  }}
                  aria-hidden
                >
                  →
                </div>
                {/* Step 2: Construction */}
                <button
                  onClick={() => { if (selectedMaterial) advanceToConstruction(); }}
                  style={{
                    textAlign: "left",
                    border: "none",
                    borderTop: specStep === "construction" ? "2px solid rgba(168,180,117,0.55)" : "2px solid rgba(67,67,43,0.08)",
                    background: "transparent",
                    padding: "14px 0 0",
                    cursor: selectedMaterial ? "pointer" : "default",
                    opacity: !selectedMaterial ? 0.72 : 1,
                  }}
                >
                  <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: specStep === "construction" ? "#6B7A40" : (constructionConfirmed ? "#6B7A40" : "rgba(67,67,43,0.36)"), marginBottom: 6 }}>
                    {constructionConfirmed ? "Complete" : specStep === "construction" ? "Current" : "Upcoming"}
                  </div>
                  <div style={{ fontFamily: sohne, fontSize: 16, fontWeight: 500, color: OLIVE, lineHeight: 1.15, marginBottom: 6 }}>
                    Construction
                  </div>
                  <div style={{ fontFamily: inter, fontSize: 11, lineHeight: 1.55, color: "rgba(67,67,43,0.48)" }}>
                    Lock the operational intensity of the build.
                  </div>
                </button>
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
                  <div style={{ paddingTop: 12, borderTop: "1px solid rgba(67,67,43,0.08)", marginBottom: 34 }}>
                    <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#6B7A40", marginBottom: 8 }}>
                      Step 1
                    </div>
                    <div style={{ fontFamily: sohne, fontSize: 28, fontWeight: 500, color: OLIVE, marginBottom: 8, letterSpacing: "-0.03em" }}>
                      Material Reality
                    </div>
                  </div>

                  {(!selectedKeyPiece || selectedKeyPiece.custom) && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
                      <span style={{ ...microLabel, color: "rgba(67,67,43,0.32)", marginRight: 4 }}>Piece</span>
                      <select
                        value={categoryId}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        style={{
                          minWidth: 140,
                          padding: "7px 28px 7px 12px",
                          borderRadius: 999,
                          border: "1px solid rgba(67,67,43,0.10)",
                          background: "rgba(255,255,255,0.68)",
                          fontFamily: inter,
                          fontSize: 12.5,
                          fontWeight: 500,
                          color: OLIVE,
                          appearance: "none",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2343432B' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' opacity='0.4'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 12px center",
                        }}
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      {categorySubcategories.length > 0 && (
                        <select
                          value={subcategoryId}
                          onChange={(e) => handleSubcategoryChange(e.target.value)}
                          style={{
                            minWidth: 160,
                            padding: "7px 28px 7px 12px",
                            borderRadius: 999,
                            border: "1px solid rgba(67,67,43,0.10)",
                            background: "rgba(255,255,255,0.68)",
                            fontFamily: inter,
                            fontSize: 12.5,
                            fontWeight: 500,
                            color: subcategoryId ? OLIVE : "rgba(67,67,43,0.40)",
                            appearance: "none",
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2343432B' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' opacity='0.4'/%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 12px center",
                          }}
                        >
                          <option value="" disabled>Select type</option>
                          {categorySubcategories.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  <div style={{ paddingBottom: 22, marginBottom: 28, borderBottom: "1px solid rgba(67,67,43,0.08)" }}>
                    <div style={{ ...microLabel, marginBottom: 10, color: "rgba(67,67,43,0.34)" }}>Constraints</div>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontFamily: inter, fontSize: 15, color: "rgba(67,67,43,0.66)", lineHeight: 1.5 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 148 }}>
                        <span>MSRP Target</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, minWidth: 118 }}>
                          <span style={{ color: "rgba(67,67,43,0.58)" }}>$</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={targetMSRPInput}
                            placeholder="e.g. $450"
                            onChange={(e) => {
                              const next = e.target.value.replace(/[^\d]/g, "");
                              setTargetMSRPInput(next);
                              setTargetMSRP(next ? Number(next) : 0);
                            }}
                            aria-label="MSRP target"
                            className="specConstraintInput"
                            style={{
                              width: 88,
                              border: "none",
                              background: "transparent",
                              padding: 0,
                              fontFamily: sohne,
                              fontSize: 22,
                              color: OLIVE,
                              outline: "none",
                              letterSpacing: "-0.02em",
                              lineHeight: 1.1,
                              appearance: "textfield",
                              WebkitAppearance: "none",
                              MozAppearance: "textfield",
                            }}
                          />
                        </span>
                        <span style={{ fontSize: 11.5, color: BRAND.camel, fontFamily: inter, lineHeight: 1.45 }}>
                          Used to calculate margin viability
                        </span>
                        {constraintPromptVisible && isTargetMsrpEmpty && (
                          <span
                            style={{
                              fontSize: 11.5,
                              color: BRAND.camel,
                              fontFamily: inter,
                              lineHeight: 1.45,
                              padding: "6px 10px",
                              borderRadius: 999,
                              background: "rgba(184,135,107,0.10)",
                              border: "1px solid rgba(184,135,107,0.18)",
                              width: "fit-content",
                            }}
                          >
                            Add your target MSRP for a margin assessment
                          </span>
                        )}
                      </div>
                      <span style={{ opacity: 0.42, alignSelf: "flex-start", paddingTop: 22 }}>·</span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 158 }}>
                        <span>Delivery Window</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={timelineWeeksInput}
                            placeholder="e.g. 10 weeks"
                            onChange={(e) => {
                              const next = e.target.value.replace(/[^\d]/g, "");
                              setTimelineWeeksInput(next);
                              setTimelineWeeks(Math.max(4, next ? Number(next) : 4));
                            }}
                            aria-label="Delivery window in weeks"
                            className="specConstraintInput"
                            style={{
                              width: 46,
                              border: "none",
                              background: "transparent",
                              padding: 0,
                              fontFamily: sohne,
                              fontSize: 22,
                              color: OLIVE,
                              outline: "none",
                              textAlign: "right",
                              letterSpacing: "-0.02em",
                              lineHeight: 1.1,
                              appearance: "textfield",
                              WebkitAppearance: "none",
                              MozAppearance: "textfield",
                            }}
                          />
                          <span>weeks</span>
                        </span>
                        <span style={{ fontSize: 11.5, color: BRAND.camel, fontFamily: inter, lineHeight: 1.45 }}>
                          Used to assess execution feasibility
                        </span>
                        {constraintPromptVisible && isTimelineEmpty && (
                          <span
                            style={{
                              fontSize: 11.5,
                              color: BRAND.camel,
                              fontFamily: inter,
                              lineHeight: 1.45,
                              padding: "6px 10px",
                              borderRadius: 999,
                              background: "rgba(184,135,107,0.10)",
                              border: "1px solid rgba(184,135,107,0.18)",
                              width: "fit-content",
                            }}
                          >
                            Add your delivery window for an execution assessment
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11.5, color: "rgba(67,67,43,0.42)", fontFamily: inter, lineHeight: 1.5 }}>
                      Ceiling ${marginCeiling}{timelineFeasibility ? ` · ${timelineFeasibility.required_weeks} weeks required at current build` : ""}
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
                        if (isTargetMsrpEmpty || isTimelineEmpty) {
                          setConstraintPromptVisible(true);
                        }
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
                    <div style={{ paddingTop: 12, borderTop: "1px solid rgba(67,67,43,0.08)", marginBottom: 34 }}>
                      <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#6B7A40", marginBottom: 8 }}>
                        Step 2
                      </div>
                      <div style={{ fontFamily: sohne, fontSize: 28, fontWeight: 500, color: OLIVE, marginBottom: 8, letterSpacing: "-0.03em" }}>
                        Construction Discipline
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
                    {constructionTier && constructionConfirmed && selectedMaterial && (
                      <div style={{ marginTop: 24 }}>
                        <div style={{
                          fontFamily: inter,
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase" as const,
                          color: "rgba(67,67,43,0.36)",
                          marginBottom: 10,
                        }}>
                          Execution Brief
                        </div>

                        {/* LAYER 1: Material × construction tier — deterministic, instant */}
                        {(() => {
                          const implication = getMaterialConstructionImplication(
                            selectedMaterial?.id,
                            constructionTier
                          );
                          return implication ? (
                            <div style={{
                              fontFamily: sohne,
                              fontSize: 15,
                              fontWeight: 500,
                              color: OLIVE,
                              lineHeight: 1.35,
                              marginBottom: 10,
                            }}>
                              {implication}
                            </div>
                          ) : null;
                        })()}

                        {/* LAYER 2: Chip × aesthetic × category guidance from design-language.json */}
                        {buildInsightContent?.text && (
                          <div style={{
                            fontFamily: inter,
                            fontSize: 13,
                            color: "rgba(67,67,43,0.62)",
                            lineHeight: 1.6,
                            marginBottom: ((buildInsightContent?.tags?.length ?? 0) > 0 || chipsForHighComplexity.length > 0) ? 10 : 0,
                          }}>
                            {buildInsightContent?.text}
                          </div>
                        )}

                        {constructionTier === "high" && (
                          <div style={{
                            fontFamily: inter,
                            fontSize: 11.4,
                            color: "rgba(67,67,43,0.48)",
                            lineHeight: 1.58,
                            marginBottom: ((buildInsightContent?.tags?.length ?? 0) > 0 || chipsForHighComplexity.length > 0) ? 10 : 0,
                          }}>
                            Continuing at High locks this complexity into your spec. Adjust the tier above if you want a different execution path.
                          </div>
                        )}

                        {/* LAYER 3: Risk tags + complexity chip count */}
                        {((buildInsightContent?.tags?.length ?? 0) > 0 || chipsForHighComplexity.length > 0) && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            {buildInsightContent?.tags?.map((tag: string) => (
                              <span key={tag} style={{
                                padding: "3px 9px",
                                borderRadius: 999,
                                fontFamily: inter,
                                fontSize: 10,
                                fontWeight: 600,
                                letterSpacing: "0.04em",
                                background: "rgba(67,67,43,0.06)",
                                color: "rgba(67,67,43,0.62)",
                                border: "1px solid rgba(67,67,43,0.12)",
                              }}>
                                {tag}
                              </span>
                            ))}
                            {chipsForHighComplexity.length > 0 && (
                              <span style={{
                                fontFamily: inter,
                                fontSize: 11,
                                color: "rgba(67,67,43,0.42)",
                              }}>
                                {chipsForHighComplexity.length} high-complexity signal{chipsForHighComplexity.length > 1 ? "s" : ""} active
                              </span>
                            )}
                          </div>
                        )}

                        {/* FALLBACK: if both layers are empty */}
                        {!getMaterialConstructionImplication(selectedMaterial?.id, constructionTier) &&
                         !buildInsightContent?.text && (
                          <div style={{
                            fontFamily: inter,
                            fontSize: 13,
                            color: "rgba(67,67,43,0.62)",
                            lineHeight: 1.6,
                          }}>
                            {buildConstructionImplication({
                              materialName: selectedMaterial?.name ?? "",
                              constructionTier: constructionTier ?? "moderate",
                              topChips: (chipSelection?.activatedChips ?? []).slice(0, 2).map((c) => c.label),
                              complexityChipCount: chipsForHighComplexity.length,
                              leadTimeWeeks: selectedMaterial?.lead_time_weeks ?? 12,
                              deliveryWindowWeeks: timelineWeeks ?? 24,
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <button
                            onClick={backToMaterial}
                            style={{ padding: "12px 18px", borderRadius: 999, border: "1px solid rgba(67,67,43,0.14)", background: "transparent", color: "rgba(67,67,43,0.62)", fontFamily: sohne, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                          >
                            ← Back to Material
                          </button>
                          <button
                            onClick={() => {
                              const cat = categories.find(c => c.id === categoryId);
                              setCategory(cat?.name ?? categoryId);
                              setTargetMsrp(targetMSRP);
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
                              setIsRunningAnalysis(true);
                              setLoadingPhase(0);
                              const phaseDelays = [650, 1300, 1950, 2500];
                              phaseDelays.forEach((delay, i) => {
                                setTimeout(() => setLoadingPhase(i + 1), delay);
                              });
                              setTimeout(() => {
                                setIsRunningAnalysis(false);
                                setShowScorecardModal(true);
                              }, 2900);
                            }}
                            disabled={!selectedMaterial || !constructionConfirmed}
                            style={{
                              padding: "12px 18px",
                              borderRadius: 999,
                              border: (selectedMaterial && constructionConfirmed) ? "1px solid rgba(125,150,172,0.34)" : "1px solid rgba(67,67,43,0.10)",
                              background: (selectedMaterial && constructionConfirmed) ? "rgba(125,150,172,0.04)" : "rgba(255,255,255,0.6)",
                              color: (selectedMaterial && constructionConfirmed) ? "rgba(89,112,133,0.92)" : "rgba(67,67,43,0.30)",
                              fontFamily: sohne,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: (selectedMaterial && constructionConfirmed) ? "pointer" : "not-allowed",
                            }}
                          >
                            Continue to Report →
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
            <div style={{ display: "flex", flexDirection: "row", height: "100%", minHeight: 0 }}>
            <aside className="specStudioColumn specStudioRight" style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
          <div className="specStudioSticky" style={{ padding: "36px 28px 44px" }}>
            <section style={{ marginBottom: 30 }}>
              <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A09A", marginBottom: 14 }}>Pulse</div>
              <PulseScoreRow
                dimensionKey="identity"
                label="Identity"
                icon={<IconIdentity color={identityColor} />}
                displayScore={String(dynamicIdentityScore)}
                numericPercent={dynamicIdentityScore}
                scoreColor={identityColor}
                pill={{ variant: identityChipData.variant, label: identityChipData.status }}
                subLabel={identityChipData.consequence}
                whatItMeans="How clearly the piece carries the collection identity."
                howCalculated="Derived from concept alignment, product anchor, and spec continuity."
                isPending={false}
                isExpanded={pulseExpandedRow === "identity"}
                onToggleExpand={() => setPulseExpandedRow(pulseExpandedRow === "identity" ? null : "identity")}
              />
              <PulseScoreRow
                dimensionKey="resonance"
                label="Resonance"
                icon={<IconResonance color={resonanceColor} />}
                displayScore={String(dynamicResonanceScore)}
                numericPercent={dynamicResonanceScore}
                scoreColor={resonanceColor}
                pill={{ variant: resonanceChipData.variant, label: resonanceChipData.status }}
                subLabel={resonanceChipData.consequence}
                whatItMeans="How commercially alive the concept feels in the market."
                howCalculated="Weighted by signal trajectory, concept framing, and product relevance."
                isPending={false}
                isExpanded={pulseExpandedRow === "resonance"}
                onToggleExpand={() => setPulseExpandedRow(pulseExpandedRow === "resonance" ? null : "resonance")}
              />
              <PulseScoreRow
                dimensionKey="execution"
                label="Execution"
                icon={<IconExecution color={executionColor} />}
                displayScore={String(executionScore)}
                numericPercent={executionScore}
                scoreColor={executionColor}
                pill={executionChipData ? { variant: executionChipData.variant, label: executionChipData.status } : null}
                subLabel={executionSubLabel}
                whatItMeans="Whether the concept still holds together under production pressure."
                howCalculated="Based on material, construction, cost, margin pressure, and delivery feasibility."
                isPending={!selectedMaterial}
                isExpanded={pulseExpandedRow === "execution"}
                onToggleExpand={() => setPulseExpandedRow(pulseExpandedRow === "execution" ? null : "execution")}
              />
              {!selectedMaterial && (
                <div style={{ fontFamily: inter, fontSize: 11.5, color: "rgba(67,67,43,0.42)", lineHeight: 1.5, marginTop: 2, marginBottom: 4 }}>
                  Select a material to begin execution analysis.
                </div>
              )}
              {materialSelectionDelta && (
                <div
                  style={{
                    marginTop: 6,
                    marginBottom: 10,
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
            </section>

            {/* Muko's Read — 3-state progressive disclosure */}
            <section style={{ paddingTop: 24, marginBottom: 30, borderTop: "1px solid rgba(67,67,43,0.08)" }}>
              <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A09A", marginBottom: 14 }}>Muko&apos;s Read</div>

              {/* State 0: no material selected */}
              {!selectedMaterial && (
                <>
                  <div style={{ fontFamily: sohne, fontSize: 21, fontWeight: 600, lineHeight: 1.22, color: OLIVE, marginBottom: 0 }}>
                    {mukoRead.headline}
                  </div>
                </>
              )}

              {/* State 1: material selected, construction not confirmed */}
              {selectedMaterial && !hasConstructionSelection && (
                <>
                  {specInsightLoading && !specSynthInsightData && !specStreamingText ? (
                    <>
                      {[84, 68, 92, 58].map((width, index) => (
                        <div key={index} style={{ height: index === 0 ? 18 : 12, borderRadius: 6, background: "rgba(67,67,43,0.07)", marginBottom: index === 0 ? 14 : 8, width: `${width}%`, animation: "pulse 1.4s ease-in-out infinite" }} />
                      ))}
                    </>
                  ) : (
                    <div style={{ fontFamily: sohne, fontSize: 21, fontWeight: 600, lineHeight: 1.22, color: OLIVE, marginBottom: 10 }}>
                      {specStreamingText || mukoRead.headline}
                    </div>
                  )}
                  {!(specInsightLoading && !specSynthInsightData && !specStreamingText) && (
                    <>
                      <MukoStreamingParagraph
                        text={(() => {
                          const text = specSynthInsightData?.statements?.slice(0, 2).join(" ") || mukoRead.body;
                          return text.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
                        })()}
                        streamingText={specStreamingParagraph}
                        isStreaming={specIsParagraphStreaming && !!specStreamingParagraph}
                        containerStyle={{ marginBottom: 16 }}
                        paragraphStyle={{ fontFamily: inter, fontSize: 12.75, color: "rgba(67,67,43,0.58)", lineHeight: 1.72 }}
                      />
                      <button
                        onClick={() => setSpecAnalysisExpanded(e => !e)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: inter, fontSize: 11, fontWeight: 600, color: "#6B7A40" }}
                      >
                        {specAnalysisExpanded ? "Hide analysis" : "See analysis"}
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ transform: specAnalysisExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 180ms ease", flexShrink: 0 }}>
                          <path d="M2 4.5L6 8L10 4.5" stroke="#6B7A40" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {specAnalysisExpanded && (
                        <div style={{ marginTop: 18, borderTop: "1px solid rgba(67,67,43,0.08)", paddingTop: 14 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 8, padding: "7px 0" }}>
                            <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#B8876B", paddingTop: 1, lineHeight: 1.5 }}>
                              Execution Risk
                            </div>
                            <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.65)", lineHeight: 1.55 }}>
                              {getFirstSentence(structuredReadouts[0]?.body ?? "")}
                            </div>
                          </div>
                        </div>
                      )}
                      <div style={{ fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.38)", marginTop: 12, lineHeight: 1.55 }}>
                        Select construction discipline to unlock the full build analysis.
                      </div>
                    </>
                  )}
                </>
              )}

              {/* State 2: both selected */}
              {hasConstructionSelection && (
                <>
                  {specInsightLoading && !specSynthInsightData && !specStreamingText ? (
                    <>
                      {[84, 68, 92, 58].map((width, index) => (
                        <div key={index} style={{ height: index === 0 ? 18 : 12, borderRadius: 6, background: "rgba(67,67,43,0.07)", marginBottom: index === 0 ? 14 : 8, width: `${width}%`, animation: "pulse 1.4s ease-in-out infinite" }} />
                      ))}
                    </>
                  ) : (
                    <div style={{ fontFamily: sohne, fontSize: 21, fontWeight: 600, lineHeight: 1.22, color: OLIVE, marginBottom: 10 }}>
                      {specStreamingText || mukoRead.headline}
                    </div>
                  )}
                  {!(specInsightLoading && !specSynthInsightData && !specStreamingText) && (
                    <>
                      <MukoStreamingParagraph
                        text={(() => {
                          const text = specSynthInsightData?.statements?.slice(0, 2).join(" ") || mukoRead.body;
                          return text.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
                        })()}
                        streamingText={specStreamingParagraph}
                        isStreaming={specIsParagraphStreaming && !!specStreamingParagraph}
                        containerStyle={{ marginBottom: 16 }}
                        paragraphStyle={{ fontFamily: inter, fontSize: 12.75, color: "rgba(67,67,43,0.58)", lineHeight: 1.72 }}
                      />
                      <div style={{ marginTop: 18, borderTop: "1px solid rgba(67,67,43,0.08)", paddingTop: 14 }}>
                        {structuredReadouts.map((item) => (
                          <div key={item.label} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 8, padding: "7px 0" }}>
                            <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#B8876B", paddingTop: 1, lineHeight: 1.5 }}>
                              {item.label}
                            </div>
                            <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.65)", lineHeight: 1.55 }}>
                              {getFirstSentence(item.body)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </section>

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
          height: 100vh;
        }
        .specStudioColumn {
          overflow-y: auto;
        }
        .specStudioLeft {
          width: 320px;
          flex-shrink: 0;
          border-right: 1px solid rgba(67,67,43,0.07);
          min-height: 100vh;
        }
        .specStudioRight {
          background:
            radial-gradient(circle at top left, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0) 34%),
            linear-gradient(180deg, rgba(250,249,246,0.9) 0%, rgba(245,242,235,0.96) 100%);
          position: relative;
          height: 100%;
        }
        .specStudioSticky {
          position: sticky;
          top: 72px;
        }
        .specMaterialGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          column-gap: 10px;
          row-gap: 7px;
        }
        .specRevealSection {
          animation: specReveal 260ms ease-out;
        }
        .specStagePill {
          display: inline-flex;
          align-items: center;
          padding: 5px 11px;
          border-radius: 999px;
          border: 1px solid rgba(67,67,43,0.07);
          background: rgba(255,255,255,0.56);
          color: rgba(67,67,43,0.52);
          font-family: ${inter};
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          animation: specReveal 240ms ease-out;
        }
        .specStagePillActive {
          background: rgba(245,242,235,0.9);
          color: rgba(67,67,43,0.74);
        }
        .specStagePillComplete {
          color: #6B7A40;
          border-color: rgba(168,180,117,0.24);
          background: rgba(255,255,255,0.72);
        }
        .specStageArrow {
          color: rgba(67,67,43,0.28);
          font-size: 13px;
          line-height: 1;
          animation: specReveal 240ms ease-out;
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
        .specConstraintInput::placeholder {
          color: rgba(67,67,43,0.28);
        }
        .specRevealPrompt {
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(255,255,255,0.56);
          border: 1px solid rgba(67,67,43,0.06);
          color: rgba(67,67,43,0.54);
          font-family: ${inter};
          font-size: 12.2px;
          line-height: 1.6;
          animation: specReveal 220ms ease-out;
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
        const phases = ["Scoring identity…", "Calibrating resonance…", "Analyzing execution…", "Finalizing…"];
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
        const mukoScore = Math.round((dynamicIdentityScore + dynamicResonanceScore + executionScore) / 3);
        return (
          <ScorecardModal
            identityScore={dynamicIdentityScore}
            resonanceScore={dynamicResonanceScore}
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
