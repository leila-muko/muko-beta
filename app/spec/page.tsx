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

import {
  IconIdentity,
  IconResonance,
} from "@/components/concept-studio/Icons";

/* ─── Brand tokens ─── */
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
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const MATERIAL_ICONS: Record<string, string> = {
  "organic-cotton": "○", tencel: "◎", linen: "▽", "recycled-poly": "◇",
  "cotton-twill": "□", modal: "◈", wool: "●", "merino-wool": "◉",
  silk: "✦", "silk-blend": "✧", denim: "▪", leather: "◆",
  "vegan-leather": "◇", cashmere: "✧", nylon: "△",
};

/* ─── Reusable styles ─── */
const scoreTextStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 650, color: "rgba(67, 67, 43, 0.62)",
  fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
};
const scoreIconWrapStyle: React.CSSProperties = {
  display: "inline-flex", width: 18, height: 18, alignItems: "center",
  justifyContent: "center", borderRadius: 999, background: "rgba(255,255,255,0.70)",
  border: "1px solid rgba(67, 67, 43, 0.10)", boxShadow: "0 6px 16px rgba(67, 67, 43, 0.06)",
};
const glassPanelBase: React.CSSProperties = {
  borderRadius: 20, border: "1px solid rgba(255, 255, 255, 0.35)",
  background: "rgba(255, 255, 255, 0.25)",
  backdropFilter: "blur(40px) saturate(180%)", WebkitBackdropFilter: "blur(40px) saturate(180%)",
  boxShadow: "0 24px 80px rgba(0,0,0,0.05), 0 8px 32px rgba(67,67,43,0.04), inset 0 1px 0 rgba(255,255,255,0.60), inset 0 -1px 0 rgba(255,255,255,0.12)",
  overflow: "hidden", position: "relative" as const,
};
const glassSheen: React.CSSProperties = {
  position: "absolute" as const, inset: 0, pointerEvents: "none" as const,
  background: "radial-gradient(ellipse 280px 120px at 15% -5%, rgba(255,255,255,0.35), transparent 65%), radial-gradient(ellipse 200px 100px at 90% 10%, rgba(255,255,255,0.15), transparent 60%)",
};
const sectionHeading: React.CSSProperties = {
  fontSize: 18, fontWeight: 650, color: BRAND.oliveInk,
  fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
};
const microLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase" as const,
  color: "rgba(67, 67, 43, 0.42)", fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
};

/* ─── Aesthetic palettes (3 options per aesthetic) ─── */
// Source: curated per aesthetic. In prod, these live in /data/aesthetics.json
// and are refreshed during Monday data updates.
const AESTHETIC_PALETTE_OPTIONS: Record<string, { name: string; palette: PaletteColor[] }[]> = {
  "refined-clarity": [
    {
      name: "Monochrome Authority",
      palette: [
        { hex: "#2C2C2C", name: "Charcoal" }, { hex: "#F5F0E8", name: "Ivory" },
        { hex: "#8B8B7A", name: "Stone" }, { hex: "#4A4A4A", name: "Graphite" },
        { hex: "#E8E0D4", name: "Parchment" }, { hex: "#1A1A1A", name: "Ink" },
      ],
    },
    {
      name: "Warm Neutrals",
      palette: [
        { hex: "#C4B5A0", name: "Sandstone" }, { hex: "#E8DFD0", name: "Linen" },
        { hex: "#8B7D6B", name: "Taupe" }, { hex: "#F5EDE3", name: "Cream" },
        { hex: "#6B5E4E", name: "Walnut" }, { hex: "#D4C8B8", name: "Oat" },
      ],
    },
    {
      name: "Cool Mineral",
      palette: [
        { hex: "#9BA8B4", name: "Slate Blue" }, { hex: "#F0EFED", name: "Cloud" },
        { hex: "#6B7B8A", name: "Pewter" }, { hex: "#D8D6D2", name: "Ash" },
        { hex: "#3D4A54", name: "Steel" }, { hex: "#B8BFC6", name: "Mist" },
      ],
    },
  ],
  "default": [
    {
      name: "Signature Muko",
      palette: [
        { hex: "#43432B", name: "Olive Ink" }, { hex: "#F5F2EB", name: "Cream" },
        { hex: "#A97B8F", name: "Dusty Rose" }, { hex: "#A9BFD6", name: "Steel Blue" },
        { hex: "#B8876B", name: "Camel" }, { hex: "#ABAB63", name: "Chartreuse" },
      ],
    },
    {
      name: "Earth & Stone",
      palette: [
        { hex: "#8B7355", name: "Desert Sand" }, { hex: "#A0522D", name: "Sienna" },
        { hex: "#D2B48C", name: "Tan" }, { hex: "#556B2F", name: "Olive" },
        { hex: "#F5F0E8", name: "Bone" }, { hex: "#2F4F4F", name: "Slate" },
      ],
    },
    {
      name: "Muted Jewel",
      palette: [
        { hex: "#5B4A5E", name: "Plum" }, { hex: "#6B7B6B", name: "Forest" },
        { hex: "#8B6F5E", name: "Umber" }, { hex: "#D4C8B8", name: "Oat" },
        { hex: "#7A8A9A", name: "Thistle" }, { hex: "#3D3D2E", name: "Moss" },
      ],
    },
  ],
};

/* ─── Silhouette aesthetic affinity ─── */
// Maps silhouette IDs to aesthetic keywords they align with.
// The Critic uses these to check if the selected silhouette
// fits the locked aesthetic direction.
const SILHOUETTE_AFFINITY: Record<string, string[]> = {
  // Outerwear
  "cocoon": ["soft", "volume", "romantic", "bohemian", "oversized"],
  "belted": ["structured", "refined", "feminine", "tailored", "classic"],
  "straight": ["minimal", "modern", "clean", "refined", "masculine"],
  "cropped": ["edgy", "playful", "sporty", "modern", "youthful"],
  // Tops
  "relaxed": ["casual", "bohemian", "soft", "minimal", "effortless"],
  "fitted": ["refined", "feminine", "structured", "classic", "polished"],
  "oversized": ["volume", "modern", "edgy", "street", "grunge"],
  "boxy": ["minimal", "modern", "clean", "architectural", "androgynous"],
  // Bottoms
  "wide-leg": ["refined", "feminine", "fluid", "elegant", "minimal"],
  "straight-leg": ["clean", "modern", "minimal", "classic", "versatile"],
  "slim": ["fitted", "modern", "sleek", "polished", "tailored"],
  "flare": ["retro", "feminine", "romantic", "bohemian", "playful"],
  // Dresses
  "column": ["refined", "minimal", "elegant", "architectural", "modern"],
  "a-line": ["feminine", "classic", "soft", "romantic", "versatile"],
  "wrap": ["feminine", "fluid", "refined", "flattering", "classic"],
  "shift": ["minimal", "modern", "clean", "architectural", "edgy"],
  // Knitwear
};

/* ─── Aesthetic keywords for matching ─── */
const AESTHETIC_KEYWORDS: Record<string, string[]> = {
  "refined-clarity": ["minimal", "structural", "refined", "modern", "clean", "tailored", "architectural", "polished"],
  "neo-western": ["rustic", "western", "earthy", "bohemian", "textured", "vintage"],
  "dark-romantic": ["romantic", "moody", "feminine", "dark", "dramatic", "edgy"],
  "coastal-minimalism": ["minimal", "clean", "soft", "natural", "effortless", "fluid"],
  "default": ["modern", "clean", "versatile"],
};

function getSilhouetteAffinity(silhouetteId: string, aestheticId: string): { aligned: boolean; note: string | null } {
  const silAffinity = SILHOUETTE_AFFINITY[silhouetteId] || [];
  const aestheticKws = AESTHETIC_KEYWORDS[aestheticId] || AESTHETIC_KEYWORDS["default"];

  const overlap = silAffinity.filter(kw => aestheticKws.includes(kw));
  const overlapRatio = silAffinity.length > 0 ? overlap.length / silAffinity.length : 0;

  if (overlapRatio >= 0.2) {
    return { aligned: true, note: null };
  }

  // Find a better silhouette
  return {
    aligned: false,
    note: `This silhouette leans ${silAffinity.slice(0, 2).join(", ")} — your ${aestheticId.replace("-", " ")} direction favors ${aestheticKws.slice(0, 2).join(", ")} shapes.`,
  };
}

/* ─── Construction lining context ─── */
const CONSTRUCTION_LINING: Record<ConstructionTier, {
  label: string; description: string; liningNote: string;
  includesLining: boolean; liningOptional: boolean;
}> = {
  low: { label: "Low", description: "Single-layer, minimal details", liningNote: "Unlined by default", includesLining: false, liningOptional: false },
  moderate: { label: "Moderate", description: "Multi-panel, standard seaming", liningNote: "Optional lining (+$18)", includesLining: false, liningOptional: true },
  high: { label: "High", description: "Complex tailoring, linings, hardware", liningNote: "Fully lined included", includesLining: true, liningOptional: false },
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

  const selectedCategory = useMemo(() => categories.find((c) => c.id === categoryId) || categories[0], [categoryId, categories]);
  const selectedMaterial = useMemo(() => materials.find((m) => m.id === materialId) || null, [materialId, materials]);
  const selectedSilhouette = useMemo(() => selectedCategory.silhouettes.find((s) => s.id === silhouetteId) || null, [silhouetteId, selectedCategory]);
  const alternativeMaterial = useMemo(() => (selectedMaterial ? findAlternativeMaterial(selectedMaterial, materials) : null), [selectedMaterial, materials]);

  const tierLining = CONSTRUCTION_LINING[constructionTier];
  const effectiveLined = tierLining.includesLining || (tierLining.liningOptional && addLining);

  // Silhouette affinity check
  const silhouetteAffinity = useMemo(() => {
    if (!silhouetteId) return null;
    return getSilhouetteAffinity(silhouetteId, conceptContext.aestheticMatchedId);
  }, [silhouetteId, conceptContext.aestheticMatchedId]);

  const insight = useMemo(() => {
    if (!selectedMaterial || !selectedSilhouette) return null;
    const breakdown = calculateCOGS(selectedMaterial, selectedSilhouette.yardage, constructionTier, effectiveLined, targetMSRP, brandTargetMargin);
    return generateInsight(breakdown, selectedMaterial, selectedSilhouette.name, constructionTier, effectiveLined, selectedSilhouette.yardage, alternativeMaterial);
  }, [selectedMaterial, selectedSilhouette, constructionTier, effectiveLined, targetMSRP, brandTargetMargin, alternativeMaterial]);

  useEffect(() => {
    if (insight) { setPulseUpdated(true); const t = setTimeout(() => setPulseUpdated(false), 1200); return () => clearTimeout(t); }
  }, [insight?.cogs, insight?.type]);

  const executionStatus = !insight ? null : insight.type === "warning" ? "red" : insight.type === "viable" ? "yellow" : "green";
  const executionColor = executionStatus === "green" ? BRAND.chartreuse : executionStatus === "yellow" ? BRAND.rose : executionStatus === "red" ? BRAND.camel : "rgba(67, 67, 43, 0.22)";
  const identityColor = conceptContext.identityScore >= 80 ? BRAND.chartreuse : conceptContext.identityScore >= 60 ? BRAND.rose : BRAND.camel;
  const resonanceColor = conceptContext.resonanceScore >= 80 ? BRAND.chartreuse : conceptContext.resonanceScore >= 60 ? BRAND.rose : BRAND.camel;

  const paletteOptions = AESTHETIC_PALETTE_OPTIONS[conceptContext.aestheticMatchedId] || AESTHETIC_PALETTE_OPTIONS["default"];

  const handleCategoryChange = (newId: string) => {
    setCategoryId(newId); setSilhouetteId("");
    setConstructionTier(SMART_DEFAULTS[newId] || "moderate");
    setOverrideWarning(null); setAddLining(false);
  };
  const handleConstructionChange = (tier: ConstructionTier) => {
    setConstructionTier(tier); setAddLining(false);
    setOverrideWarning(getOverrideWarning(categoryId, selectedCategory.name, tier, SMART_DEFAULTS[categoryId] || "moderate"));
  };
  const handleSwapMaterial = (newId: string) => setMaterialId(newId);

  const isComplete = materialId && silhouetteId && constructionTier;
  const marginCeiling = Math.round(targetMSRP * (1 - brandTargetMargin));
  const altSharedProps = selectedMaterial && alternativeMaterial ? selectedMaterial.properties.filter((p) => alternativeMaterial.properties.includes(p)) : [];

  // Build combined insight text including silhouette affinity
  const insightWithAffinity = useMemo(() => {
    if (!insight) return null;
    let body = insight.body;
    if (silhouetteAffinity && !silhouetteAffinity.aligned) {
      body += ` Also: ${silhouetteAffinity.note}`;
    }
    return { ...insight, body };
  }, [insight, silhouetteAffinity]);

  const roseGlowStyle: React.CSSProperties = {
    position: "absolute" as const, inset: -3, borderRadius: 23, pointerEvents: "none" as const,
    opacity: pulseUpdated ? 1 : 0, transition: "opacity 600ms cubic-bezier(0.4, 0, 0.2, 1)",
    background: pulseUpdated ? "radial-gradient(ellipse 120% 80% at 50% 30%, rgba(186, 156, 168, 0.14), transparent 70%)" : "transparent",
    boxShadow: pulseUpdated ? "0 0 50px rgba(186, 156, 168, 0.35), 0 0 100px rgba(186, 156, 168, 0.18)" : "none",
    border: pulseUpdated ? "1.5px solid rgba(186, 156, 168, 0.30)" : "1.5px solid transparent",
  };

  /* ─── Content width wrapper for alignment ─── */
  const CONTENT_MAX = "100%";

  return (
    <div style={{ minHeight: "100vh", background: BRAND.parchment, display: "flex", position: "relative" }}>

      {/* ═══ TOP NAV ═══ */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 72,
        background: "rgba(250, 249, 246, 0.86)", backdropFilter: "blur(26px) saturate(180%)",
        WebkitBackdropFilter: "blur(26px) saturate(180%)", borderBottom: "1px solid rgba(67, 67, 43, 0.10)", zIndex: 200,
      }}>
        <div style={{ maxWidth: 1520, margin: "0 auto", height: "100%", padding: "0 64px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ fontFamily: "var(--font-sohne-breit), system-ui, sans-serif", fontWeight: 700, letterSpacing: "-0.02em", color: BRAND.oliveInk, fontSize: 18 }}>muko</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {[
                { label: "Entry", state: "done" }, { label: "Concept", state: "done" },
                { label: "Spec", state: "active" }, { label: "Report", state: "idle" },
              ].map((s) => {
                const isDone = s.state === "done"; const isActive = s.state === "active";
                return (
                  <div key={s.label} style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 999,
                    border: isDone ? `1.5px solid ${BRAND.chartreuse}` : isActive ? `1.5px solid ${BRAND.steelBlue}` : "1.5px solid rgba(67, 67, 43, 0.10)",
                    background: isDone ? "rgba(171, 171, 99, 0.10)" : isActive ? "rgba(169, 191, 214, 0.08)" : "rgba(67, 67, 43, 0.03)",
                    boxShadow: isActive ? "0 8px 24px rgba(169, 191, 214, 0.14), inset 0 1px 0 rgba(255,255,255,0.80)" : isDone ? "0 6px 18px rgba(171, 171, 99, 0.08)" : "none",
                    fontFamily: "var(--font-sohne-breit), system-ui, sans-serif", fontSize: 12, fontWeight: 650, letterSpacing: "0.01em",
                  }}>
                    {isDone ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill={BRAND.chartreuse} opacity="0.22" /><path d="M4.5 7.2L6.2 8.8L9.5 5.5" stroke={BRAND.chartreuse} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    ) : isActive ? (
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: BRAND.steelBlue, boxShadow: "0 0 0 3px rgba(169, 191, 214, 0.22)" }} />
                    ) : (
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: "rgba(67, 67, 43, 0.18)" }} />
                    )}
                    <span style={{ color: isDone ? "rgba(67, 67, 43, 0.72)" : isActive ? "rgba(67, 67, 43, 0.85)" : "rgba(67, 67, 43, 0.38)" }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(67, 67, 43, 0.55)", fontFamily: "var(--font-sohne-breit), system-ui, sans-serif", letterSpacing: "0.04em" }}>
              {headerSeasonLabel}<span style={{ padding: "0 8px", opacity: 0.35 }}>·</span>{headerCollectionName}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { label: "Back", icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>, onClick: () => window.history.back() },
                { label: "Save & Close", icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 8.5V11.5C11 11.776 10.776 12 10.5 12H3.5C3.224 12 3 11.776 3 11.5V2.5C3 2.224 3.224 2 3.5 2H8.5L11 4.5V8.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /><path d="M8.5 2V4.5H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 8H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M5 10H7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>, onClick: () => console.log("Save & Close") },
              ].map((btn) => (
                <button key={btn.label} onClick={btn.onClick} style={{
                  fontSize: 12, fontWeight: 650, color: BRAND.rose, background: "rgba(169, 123, 143, 0.06)",
                  border: "1px solid rgba(169, 123, 143, 0.18)", borderRadius: 999, padding: "7px 14px 7px 10px",
                  cursor: "pointer", fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                  display: "flex", alignItems: "center", gap: 5, transition: "all 180ms ease",
                }}>{btn.icon}{btn.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MAIN ═══ */}
      <main style={{ flex: 1, paddingTop: 88 }}>
        <div style={{ padding: "46px 72px 120px", maxWidth: 1520, margin: "0 auto" }}>

          {/* Page header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 32, fontWeight: 600, color: BRAND.oliveInk, margin: 0, fontFamily: "var(--font-sohne-breit), system-ui, sans-serif", letterSpacing: "-0.01em" }}>
              Spec Studio
            </h1>
            <p style={{ fontSize: 14, color: "rgba(67, 67, 43, 0.55)", fontFamily: "var(--font-inter), system-ui, sans-serif", marginTop: 14, marginBottom: 0 }}>
              Define the physical product — Muko will check your margins and feasibility in real time.
            </p>
          </div>

          {/* ─── Locked Concept Bar (compact, single-line) ─── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 18px", borderRadius: 14,
            background: "rgba(255,255,255,0.62)", border: `1px solid ${BRAND.chartreuse}`,
            boxShadow: "0 10px 32px rgba(67, 67, 43, 0.06), inset 0 0 0 1px rgba(255,255,255,0.50)",
            marginBottom: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" as const }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: BRAND.chartreuse, boxShadow: "0 0 0 3px rgba(171, 171, 99, 0.18)", flex: "0 0 auto" }} />
              <span style={{ fontSize: 16, fontWeight: 650, color: BRAND.oliveInk, fontFamily: "var(--font-sohne-breit), system-ui, sans-serif" }}>
                {refinement.base}
              </span>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <span style={{ ...scoreIconWrapStyle, color: identityColor }}><IconIdentity size={14} /></span>
                  <span style={scoreTextStyle}>{conceptContext.identityScore}</span>
                </div>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <span style={{ ...scoreIconWrapStyle, color: resonanceColor }}><IconResonance size={14} /></span>
                  <span style={scoreTextStyle}>{conceptContext.resonanceScore}</span>
                </div>
              </div>
              {refinement.modifiers.length > 0 && (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {refinement.modifiers.map((m) => (
                    <span key={m} style={{
                      padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 650,
                      color: "rgba(67, 67, 43, 0.60)", background: "rgba(171, 171, 99, 0.10)",
                      border: "1px solid rgba(171, 171, 99, 0.18)", fontFamily: "var(--font-inter), system-ui, sans-serif",
                    }}>{m}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── Top Rail: Category + MSRP + COGS ─── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 32, padding: "14px 0", marginBottom: 32,
            borderBottom: "1px solid rgba(67, 67, 43, 0.08)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={microLabel}>Category</span>
              <select value={categoryId} onChange={(e) => handleCategoryChange(e.target.value)} style={{
                padding: "10px 36px 10px 16px", borderRadius: 12, width: 180,
                border: "1px solid rgba(67, 67, 43, 0.12)", background: "rgba(255,255,255,0.78)",
                fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 14, fontWeight: 500,
                color: BRAND.oliveInk, cursor: "pointer", outline: "none",
                boxShadow: "0 10px 26px rgba(67, 67, 43, 0.06)",
                appearance: "none" as const,
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2343432B' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' opacity='0.4'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 14px center",
              }}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={microLabel}>Target MSRP</span>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "rgba(67, 67, 43, 0.45)" }}>$</span>
                <input type="number" value={targetMSRP} onChange={(e) => setTargetMSRP(Number(e.target.value))} style={{
                  padding: "10px 16px 10px 28px", borderRadius: 12, width: 180,
                  border: "1px solid rgba(67, 67, 43, 0.12)", background: "rgba(255,255,255,0.78)",
                  fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 14, fontWeight: 500,
                  color: BRAND.oliveInk, outline: "none", boxShadow: "0 10px 26px rgba(67, 67, 43, 0.06)",
                }} />
              </div>
              <span style={{ fontSize: 11, color: "rgba(67, 67, 43, 0.35)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>Ceiling: ${marginCeiling}</span>
            </div>

            {insight && (
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={microLabel}>Est. COGS</span>
                <span style={{
                  fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" as const,
                  color: insight.type === "warning" ? BRAND.camel : insight.type === "strong" ? BRAND.chartreuse : BRAND.steelBlue,
                  fontFamily: "var(--font-sohne-breit), system-ui, sans-serif", transition: "color 300ms ease",
                }}>${insight.cogs}</span>
              </div>
            )}
          </div>

          {/* ═══ 2-COLUMN LAYOUT ═══ */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 372px", gap: 40, alignItems: "start" }}>

            {/* ═══ LEFT ═══ */}
            <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>

              {/* Material */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={sectionHeading}>Material</div>
                  <span style={{ fontSize: 11, color: "rgba(67, 67, 43, 0.35)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>Industry benchmark pricing</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {materials.map((mat) => {
                    const isSel = materialId === mat.id;
                    return (
                      <button key={mat.id} onClick={() => setMaterialId(mat.id)} style={{
                        textAlign: "left", borderRadius: 14, padding: "14px 14px 12px",
                        background: isSel ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)",
                        border: isSel ? `1.5px solid ${BRAND.chartreuse}` : "1px solid rgba(67, 67, 43, 0.10)",
                        boxShadow: isSel ? "0 14px 40px rgba(67,67,43,0.10), inset 0 0 0 1px rgba(255,255,255,0.50)" : "0 8px 24px rgba(67,67,43,0.05)",
                        cursor: "pointer", outline: "none", transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                        transform: isSel ? "translateY(-1px)" : "translateY(0)",
                      }}>
                        <div style={{ fontSize: 16, marginBottom: 4 }}>{MATERIAL_ICONS[mat.id] || "○"}</div>
                        <div style={{ fontSize: 13, fontWeight: 650, color: BRAND.oliveInk, fontFamily: "var(--font-sohne-breit), system-ui, sans-serif", marginBottom: 2 }}>{mat.name}</div>
                        <div style={{ fontSize: 11, color: "rgba(67,67,43,0.45)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>${mat.cost_per_yard}/yd · {mat.lead_time_weeks}wk</div>
                      </button>
                    );
                  })}
                </div>
                {selectedMaterial && alternativeMaterial && (
                  <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 12, background: "rgba(171,171,99,0.06)", border: "1px dashed rgba(171,171,99,0.28)", display: "flex", alignItems: "center", justifyContent: "space-between", animation: "fadeIn 300ms ease-out" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13 }}>💡</span>
                      <span style={{ fontSize: 12, color: "rgba(67,67,43,0.60)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
                        Similar feel, lower cost: <strong style={{ color: BRAND.oliveInk, fontFamily: "var(--font-sohne-breit), system-ui, sans-serif", fontWeight: 650 }}>{alternativeMaterial.name}</strong> (${alternativeMaterial.cost_per_yard}/yd){altSharedProps.length > 0 && <> — shares {altSharedProps.join(", ")}</>}
                      </span>
                    </div>
                    <button onClick={() => handleSwapMaterial(alternativeMaterial.id)} style={{ fontSize: 11, fontWeight: 650, color: BRAND.chartreuse, border: `1px solid ${BRAND.chartreuse}`, borderRadius: 999, padding: "5px 14px", background: "rgba(171,171,99,0.08)", cursor: "pointer", fontFamily: "var(--font-sohne-breit), system-ui, sans-serif" }}>Swap</button>
                  </div>
                )}
              </div>

              {/* Silhouette */}
              <div>
                <div style={{ marginBottom: 12 }}>
                  <span style={sectionHeading}>Silhouette</span>
                  <span style={{ fontSize: 13, color: "rgba(67,67,43,0.40)", fontFamily: "var(--font-inter), system-ui, sans-serif", marginLeft: 10 }}>for {selectedCategory.name}</span>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {selectedCategory.silhouettes.map((sil) => {
                    const isSel = silhouetteId === sil.id;
                    return (
                      <button key={sil.id} onClick={() => setSilhouetteId(sil.id)} style={{
                        flex: 1, textAlign: "center", borderRadius: 14, padding: "16px 12px",
                        background: isSel ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)",
                        border: isSel ? `1.5px solid ${BRAND.chartreuse}` : "1px solid rgba(67,67,43,0.10)",
                        boxShadow: isSel ? "0 14px 40px rgba(67,67,43,0.10)" : "0 8px 24px rgba(67,67,43,0.05)",
                        cursor: "pointer", outline: "none", transition: "all 200ms ease",
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 650, color: BRAND.oliveInk, fontFamily: "var(--font-sohne-breit), system-ui, sans-serif" }}>{sil.name}</div>
                        <div style={{ fontSize: 11, color: "rgba(67,67,43,0.38)", fontFamily: "var(--font-inter), system-ui, sans-serif", marginTop: 4 }}>~{sil.yardage} yards</div>
                      </button>
                    );
                  })}
                </div>
                {/* Silhouette affinity warning */}
                {silhouetteAffinity && !silhouetteAffinity.aligned && (
                  <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 12, background: "rgba(184,135,107,0.08)", border: "1px solid rgba(184,135,107,0.22)", display: "flex", alignItems: "center", gap: 8, animation: "fadeIn 300ms ease-out" }}>
                    <span style={{ fontSize: 13, color: BRAND.camel }}>⚠</span>
                    <span style={{ fontSize: 12, color: "rgba(67,67,43,0.65)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>{silhouetteAffinity.note}</span>
                  </div>
                )}
              </div>

              {/* Construction */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={sectionHeading}>Construction</span>
                  <span style={{ fontSize: 11, fontWeight: 650, color: BRAND.chartreuse, background: "rgba(171,171,99,0.10)", border: "1px solid rgba(171,171,99,0.18)", borderRadius: 999, padding: "4px 10px", fontFamily: "var(--font-sohne-breit), system-ui, sans-serif" }}>
                    Default: {CONSTRUCTION_INFO[SMART_DEFAULTS[categoryId] || "moderate"].label}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {(["low", "moderate", "high"] as ConstructionTier[]).map((tier) => {
                    const info = CONSTRUCTION_LINING[tier]; const isSel = constructionTier === tier;
                    return (
                      <button key={tier} onClick={() => handleConstructionChange(tier)} style={{
                        flex: 1, textAlign: "center", borderRadius: 14, padding: "16px 12px",
                        background: isSel ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)",
                        border: isSel ? `1.5px solid ${BRAND.chartreuse}` : "1px solid rgba(67,67,43,0.10)",
                        boxShadow: isSel ? "0 14px 40px rgba(67,67,43,0.10)" : "0 8px 24px rgba(67,67,43,0.05)",
                        cursor: "pointer", outline: "none", transition: "all 200ms ease",
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 650, color: BRAND.oliveInk, fontFamily: "var(--font-sohne-breit), system-ui, sans-serif" }}>{info.label}</div>
                        <div style={{ fontSize: 11, color: "rgba(67,67,43,0.38)", fontFamily: "var(--font-inter), system-ui, sans-serif", marginTop: 4, lineHeight: 1.4 }}>{info.description}</div>
                        <div style={{ fontSize: 10, marginTop: 6, padding: "3px 8px", borderRadius: 999, display: "inline-block", color: info.includesLining ? BRAND.chartreuse : "rgba(67,67,43,0.45)", background: info.includesLining ? "rgba(171,171,99,0.10)" : "rgba(67,67,43,0.04)", fontFamily: "var(--font-inter), system-ui, sans-serif", fontWeight: 600 }}>{info.liningNote}</div>
                      </button>
                    );
                  })}
                </div>
                {tierLining.liningOptional && (
                  <div style={{ marginTop: 10, padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.60)", border: "1px solid rgba(67,67,43,0.10)", display: "flex", alignItems: "center", justifyContent: "space-between", animation: "fadeIn 300ms ease-out" }}>
                    <span style={{ fontSize: 13, color: "rgba(67,67,43,0.65)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>Add lining? <span style={{ color: "rgba(67,67,43,0.40)" }}>+$18 COGS</span></span>
                    <button onClick={() => setAddLining(!addLining)} style={{ width: 44, height: 24, borderRadius: 999, border: "none", cursor: "pointer", position: "relative", background: addLining ? BRAND.chartreuse : "rgba(67,67,43,0.15)", transition: "background 200ms ease" }}>
                      <span style={{ position: "absolute", top: 2, left: addLining ? 22 : 2, width: 20, height: 20, borderRadius: 999, background: "white", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", transition: "left 200ms ease" }} />
                    </button>
                  </div>
                )}
                {overrideWarning && (
                  <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 12, background: "rgba(184,135,107,0.08)", border: "1px solid rgba(184,135,107,0.22)", display: "flex", alignItems: "center", gap: 8, animation: "fadeIn 300ms ease-out" }}>
                    <span style={{ fontSize: 13, color: BRAND.camel }}>⚠</span>
                    <span style={{ fontSize: 12, color: "rgba(67,67,43,0.65)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>{overrideWarning}</span>
                  </div>
                )}
              </div>

              {/* ─── Palette (3 tile options) ─── */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={sectionHeading}>Palette</div>
                  <span style={{ fontSize: 11, color: "rgba(67,67,43,0.35)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>Recommended for {conceptContext.aestheticName}</span>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {paletteOptions.map((opt, idx) => {
                    const isSel = selectedPaletteIdx === idx;
                    return (
                      <button key={idx} onClick={() => setSelectedPaletteIdx(idx)} style={{
                        flex: 1, textAlign: "center", borderRadius: 14, padding: "16px 14px 14px",
                        background: isSel ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)",
                        border: isSel ? `1.5px solid ${BRAND.chartreuse}` : "1px solid rgba(67,67,43,0.10)",
                        boxShadow: isSel ? "0 14px 40px rgba(67,67,43,0.10)" : "0 8px 24px rgba(67,67,43,0.05)",
                        cursor: "pointer", outline: "none", transition: "all 200ms ease",
                      }}>
                        {/* Swatch row */}
                        <div style={{ display: "flex", gap: 4, marginBottom: 10, justifyContent: "center" }}>
                          {opt.palette.map((c, ci) => (
                            <div key={ci} style={{
                              width: 24, height: 24, borderRadius: 6,
                              backgroundColor: c.hex, border: "1px solid rgba(0,0,0,0.06)",
                            }} />
                          ))}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 650, color: BRAND.oliveInk, fontFamily: "var(--font-sohne-breit), system-ui, sans-serif", lineHeight: 1.3 }}>
                          {opt.name}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Expanded palette preview */}
                <div style={{ marginTop: 12, padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.60)", border: "1px solid rgba(67,67,43,0.08)", animation: "fadeIn 300ms ease-out" }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    {paletteOptions[selectedPaletteIdx].palette.map((c, i) => (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ width: "100%", aspectRatio: "1", borderRadius: 10, backgroundColor: c.hex, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 6px 18px rgba(67,67,43,0.08)" }} />
                        <span style={{ fontSize: 10, color: "rgba(67,67,43,0.50)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>{c.name}</span>
                        <span style={{ fontSize: 9, color: "rgba(67,67,43,0.28)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>{c.hex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ RIGHT — INTELLIGENCE ═══ */}
            <div style={{ position: "relative" }}>
              {/* Ambient mesh */}
              <div style={{ position: "absolute", inset: "-40px -30px", zIndex: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 32 }}>
                <div style={{ position: "absolute", width: 380, height: 380, top: "-15%", right: "-15%", borderRadius: "50%", background: "radial-gradient(circle, rgba(186,156,168,0.32) 0%, rgba(186,156,168,0.08) 40%, transparent 65%)", filter: "blur(60px)", animation: "blobDrift1 12s ease-in-out infinite alternate", opacity: pulseUpdated ? 0.95 : 0.75, transition: "opacity 800ms ease" }} />
                <div style={{ position: "absolute", width: 340, height: 340, top: "25%", left: "-18%", borderRadius: "50%", background: "radial-gradient(circle, rgba(178,180,140,0.28) 0%, rgba(178,180,140,0.06) 40%, transparent 65%)", filter: "blur(65px)", animation: "blobDrift2 14s ease-in-out infinite alternate", opacity: pulseUpdated ? 0.9 : 0.65, transition: "opacity 800ms ease" }} />
                <div style={{ position: "absolute", width: 300, height: 300, bottom: "0%", right: "5%", borderRadius: "50%", background: "radial-gradient(circle, rgba(180,192,204,0.26) 0%, rgba(180,192,204,0.06) 40%, transparent 65%)", filter: "blur(60px)", animation: "blobDrift3 10s ease-in-out infinite alternate", opacity: pulseUpdated ? 0.85 : 0.6, transition: "opacity 800ms ease" }} />
                <div style={{ position: "absolute", width: 260, height: 260, top: "45%", left: "15%", borderRadius: "50%", background: "radial-gradient(circle, rgba(200,182,160,0.20) 0%, transparent 60%)", filter: "blur(55px)", animation: "blobDrift4 16s ease-in-out infinite alternate", opacity: 0.55 }} />
              </div>

              <div style={{ position: "sticky", top: 96, zIndex: 1 }}>
                {/* Pulse Rail */}
                <div style={{ ...glassPanelBase, padding: 18, transition: "box-shadow 500ms ease, transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)", transform: pulseUpdated ? "translateY(-3px) scale(1.008)" : "translateY(0) scale(1)", animation: pulseUpdated ? "panelGlowPulse 1.2s ease-out 1" : "none" }}>
                  <div style={glassSheen} /><div style={roseGlowStyle} />
                  <div style={{ position: "relative" }}>
                    <div style={{ ...microLabel, marginBottom: 12 }}>Pulse</div>
                    {[
                      { label: "Identity", locked: true, dot: identityColor, icon: <IconIdentity size={16} />, score: `${conceptContext.identityScore}`, accent: identityColor },
                      { label: "Resonance", locked: true, dot: resonanceColor, icon: <IconResonance size={16} />, score: `${conceptContext.resonanceScore}`, accent: resonanceColor },
                      { label: "Execution", locked: false, dot: executionColor, icon: <IconExecution size={16} />, score: !insight ? "Pending" : `$${insight.cogs}`, accent: executionColor },
                    ].map((row) => (
                      <div key={row.label} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "14px 14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.30)",
                        background: "rgba(255,255,255,0.18)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                        marginBottom: 10, opacity: row.locked ? 0.55 : 1, transition: "opacity 400ms ease",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 999, background: row.dot, boxShadow: row.locked ? "0 0 0 4px rgba(171,171,99,0.14)" : executionStatus ? `0 0 0 4px ${executionColor}22` : "none" }} />
                          <div style={{ fontFamily: "var(--font-sohne-breit), system-ui, sans-serif", fontWeight: 750, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "rgba(67,67,43,0.74)" }}>{row.label}</div>
                          {row.locked && <span style={{ fontSize: 10, color: "rgba(67,67,43,0.35)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>Locked</span>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ ...scoreIconWrapStyle, color: row.accent }}>{row.icon}</span>
                          <span style={scoreTextStyle}>{row.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Muko Insight */}
                <div style={{ ...glassPanelBase, marginTop: 16, padding: 18, transition: "box-shadow 500ms ease, transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 100ms", transform: pulseUpdated ? "translateY(-2px) scale(1.005)" : "translateY(0) scale(1)", animation: pulseUpdated ? "panelGlowPulse 1.2s ease-out 1 150ms" : "none" }}>
                  <div style={glassSheen} /><div style={roseGlowStyle} />
                  <div style={{ position: "relative" }}>
                    <div style={{ ...microLabel, marginBottom: 10 }}>Muko Insight</div>

                    {!insightWithAffinity ? (
                      <div style={{ fontSize: 13, lineHeight: 1.58, color: "rgba(67,67,43,0.45)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
                        Start making selections to see live intelligence…
                      </div>
                    ) : (
                      <>
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ height: 4, borderRadius: 2, background: "rgba(67,67,43,0.08)", position: "relative" }}>
                            <div style={{ height: 4, borderRadius: 2, background: insightWithAffinity.type === "warning" ? BRAND.camel : insightWithAffinity.type === "strong" ? BRAND.chartreuse : BRAND.steelBlue, width: `${Math.min((insightWithAffinity.cogs / insightWithAffinity.ceiling) * 100, 100)}%`, transition: "width 600ms ease-out, background 300ms ease" }} />
                            <div style={{ position: "absolute", right: 0, top: -3, width: 1, height: 10, background: "rgba(67,67,43,0.22)" }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                            <span style={{ fontSize: 10, color: "rgba(67,67,43,0.35)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>$0</span>
                            <span style={{ fontSize: 10, color: "rgba(67,67,43,0.35)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>${insightWithAffinity.ceiling}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.45, color: "rgba(67,67,43,0.88)", fontFamily: "var(--font-inter), system-ui, sans-serif", marginBottom: 6 }}>{insightWithAffinity.headline}</div>
                        <div style={{ fontSize: 13, lineHeight: 1.58, color: "rgba(67,67,43,0.62)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>{insightWithAffinity.body}</div>
                        {insightWithAffinity.alternative && (
                          <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12, background: "rgba(171,171,99,0.08)", border: "1px solid rgba(171,171,99,0.18)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 12 }}>💡</span>
                                <span style={{ fontSize: 12, fontWeight: 650, color: BRAND.oliveInk, fontFamily: "var(--font-sohne-breit), system-ui, sans-serif" }}>Try {insightWithAffinity.alternative.name}</span>
                              </div>
                              <span style={{ fontSize: 11, color: "rgba(67,67,43,0.50)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
                                ${insightWithAffinity.alternative.cost}/yd · saves ~${insightWithAffinity.alternative.saving}
                                {insightWithAffinity.alternative.sharedProperties.length > 0 && <> · {insightWithAffinity.alternative.sharedProperties.join(", ")}</>}
                              </span>
                            </div>
                            <button onClick={() => { const alt = materials.find(m => m.name === insightWithAffinity.alternative?.name); if (alt) handleSwapMaterial(alt.id); }} style={{ fontSize: 11, fontWeight: 650, color: BRAND.chartreuse, border: `1px solid ${BRAND.chartreuse}`, borderRadius: 999, padding: "5px 14px", background: "rgba(171,171,99,0.08)", cursor: "pointer", fontFamily: "var(--font-sohne-breit), system-ui, sans-serif" }}>Swap</button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Run Analysis Button */}
                <button disabled={!isComplete} onClick={() => console.log("Run Muko Analysis")} style={{
                  marginTop: 16, width: "100%", padding: "14px 16px", borderRadius: 14,
                  fontSize: 13, fontWeight: 750, fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                  color: isComplete ? BRAND.steelBlue : "rgba(67,67,43,0.32)",
                  background: isComplete ? "rgba(169,191,214,0.08)" : "rgba(255,255,255,0.46)",
                  border: isComplete ? `1.5px solid ${BRAND.steelBlue}` : "1.5px solid rgba(67,67,43,0.10)",
                  cursor: isComplete ? "pointer" : "not-allowed",
                  boxShadow: isComplete ? "0 14px 44px rgba(169,191,214,0.16), inset 0 1px 0 rgba(255,255,255,0.60)" : "none",
                  transition: "all 280ms cubic-bezier(0.4, 0, 0.2, 1)", opacity: isComplete ? 1 : 0.75,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  animation: isComplete ? "continueReady 600ms ease-out 1" : "none",
                }}>
                  <span>Run Muko Analysis</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition: "transform 280ms ease", transform: isComplete ? "translateX(0)" : "translateX(-2px)", opacity: isComplete ? 1 : 0.4, animation: isComplete ? "arrowNudge 2s ease-in-out infinite 1s" : "none" }}>
                    <path d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

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
  );
}