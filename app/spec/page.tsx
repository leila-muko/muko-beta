"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/store/sessionStore";
import type { ActivatedChip } from "@/lib/store/sessionStore";
import type {
  Material,
  Category,
  ConstructionTier,
  ConceptContext as ConceptContextType,
} from "@/lib/types/spec-studio";
import { calculateCOGS, generateInsight, checkExecutionFeasibility } from "@/lib/spec-studio/calculator";
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
import FloatingMukoOrb from "@/components/FloatingMukoOrb";
import { AESTHETIC_CONTENT } from "@/lib/concept-studio/constants";
import { ResizableSplitPanel } from "@/components/ui/ResizableSplitPanel";
import { PulseScoreRow } from "@/components/ui/PulseScoreRow";
import { MukoInsightSection } from "@/components/ui/MukoInsightSection";
import { PulseChip } from "@/components/ui/PulseChip";
import type { PulseChipProps } from "@/components/ui/PulseChip";
import { InsightPanel } from "@/components/ui/InsightPanel";
import { SuggestionCard } from "@/components/ui/SuggestionCard";
import type { InsightData, SpecInsightMode } from "@/lib/types/insight";
import { buildSpecBlackboard } from "@/lib/synthesizer/assemble";
import { createClient } from "@/lib/supabase/client";
import type { SpecSuggestion } from "@/lib/types/next-move";

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
const ROSE = "#A97B8F";
const CAMEL_COL = "#B8876B";
const PULSE_GREEN = "#4D7A56";
const PULSE_YELLOW = "#9B7A3A";
const PULSE_RED = "#8A3A3A";
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

const MATERIAL_ICONS: Record<string, string> = {
  "organic-cotton": "○",
  tencel: "◎",
  linen: "▽",
  "recycled-poly": "◇",
  "cotton-twill": "□",
  modal: "◈",
  wool: "●",
  "merino-wool": "◉",
  silk: "✦",
  "silk-blend": "✧",
  denim: "▪",
  leather: "◆",
  "vegan-leather": "◇",
  cashmere: "✧",
  nylon: "△",
};

/* ─── Reusable styles ─── */
const scoreTextStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 650,
  color: "rgba(67, 67, 43, 0.62)",
  fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
};


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
    description: "Clean build, minimal detailing",
    note: "Simple seaming, no hardware",
  },
  moderate: {
    label: "Moderate",
    description: "Standard seaming + some detail",
    note: "Category standard",
  },
  high: {
    label: "High",
    description: "Tailoring, hardware, structural detail",
    note: "Complex construction",
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
  return label.toLowerCase().replace(/\s+/g, "-").replace(/[\/&]/g, "-");
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
  return { label: "+ Cost", variant: 'added' };
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

export default function SpecStudioPage() {
  const router = useRouter();
  const { setCategory, setSubcategory: setStoreSubcategory, setTargetMsrp, setMaterial, setSilhouette, setConstructionTier: setStoreTier, setColorPalette, setCurrentStep, setChipSelection, updateExecutionPulse, intentGoals, intentTradeoff, collectionRole: storeCollectionRole } = useSessionStore();
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
  const [pulseUpdated, setPulseUpdated] = useState(false);

  const [hasInitialized, setHasInitialized] = useState(false);

  const [userManuallySelected, setUserManuallySelected] = useState(false);

  const [hoveredMaterialId, setHoveredMaterialId] = useState<string | null>(null);
  const [materialCategory, setMaterialCategory] = useState<string>("all");
  const [hoveredComplexity, setHoveredComplexity] = useState<ConstructionTier | null>(null);
  const [pulseExpandedRow, setPulseExpandedRow] = useState<string | null>(null);
  const [dismissingChips, setDismissingChips] = useState<Set<string>>(new Set());
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);
  const [removedSignals, setRemovedSignals] = useState<import("@/lib/store/sessionStore").ActivatedChip[]>([]);

  const storeAesthetic = useSessionStore((s) => s.aestheticMatchedId);
  const storeModifiers = useSessionStore((s) => s.refinementModifiers);
  const selectedKeyPiece = useSessionStore((s) => s.selectedKeyPiece);
  const storeMoodboard = useSessionStore((s) => s.moodboardImages);
  const chipSelection = useSessionStore((s) => s.chipSelection);
  const conceptSilhouette = useSessionStore((s) => s.conceptSilhouette);
  const conceptPalette = useSessionStore((s) => s.conceptPalette);

  const conceptContext = useMemo<ConceptContextType>(() => {
    if (!storeAesthetic) return FALLBACK_CONCEPT;
    const scores = AESTHETIC_CONTENT[storeAesthetic];
    return {
      aestheticName: storeAesthetic,
      aestheticMatchedId: toSlug(storeAesthetic),
      identityScore: scores?.identityScore ?? 88,
      resonanceScore: scores?.resonanceScore ?? 92,
      moodboardImages: storeMoodboard || [],
      recommendedPalette: [],
    };
  }, [storeAesthetic, storeMoodboard]);

  const refinement = useMemo(() => {
    if (!storeAesthetic) return FALLBACK_REFINEMENT;
    return { base: storeAesthetic, modifiers: [] as string[] };
  }, [storeAesthetic]);
  const brandTargetMargin = 0.60;

  const storeCollectionName = useSessionStore((s) => s.collectionName);
  const storeSeason = useSessionStore((s) => s.season);
  const refinementModifiers = useSessionStore((s) => s.refinementModifiers);

  const [brandProfileName, setBrandProfileName] = useState<string | null>(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('brand_profiles')
        .select('brand_name')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.brand_name) setBrandProfileName(data.brand_name);
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
  // Compute yardage from subcategory base_yardage + silhouette modifier (falls back to category base)
  const conceptYardage = useMemo(() => {
    const base = selectedSubcategory
      ? selectedSubcategory.base_yardage
      : CATEGORY_BASE_YARDAGE[categoryId] ?? 2.5;
    const mod = SILHOUETTE_YARDAGE_MODIFIERS[conceptSilhouette] ?? 0;
    return Math.round((base + mod) * 10) / 10;
  }, [categoryId, conceptSilhouette, selectedSubcategory]);

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
      setOverrideWarning(null);
    }
  };

  const handleComplexityChange = (tier: ConstructionTier) => {
    setConstructionTier(tier);
    setUserManuallySelected(true);
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

  const removeChipSignal = (chipLabel: string) => {
    if (expandedSignal === chipLabel) setExpandedSignal(null);
    setDismissingChips(prev => new Set(prev).add(chipLabel));
    setTimeout(() => {
      if (chipSelection) {
        const removed = chipSelection.activatedChips.find(c => c.label === chipLabel);
        if (removed) setRemovedSignals(prev => [...prev, removed]);
        setChipSelection({
          ...chipSelection,
          activatedChips: chipSelection.activatedChips.filter(c => c.label !== chipLabel),
        });
      }
      setDismissingChips(prev => {
        const next = new Set(prev);
        next.delete(chipLabel);
        return next;
      });
    }, 250);
  };

  const restoreAllSignals = () => {
    if (!chipSelection || removedSignals.length === 0) return;
    const existing = new Set(chipSelection.activatedChips.map(c => c.label));
    const toRestore = removedSignals.filter(c => !existing.has(c.label));
    setChipSelection({
      ...chipSelection,
      activatedChips: [...chipSelection.activatedChips, ...toRestore],
    });
    setRemovedSignals([]);
  };

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

  const baselineMaterial = useMemo(() => {
    const id = recommendedMaterialId || materialId || "";
    return materials.find((m) => m.id === id) || null;
  }, [materials, recommendedMaterialId, materialId]);

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
    if (materialId) setMaterial(materialId);
  }, [materialId, setMaterial]);

  useEffect(() => {
    if (constructionTier) setStoreTier(constructionTier);
  }, [constructionTier, setStoreTier]);

  // Auto-populate from selected key piece when it changes
  useEffect(() => {
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
  const executionScore = (() => {
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

  const timelineBuffer = selectedMaterial
    ? (selectedMaterial.lead_time_weeks ?? 0) <= 6 ? 6
      : (selectedMaterial.lead_time_weeks ?? 0) <= 8 ? 3
      : 1
    : 6;

  const specInsightData = getSpecInsightData(executionScore, marginGatePassed, timelineBuffer);

  // ─── Synthesizer: reactive MUKO INSIGHT (streaming) ──────────────────────
  const specAbortRef = useRef<AbortController | null>(null);
  const [specSynthInsightData, setSpecSynthInsightData] = useState<InsightData | null>(null);
  const [specInsightLoading, setSpecInsightLoading] = useState(false);
  const [specStreamingText, setSpecStreamingText] = useState('');

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
              setSpecStreamingText(prev => {
                const accumulated = prev + chunk;
                // Extract partial margin_read value for display
                const match = accumulated.match(/"margin_read"\s*:\s*"([^"]*)/);
                return match ? match[1] : prev;
              });
            } catch { /* ignore parse errors on partial chunks */ }
          } else if (event === 'complete' || event === 'fallback') {
            try {
              const result = JSON.parse(data) as { data: InsightData; meta: { method: string } };
              if (!controller.signal.aborted) {
                setSpecSynthInsightData(result.data);
                setSpecStreamingText('');
                // Fire-and-forget DB log
                try {
                  const supabase = createClient();
                  supabase.from('analyses').insert({
                    narrative: result.data.statements?.join(' ') ?? '',
                    agent_versions: { synthesizer: result.meta?.method ?? 'unknown' },
                  }).then(() => {});
                } catch { /* fire-and-forget */ }
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
  }, [materialId, constructionTier, categoryId, targetMSRP]);

  // ─── Fix #1: Write execution state to store so report page gets real data ──
  useEffect(() => {
    if (!executionStatus) return;
    updateExecutionPulse({
      status: executionStatus as 'green' | 'yellow' | 'red',
      score: executionScore,
      message: executionChipData?.consequence ?? '',
    });
  }, [executionStatus, executionScore, executionChipData?.consequence]);
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

  /* ─── RENDER ───────────────────────────────────────────────────────────── */
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
          <span style={{ fontFamily: sohne, fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", color: OLIVE }}>muko</span>
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

      {/* ── Two-column body ────────────────────────────────────────────────── */}
      <ResizableSplitPanel
        defaultLeftPercent={60}
        storageKey="muko_spec_splitPanel"
        topOffset={72}
        leftContent={
          <>

          {/* Title */}
          <div style={{ padding: "36px 44px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
            <div>
              <h1 style={{ margin: 0, fontFamily: sohne, fontWeight: 500, fontSize: 28, color: OLIVE, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
                Spec Studio
              </h1>
              <p style={{ margin: "10px 0 0", fontFamily: inter, fontSize: 13, color: "rgba(67,67,43,0.52)", lineHeight: 1.55, maxWidth: 460 }}>
                We translated your concept into a recommended spec. Select your garment type, explore materials and construction — Muko scores every combination in real time.
              </p>
            </div>
            <button
              onClick={() => {
                setMaterialId(recommendedMaterialId);
                setConstructionTier(baselineComplexity);
                setUserManuallySelected(true);
              }}
              style={{
                flexShrink: 0,
                marginTop: 4,
                padding: "7px 16px 7px 12px",
                borderRadius: 999,
                border: "1.5px solid rgba(77,48,47,0.35)",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                transition: "background 200ms ease, border-color 200ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(77,48,47,0.06)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(77,48,47,0.55)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(77,48,47,0.35)";
              }}
            >
              <span
                className="muko-pick-dot"
                style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#A8B475", flexShrink: 0 }}
              />
              <span style={{ fontFamily: sohne, fontSize: 11, fontWeight: 600, color: "#4D302F", whiteSpace: "nowrap", letterSpacing: "0.01em" }}>
                Muko&apos;s Pick
              </span>
            </button>
          </div>

          <div style={{ padding: "0 44px 48px" }}>

          {/* ─── Locked Concept Bar ─── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 18px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.80)",
              border: "1px solid rgba(67,67,43,0.10)",
              boxShadow: "0 2px 12px rgba(67,67,43,0.05)",
              marginBottom: 16,
              gap: 10,
              flexWrap: "wrap" as const,
            }}
          >
            {/* Direction name + key piece + silhouette + palette */}
            <span style={{ fontFamily: sohne, fontSize: 13.5, fontWeight: 500, color: OLIVE, letterSpacing: "-0.01em", flexShrink: 0 }}>
              {refinement.base}
            </span>
            {selectedKeyPiece && (
              <>
                <span style={{ color: "rgba(67,67,43,0.65)", fontSize: 18, fontWeight: 700, lineHeight: 1, letterSpacing: 0 }}>&middot;</span>
                <span style={{ fontFamily: inter, fontSize: 13, fontWeight: 400, color: "rgba(67,67,43,0.52)" }}>
                  {selectedKeyPiece.item}
                </span>
              </>
            )}
            {conceptSilhouette && (
              <>
                <span style={{ color: "rgba(67,67,43,0.65)", fontSize: 18, fontWeight: 700, lineHeight: 1, letterSpacing: 0 }}>&middot;</span>
                <span style={{ fontFamily: inter, fontSize: 13, fontWeight: 400, color: "rgba(67,67,43,0.52)" }}>
                  {conceptSilhouette.charAt(0).toUpperCase() + conceptSilhouette.slice(1)}
                </span>
              </>
            )}
            {conceptPalette && (() => {
              const entry = (aestheticsData as unknown as Array<{ id: string; palette_options?: Array<{ id: string; name: string }> }>).find(
                (a) => a.id === conceptContext.aestheticMatchedId
              );
              const palName = entry?.palette_options?.find((p) => p.id === conceptPalette)?.name ?? conceptPalette;
              return (
                <>
                  <span style={{ color: "rgba(67,67,43,0.65)", fontSize: 18, fontWeight: 700, lineHeight: 1, letterSpacing: 0 }}>&middot;</span>
                  <span style={{ fontFamily: inter, fontSize: 13, fontWeight: 400, color: "rgba(67,67,43,0.52)" }}>
                    {palName}
                  </span>
                </>
              );
            })()}

            {/* Chips — unified style */}
            {chipSelection && chipSelection.activatedChips.length > 0 && (
              <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" as const }}>
                {chipSelection.activatedChips.map((chip) => (
                  <span
                    key={chip.label}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 500,
                      color: STEEL,
                      background: "rgba(125,150,172,0.10)",
                      border: "1px solid rgba(125,150,172,0.28)",
                      fontFamily: inter,
                    }}
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ─── Top Rail ─── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "14px 0",
              marginBottom: 32,
              borderBottom: "1px solid rgba(67, 67, 43, 0.08)",
              overflow: "visible",
            }}
          >
            {/* State 1: Non-custom key piece — no dropdowns needed, context bar above carries it */}
            {selectedKeyPiece && !selectedKeyPiece.custom ? null : selectedKeyPiece && selectedKeyPiece.custom ? (
              /* State 2: Custom piece — Category dropdown only */
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={microLabel}>Category</span>
                <select
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  style={{
                    padding: "8px 28px 8px 12px",
                    borderRadius: 12,
                    width: 130,
                    border: "1px solid rgba(67, 67, 43, 0.12)",
                    background: "rgba(255,255,255,0.78)",
                    fontFamily: inter,
                    fontSize: 14,
                    fontWeight: 500,
                    color: BRAND.oliveInk,
                    cursor: "pointer",
                    outline: "none",
                    boxShadow: "0 10px 26px rgba(67, 67, 43, 0.06)",
                    appearance: "none" as const,
                    backgroundImage:
                      `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2343432B' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' opacity='0.4'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 14px center",
                  }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              /* State 3: No key piece — original dropdowns */
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={microLabel}>Category</span>
                  <select
                    value={categoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    style={{
                      padding: "8px 28px 8px 12px",
                      borderRadius: 12,
                      width: 130,
                      border: "1px solid rgba(67, 67, 43, 0.12)",
                      background: "rgba(255,255,255,0.78)",
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                      fontSize: 14,
                      fontWeight: 500,
                      color: BRAND.oliveInk,
                      cursor: "pointer",
                      outline: "none",
                      boxShadow: "0 10px 26px rgba(67, 67, 43, 0.06)",
                      appearance: "none" as const,
                      backgroundImage:
                        `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2343432B' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' opacity='0.4'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 14px center",
                    }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {categorySubcategories.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={microLabel}>Type</span>
                    <select
                      value={subcategoryId}
                      onChange={(e) => handleSubcategoryChange(e.target.value)}
                      style={{
                        padding: "8px 28px 8px 12px",
                        borderRadius: 12,
                        width: 170,
                        border: "1px solid rgba(67, 67, 43, 0.12)",
                        background: "rgba(255,255,255,0.78)",
                        fontFamily: "var(--font-inter), system-ui, sans-serif",
                        fontSize: 14,
                        fontWeight: 500,
                        color: subcategoryId ? BRAND.oliveInk : "rgba(67, 67, 43, 0.40)",
                        cursor: "pointer",
                        outline: "none",
                        boxShadow: "0 10px 26px rgba(67, 67, 43, 0.06)",
                        appearance: "none" as const,
                        backgroundImage:
                          `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2343432B' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' opacity='0.4'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 14px center",
                      }}
                    >
                      <option value="" disabled>Select type...</option>
                      {categorySubcategories.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* MSRP label + ceiling subtitle */}
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={microLabel}>MSRP</span>
                <span style={{ fontSize: 9, color: "rgba(67,67,43,0.32)", fontFamily: "var(--font-inter), system-ui, sans-serif", letterSpacing: "0.02em" }}>
                  Ceiling: ${marginCeiling}
                </span>
              </div>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 14,
                    color: "rgba(67, 67, 43, 0.45)",
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  value={targetMSRP}
                  onChange={(e) => setTargetMSRP(Number(e.target.value))}
                  style={{
                    padding: "8px 12px 8px 26px",
                    borderRadius: 12,
                    width: 105,
                    border: "1px solid rgba(67, 67, 43, 0.12)",
                    background: "rgba(255,255,255,0.78)",
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    color: BRAND.oliveInk,
                    outline: "none",
                    boxShadow: "0 10px 26px rgba(67, 67, 43, 0.06)",
                  }}
                />
              </div>

              {/* Delivery label + required subtitle */}
              <div style={{ display: "flex", flexDirection: "column", gap: 1, marginLeft: 8 }}>
                <span style={microLabel}>Delivery</span>
                <span style={{ fontSize: 9, fontFamily: "var(--font-inter), system-ui, sans-serif", letterSpacing: "0.02em", color: timelineFeasibility ? (timelineStatus === 'red' ? '#8A3A3A' : timelineStatus === 'yellow' ? BRAND.camel : "rgba(67,67,43,0.32)") : "rgba(67,67,43,0.32)" }}>
                  {timelineFeasibility ? `${timelineFeasibility.required_weeks}wk required` : "\u00a0"}
                </span>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  min={4}
                  max={52}
                  value={timelineWeeks}
                  onChange={(e) => setTimelineWeeks(Math.max(4, Number(e.target.value)))}
                  style={{
                    padding: "8px 36px 8px 12px",
                    borderRadius: 12,
                    width: 88,
                    border: `1px solid ${
                      timelineStatus === 'red' ? 'rgba(138, 58, 58, 0.35)' :
                      timelineStatus === 'yellow' ? 'rgba(184, 135, 107, 0.35)' :
                      'rgba(67, 67, 43, 0.12)'
                    }`,
                    background: "rgba(255,255,255,0.78)",
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    color: BRAND.oliveInk,
                    outline: "none",
                    boxShadow: "0 10px 26px rgba(67, 67, 43, 0.06)",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 11,
                    color: "rgba(67, 67, 43, 0.4)",
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    pointerEvents: "none",
                  }}
                >
                  wks
                </span>
              </div>
            </div>

          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
              {/* Material */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <div style={sectionHeading}>Material</div>
                  <span
                    style={{
                      fontSize: 11,
                      color: "rgba(67, 67, 43, 0.35)",
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                    }}
                  >
                    Industry benchmark pricing
                  </span>
                </div>

                {/* Category filter strip */}
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  {(["all", "natural", "luxury", "synthetic", "deadstock"] as const).map((cat) => {
                    const isActive = materialCategory === cat;
                    const label = cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1);
                    const meta = cat !== "all" ? CATEGORY_META[cat] : null;
                    return (
                      <button
                        key={cat}
                        onClick={() => setMaterialCategory(cat)}
                        style={{
                          padding: "4px 11px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: isActive ? 600 : 400,
                          fontFamily: inter,
                          cursor: "pointer",
                          outline: "none",
                          transition: "all 150ms ease",
                          border: isActive
                            ? cat === "all"
                              ? "1.5px solid #D4CFC8"
                              : `1.5px solid ${meta!.badgeBorder}`
                            : "1.5px solid #E8E3D6",
                          background: isActive
                            ? cat === "all"
                              ? "#F0EDE8"
                              : meta!.badgeBg
                            : "transparent",
                          color: isActive
                            ? cat === "all"
                              ? "#4D302F"
                              : meta!.badgeColor
                            : "#A8A09A",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Selected material detail panel */}
                {selectedMaterial && (
                  <div
                    style={{
                      marginBottom: 12,
                      padding: "12px 14px",
                      background: "#FFFFFF",
                      border: "1px solid #E8E3D6",
                      borderRadius: 10,
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    {/* Mini swatch */}
                    <div
                      style={{
                        flexShrink: 0,
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: MATERIAL_SWATCH_BG[selectedMaterial.id] || "#D0C8B8",
                        border: "1px solid rgba(0,0,0,0.06)",
                      }}
                    />
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: "#191919", fontFamily: inter }}>
                          {selectedMaterial.name}
                        </span>
                        {(() => {
                          const c = MATERIAL_CATEGORY_MAP[selectedMaterial.id] || "natural";
                          const m = CATEGORY_META[c];
                          return (
                            <span
                              style={{
                                fontSize: 9.5,
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase" as const,
                                color: m.badgeColor,
                                background: m.badgeBg,
                                border: `1px solid ${m.badgeBorder}`,
                                borderRadius: 4,
                                padding: "1px 5px",
                                fontFamily: inter,
                              }}
                            >
                              {c}
                            </span>
                          );
                        })()}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: "#6B6560",
                          lineHeight: 1.65,
                          fontFamily: inter,
                          marginBottom: 4,
                        }}
                      >
                        {MATERIAL_DESCRIPTIONS[selectedMaterial.id] ||
                          "Shifts weight, drape, and finish — this choice will quietly define the piece's tone."}
                      </div>
                      <div style={{ fontFamily: inter }}>
                        <span style={{ fontSize: 12, color: "#4D302F", fontWeight: 600 }}>
                          ${selectedMaterial.cost_per_yard}/yd
                        </span>
                        <span style={{ color: "#D4CFC8", margin: "0 5px" }}>·</span>
                        <span style={{ fontSize: 12, color: "#A8A09A" }}>{selectedMaterial.lead_time_weeks}wk lead</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Swatch grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {materials
                    .filter((mat) => materialCategory === "all" || MATERIAL_CATEGORY_MAP[mat.id] === materialCategory)
                    .map((mat) => {
                      const isSel = materialId === mat.id;
                      const isRedirectMat = selectedKeyPiece?.redirect_material_id === mat.id && insight?.type === "warning";
                      const cat = MATERIAL_CATEGORY_MAP[mat.id] || "natural";
                      const meta = CATEGORY_META[cat];
                      const swatchBg = MATERIAL_SWATCH_BG[mat.id] || "#D0C8B8";
                      return (
                        <button
                          key={mat.id}
                          onClick={() => { if (!isSel) { setMaterialId(mat.id); setUserManuallySelected(true); } }}
                          style={{
                            padding: 0,
                            border: isSel ? "2px solid #A8B475" : "2px solid transparent",
                            borderRadius: 10,
                            overflow: "hidden",
                            boxShadow: isSel ? "0 0 0 3px rgba(168,180,117,0.13)" : "none",
                            cursor: "pointer",
                            outline: "none",
                            textAlign: "left",
                            background: "none",
                            transition: "all 150ms ease",
                          }}
                        >
                          {/* Texture swatch */}
                          <div
                            style={{
                              position: "relative",
                              height: 72,
                              background: swatchBg,
                              borderRadius: "8px 8px 0 0",
                            }}
                          >
                            {/* Category dot */}
                            <div
                              style={{
                                position: "absolute",
                                top: 6,
                                right: 6,
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                background: meta.dotColor,
                                opacity: 0.7,
                              }}
                            />
                            {/* Selected overlay + checkmark */}
                            {isSel && (
                              <div
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  background: "rgba(168,180,117,0.15)",
                                  borderRadius: "8px 8px 0 0",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <div
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: "50%",
                                    background: "#A8B475",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <span style={{ color: "#fff", fontSize: 11, fontWeight: 800, lineHeight: 1 }}>✓</span>
                                </div>
                              </div>
                            )}
                            {/* Cost alternative badge */}
                            {isRedirectMat && (
                              <div style={{ position: "absolute", bottom: 4, left: 4 }}>
                                <span
                                  style={{
                                    padding: "1px 5px",
                                    borderRadius: 3,
                                    fontSize: 8,
                                    fontWeight: 700,
                                    letterSpacing: "0.10em",
                                    textTransform: "uppercase" as const,
                                    background: "rgba(67,67,43,0.08)",
                                    color: "rgba(67,67,43,0.5)",
                                    fontFamily: inter,
                                  }}
                                >
                                  ALT
                                </span>
                              </div>
                            )}
                          </div>
                          {/* Label area */}
                          <div
                            style={{
                              padding: "7px 8px 8px",
                              background: isSel ? "rgba(168,180,117,0.031)" : "#FFFFFF",
                              borderTop: isSel ? "1px solid rgba(168,180,117,0.188)" : "1px solid #F0EDE8",
                              borderRadius: "0 0 8px 8px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#191919",
                                lineHeight: 1.3,
                                fontFamily: inter,
                              }}
                            >
                              {mat.name}
                            </div>
                            <div style={{ marginTop: 2, fontFamily: inter }}>
                              <span style={{ fontSize: 11, color: "#6B6560" }}>${mat.cost_per_yard}/yd</span>
                              <span style={{ color: "#D4CFC8", margin: "0 3px" }}>·</span>
                              <span style={{ fontSize: 10.5, color: "#A8A09A" }}>{mat.lead_time_weeks}wk</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>

              </div>

              {/* Complexity */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionHeading}>Complexity</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 650,
                      color: CHARTREUSE,
                      background: "rgba(171,171,99,0.10)",
                      border: "1px solid rgba(171,171,99,0.18)",
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                    }}
                  >
                    Default: {CONSTRUCTION_INFO[getSmartDefault(categoryId, conceptSilhouette || undefined)].label}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  {(["low", "moderate", "high"] as ConstructionTier[]).map((tier) => {
                    const info = COMPLEXITY_CONTEXT[tier];
                    const isSel = constructionTier === tier;
                    const isRec = tier === baselineComplexity;
                    const isHover = hoveredComplexity === tier;
                    const deltas = scoreComplexityDeltas(tier);
                    const matchingChips = tier === "high" ? chipsForHighComplexity : [];

                    return (
                      <button
                        key={tier}
                        onClick={() => handleComplexityChange(tier)}
                        onMouseEnter={() => setHoveredComplexity(tier)}
                        onMouseLeave={() => setHoveredComplexity(null)}
                        style={{
                          flex: 1,
                          textAlign: "left",
                          borderRadius: 14,
                          padding: "16px 14px 14px",
                          background: isSel ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.55)",
                          border: isSel
                            ? `1.5px solid ${CHARTREUSE}`
                            : isRec && !isSel
                              ? "1.5px solid rgba(169,123,143,0.35)"
                              : "1px solid rgba(67,67,43,0.10)",
                          boxShadow: isSel
                            ? "0 14px 40px rgba(67,67,43,0.10)"
                            : "0 8px 24px rgba(67,67,43,0.05)",
                          cursor: "pointer",
                          outline: "none",
                          transition: "all 200ms ease",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 10,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 650,
                                color: OLIVE,
                                fontFamily: sohne,
                              }}
                            >
                              {info.label}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "rgba(67,67,43,0.38)",
                                fontFamily: inter,
                                marginTop: 4,
                                lineHeight: 1.4,
                              }}
                            >
                              {info.description}
                            </div>
                          </div>

                          {isHover && !isSel ? (
                            compactDeltaCluster({
                              deltas: { ...deltas, identity: 0 },
                              isHoverOrActive: true,
                              isRecommended: isRec,
                            })
                          ) : !isSel ? (
                            aggregateDeltaDot({ deltas: { ...deltas, identity: 0 } })
                          ) : null}
                        </div>

                        <div
                          style={{
                            fontSize: 10,
                            marginTop: 10,
                            padding: "3px 8px",
                            borderRadius: 999,
                            display: "inline-block",
                            color: "rgba(67,67,43,0.45)",
                            background: "rgba(67,67,43,0.04)",
                            fontFamily: "var(--font-inter), system-ui, sans-serif",
                            fontWeight: 600,
                          }}
                        >
                          {info.note}
                        </div>

                        {matchingChips.length > 0 && (
                          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {matchingChips.map((chip) => (
                              <span
                                key={chip.label}
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: 999,
                                  fontSize: 10,
                                  fontWeight: 550,
                                  color: STEEL,
                                  background: "rgba(125,150,172,0.10)",
                                  border: "1px solid rgba(125,150,172,0.28)",
                                  fontFamily: inter,
                                }}
                              >
                                {chip.label}
                              </span>
                            ))}
                          </div>
                        )}

                        {(isHover || isSel) && (
                          <div style={{ marginTop: 10 }}>
                            <div
                              style={{
                                fontSize: 12,
                                lineHeight: 1.5,
                                color: "rgba(67,67,43,0.70)",
                                fontFamily: "var(--font-inter), system-ui, sans-serif",
                              }}
                            >
                              {COMPLEXITY_DESCRIPTIONS[tier].hover}
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>


                {overrideWarning && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: "rgba(184,135,107,0.08)",
                      border: "1px solid rgba(184,135,107,0.22)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      animation: "fadeIn 300ms ease-out",
                    }}
                  >
                    <span style={{ fontSize: 13, color: BRAND.camel }}>⚠</span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "rgba(67,67,43,0.65)",
                        fontFamily: "var(--font-inter), system-ui, sans-serif",
                      }}
                    >
                      {overrideWarning}
                    </span>
                  </div>
                )}
              </div>

              {/* Construction Implications — inline sub-section of Complexity */}
              <div id="construction-section">
                {/* Section heading */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ ...sectionHeading, color: "rgba(67,67,43,0.35)", fontWeight: 500 }}>Complexity</span>
                  <span style={{ ...sectionHeading, color: "rgba(67,67,43,0.22)", fontSize: 14, fontWeight: 400 }}>|</span>
                  <span style={sectionHeading}>Construction Implications</span>
                </div>
                <div style={{
                  fontFamily: inter,
                  fontSize: 12,
                  fontStyle: "italic",
                  color: "rgba(67,67,43,0.42)",
                  marginBottom: 16,
                }}>
                  Construction implications for your active signals. Click a row to expand.
                </div>

                {/* Strip container */}
                <div style={{
                  background: "rgba(255,255,255,0.55)",
                  border: "1px solid rgba(67,67,43,0.08)",
                  borderRadius: 12,
                  backdropFilter: "blur(4px)",
                  overflow: "hidden",
                }}>
                  {activeImplications.length === 0 ? (
                    <div style={{
                      padding: "28px 24px",
                      textAlign: "center",
                      fontFamily: inter,
                      fontSize: 13,
                      color: "#b0a898",
                      fontStyle: "italic",
                    }}>
                      No active signals. Add aesthetic chips above to see construction implications.
                    </div>
                  ) : (
                    activeImplications.map((s, i) => {
                      const isDismissing = dismissingChips.has(s.chip);
                      const isExpanded = expandedSignal === s.chip;
                      const costBadge = parseCostBadge(s.cost_note);
                      const risk = parseRiskLevel(s.complexity_flag);
                      const instruction = getFirstSentence(s.detail);

                      const riskStyle: React.CSSProperties =
                        risk === 'High'
                          ? { color: "#9a4a2a", background: "rgba(184,135,107,0.12)", border: "1px solid rgba(184,135,107,0.3)" }
                          : risk === 'Med'
                          ? { color: "#9a7820", background: "rgba(230,192,104,0.12)", border: "1px solid rgba(230,192,104,0.3)" }
                          : { color: "#6b7a35", background: "rgba(168,180,117,0.12)", border: "1px solid rgba(168,180,117,0.3)" };

                      const costStyle: React.CSSProperties =
                        costBadge.variant === 'neutral'
                          ? { color: "#8a8478", background: "rgba(180,172,160,0.1)", border: "1px solid rgba(180,172,160,0.2)" }
                          : { color: "#9a6845", background: "rgba(184,135,107,0.1)", border: "1px solid rgba(184,135,107,0.25)" };

                      return (
                        <div
                          key={s.chip}
                          style={{
                            opacity: isDismissing ? 0 : 1,
                            transform: isDismissing ? "translateY(-4px)" : "translateY(0)",
                            transition: "opacity 250ms ease, transform 250ms ease",
                            borderTop: i > 0 ? "1px solid rgba(200,194,182,0.3)" : undefined,
                          }}
                        >
                          {/* Collapsed row */}
                          <div
                            onClick={() => setExpandedSignal(isExpanded ? null : s.chip)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "14px 20px",
                              cursor: "pointer",
                              background: isExpanded ? "rgba(168,180,117,0.04)" : "transparent",
                              transition: "background 150ms ease",
                            }}
                          >
                            {/* Expand arrow */}
                            <span style={{
                              fontSize: 14,
                              color: isExpanded ? CHARTREUSE : "rgba(200,192,182,0.8)",
                              flexShrink: 0,
                              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                              transition: "transform 180ms ease, color 150ms ease",
                              display: "inline-block",
                              lineHeight: 1,
                              fontWeight: 300,
                            }}>
                              ›
                            </span>

                            {/* Chip pill */}
                            <span style={{
                              padding: "3px 10px",
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 500,
                              fontFamily: inter,
                              background: "rgba(125,150,172,0.1)",
                              border: "1px solid rgba(125,150,172,0.2)",
                              color: "#7D96AC",
                              flexShrink: 0,
                              whiteSpace: "nowrap" as const,
                            }}>
                              {s.chip}
                            </span>

                            {/* Instruction text */}
                            <span style={{
                              fontFamily: inter,
                              fontSize: 13,
                              color: "#3a3830",
                              flex: 1,
                              lineHeight: 1.4,
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: isExpanded ? "normal" : "nowrap" as const,
                            }}>
                              {instruction}
                            </span>

                            {/* Cost badge */}
                            <span style={{
                              fontFamily: inter,
                              fontSize: 11,
                              fontWeight: 500,
                              borderRadius: 4,
                              padding: "2px 7px",
                              flexShrink: 0,
                              whiteSpace: "nowrap" as const,
                              ...costStyle,
                            }}>
                              {costBadge.label}
                            </span>

                            {/* Risk badge */}
                            <span style={{
                              fontFamily: inter,
                              fontSize: 11,
                              fontWeight: 500,
                              borderRadius: 4,
                              padding: "2px 7px",
                              flexShrink: 0,
                              whiteSpace: "nowrap" as const,
                              ...riskStyle,
                            }}>
                              {risk} risk
                            </span>

                            {/* Remove × */}
                            <button
                              onClick={(e) => { e.stopPropagation(); removeChipSignal(s.chip); }}
                              style={{
                                fontSize: 12,
                                color: "#c8c0b4",
                                background: "transparent",
                                border: "1px solid rgba(200,194,182,0.5)",
                                borderRadius: "50%",
                                cursor: "pointer",
                                flexShrink: 0,
                                width: 18,
                                height: 18,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                lineHeight: "1",
                                padding: "0 0 1px 0",
                                transition: "color 150ms ease, border-color 150ms ease",
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.color = CAMEL_COL;
                                e.currentTarget.style.borderColor = "rgba(184,135,107,0.5)";
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.color = "#c8c0b4";
                                e.currentTarget.style.borderColor = "rgba(200,194,182,0.5)";
                              }}
                              aria-label={`Remove ${s.chip} signal`}
                            >
                              ×
                            </button>
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div style={{
                              paddingLeft: 44,
                              paddingRight: 24,
                              paddingBottom: 18,
                              paddingTop: 14,
                              background: "rgba(168,180,117,0.03)",
                              borderTop: "1px solid rgba(200,194,182,0.2)",
                            }}>
                              {/* Full spec paragraph */}
                              <div style={{
                                fontFamily: inter,
                                fontSize: 13,
                                color: "#5a5650",
                                lineHeight: 1.7,
                                marginBottom: 14,
                              }}>
                                {s.detail}
                              </div>

                              {(s.cost_note || s.avoid) && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  {s.cost_note && (
                                    <div style={{ display: "flex", gap: 0, alignItems: "flex-start" }}>
                                      <span style={{
                                        fontFamily: inter, fontSize: 9, fontWeight: 700,
                                        letterSpacing: "0.10em", textTransform: "uppercase" as const,
                                        color: CHARTREUSE, flexShrink: 0, lineHeight: 1.8,
                                        width: 44,
                                      }}>COST</span>
                                      <span style={{ fontFamily: inter, fontSize: 12, color: "#8a8478", lineHeight: 1.7 }}>
                                        {s.cost_note}
                                      </span>
                                    </div>
                                  )}
                                  {s.avoid && (
                                    <div style={{ display: "flex", gap: 0, alignItems: "flex-start" }}>
                                      <span style={{
                                        fontFamily: inter, fontSize: 9, fontWeight: 700,
                                        letterSpacing: "0.10em", textTransform: "uppercase" as const,
                                        color: CAMEL_COL, flexShrink: 0, lineHeight: 1.8,
                                        width: 44,
                                      }}>AVOID</span>
                                      <span style={{ fontFamily: inter, fontSize: 12, color: "#8a8478", lineHeight: 1.7 }}>
                                        {s.avoid}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Restore bar */}
                {removedSignals.length > 0 && (
                  <div style={{
                    marginTop: 8,
                    fontFamily: inter,
                    fontSize: 11,
                    color: "rgba(67,67,43,0.45)",
                  }}>
                    {removedSignals.length} signal{removedSignals.length !== 1 ? "s" : ""} removed
                    {" · "}
                    <button
                      onClick={restoreAllSignals}
                      style={{
                        fontFamily: inter,
                        fontSize: 11,
                        color: STEEL,
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Restore all
                    </button>
                  </div>
                )}
              </div>

          </div>{/* end sections */}

          <style>{`
            @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes continueReady { 0% { transform: translateY(4px); opacity: 0.6; } 100% { transform: translateY(0); opacity: 1; } }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
          `}</style>

        </div>{/* end left content padding */}
          </>
        }
        rightContent={
        <>
        <div style={{ padding: "36px 36px 0" }}>
          {/* Pulse Rail — slim strip */}
          <div style={{ marginBottom: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#A8A09A", fontFamily: inter, marginBottom: 14 }}>Pulse</div>
            <PulseScoreRow
              dimensionKey="identity"
              label="Identity"
              icon={<IconIdentity size={14} />}
              displayScore={`${dynamicIdentityScore}`}
              numericPercent={dynamicIdentityScore}
              scoreColor={identityColor}
              pill={identityChipData ? { variant: identityChipData.variant, label: identityChipData.status } : null}
              subLabel="Locked from Concept"
              whatItMeans="Identity measures how well your material, silhouette, palette, and construction choices reinforce the locked direction's brand signals."
              howCalculated="Delta scoring against your locked aesthetic — each spec choice adds or subtracts from the base concept identity score."
              isPending={false}
              variant="strip"
            />
            <PulseScoreRow
              dimensionKey="resonance"
              label="Resonance"
              icon={<IconResonance size={14} />}
              displayScore={`${dynamicResonanceScore}`}
              numericPercent={dynamicResonanceScore}
              scoreColor={resonanceColor}
              pill={resonanceChipData ? { variant: resonanceChipData.variant, label: resonanceChipData.status } : null}
              subLabel="Locked from Concept"
              whatItMeans="Resonance measures whether your choices are commercially timed — does the market appetite exist for this spec combination right now?"
              howCalculated="Material trend alignment + silhouette saturation score, weighted against your direction's velocity data."
              isPending={false}
              variant="strip"
            />
            <PulseScoreRow
              dimensionKey="execution"
              label="Execution"
              icon={<IconExecution size={14} />}
              displayScore={!insight ? "—" : `$${insight.cogs}`}
              numericPercent={!insight ? 0 : Math.min((insight.cogs / insight.ceiling) * 100, 100)}
              scoreColor={executionColor}
              pill={executionChipData ? { variant: executionChipData.variant, label: executionChipData.status } : null}
              subLabel={executionChipData?.consequence ?? null}
              whatItMeans="Execution measures cost feasibility — whether your build is viable at the target margin. COGS is calculated from material cost × yardage + complexity multiplier."
              howCalculated="COGS vs margin ceiling: green if under, amber within 5%, red if over. Lead time scored separately against season deadline."
              isPending={!insight}
              variant="strip"
            />
            {activeImplications.length > 0 && (
              <button
                onClick={() => document.getElementById("construction-section")?.scrollIntoView({ behavior: "smooth" })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  marginTop: 10,
                  padding: "10px 14px",
                  background: "rgba(184,135,107,0.08)",
                  border: "1px solid rgba(184,135,107,0.25)",
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontFamily: inter, fontSize: 12, fontWeight: 500, color: "#9a6845" }}>
                  ⚠ {activeImplications.length} construction signal{activeImplications.length !== 1 ? "s" : ""} flagged
                </span>
                <span style={{ fontFamily: inter, fontSize: 11, color: CAMEL_COL, flexShrink: 0 }}>
                  See below ↓
                </span>
              </button>
            )}
          </div>

          {/* Major section divider */}
          <div style={{ height: 1, background: "#E8E3D6", margin: "20px 0 24px" }} />

          {/* Muko Insight */}
          {!userManuallySelected ? (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A09A", marginBottom: 14 }}>
                Insight
              </div>
              <p style={{ margin: 0, fontFamily: inter, fontSize: 13.5, color: "rgba(67,67,43,0.42)", fontStyle: "italic", lineHeight: 1.6 }}>
                Select a material to see Muko&apos;s insight
              </p>
            </div>
          ) : specInsightLoading && !specSynthInsightData && !specStreamingText ? (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A09A", marginBottom: 14 }}>
                Insight
              </div>
              {/* Skeleton — shown only before first streaming chunk arrives */}
              {[80, 60, 90, 55].map((w, i) => (
                <div key={i} style={{ height: i === 0 ? 18 : 12, borderRadius: 6, background: "rgba(67,67,43,0.07)", marginBottom: i === 0 ? 14 : 8, width: `${w}%`, animation: "pulse 1.4s ease-in-out infinite" }} />
              ))}
            </div>
          ) : (
            <MukoInsightSection
              headline={specSynthInsightData?.statements[0] ?? specInsightContent.headline}
              paragraphs={
                specSynthInsightData
                  ? [specSynthInsightData.statements[1] ?? '', specSynthInsightData.statements[2] ?? ''].filter(Boolean)
                  : [specInsightContent.p1, specInsightContent.p2, specInsightContent.p3]
              }
              bullets={{
                label: specSynthInsightData?.editLabel ?? 'BUILD REALITY',
                items: specSynthInsightData?.edit ?? specInsightContent.opportunity,
              }}
              mode={specSynthInsightData?.mode}
              isStreaming={specInsightLoading && !!specStreamingText}
              streamingText={specStreamingText}
              pageMode="concept"
              nextMove={{
                mode: "spec",
                suggestions: mukoSynthesis?.suggestions ?? [],
                subtitle: insight && insight.cogs > insight.ceiling
                  ? "Adjustments that improve feasibility without changing your direction."
                  : "Ways to invest your margin headroom and elevate the piece.",
                appliedIds: appliedSuggestions,
                onApply: (id) => applySuggestion(id, mukoSynthesis?.suggestions ?? []),
                onUndo: undoSuggestion,
              }}
            />
          )}

          {/* Spacer for sticky footer */}
          <div style={{ height: 72 }} />
        </div>

        {/* Sticky CTA */}
        <div style={{ position: "sticky", bottom: 0, padding: "0 36px 24px", background: "linear-gradient(to bottom, rgba(250,249,246,0) 0%, rgba(250,249,246,0.92) 16%, rgba(250,249,246,1) 100%)", paddingTop: 20, zIndex: 10 }}>
          <button
            disabled={!isComplete}
            onClick={() => {
              if (!isComplete) return;
              const cat = categories.find(c => c.id === categoryId);
              setCategory(cat?.name ?? categoryId);
              setTargetMsrp(targetMSRP);
              setMaterial(materialId);
              setSilhouette(conceptSilhouette ? conceptSilhouette.charAt(0).toUpperCase() + conceptSilhouette.slice(1) : '');
              setStoreTier(constructionTier!);
              // Palette from concept or spec selection
              if (conceptPalette) {
                const entry = (aestheticsData as unknown as Array<{ id: string; palette_options?: Array<{ id: string; name: string; swatches: string[] }> }>).find(
                  (a) => a.id === conceptContext.aestheticMatchedId
                );
                const palOption = entry?.palette_options?.find((p) => p.id === conceptPalette);
                if (palOption) {
                  setColorPalette(palOption.swatches, palOption.name);
                }
              }
              setCurrentStep(4);
              router.push("/report");
            }}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: sohne,
              letterSpacing: "0.02em",
              color: isComplete ? STEEL : "rgba(67,67,43,0.30)",
              background: isComplete ? "rgba(125,150,172,0.07)" : "rgba(255,255,255,0.46)",
              border: isComplete ? `1.5px solid ${STEEL}` : "1.5px solid rgba(67,67,43,0.10)",
              cursor: isComplete ? "pointer" : "not-allowed",
              transition: "all 280ms ease",
              opacity: isComplete ? 1 : 0.65,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              animation: isComplete ? "continueReady 600ms ease-out 1" : "none",
            }}
          >
            <span>Run Muko Analysis</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition: "transform 280ms ease", transform: isComplete ? "translateX(0)" : "translateX(-2px)", opacity: isComplete ? 1 : 0.4 }}>
              <path d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        </>
        }
      />

      {/* ═══ FLOATING MUKO ORB ═══ */}
      <FloatingMukoOrb
        step="spec"
        context={{
          aesthetic: conceptContext.aestheticMatchedId,
          refinement,
          identityScore: conceptContext.identityScore,
          resonanceScore: conceptContext.resonanceScore,
          material: selectedMaterial?.name,
          silhouette: conceptSilhouette ? conceptSilhouette.charAt(0).toUpperCase() + conceptSilhouette.slice(1) : undefined,
          category: categoryId,
        }}
        conceptName={conceptContext.aestheticName || undefined}
        identityScore={conceptContext.identityScore}
        resonanceScore={conceptContext.resonanceScore}
      />
    </div>
  );
}
