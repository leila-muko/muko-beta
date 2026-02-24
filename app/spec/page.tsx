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
import { calculateCOGS, generateInsight } from "@/lib/spec-studio/calculator";
import { findAlternativeMaterial } from "@/lib/spec-studio/material-matcher";
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
import AskMuko from "@/components/AskMuko";
import { AESTHETIC_CONTENT } from "@/lib/concept-studio/constants";
import { ResizableSplitPanel } from "@/components/ui/ResizableSplitPanel";
import { PulseScoreRow } from "@/components/ui/PulseScoreRow";
import { MukoInsightSection } from "@/components/ui/MukoInsightSection";
import { PulseChip } from "@/components/ui/PulseChip";
import type { PulseChipProps } from "@/components/ui/PulseChip";
import { InsightPanel } from "@/components/ui/InsightPanel";
import { SuggestionCard } from "@/components/ui/SuggestionCard";
import type { InsightData, SpecInsightMode } from "@/lib/types/insight";
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

export default function SpecStudioPage() {
  const router = useRouter();
  const { setCategory, setSubcategory: setStoreSubcategory, setTargetMsrp, setMaterial, setSilhouette, setConstructionTier: setStoreTier, setColorPalette, setCurrentStep, setChipSelection } = useSessionStore();
  const categories: Category[] = categoriesData.categories as unknown as Category[];
  const materials: Material[] = materialsData as unknown as Material[];
  const allSubcategories = subcategoriesData as Record<string, SubcategoryEntry[]>;

  const [categoryId, setCategoryId] = useState(categories[0].id);
  const [subcategoryId, setSubcategoryId] = useState("");
  const [targetMSRP, setTargetMSRP] = useState(450);
  const [materialId, setMaterialId] = useState("");
  const [constructionTier, setConstructionTier] = useState<ConstructionTier | null>(null);
  const [overrideWarning, setOverrideWarning] = useState<string | null>(null);
  const [pulseUpdated, setPulseUpdated] = useState(false);

  const [hasInitialized, setHasInitialized] = useState(false);

  const [userManuallySelected, setUserManuallySelected] = useState(false);

  const [hoveredMaterialId, setHoveredMaterialId] = useState<string | null>(null);
  const [hoveredComplexity, setHoveredComplexity] = useState<ConstructionTier | null>(null);
  const [pulseExpandedRow, setPulseExpandedRow] = useState<string | null>(null);

  const storeAesthetic = useSessionStore((s) => s.aestheticMatchedId);
  const storeModifiers = useSessionStore((s) => s.refinementModifiers);
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
    () => (selectedMaterial ? findAlternativeMaterial(selectedMaterial, materials) : null),
    [selectedMaterial, materials]
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

  useEffect(() => {
    if (insight) {
      setPulseUpdated(true);
      const t = setTimeout(() => setPulseUpdated(false), 1200);
      return () => clearTimeout(t);
    }
  }, [insight?.cogs, insight?.type]);

  const executionStatus = !insight
    ? null
    : insight.type === "warning"
      ? "red"
      : insight.type === "viable"
        ? "yellow"
        : "green";

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

    return clamp(
      baseScore + materialDelta + complexityDelta,
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
  ]);

  const dynamicResonanceScore = useMemo(() => {
    if (!selectedMaterial) return conceptContext.resonanceScore;

    const baseScore = conceptContext.resonanceScore;
    const materialDelta = selectedMaterial ? scoreMaterialDeltas(selectedMaterial).resonance : 0;
    const complexityDelta = constructionTier ? scoreComplexityDeltas(constructionTier).resonance : 0;

    return clamp(
      baseScore + materialDelta + complexityDelta,
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

  const executionChipData: PulseChipProps | null = overrideWarning
    ? { variant: "amber", status: "Complexity mismatch", consequence: overrideWarning.split(".")[0] }
    : executionStatus === "green"
      ? { variant: "green", status: "Feasible", consequence: "Good margin headroom" }
      : executionStatus === "yellow"
        ? { variant: "amber", status: "Tight margin", consequence: "Reduce complexity" }
        : executionStatus === "red"
          ? { variant: "red", status: "Not feasible", consequence: "Adjust specs to proceed" }
          : null;
  // ─────────────────────────────────────────────────────────────────────────

  const executionScore =
    executionStatus === "green" ? 80
    : executionStatus === "yellow" ? 55
    : executionStatus === "red" ? 40
    : 0;

  const marginGatePassed = !insight || insight.type !== "warning";

  const timelineBuffer = selectedMaterial
    ? (selectedMaterial.lead_time_weeks ?? 0) <= 6 ? 6
      : (selectedMaterial.lead_time_weeks ?? 0) <= 8 ? 3
      : 1
    : 6;

  const specInsightData = getSpecInsightData(executionScore, marginGatePassed, timelineBuffer);

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

    // Palette is locked from Concept Studio — no palette suggestions

    const headline =
      overBy > 0
        ? `$${cogs} estimated COGS — $${overBy} over your $${ceiling} ceiling`
        : `$${cogs} estimated COGS — within your $${ceiling} ceiling`;

    const detail =
      overBy > 0
        ? `Your biggest cost driver is ${selectedMaterial.name} at $${selectedMaterial.cost_per_yard}/yd. Pull cost back through complexity or material first.`
        : `You’re in a safe zone. If you want to push the piece into more “statement” territory, you have room to invest in finishing details without breaking margin.`;

    return { headline, overall, detail, suggestions };
  }, [
    insight,
    selectedMaterial,
    selectedImpact,
    constructionTier,
    alternativeMaterial,
    materials,
    materialId,
    recommendedMaterialId,
    baselineComplexity,
    conceptContext.aestheticName,
    conceptContext.aestheticMatchedId,
    conceptYardage,
    targetMSRP,
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
          <div style={{ padding: "36px 44px 24px" }}>
            <h1 style={{ margin: 0, fontFamily: sohne, fontWeight: 500, fontSize: 28, color: OLIVE, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
              Spec Studio
            </h1>
            <p style={{ margin: "10px 0 0", fontFamily: inter, fontSize: 13, color: "rgba(67,67,43,0.52)", lineHeight: 1.55, maxWidth: 460 }}>
              We translated your concept into a recommended spec. Select your garment type, explore materials and construction — Muko scores every combination in real time.
            </p>
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
            {/* Direction name + silhouette + palette */}
            <span style={{ fontFamily: sohne, fontSize: 13.5, fontWeight: 500, color: OLIVE, letterSpacing: "-0.01em", flexShrink: 0 }}>
              {refinement.base}
            </span>
            {conceptSilhouette && (
              <>
                <span style={{ color: "rgba(67,67,43,0.30)", fontSize: 11 }}>&middot;</span>
                <span style={{ fontFamily: inter, fontSize: 12, fontWeight: 400, color: "rgba(67,67,43,0.60)" }}>
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
                  <span style={{ color: "rgba(67,67,43,0.30)", fontSize: 11 }}>&middot;</span>
                  <span style={{ fontFamily: inter, fontSize: 12, fontWeight: 400, color: "rgba(67,67,43,0.60)" }}>
                    {palName}
                  </span>
                </>
              );
            })()}

            {/* Scores inline — identity + resonance only */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 2, fontFamily: inter, fontSize: 10, fontWeight: 650, color: identityColor }}>
                <IconIdentity size={10} color={identityColor} />{dynamicIdentityScore}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 2, fontFamily: inter, fontSize: 10, fontWeight: 650, color: resonanceColor }}>
                <IconResonance size={10} color={resonanceColor} />{dynamicResonanceScore}
              </span>
            </div>

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

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={microLabel}>MSRP</span>
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
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(67, 67, 43, 0.35)",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                }}
              >
                Ceiling: ${marginCeiling}
              </span>
            </div>

            {insight && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={microLabel}>Est. COGS</span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums" as const,
                    color:
                      insight.type === "warning"
                        ? BRAND.camel
                        : insight.type === "strong"
                          ? CHARTREUSE
                          : STEEL,
                    fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                    transition: "color 300ms ease",
                  }}
                >
                  ${insight.cogs}
                </span>
              </div>
            )}
          </div>

          {/* ─── Hero Card: Muko's Pick / Selected ─── */}
          {(() => {
            const cellStyle = { borderRadius: 10, background: "rgba(67,67,43,0.03)", border: "1px solid rgba(67,67,43,0.08)", padding: "10px 12px" };
            const cellLabelColor = hasUserSelection ? "rgba(67,67,43,0.50)" : ROSE;
            const cellLabelStyle = { fontSize: 9, fontWeight: 800 as const, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: cellLabelColor, fontFamily: sohne, marginBottom: 5 };
            const cellValueStyle = { fontFamily: sohne, fontSize: 13, fontWeight: 650 as const, color: OLIVE, marginBottom: 3 };
            const cellDetailStyle = { fontFamily: inter, fontSize: 10, color: "rgba(67,67,43,0.45)" };

            // Muko's Pick: show Material + Complexity cells
            // Silhouette & Palette are already visible in the locked concept direction bar above
            const mukoMatChips = baselineMaterial ? (chipsByMaterial[baselineMaterial.id] || []) : [];
            const mukoComplexChips = baselineComplexity === "high" ? chipsForHighComplexity : [];
            const mukoCells = [
              { key: "material", label: "Material", name: baselineMaterial?.name ?? "—", detail: baselineMaterial ? `$${baselineMaterial.cost_per_yard}/yd · ${baselineMaterial.lead_time_weeks}wk` : "—", locked: false, chips: mukoMatChips },
              { key: "complexity", label: "Complexity", name: COMPLEXITY_CONTEXT[baselineComplexity].label, detail: COMPLEXITY_CONTEXT[baselineComplexity].description, locked: false, chips: mukoComplexChips },
            ];

            const selMatChips = selectedMaterial ? (chipsByMaterial[selectedMaterial.id] || []) : [];
            const selComplexChips = constructionTier === "high" ? chipsForHighComplexity : [];
            const selectedCells = [
              ...(materialId ? [{ key: "material", label: "Material", name: selectedMaterial?.name ?? "—", detail: selectedMaterial ? `$${selectedMaterial.cost_per_yard}/yd · ${selectedMaterial.lead_time_weeks}wk` : "—", locked: false, chips: selMatChips }] : []),
              ...(constructionTier ? [{ key: "complexity", label: "Complexity", name: COMPLEXITY_CONTEXT[constructionTier].label, detail: COMPLEXITY_CONTEXT[constructionTier].description, locked: false, chips: selComplexChips }] : []),
            ];

            const cells = hasUserSelection ? selectedCells : mukoCells;
            const gridCols = cells.length <= 1 ? "1fr" : cells.length === 2 ? "repeat(2, 1fr)" : cells.length === 3 ? "repeat(3, 1fr)" : "repeat(4, 1fr)";

            return (
              <div style={{ marginBottom: 28 }}>
                {/* Section label */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: hasUserSelection ? CHARTREUSE : ROSE, fontFamily: sohne }}>
                    {hasUserSelection ? "Your Spec" : "Muko\u2019s Pick"}
                  </span>
                  <div style={{ flex: 1, height: 1, background: hasUserSelection ? "rgba(168,180,117,0.25)" : "rgba(169,123,143,0.20)" }} />
                </div>

                {/* Card */}
                <div style={{
                  borderRadius: 16,
                  border: hasUserSelection ? `1.5px solid ${CHARTREUSE}` : "1.5px solid rgba(169,123,143,0.30)",
                  background: "rgba(255,255,255,0.72)",
                  boxShadow: hasUserSelection
                    ? "0 4px 16px rgba(168,180,117,0.18), 0 1px 4px rgba(0,0,0,0.06)"
                    : "0 18px 50px rgba(169,123,143,0.12), 0 2px 8px rgba(67,67,43,0.04), inset 0 1px 0 rgba(255,255,255,0.70)",
                  padding: "18px 20px 16px",
                }}>
                  {/* Mini-cells */}
                  <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 8, marginBottom: 14 }}>
                    {cells.map((cell) => {
                      const isLocked = (cell as any).locked === true;
                      return (
                        <div key={cell.key} style={{ ...cellStyle, position: "relative" as const, opacity: isLocked ? 0.7 : 1 }}>
                          {isLocked ? (
                            <div style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: "50%", background: "rgba(67,67,43,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }} title="Set in Concept Studio — go back to change">
                              <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><rect x="3" y="6" width="8" height="6" rx="1.5" stroke="rgba(67,67,43,0.40)" strokeWidth="1.2" /><path d="M5 6V4.5a2 2 0 0 1 4 0V6" stroke="rgba(67,67,43,0.40)" strokeWidth="1.2" strokeLinecap="round" /></svg>
                            </div>
                          ) : hasUserSelection ? (
                            <div style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: "50%", background: CHARTREUSE, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                          ) : null}
                          <div style={cellLabelStyle}>{cell.label}</div>
                          <div style={cellValueStyle}>{cell.name}</div>
                          {cell.detail && <div style={cellDetailStyle}>{cell.detail}</div>}
                          {(cell as any).chips && (cell as any).chips.length > 0 && (
                            <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 3 }}>
                              {((cell as any).chips as ActivatedChip[]).map((chip) => (
                                <span
                                  key={chip.label}
                                  style={{
                                    padding: "2px 7px",
                                    borderRadius: 999,
                                    fontSize: 9,
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
                          {(cell as any).swatches && (
                            <div style={{ display: "flex", gap: 3, marginTop: 2 }}>
                              {((cell as any).swatches as Array<{ hex: string }>).slice(0, 5).map((c, ci) => (
                                <div key={ci} style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: c.hex, border: "1px solid rgba(0,0,0,0.06)" }} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div style={{ borderTop: "1px solid rgba(67,67,43,0.07)", paddingTop: 10 }}>
                    <p style={{ margin: 0, fontFamily: inter, fontSize: 11, fontStyle: "italic", color: "rgba(67,67,43,0.40)", lineHeight: 1.5 }}>
                      {hasUserSelection
                        ? "Muko recalculates as you refine — change any input below."
                        : "Select any material, silhouette, or construction below to override — Muko will recalculate in real time."}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

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

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {materials.map((mat) => {
                    const isSel = materialId === mat.id;
                    const isRec = mat.id === recommendedMaterialId;
                    const isHover = hoveredMaterialId === mat.id;
                    const deltas = scoreMaterialDeltas(mat);
                    const matchingChips = chipsByMaterial[mat.id] || [];

                    return (
                      <button
                        key={mat.id}
                        onClick={() => { setMaterialId(mat.id); setUserManuallySelected(true); }}
                        onMouseEnter={() => setHoveredMaterialId(mat.id)}
                        onMouseLeave={() => setHoveredMaterialId(null)}
                        style={{
                          textAlign: "left",
                          borderRadius: 14,
                          padding: "14px 14px 12px",
                          background: isSel ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.55)",
                          border: isSel
                            ? `1.5px solid ${CHARTREUSE}`
                            : isRec && !isSel
                              ? "1.5px solid rgba(169,123,143,0.35)"
                              : "1px solid rgba(67, 67, 43, 0.10)",
                          boxShadow: isSel
                            ? "0 14px 40px rgba(67,67,43,0.10)"
                            : "0 8px 24px rgba(67,67,43,0.05)",
                          cursor: "pointer",
                          outline: "none",
                          transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                          transform: isSel ? "translateY(-1px)" : "translateY(0)",
                          position: "relative",
                        }}
                      >
                        {isRec && !isSel && (
                          <div style={{ position: "absolute", top: 8, right: 8 }}>
                            <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" as const, background: "rgba(169,123,143,0.10)", border: "1px solid rgba(169,123,143,0.30)", color: ROSE, fontFamily: inter, whiteSpace: "nowrap" }}>
                              Muko&apos;s Pick
                            </span>
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13, marginBottom: 4, color: "rgba(67,67,43,0.35)" }}>
                              {MATERIAL_ICONS[mat.id] || "○"}
                            </div>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 650,
                                color: OLIVE,
                                fontFamily: sohne,
                                marginBottom: 2,
                              }}
                            >
                              {mat.name}
                            </div>
                          </div>

                          {isHover && !isSel ? (
                            compactDeltaCluster({
                              deltas,
                              isHoverOrActive: true,
                              isRecommended: isRec,
                            })
                          ) : !isSel ? (
                            aggregateDeltaDot({ deltas })
                          ) : null}
                        </div>

                        <div
                          style={{
                            fontSize: 11,
                            color: "rgba(67,67,43,0.45)",
                            fontFamily: "var(--font-inter), system-ui, sans-serif",
                            marginTop: 6,
                          }}
                        >
                          ${mat.cost_per_yard}/yd · {mat.lead_time_weeks}wk
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
                              {MATERIAL_DESCRIPTIONS[mat.id] || "Shifts weight, drape, and finish — this choice will quietly define the piece's tone."}
                            </div>
                          </div>
                        )}
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
                            {isRec && !isSel && (
                              <span style={{ display: "inline-block", marginTop: 3, padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" as const, background: "rgba(169,123,143,0.10)", border: "1px solid rgba(169,123,143,0.30)", color: ROSE, fontFamily: inter }}>
                                Muko&apos;s Pick
                              </span>
                            )}
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
                              deltas,
                              isHoverOrActive: true,
                              isRecommended: isRec,
                            })
                          ) : !isSel ? (
                            aggregateDeltaDot({ deltas })
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
          </div>{/* end sections */}

          <style>{`
            @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes continueReady { 0% { transform: translateY(4px); opacity: 0.6; } 100% { transform: translateY(0); opacity: 1; } }
          `}</style>

        </div>{/* end left content padding */}
          </>
        }
        rightContent={
        <>
        <div style={{ padding: "36px 36px 0" }}>
          {/* Pulse Rail */}
          <div style={{ marginBottom: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(67,67,43,0.38)", fontFamily: sohne, marginBottom: 16 }}>Pulse</div>
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
              isExpanded={pulseExpandedRow === "identity"}
              onToggleExpand={() => setPulseExpandedRow(pulseExpandedRow === "identity" ? null : "identity")}
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
              isExpanded={pulseExpandedRow === "resonance"}
              onToggleExpand={() => setPulseExpandedRow(pulseExpandedRow === "resonance" ? null : "resonance")}
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
              isExpanded={pulseExpandedRow === "execution"}
              onToggleExpand={() => setPulseExpandedRow(pulseExpandedRow === "execution" ? null : "execution")}
            />
          </div>

          {/* Muko Insight */}
          <MukoInsightSection
            headline={specInsightContent.headline}
            paragraphs={[specInsightContent.p1, specInsightContent.p2, specInsightContent.p3]}
            opportunity={{ items: specInsightContent.opportunity }}
            edit={{ items: specInsightContent.editItems }}
            nextMove={{
              mode: "spec",
              suggestions: mukoSynthesis?.suggestions ?? [],
              subtitle: "Adjustments that improve feasibility without changing your direction.",
              appliedIds: appliedSuggestions,
              onApply: (id) => applySuggestion(id, mukoSynthesis?.suggestions ?? []),
              onUndo: undoSuggestion,
            }}
          />

          {/* Ask Muko */}
          <AskMuko
            step="spec"
            suggestedQuestions={suggestedQuestions}
            context={{
              aesthetic: conceptContext.aestheticMatchedId,
              refinement,
              identityScore: conceptContext.identityScore,
              resonanceScore: conceptContext.resonanceScore,
              material: selectedMaterial?.name,
              silhouette: conceptSilhouette ? conceptSilhouette.charAt(0).toUpperCase() + conceptSilhouette.slice(1) : undefined,
              category: categoryId,
            }}
          />

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
    </div>
  );
}
