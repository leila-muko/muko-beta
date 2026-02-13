"use client";

import React, { useState, useEffect, useMemo } from "react";
import type {
  Material,
  Category,
  ConstructionTier,
  ConceptContext as ConceptContextType,
  PaletteColor,
} from "@/lib/types/spec-studio";
import { calculateCOGS, generateInsight } from "@/lib/spec-studio/calculator";
import { findAlternativeMaterial } from "@/lib/spec-studio/material-matcher";
import {
  SMART_DEFAULTS,
  CONSTRUCTION_INFO,
  getOverrideWarning,
} from "@/lib/spec-studio/smart-defaults";

import categoriesData from "@/data/categories.json";
import materialsData from "@/data/materials.json";

/* ─── Icons: matched to Concept Studio (star, users, cog) ─── */
function IconIdentity({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconResonance({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="9"
        cy="7"
        r="4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23 21V19C22.99 17.18 21.8 15.58 20 15.13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 3.13C17.8 3.58 18.99 5.18 18.99 7C18.99 8.82 17.8 10.42 16 10.87"
        stroke="currentColor"
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

/* ─── Icons ─── */
function IconExecution({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="currentColor"
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

const glassPanelBase: React.CSSProperties = {
  borderRadius: 20,
  border: "1px solid rgba(255, 255, 255, 0.35)",
  background: "rgba(255, 255, 255, 0.25)",
  backdropFilter: "blur(40px) saturate(180%)",
  WebkitBackdropFilter: "blur(40px) saturate(180%)",
  boxShadow:
    "0 24px 80px rgba(0,0,0,0.05), 0 8px 32px rgba(67,67,43,0.04), inset 0 1px 0 rgba(255,255,255,0.60), inset 0 -1px 0 rgba(255,255,255,0.12)",
  overflow: "hidden",
  position: "relative" as const,
};

const glassSheen: React.CSSProperties = {
  position: "absolute" as const,
  inset: 0,
  pointerEvents: "none" as const,
  background:
    "radial-gradient(ellipse 280px 120px at 15% -5%, rgba(255,255,255,0.35), transparent 65%), radial-gradient(ellipse 200px 100px at 90% 10%, rgba(255,255,255,0.15), transparent 60%)",
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
const AESTHETIC_PALETTE_OPTIONS: Record<
  string,
  { name: string; palette: PaletteColor[] }[]
> = {
  "refined-clarity": [
    {
      name: "Monochrome Authority",
      palette: [
        { hex: "#2C2C2C", name: "Charcoal" },
        { hex: "#F5F0E8", name: "Ivory" },
        { hex: "#8B8B7A", name: "Stone" },
        { hex: "#4A4A4A", name: "Graphite" },
        { hex: "#E8E0D4", name: "Parchment" },
        { hex: "#1A1A1A", name: "Ink" },
      ],
    },
    {
      name: "Warm Neutrals",
      palette: [
        { hex: "#C4B5A0", name: "Sandstone" },
        { hex: "#E8DFD0", name: "Linen" },
        { hex: "#8B7D6B", name: "Taupe" },
        { hex: "#F5EDE3", name: "Cream" },
        { hex: "#6B5E4E", name: "Walnut" },
        { hex: "#D4C8B8", name: "Oat" },
      ],
    },
    {
      name: "Cool Mineral",
      palette: [
        { hex: "#9BA8B4", name: "Slate Blue" },
        { hex: "#F0EFED", name: "Cloud" },
        { hex: "#6B7B8A", name: "Pewter" },
        { hex: "#D8D6D2", name: "Ash" },
        { hex: "#3D4A54", name: "Steel" },
        { hex: "#B8BFC6", name: "Mist" },
      ],
    },
  ],
  default: [
    {
      name: "Signature Muko",
      palette: [
        { hex: "#43432B", name: "Olive Ink" },
        { hex: "#F5F2EB", name: "Cream" },
        { hex: "#A97B8F", name: "Dusty Rose" },
        { hex: "#A9BFD6", name: "Steel Blue" },
        { hex: "#B8876B", name: "Camel" },
        { hex: "#ABAB63", name: "Chartreuse" },
      ],
    },
    {
      name: "Earth & Stone",
      palette: [
        { hex: "#8B7355", name: "Desert Sand" },
        { hex: "#A0522D", name: "Sienna" },
        { hex: "#D2B48C", name: "Tan" },
        { hex: "#556B2F", name: "Olive" },
        { hex: "#F5F0E8", name: "Bone" },
        { hex: "#2F4F4F", name: "Slate" },
      ],
    },
    {
      name: "Muted Jewel",
      palette: [
        { hex: "#5B4A5E", name: "Plum" },
        { hex: "#6B7B6B", name: "Forest" },
        { hex: "#8B6F5E", name: "Umber" },
        { hex: "#D4C8B8", name: "Oat" },
        { hex: "#7A8A9A", name: "Thistle" },
        { hex: "#3D3D2E", name: "Moss" },
      ],
    },
  ],
};

/* ─── Silhouette aesthetic affinity ─── */
const SILHOUETTE_AFFINITY: Record<string, string[]> = {
  cocoon: ["soft", "volume", "romantic", "bohemian", "oversized"],
  belted: ["structured", "refined", "feminine", "tailored", "classic"],
  straight: ["minimal", "modern", "clean", "refined", "masculine"],
  cropped: ["edgy", "playful", "sporty", "modern", "youthful"],
  relaxed: ["casual", "bohemian", "soft", "minimal", "effortless"],
  fitted: ["refined", "feminine", "structured", "classic", "polished"],
  oversized: ["volume", "modern", "edgy", "street", "grunge"],
  boxy: ["minimal", "modern", "clean", "architectural", "androgynous"],
  "wide-leg": ["refined", "feminine", "fluid", "elegant", "minimal"],
  "straight-leg": ["clean", "modern", "minimal", "classic", "versatile"],
  slim: ["fitted", "modern", "sleek", "polished", "tailored"],
  flare: ["retro", "feminine", "romantic", "bohemian", "playful"],
  column: ["refined", "minimal", "elegant", "architectural", "modern"],
  "a-line": ["feminine", "classic", "soft", "romantic", "versatile"],
  wrap: ["feminine", "fluid", "refined", "flattering", "classic"],
  shift: ["minimal", "modern", "clean", "architectural", "edgy"],
};

/* ─── Aesthetic keywords for matching ─── */
const AESTHETIC_KEYWORDS: Record<string, string[]> = {
  "refined-clarity": [
    "minimal",
    "structural",
    "refined",
    "modern",
    "clean",
    "tailored",
    "architectural",
    "polished",
  ],
  "neo-western": ["rustic", "western", "earthy", "bohemian", "textured", "vintage"],
  "dark-romantic": ["romantic", "moody", "feminine", "dark", "dramatic", "edgy"],
  "coastal-minimalism": ["minimal", "clean", "soft", "natural", "effortless", "fluid"],
  default: ["modern", "clean", "versatile"],
};

function getSilhouetteAffinity(
  silhouetteId: string,
  aestheticId: string
): { aligned: boolean; note: string | null } {
  const silAffinity = SILHOUETTE_AFFINITY[silhouetteId] || [];
  const aestheticKws = AESTHETIC_KEYWORDS[aestheticId] || AESTHETIC_KEYWORDS.default;

  const overlap = silAffinity.filter((kw) => aestheticKws.includes(kw));
  const overlapRatio = silAffinity.length > 0 ? overlap.length / silAffinity.length : 0;

  if (overlapRatio >= 0.2) return { aligned: true, note: null };

  return {
    aligned: false,
    note: `This silhouette leans ${silAffinity.slice(0, 2).join(", ")} — your ${aestheticId
      .replace("-", " ")
      .replace(/\b\w/g, (m) => m.toUpperCase())} direction favors ${aestheticKws
      .slice(0, 2)
      .join(", ")} shapes.`,
  };
}

/* ─── Complexity (formerly Construction) ─── */
const COMPLEXITY_CONTEXT: Record<
  ConstructionTier,
  {
    label: string;
    description: string;
    note: string;
    includesLining: boolean;
    liningOptional: boolean;
  }
> = {
  low: {
    label: "Low",
    description: "Clean build, minimal detailing",
    note: "Unlined by default",
    includesLining: false,
    liningOptional: false,
  },
  moderate: {
    label: "Moderate",
    description: "Standard seaming + some detail",
    note: "Optional lining (+$18)",
    includesLining: false,
    liningOptional: true,
  },
  high: {
    label: "High",
    description: "Tailoring, lining, hardware-ready",
    note: "Fully lined included",
    includesLining: true,
    liningOptional: false,
  },
};

/* ─── Mock data ─── */
const MOCK_CONCEPT: ConceptContextType = {
  aestheticName: "Refined Clarity",
  aestheticMatchedId: "refined-clarity",
  identityScore: 88,
  resonanceScore: 92,
  moodboardImages: [],
  recommendedPalette: [],
};
const MOCK_REFINEMENT = {
  base: "Refined Clarity",
  modifiers: ["Feminine", "Soft"],
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
  const color = status === "good" ? BRAND.chartreuse : BRAND.rose;

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
  isHoverOrActive,
  isRecommended,
}: {
  deltas: Deltas;
  isHoverOrActive: boolean;
  isRecommended: boolean;
}) {
  const c = deltaColor({ isHoverOrActive, isRecommended });
  const itemStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
  const iconStyle: React.CSSProperties = {
    color: c,
    opacity: isHoverOrActive || isRecommended ? 1 : 0.85,
  };
  const textStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: c,
    fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
    fontVariantNumeric: "tabular-nums" as const,
    letterSpacing: "0.01em",
  };

  const deltaItems = [
    { icon: <IconIdentity size={16} />, value: deltas.identity, key: "identity" },
    { icon: <IconResonance size={16} />, value: deltas.resonance, key: "resonance" },
    { icon: <IconExecution size={16} />, value: deltas.execution, key: "execution" },
  ].filter((item) => item.value !== 0);

  if (deltaItems.length === 0) return null;

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
      {deltaItems.map((item) => (
        <div key={item.key} style={itemStyle}>
          <span style={iconStyle}>{item.icon}</span>
          <span style={textStyle}>{fmtDelta(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function SpecStudioPage() {
  const categories: Category[] = categoriesData.categories as Category[];
  const materials: Material[] = materialsData.materials;

  const [categoryId, setCategoryId] = useState(categories[0].id);
  const [targetMSRP, setTargetMSRP] = useState(450);
  const [materialId, setMaterialId] = useState("");
  const [silhouetteId, setSilhouetteId] = useState("");
  const [constructionTier, setConstructionTier] = useState<ConstructionTier>("high");
  const [addLining, setAddLining] = useState(false);
  const [overrideWarning, setOverrideWarning] = useState<string | null>(null);
  const [pulseUpdated, setPulseUpdated] = useState(false);
  const [selectedPaletteIdx, setSelectedPaletteIdx] = useState(0);

  const [hoveredMaterialId, setHoveredMaterialId] = useState<string | null>(null);
  const [hoveredSilhouetteId, setHoveredSilhouetteId] = useState<string | null>(null);
  const [hoveredPaletteIdx, setHoveredPaletteIdx] = useState<number | null>(null);
  const [hoveredComplexity, setHoveredComplexity] = useState<ConstructionTier | null>(null);

  const conceptContext = MOCK_CONCEPT;
  const refinement = MOCK_REFINEMENT;
  const brandTargetMargin = 0.60;

  const [headerCollectionName, setHeaderCollectionName] = useState("Desert Mirage");
  const [headerSeasonLabel, setHeaderSeasonLabel] = useState("SS26");
  useEffect(() => {
    try {
      const n = window.localStorage.getItem("muko_collectionName");
      const s = window.localStorage.getItem("muko_seasonLabel");
      if (n) setHeaderCollectionName(n);
      if (s) setHeaderSeasonLabel(s);
    } catch {}
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) || categories[0],
    [categoryId, categories]
  );
  const selectedMaterial = useMemo(
    () => materials.find((m) => m.id === materialId) || null,
    [materialId, materials]
  );
  const selectedSilhouette = useMemo(
    () => selectedCategory.silhouettes.find((s) => s.id === silhouetteId) || null,
    [silhouetteId, selectedCategory]
  );

  const paletteOptions =
    AESTHETIC_PALETTE_OPTIONS[conceptContext.aestheticMatchedId] ||
    AESTHETIC_PALETTE_OPTIONS.default;

  const tierCtx = COMPLEXITY_CONTEXT[constructionTier];
  const effectiveLined =
    tierCtx.includesLining || (tierCtx.liningOptional && addLining);

  const silhouetteAffinity = useMemo(() => {
    if (!silhouetteId) return null;
    return getSilhouetteAffinity(silhouetteId, conceptContext.aestheticMatchedId);
  }, [silhouetteId, conceptContext.aestheticMatchedId]);

  const aestheticKws =
    AESTHETIC_KEYWORDS[conceptContext.aestheticMatchedId] ||
    AESTHETIC_KEYWORDS.default;

  const recommendedPaletteIdx =
    conceptContext.aestheticMatchedId === "refined-clarity" ? 2 : 0;

  const recommendedMaterialId = useMemo(() => {
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
  }, [materials, aestheticKws]);

  const recommendedSilhouetteId = useMemo(() => {
    const silhouettes = selectedCategory.silhouettes || [];
    const rank = (sid: string) => {
      const aff = SILHOUETTE_AFFINITY[sid] || [];
      const overlap = aff.filter((kw) => aestheticKws.includes(kw)).length;
      return overlap;
    };
    const ranked = silhouettes
      .map((s) => ({ id: s.id, score: rank(s.id) }))
      .sort((a, b) => b.score - a.score);
    return ranked[0]?.id || "";
  }, [selectedCategory.silhouettes, aestheticKws]);

  const alternativeMaterial = useMemo(
    () => (selectedMaterial ? findAlternativeMaterial(selectedMaterial, materials) : null),
    [selectedMaterial, materials]
  );

  const insight = useMemo(() => {
    if (!selectedMaterial || !selectedSilhouette) return null;
    const breakdown = calculateCOGS(
      selectedMaterial,
      selectedSilhouette.yardage,
      constructionTier,
      effectiveLined,
      targetMSRP,
      brandTargetMargin
    );
    return generateInsight(
      breakdown,
      selectedMaterial,
      selectedSilhouette.name,
      constructionTier,
      effectiveLined,
      selectedSilhouette.yardage,
      alternativeMaterial
    );
  }, [
    selectedMaterial,
    selectedSilhouette,
    constructionTier,
    effectiveLined,
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
      ? BRAND.chartreuse
      : executionStatus === "yellow"
        ? BRAND.rose
        : executionStatus === "red"
          ? BRAND.camel
          : "rgba(67, 67, 43, 0.22)";

  const handleCategoryChange = (newId: string) => {
    setCategoryId(newId);
    setSilhouetteId("");
    setConstructionTier(SMART_DEFAULTS[newId] || "moderate");
    setOverrideWarning(null);
    setAddLining(false);
  };

  const handleComplexityChange = (tier: ConstructionTier) => {
    setConstructionTier(tier);
    setAddLining(false);
    setOverrideWarning(
      getOverrideWarning(
        categoryId,
        selectedCategory.name,
        tier,
        SMART_DEFAULTS[categoryId] || "moderate"
      )
    );
  };

  const isComplete = materialId && silhouetteId && constructionTier;
  const marginCeiling = Math.round(targetMSRP * (1 - brandTargetMargin));

  const baselineComplexity: ConstructionTier =
    SMART_DEFAULTS[categoryId] || "moderate";

  const baselineMaterial = useMemo(() => {
    const id = recommendedMaterialId || materialId || "";
    return materials.find((m) => m.id === id) || null;
  }, [materials, recommendedMaterialId, materialId]);

  const baselineSilhouette = useMemo(() => {
    const id = recommendedSilhouetteId || silhouetteId || "";
    return selectedCategory.silhouettes.find((s) => s.id === id) || null;
  }, [selectedCategory.silhouettes, recommendedSilhouetteId, silhouetteId]);

  function getBaselineMaterialCost() {
    if (!baselineMaterial) {
      const recMat = materials.find((m) => m.id === recommendedMaterialId);
      return recMat?.cost_per_yard || 25;
    }
    return baselineMaterial.cost_per_yard || 25;
  }

  function getBaselineSilhouetteYardage() {
    if (!baselineSilhouette) {
      const recSil = selectedCategory.silhouettes.find(
        (s) => s.id === recommendedSilhouetteId
      );
      return recSil?.yardage || 3;
    }
    return baselineSilhouette.yardage || 3;
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

  function scoreSilhouetteDeltas(sid: string): Deltas {
    const aff = SILHOUETTE_AFFINITY[sid] || [];
    const overlap = aff.filter((kw) => aestheticKws.includes(kw)).length;

    const id = clamp(overlap >= 3 ? 3 : overlap >= 2 ? 2 : overlap >= 1 ? 1 : -1, -2, 4);
    const res = clamp(overlap >= 3 ? 2 : overlap >= 2 ? 1 : 0, -1, 3);

    const sil = selectedCategory.silhouettes.find((x) => x.id === sid) || null;
    const baseY = getBaselineSilhouetteYardage();
    const y = sil?.yardage || 0;
    const yDiff = y - baseY;
    const exec = clamp(Math.round(-yDiff * 2), -4, 4);

    return { identity: id, resonance: res, execution: exec };
  }

  function scorePaletteDeltas(idx: number): Deltas {
    if (idx === recommendedPaletteIdx) return { identity: 2, resonance: 1, execution: 0 };
    return { identity: 0, resonance: 0, execution: 0 };
  }

  function scoreComplexityDeltas(tier: ConstructionTier): Deltas {
    const base = baselineComplexity;
    const map: Record<ConstructionTier, number> = { low: 0, moderate: 1, high: 2 };
    const d = map[tier] - map[base];
    const id = clamp(d, -2, 2);
    const res = clamp(0, -1, 1);
    const exec = clamp(-d * 2, -4, 4);
    return { identity: id, resonance: res, execution: exec };
  }

  function addDeltas(a: Deltas, b: Deltas): Deltas {
    return {
      identity: a.identity + b.identity,
      resonance: a.resonance + b.resonance,
      execution: a.execution + b.execution,
    };
  }

  const dynamicIdentityScore = useMemo(() => {
    if (!selectedMaterial && !silhouetteId) return conceptContext.identityScore;

    const baseScore = conceptContext.identityScore;
    const materialDelta = selectedMaterial ? scoreMaterialDeltas(selectedMaterial).identity : 0;
    const silhouetteDelta = silhouetteId ? scoreSilhouetteDeltas(silhouetteId).identity : 0;
    const paletteDelta = scorePaletteDeltas(selectedPaletteIdx).identity;
    const complexityDelta = scoreComplexityDeltas(constructionTier).identity;

    return clamp(
      baseScore + materialDelta + silhouetteDelta + paletteDelta + complexityDelta,
      0,
      100
    );
  }, [
    selectedMaterial,
    silhouetteId,
    selectedPaletteIdx,
    constructionTier,
    conceptContext.identityScore,
    baselineMaterial,
    baselineSilhouette,
    baselineComplexity,
    recommendedMaterialId,
    recommendedSilhouetteId,
    recommendedPaletteIdx,
    categoryId,
    materials,
    selectedCategory.silhouettes,
    aestheticKws,
  ]);

  const dynamicResonanceScore = useMemo(() => {
    if (!selectedMaterial && !silhouetteId) return conceptContext.resonanceScore;

    const baseScore = conceptContext.resonanceScore;
    const materialDelta = selectedMaterial ? scoreMaterialDeltas(selectedMaterial).resonance : 0;
    const silhouetteDelta = silhouetteId ? scoreSilhouetteDeltas(silhouetteId).resonance : 0;
    const paletteDelta = scorePaletteDeltas(selectedPaletteIdx).resonance;
    const complexityDelta = scoreComplexityDeltas(constructionTier).resonance;

    return clamp(
      baseScore + materialDelta + silhouetteDelta + paletteDelta + complexityDelta,
      0,
      100
    );
  }, [
    selectedMaterial,
    silhouetteId,
    selectedPaletteIdx,
    constructionTier,
    conceptContext.resonanceScore,
    baselineMaterial,
    baselineSilhouette,
    baselineComplexity,
    recommendedMaterialId,
    recommendedSilhouetteId,
    recommendedPaletteIdx,
    categoryId,
    materials,
    selectedCategory.silhouettes,
    aestheticKws,
  ]);

  const identityColor =
    dynamicIdentityScore >= 80
      ? BRAND.chartreuse
      : dynamicIdentityScore >= 60
        ? BRAND.rose
        : BRAND.camel;

  const resonanceColor =
    dynamicResonanceScore >= 80
      ? BRAND.chartreuse
      : dynamicResonanceScore >= 60
        ? BRAND.rose
        : BRAND.camel;

  const selectedImpact: Deltas = useMemo(() => {
    if (!selectedMaterial || !silhouetteId) return { identity: 0, resonance: 0, execution: 0 };
    const m = scoreMaterialDeltas(selectedMaterial);
    const s = scoreSilhouetteDeltas(silhouetteId);
    const p = scorePaletteDeltas(selectedPaletteIdx);
    const c = scoreComplexityDeltas(constructionTier);
    return addDeltas(addDeltas(m, s), addDeltas(p, c));
  }, [selectedMaterial, silhouetteId, selectedPaletteIdx, constructionTier]);

  const mukoSynthesis = useMemo(() => {
    if (!selectedMaterial) return null;
    if (!insight || !selectedSilhouette) {
      return {
        headline: "Select a silhouette to see full cost analysis",
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
        }. Choose a silhouette to see the full COGS breakdown.`,
        suggestions: [],
      };
    }

    const ceiling = insight.ceiling;
    const cogs = insight.cogs;
    const overBy = cogs - ceiling;

    const isOnRecommendedMaterial = materialId === recommendedMaterialId;
    const isOnRecommendedSilhouette = silhouetteId === recommendedSilhouetteId;
    const isOnRecommendedPalette = selectedPaletteIdx === recommendedPaletteIdx;
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

    const suggestions: {
      label: string;
      kind: "material" | "silhouette" | "palette" | "complexity";
      action: () => void;
      sub?: string;
    }[] = [];

    if (overBy > 0) {
      if (constructionTier === "high" && !isOnRecommendedComplexity) {
        suggestions.push({
          label: "Reduce complexity to Moderate",
          kind: "complexity",
          action: () => handleComplexityChange("moderate"),
          sub: "Keeps the design intent, lowers build risk and cost.",
        });
      } else if (constructionTier === "moderate" && !isOnRecommendedComplexity) {
        suggestions.push({
          label: "Reduce complexity to Low",
          kind: "complexity",
          action: () => handleComplexityChange("low"),
          sub: "Simplifies construction to pull COGS back under ceiling.",
        });
      }

      if (alternativeMaterial && !isOnRecommendedMaterial) {
        suggestions.push({
          label: `Swap material to ${alternativeMaterial.name}`,
          kind: "material",
          action: () => {
            const alt = materials.find((m) => m.id === alternativeMaterial.id);
            if (alt) setMaterialId(alt.id);
          },
          sub: `$${alternativeMaterial.cost_per_yard}/yd · typically saves ~${Math.round(
            (selectedSilhouette?.yardage || 0) *
              ((selectedMaterial.cost_per_yard || 0) -
                (alternativeMaterial.cost_per_yard || 0))
          )}`,
        });
      }

      if (!isOnRecommendedSilhouette) {
        const currentY = selectedSilhouette.yardage || 0;
        const candidates = selectedCategory.silhouettes
          .map((s) => ({
            id: s.id,
            name: s.name,
            yardage: s.yardage,
            delta: scoreSilhouetteDeltas(s.id),
          }))
          .filter((s) => s.yardage < currentY)
          .sort((a, b) => b.delta.identity - a.delta.identity);

        if (candidates[0] && candidates[0].id !== silhouetteId) {
          suggestions.push({
            label: `Try silhouette: ${candidates[0].name}`,
            kind: "silhouette",
            action: () => setSilhouetteId(candidates[0].id),
            sub: `Lower yardage (~${candidates[0].yardage} yd) to ease COGS while staying aligned.`,
          });
        }
      }
    }

    if (silhouetteAffinity && !silhouetteAffinity.aligned && !isOnRecommendedSilhouette) {
      suggestions.push({
        label: "Explore a more aligned silhouette",
        kind: "silhouette",
        action: () => setSilhouetteId(recommendedSilhouetteId || silhouetteId),
        sub: "Keeps the concept legible against your aesthetic direction.",
      });
    }

    if (!isOnRecommendedPalette && selectedImpact.identity <= -1) {
      suggestions.push({
        label: `Switch to palette: ${paletteOptions[recommendedPaletteIdx].name}`,
        kind: "palette",
        action: () => setSelectedPaletteIdx(recommendedPaletteIdx),
        sub: "Re-centers the direction and improves brand clarity.",
      });
    }

    const headline =
      overBy > 0
        ? `$${cogs} estimated COGS — $${overBy} over your $${ceiling} ceiling`
        : `$${cogs} estimated COGS — within your $${ceiling} ceiling`;

    const detail =
      overBy > 0
        ? `Your biggest cost driver is ${selectedMaterial.name} at $${selectedMaterial.cost_per_yard}/yd. Keep the silhouette if it’s core to the concept — pull cost back through complexity or material first.`
        : `You’re in a safe zone. If you want to push the piece into more “statement” territory, you have room to invest in finishing details without breaking margin.`;

    return { headline, overall, detail, suggestions };
  }, [
    insight,
    selectedMaterial,
    selectedSilhouette,
    selectedImpact,
    silhouetteAffinity,
    constructionTier,
    alternativeMaterial,
    materials,
    paletteOptions,
    selectedPaletteIdx,
    recommendedPaletteIdx,
    recommendedSilhouetteId,
    silhouetteId,
    selectedCategory.silhouettes,
    materialId,
    recommendedMaterialId,
    baselineComplexity,
    conceptContext.aestheticName,
    conceptContext.aestheticMatchedId,
    aestheticKws,
  ]);

  const roseGlowStyle: React.CSSProperties = {
    position: "absolute" as const,
    inset: -3,
    borderRadius: 23,
    pointerEvents: "none" as const,
    opacity: pulseUpdated ? 1 : 0,
    transition: "opacity 600ms cubic-bezier(0.4, 0, 0.2, 1)",
    background: pulseUpdated
      ? "radial-gradient(ellipse 120% 80% at 50% 30%, rgba(186, 156, 168, 0.14), transparent 70%)"
      : "transparent",
    boxShadow: pulseUpdated
      ? "0 0 50px rgba(186, 156, 168, 0.35), 0 0 100px rgba(186, 156, 168, 0.18)"
      : "none",
    border: pulseUpdated ? "1.5px solid rgba(186, 156, 168, 0.30)" : "1.5px solid transparent",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BRAND.parchment,
        display: "flex",
        position: "relative",
      }}
    >
      {/* ═══ TOP NAV ═══ */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 72,
          background: "rgba(250, 249, 246, 0.86)",
          backdropFilter: "blur(26px) saturate(180%)",
          WebkitBackdropFilter: "blur(26px) saturate(180%)",
          borderBottom: "1px solid rgba(67, 67, 43, 0.10)",
          zIndex: 200,
        }}
      >
        <div
          style={{
            maxWidth: 1520,
            margin: "0 auto",
            height: "100%",
            padding: "0 64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: BRAND.oliveInk,
                fontSize: 18,
              }}
            >
              muko
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {[
                { label: "Intent", state: "done" },
                { label: "Concept", state: "done" },
                { label: "Spec", state: "active" },
                { label: "Report", state: "idle" },
              ].map((s) => {
                const isDone = s.state === "done";
                const isActive = s.state === "active";
                return (
                  <div
                    key={s.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "7px 14px",
                      borderRadius: 999,
                      border: isDone
                        ? `1.5px solid ${BRAND.chartreuse}`
                        : isActive
                          ? `1.5px solid ${BRAND.steelBlue}`
                          : "1.5px solid rgba(67, 67, 43, 0.10)",
                      background: isDone
                        ? "rgba(171, 171, 99, 0.10)"
                        : isActive
                          ? "rgba(169, 191, 214, 0.08)"
                          : "rgba(67, 67, 43, 0.03)",
                      boxShadow: isActive
                        ? "0 8px 24px rgba(169, 191, 214, 0.14), inset 0 1px 0 rgba(255,255,255,0.80)"
                        : isDone
                          ? "0 6px 18px rgba(171, 171, 99, 0.08)"
                          : "none",
                      fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                      fontSize: 12,
                      fontWeight: 650,
                      letterSpacing: "0.01em",
                    }}
                  >
                    {isDone ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="6" fill={BRAND.chartreuse} opacity="0.22" />
                        <path
                          d="M4.5 7.2L6.2 8.8L9.5 5.5"
                          stroke={BRAND.chartreuse}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : isActive ? (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: BRAND.steelBlue,
                          boxShadow: "0 0 0 3px rgba(169, 191, 214, 0.22)",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          background: "rgba(67, 67, 43, 0.18)",
                        }}
                      />
                    )}
                    <span
                      style={{
                        color: isDone
                          ? "rgba(67, 67, 43, 0.72)"
                          : isActive
                            ? "rgba(67, 67, 43, 0.85)"
                            : "rgba(67, 67, 43, 0.38)",
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "rgba(67, 67, 43, 0.55)",
                fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              {headerSeasonLabel}
              <span style={{ padding: "0 8px", opacity: 0.35 }}>·</span>
              {headerCollectionName}
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {[
                {
                  label: "Back",
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M8.5 3L4.5 7L8.5 11"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ),
                  onClick: () => window.history.back(),
                },
                {
                  label: "Save & Close",
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M11 8.5V11.5C11 11.776 10.776 12 10.5 12H3.5C3.224 12 3 11.776 3 11.5V2.5C3 2.224 3.224 2 3.5 2H8.5L11 4.5V8.5Z"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8.5 2V4.5H11"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path d="M5 8H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      <path d="M5 10H7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  ),
                  onClick: () => console.log("Save & Close"),
                },
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={btn.onClick}
                  style={{
                    fontSize: 12,
                    fontWeight: 650,
                    color: BRAND.rose,
                    background: "rgba(169, 123, 143, 0.06)",
                    border: "1px solid rgba(169, 123, 143, 0.18)",
                    borderRadius: 999,
                    padding: "7px 14px 7px 10px",
                    cursor: "pointer",
                    fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    transition: "all 180ms ease",
                  }}
                >
                  {btn.icon}
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MAIN (FIXED WRAPPER) ═══ */}
      <main style={{ flex: 1, paddingTop: 88 }}>
        <div style={{ padding: "46px 72px 120px", maxWidth: 1520, margin: "0 auto" }}>
          {/* Page header */}
          <div style={{ marginBottom: 24 }}>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 600,
                color: BRAND.oliveInk,
                margin: 0,
                fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                letterSpacing: "-0.01em",
              }}
            >
              Spec Studio
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "rgba(67, 67, 43, 0.55)",
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                marginTop: 14,
                marginBottom: 0,
              }}
            >
              Define the physical product — Muko will check your margins and feasibility in real time.
            </p>
          </div>

          {/* ─── Locked Concept Bar ─── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 18px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.62)",
              border: `1px solid ${BRAND.chartreuse}`,
              boxShadow:
                "0 10px 32px rgba(67, 67, 43, 0.06), inset 0 0 0 1px rgba(255,255,255,0.50)",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" as const }}>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 650,
                  color: BRAND.oliveInk,
                  fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                }}
              >
                {refinement.base}
              </span>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: identityColor, opacity: 0.95 }}>
                  <IconIdentity size={16} />
                </span>
                <span style={scoreTextStyle}>{dynamicIdentityScore}</span>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: resonanceColor, opacity: 0.95 }}>
                  <IconResonance size={16} />
                </span>
                <span style={scoreTextStyle}>{dynamicResonanceScore}</span>
              </div>

              {refinement.modifiers.length > 0 && (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {refinement.modifiers.map((m) => (
                    <span
                      key={m}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 650,
                        color: "rgba(67, 67, 43, 0.60)",
                        background: "rgba(171, 171, 99, 0.10)",
                        border: "1px solid rgba(171, 171, 99, 0.18)",
                        fontFamily: "var(--font-inter), system-ui, sans-serif",
                      }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── Top Rail ─── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 32,
              padding: "14px 0",
              marginBottom: 32,
              borderBottom: "1px solid rgba(67, 67, 43, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={microLabel}>Category</span>
              <select
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                style={{
                  padding: "10px 36px 10px 16px",
                  borderRadius: 12,
                  width: 180,
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

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={microLabel}>Target MSRP</span>
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
                    padding: "10px 16px 10px 28px",
                    borderRadius: 12,
                    width: 180,
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
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
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
                          ? BRAND.chartreuse
                          : BRAND.steelBlue,
                    fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                    transition: "color 300ms ease",
                  }}
                >
                  ${insight.cogs}
                </span>
              </div>
            )}
          </div>

          {/* ═══ 2-COLUMN LAYOUT ═══ */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 372px",
              gap: 40,
              alignItems: "start",
            }}
          >
            {/* LEFT */}
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

                    const roseGlow = isRec
                      ? {
                          boxShadow:
                            "0 18px 50px rgba(169,123,143,0.16), 0 0 0 1px rgba(169,123,143,0.22), inset 0 1px 0 rgba(255,255,255,0.60)",
                          border: "1.5px solid rgba(169,123,143,0.28)",
                        }
                      : {};

                    return (
                      <button
                        key={mat.id}
                        onClick={() => setMaterialId(mat.id)}
                        onMouseEnter={() => setHoveredMaterialId(mat.id)}
                        onMouseLeave={() => setHoveredMaterialId(null)}
                        style={{
                          textAlign: "left",
                          borderRadius: 14,
                          padding: "14px 14px 12px",
                          background: isSel ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.55)",
                          border: isSel
                            ? `1.5px solid ${BRAND.chartreuse}`
                            : "1px solid rgba(67, 67, 43, 0.10)",
                          boxShadow: isSel
                            ? "0 14px 40px rgba(67,67,43,0.10)"
                            : "0 8px 24px rgba(67,67,43,0.05)",
                          cursor: "pointer",
                          outline: "none",
                          transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                          transform: isSel ? "translateY(-1px)" : "translateY(0)",
                          position: "relative",
                          ...(isRec ? roseGlow : {}),
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 16, marginBottom: 4 }}>
                              {MATERIAL_ICONS[mat.id] || "○"}
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 650,
                                color: BRAND.oliveInk,
                                fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                                marginBottom: 2,
                              }}
                            >
                              {mat.name}
                            </div>
                          </div>

                          {isHover || isSel ? (
                            compactDeltaCluster({
                              deltas,
                              isHoverOrActive: true,
                              isRecommended: isRec,
                            })
                          ) : (
                            aggregateDeltaDot({ deltas })
                          )}
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
                              {isRec
                                ? "Clean structure with an elevated handfeel — reads refined without feeling precious."
                                : "Shifts weight, drape, and finish — this choice will quietly define the piece’s tone."}
                            </div>

                            {isRec && (
                              <div style={{ marginTop: 10 }}>
                                <div
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase" as const,
                                    color: "rgba(67,67,43,0.50)",
                                    fontFamily:
                                      "var(--font-sohne-breit), system-ui, sans-serif",
                                    marginBottom: 4,
                                  }}
                                >
                                  Why This Works
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    color: "rgba(67,67,43,0.62)",
                                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                                  }}
                                >
                                  Supports your direction while keeping execution flexible — easier to hit
                                  margin without losing polish.
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Silhouette */}
              <div>
                <div style={{ marginBottom: 12 }}>
                  <span style={sectionHeading}>Silhouette</span>
                  <span
                    style={{
                      fontSize: 13,
                      color: "rgba(67,67,43,0.40)",
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                      marginLeft: 10,
                    }}
                  >
                    for {selectedCategory.name}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  {selectedCategory.silhouettes.map((sil) => {
                    const isSel = silhouetteId === sil.id;
                    const isRec = sil.id === recommendedSilhouetteId;
                    const isHover = hoveredSilhouetteId === sil.id;
                    const deltas = scoreSilhouetteDeltas(sil.id);

                    const roseGlow = isRec
                      ? {
                          boxShadow:
                            "0 18px 50px rgba(169,123,143,0.16), 0 0 0 1px rgba(169,123,143,0.22), inset 0 1px 0 rgba(255,255,255,0.60)",
                          border: "1.5px solid rgba(169,123,143,0.28)",
                        }
                      : {};

                    return (
                      <button
                        key={sil.id}
                        onClick={() => setSilhouetteId(sil.id)}
                        onMouseEnter={() => setHoveredSilhouetteId(sil.id)}
                        onMouseLeave={() => setHoveredSilhouetteId(null)}
                        style={{
                          flex: 1,
                          textAlign: "left",
                          borderRadius: 14,
                          padding: "16px 14px 14px",
                          background: isSel ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.55)",
                          border: isSel
                            ? `1.5px solid ${BRAND.chartreuse}`
                            : "1px solid rgba(67,67,43,0.10)",
                          boxShadow: isSel
                            ? "0 14px 40px rgba(67,67,43,0.10)"
                            : "0 8px 24px rgba(67,67,43,0.05)",
                          cursor: "pointer",
                          outline: "none",
                          transition: "all 200ms ease",
                          position: "relative",
                          ...(isRec ? roseGlow : {}),
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
                                color: BRAND.oliveInk,
                                fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                              }}
                            >
                              {sil.name}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "rgba(67,67,43,0.38)",
                                fontFamily: "var(--font-inter), system-ui, sans-serif",
                                marginTop: 4,
                              }}
                            >
                              ~{sil.yardage} yards
                            </div>
                          </div>

                          {isHover || isSel ? (
                            compactDeltaCluster({
                              deltas,
                              isHoverOrActive: true,
                              isRecommended: isRec,
                            })
                          ) : (
                            aggregateDeltaDot({ deltas })
                          )}
                        </div>

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
                              {isRec
                                ? "Gives the concept its ‘read’ immediately — sharp enough to feel intentional."
                                : "Sets proportion and posture — this will drive both fabric behavior and cost."}
                            </div>

                            {isRec && (
                              <div style={{ marginTop: 10 }}>
                                <div
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase" as const,
                                    color: "rgba(67,67,43,0.50)",
                                    fontFamily:
                                      "var(--font-sohne-breit), system-ui, sans-serif",
                                    marginBottom: 4,
                                  }}
                                >
                                  Why This Works
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    color: "rgba(67,67,43,0.62)",
                                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                                  }}
                                >
                                  Reinforces your direction&apos;s silhouette language — feels cohesive with
                                  the concept you locked.
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {silhouetteAffinity && !silhouetteAffinity.aligned && (
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
                      {silhouetteAffinity.note}
                    </span>
                  </div>
                )}
              </div>

              {/* Palette */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <div style={sectionHeading}>Palette</div>
                  <span
                    style={{
                      fontSize: 11,
                      color: "rgba(67,67,43,0.35)",
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                    }}
                  >
                    Recommended for {conceptContext.aestheticName}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  {paletteOptions.map((opt, idx) => {
                    const isSel = selectedPaletteIdx === idx;
                    const isRec = idx === recommendedPaletteIdx;
                    const isHover = hoveredPaletteIdx === idx;
                    const deltas = scorePaletteDeltas(idx);

                    const roseGlow = isRec
                      ? {
                          boxShadow:
                            "0 18px 50px rgba(169,123,143,0.16), 0 0 0 1px rgba(169,123,143,0.22), inset 0 1px 0 rgba(255,255,255,0.60)",
                          border: "1.5px solid rgba(169,123,143,0.28)",
                        }
                      : {};

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedPaletteIdx(idx)}
                        onMouseEnter={() => setHoveredPaletteIdx(idx)}
                        onMouseLeave={() => setHoveredPaletteIdx(null)}
                        style={{
                          flex: 1,
                          textAlign: "left",
                          borderRadius: 14,
                          padding: "14px 14px 12px",
                          background: isSel ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.55)",
                          border: isSel
                            ? `1.5px solid ${BRAND.chartreuse}`
                            : "1px solid rgba(67,67,43,0.10)",
                          boxShadow: isSel
                            ? "0 14px 40px rgba(67,67,43,0.10)"
                            : "0 8px 24px rgba(67,67,43,0.05)",
                          cursor: "pointer",
                          outline: "none",
                          transition: "all 200ms ease",
                          position: "relative",
                          ...(isRec ? roseGlow : {}),
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
                                display: "flex",
                                gap: 4,
                                marginBottom: 10,
                                justifyContent: "flex-start",
                              }}
                            >
                              {opt.palette.map((c, ci) => (
                                <div
                                  key={ci}
                                  style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: 5,
                                    backgroundColor: c.hex,
                                    border: "1px solid rgba(0,0,0,0.06)",
                                  }}
                                />
                              ))}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 650,
                                color: BRAND.oliveInk,
                                fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                                lineHeight: 1.3,
                              }}
                            >
                              {opt.name}
                            </div>
                          </div>

                          {isHover || isSel ? (
                            compactDeltaCluster({
                              deltas,
                              isHoverOrActive: true,
                              isRecommended: isRec,
                            })
                          ) : (
                            aggregateDeltaDot({ deltas })
                          )}
                        </div>

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
                              {isRec
                                ? "Makes the concept instantly legible — cool restraint with quiet authority."
                                : "Shifts mood and perceived value — palette is one of your strongest ‘intent’ levers."}
                            </div>

                            {isRec && (
                              <div style={{ marginTop: 10 }}>
                                <div
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase" as const,
                                    color: "rgba(67,67,43,0.50)",
                                    fontFamily:
                                      "var(--font-sohne-breit), system-ui, sans-serif",
                                    marginBottom: 4,
                                  }}
                                >
                                  Why This Works
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    color: "rgba(67,67,43,0.62)",
                                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                                  }}
                                >
                                  Aligns to your direction while staying flexible across product and styling.
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Palette preview */}
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    gap: 10,
                    justifyContent:
                      selectedPaletteIdx === 0
                        ? "flex-start"
                        : selectedPaletteIdx === 2
                          ? "flex-end"
                          : "center",
                    animation: "fadeIn 300ms ease-out",
                  }}
                >
                  {paletteOptions[selectedPaletteIdx].palette.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        width: 62,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 12,
                          backgroundColor: c.hex,
                          border: "1px solid rgba(0,0,0,0.05)",
                          boxShadow: "0 6px 16px rgba(67,67,43,0.08)",
                        }}
                      />
                      <span
                        style={{
                          fontSize: 10,
                          color: "rgba(67,67,43,0.50)",
                          fontFamily: "var(--font-inter), system-ui, sans-serif",
                        }}
                      >
                        {c.name}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          color: "rgba(67,67,43,0.28)",
                          fontFamily: "var(--font-inter), system-ui, sans-serif",
                        }}
                      >
                        {c.hex}
                      </span>
                    </div>
                  ))}
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
                      color: BRAND.chartreuse,
                      background: "rgba(171,171,99,0.10)",
                      border: "1px solid rgba(171,171,99,0.18)",
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                    }}
                  >
                    Default: {CONSTRUCTION_INFO[SMART_DEFAULTS[categoryId] || "moderate"].label}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  {(["low", "moderate", "high"] as ConstructionTier[]).map((tier) => {
                    const info = COMPLEXITY_CONTEXT[tier];
                    const isSel = constructionTier === tier;
                    const isRec = tier === baselineComplexity;
                    const isHover = hoveredComplexity === tier;
                    const deltas = scoreComplexityDeltas(tier);

                    const roseGlow = isRec
                      ? {
                          boxShadow:
                            "0 18px 50px rgba(169,123,143,0.16), 0 0 0 1px rgba(169,123,143,0.22), inset 0 1px 0 rgba(255,255,255,0.60)",
                          border: "1.5px solid rgba(169,123,143,0.28)",
                        }
                      : {};

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
                            ? `1.5px solid ${BRAND.chartreuse}`
                            : "1px solid rgba(67,67,43,0.10)",
                          boxShadow: isSel
                            ? "0 14px 40px rgba(67,67,43,0.10)"
                            : "0 8px 24px rgba(67,67,43,0.05)",
                          cursor: "pointer",
                          outline: "none",
                          transition: "all 200ms ease",
                          position: "relative",
                          ...(isRec ? roseGlow : {}),
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
                                color: BRAND.oliveInk,
                                fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                              }}
                            >
                              {info.label}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "rgba(67,67,43,0.38)",
                                fontFamily: "var(--font-inter), system-ui, sans-serif",
                                marginTop: 4,
                                lineHeight: 1.4,
                              }}
                            >
                              {info.description}
                            </div>
                          </div>

                          {isHover || isSel ? (
                            compactDeltaCluster({
                              deltas,
                              isHoverOrActive: true,
                              isRecommended: isRec,
                            })
                          ) : (
                            aggregateDeltaDot({ deltas })
                          )}
                        </div>

                        <div
                          style={{
                            fontSize: 10,
                            marginTop: 10,
                            padding: "3px 8px",
                            borderRadius: 999,
                            display: "inline-block",
                            color: info.includesLining ? BRAND.chartreuse : "rgba(67,67,43,0.45)",
                            background: info.includesLining ? "rgba(171,171,99,0.10)" : "rgba(67,67,43,0.04)",
                            fontFamily: "var(--font-inter), system-ui, sans-serif",
                            fontWeight: 600,
                          }}
                        >
                          {info.note}
                        </div>

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
                              {isRec
                                ? "The most ‘safe’ complexity for this category — reads intentional without blowing up cost."
                                : "Changes finishing + labor — this is the most direct margin lever after fabric."}
                            </div>

                            {isRec && (
                              <div style={{ marginTop: 10 }}>
                                <div
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase" as const,
                                    color: "rgba(67,67,43,0.50)",
                                    fontFamily:
                                      "var(--font-sohne-breit), system-ui, sans-serif",
                                    marginBottom: 4,
                                  }}
                                >
                                  Why This Works
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    color: "rgba(67,67,43,0.62)",
                                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                                  }}
                                >
                                  Keeps the piece executable while preserving a premium read.
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {COMPLEXITY_CONTEXT[constructionTier].liningOptional && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "12px 16px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.60)",
                      border: "1px solid rgba(67,67,43,0.10)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      animation: "fadeIn 300ms ease-out",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: "rgba(67,67,43,0.65)",
                        fontFamily: "var(--font-inter), system-ui, sans-serif",
                      }}
                    >
                      Add lining? <span style={{ color: "rgba(67,67,43,0.40)" }}>+$18 COGS</span>
                    </span>
                    <button
                      onClick={() => setAddLining(!addLining)}
                      style={{
                        width: 44,
                        height: 24,
                        borderRadius: 999,
                        border: "none",
                        cursor: "pointer",
                        position: "relative",
                        background: addLining ? BRAND.chartreuse : "rgba(67,67,43,0.15)",
                        transition: "background 200ms ease",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: 2,
                          left: addLining ? 22 : 2,
                          width: 20,
                          height: 20,
                          borderRadius: 999,
                          background: "white",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                          transition: "left 200ms ease",
                        }}
                      />
                    </button>
                  </div>
                )}

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
            </div>

            {/* RIGHT */}
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  inset: "-40px -30px",
                  zIndex: 0,
                  pointerEvents: "none",
                  overflow: "hidden",
                  borderRadius: 32,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    width: 380,
                    height: 380,
                    top: "-15%",
                    right: "-15%",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(186,156,168,0.32) 0%, rgba(186,156,168,0.08) 40%, transparent 65%)",
                    filter: "blur(60px)",
                    animation: "blobDrift1 12s ease-in-out infinite alternate",
                    opacity: pulseUpdated ? 0.95 : 0.75,
                    transition: "opacity 800ms ease",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    width: 340,
                    height: 340,
                    top: "25%",
                    left: "-18%",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(178,180,140,0.28) 0%, rgba(178,180,140,0.06) 40%, transparent 65%)",
                    filter: "blur(65px)",
                    animation: "blobDrift2 14s ease-in-out infinite alternate",
                    opacity: pulseUpdated ? 0.9 : 0.65,
                    transition: "opacity 800ms ease",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    width: 300,
                    height: 300,
                    bottom: "0%",
                    right: "5%",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(180,192,204,0.26) 0%, rgba(180,192,204,0.06) 40%, transparent 65%)",
                    filter: "blur(60px)",
                    animation: "blobDrift3 10s ease-in-out infinite alternate",
                    opacity: pulseUpdated ? 0.85 : 0.6,
                    transition: "opacity 800ms ease",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    width: 260,
                    height: 260,
                    top: "45%",
                    left: "15%",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(200,182,160,0.20) 0%, transparent 60%)",
                    filter: "blur(55px)",
                    animation: "blobDrift4 16s ease-in-out infinite alternate",
                    opacity: 0.55,
                  }}
                />
              </div>

              <div style={{ position: "sticky", top: 96, zIndex: 1 }}>
                {/* Pulse Rail */}
                <div
                  style={{
                    ...glassPanelBase,
                    padding: 18,
                    transition: "box-shadow 500ms ease, transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                    transform: pulseUpdated ? "translateY(-3px) scale(1.008)" : "translateY(0) scale(1)",
                    animation: pulseUpdated ? "panelGlowPulse 1.2s ease-out 1" : "none",
                  }}
                >
                  <div style={glassSheen} />
                  <div style={roseGlowStyle} />
                  <div style={{ position: "relative" }}>
                    <div style={{ ...microLabel, marginBottom: 12 }}>Pulse</div>
                    {[
                      {
                        label: "Identity",
                        dot: identityColor,
                        icon: <IconIdentity size={16} />,
                        score: `${dynamicIdentityScore}`,
                        accent: identityColor,
                      },
                      {
                        label: "Resonance",
                        dot: resonanceColor,
                        icon: <IconResonance size={16} />,
                        score: `${dynamicResonanceScore}`,
                        accent: resonanceColor,
                      },
                      {
                        label: "Execution",
                        dot: executionColor,
                        icon: <IconExecution size={16} />,
                        score: !insight ? "Pending" : `$${insight.cogs}`,
                        accent: executionColor,
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "14px 14px",
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.30)",
                          background: "rgba(255,255,255,0.18)",
                          backdropFilter: "blur(12px)",
                          WebkitBackdropFilter: "blur(12px)",
                          marginBottom: 10,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              background: row.dot,
                              boxShadow: executionStatus ? `0 0 0 4px ${executionColor}22` : "none",
                            }}
                          />
                          <div
                            style={{
                              fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                              fontWeight: 750,
                              fontSize: 12,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase" as const,
                              color: "rgba(67,67,43,0.74)",
                            }}
                          >
                            {row.label}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ color: row.accent, opacity: 0.95 }}>{row.icon}</span>
                          <span style={scoreTextStyle}>{row.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Muko Insight */}
                <div
                  style={{
                    ...glassPanelBase,
                    marginTop: 16,
                    padding: 18,
                    transition:
                      "box-shadow 500ms ease, transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 100ms",
                    transform: pulseUpdated ? "translateY(-2px) scale(1.005)" : "translateY(0) scale(1)",
                    animation: pulseUpdated ? "panelGlowPulse 1.2s ease-out 1 150ms" : "none",
                  }}
                >
                  <div style={glassSheen} />
                  <div style={roseGlowStyle} />
                  <div style={{ position: "relative" }}>
                    <div style={{ ...microLabel, marginBottom: 10 }}>Muko Insight</div>

                    {!mukoSynthesis || !insight ? (
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 650,
                            lineHeight: 1.45,
                            color: "rgba(67,67,43,0.82)",
                            fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                            marginBottom: 10,
                          }}
                        >
                          {mukoSynthesis?.headline || `Start by selecting a material`}
                        </div>

                        <div
                          style={{
                            fontSize: 13,
                            lineHeight: 1.58,
                            color: "rgba(67,67,43,0.66)",
                            fontFamily: "var(--font-inter), system-ui, sans-serif",
                            marginBottom: 10,
                          }}
                        >
                          {mukoSynthesis?.overall ||
                            "Look for the subtle rose glow — those are Muko’s recommendations for your locked direction."}
                        </div>

                        <div
                          style={{
                            fontSize: 13,
                            lineHeight: 1.58,
                            color: "rgba(67,67,43,0.60)",
                            fontFamily: "var(--font-inter), system-ui, sans-serif",
                          }}
                        >
                          {mukoSynthesis?.detail ||
                            "Choose a silhouette to see your full execution + margin readout (COGS vs ceiling)."}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ marginBottom: 14 }}>
                          <div
                            style={{
                              height: 4,
                              borderRadius: 2,
                              background: "rgba(67,67,43,0.08)",
                              position: "relative",
                            }}
                          >
                            <div
                              style={{
                                height: 4,
                                borderRadius: 2,
                                background:
                                  insight.type === "warning"
                                    ? BRAND.camel
                                    : insight.type === "strong"
                                      ? BRAND.chartreuse
                                      : BRAND.steelBlue,
                                width: `${Math.min((insight.cogs / insight.ceiling) * 100, 100)}%`,
                                transition: "width 600ms ease-out, background 300ms ease",
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                right: 0,
                                top: -3,
                                width: 1,
                                height: 10,
                                background: "rgba(67,67,43,0.22)",
                              }}
                            />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                            <span
                              style={{
                                fontSize: 10,
                                color: "rgba(67,67,43,0.35)",
                                fontFamily: "var(--font-inter), system-ui, sans-serif",
                              }}
                            >
                              $0
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                color: "rgba(67,67,43,0.35)",
                                fontFamily: "var(--font-inter), system-ui, sans-serif",
                              }}
                            >
                              ${insight.ceiling}
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 650,
                            lineHeight: 1.45,
                            color: "rgba(67,67,43,0.88)",
                            fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                            marginBottom: 10,
                          }}
                        >
                          {mukoSynthesis.headline}
                        </div>

                        <div
                          style={{
                            fontSize: 13,
                            lineHeight: 1.58,
                            color: "rgba(67,67,43,0.66)",
                            fontFamily: "var(--font-inter), system-ui, sans-serif",
                          }}
                        >
                          {mukoSynthesis.overall}
                        </div>

                        <div
                          style={{
                            marginTop: 10,
                            fontSize: 13,
                            lineHeight: 1.58,
                            color: "rgba(67,67,43,0.60)",
                            fontFamily: "var(--font-inter), system-ui, sans-serif",
                          }}
                        >
                          {mukoSynthesis.detail}
                        </div>

                        {mukoSynthesis.suggestions.length > 0 && (
                          <div style={{ marginTop: 14 }}>
                            <div style={{ ...microLabel, marginBottom: 8 }}>Suggestions</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              {mukoSynthesis.suggestions.slice(0, 3).map((sug, i) => (
                                <div
                                  key={`${sug.kind}-${i}`}
                                  style={{
                                    padding: "12px 14px",
                                    borderRadius: 14,
                                    background: "rgba(255,255,255,0.46)",
                                    border: "1px solid rgba(67,67,43,0.10)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 12,
                                  }}
                                >
                                  <div>
                                    <div
                                      style={{
                                        fontSize: 12.5,
                                        fontWeight: 700,
                                        color: "rgba(67,67,43,0.82)",
                                        fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                                      }}
                                    >
                                      {sug.label}
                                    </div>
                                    {sug.sub && (
                                      <div
                                        style={{
                                          marginTop: 4,
                                          fontSize: 12,
                                          lineHeight: 1.45,
                                          color: "rgba(67,67,43,0.55)",
                                          fontFamily: "var(--font-inter), system-ui, sans-serif",
                                        }}
                                      >
                                        {sug.sub}
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    onClick={sug.action}
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 650,
                                      color: BRAND.chartreuse,
                                      border: `1px solid ${BRAND.chartreuse}`,
                                      borderRadius: 999,
                                      padding: "6px 14px",
                                      background: "rgba(171,171,99,0.08)",
                                      cursor: "pointer",
                                      fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                                      flex: "0 0 auto",
                                    }}
                                  >
                                    Apply
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                  </div>
                </div>

                {/* Run Analysis Button (below Muko Insight — matches Concept Studio placement) */}
                <button
                  disabled={!isComplete}
                  onClick={() => console.log("Run Muko Analysis")}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: 14,
                    fontSize: 13,
                    fontWeight: 750,
                    fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                    color: isComplete ? BRAND.steelBlue : "rgba(67,67,43,0.32)",
                    background: isComplete ? "rgba(169,191,214,0.08)" : "rgba(255,255,255,0.46)",
                    border: isComplete ? `1.5px solid ${BRAND.steelBlue}` : "1.5px solid rgba(67,67,43,0.10)",
                    cursor: isComplete ? "pointer" : "not-allowed",
                    boxShadow: isComplete
                      ? "0 14px 44px rgba(169,191,214,0.16), inset 0 1px 0 rgba(255,255,255,0.60)"
                      : "none",
                    transition: "all 280ms cubic-bezier(0.4, 0, 0.2, 1)",
                    opacity: isComplete ? 1 : 0.75,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    animation: isComplete ? "continueReady 600ms ease-out 1" : "none",
                  }}
                >
                  <span>Run Muko Analysis</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    style={{
                      transition: "transform 280ms ease",
                      transform: isComplete ? "translateX(0)" : "translateX(-2px)",
                      opacity: isComplete ? 1 : 0.4,
                      animation: isComplete ? "arrowNudge 2s ease-in-out infinite 1s" : "none",
                    }}
                  >
                    <path
                      d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes blobDrift1 { 0% { transform: translate(0,0) scale(1); } 33% { transform: translate(-15px,20px) scale(1.08); } 66% { transform: translate(10px,-10px) scale(0.95); } 100% { transform: translate(-8px,15px) scale(1.04); } }
            @keyframes blobDrift2 { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(20px,-15px) scale(1.1); } 100% { transform: translate(-10px,10px) scale(0.96); } }
            @keyframes blobDrift3 { 0% { transform: translate(0,0) scale(1); } 40% { transform: translate(-12px,-18px) scale(1.06); } 100% { transform: translate(15px,8px) scale(0.98); } }
            @keyframes blobDrift4 { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(10px,12px) scale(1.05); } 100% { transform: translate(-8px,-6px) scale(0.97); } }
            @keyframes panelGlowPulse {
              0% { box-shadow: 0 24px 80px rgba(0,0,0,0.05), 0 8px 32px rgba(67,67,43,0.04), inset 0 1px 0 rgba(255,255,255,0.60), inset 0 -1px 0 rgba(255,255,255,0.12); }
              35% { box-shadow: 0 30px 100px rgba(186,156,168,0.22), 0 12px 48px rgba(186,156,168,0.12), 0 0 60px rgba(186,156,168,0.15), inset 0 1px 0 rgba(255,255,255,0.70), inset 0 -1px 0 rgba(255,255,255,0.15); }
              100% { box-shadow: 0 24px 80px rgba(0,0,0,0.05), 0 8px 32px rgba(67,67,43,0.04), inset 0 1px 0 rgba(255,255,255,0.60), inset 0 -1px 0 rgba(255,255,255,0.12); }
            }
            @keyframes continueReady { 0% { transform: translateY(4px); opacity: 0.6; } 100% { transform: translateY(0); opacity: 1; } }
            @keyframes arrowNudge { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(3px); } }
            @media (max-width: 1100px) { main > div > div[style*="grid-template-columns: 1fr 372px"] { grid-template-columns: 1fr !important; } }
          `}</style>
        </div>
      </main>
    </div>
  );
}
