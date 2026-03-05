"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSessionStore } from "@/lib/store/sessionStore";
import type { KeyPiece } from "@/lib/store/sessionStore";
import {
  BRAND,
  AESTHETICS,
  TOP_SUGGESTED,
  AESTHETIC_CONTENT,
} from "../../lib/concept-studio/constants";
import {
  seededShuffle,
  matchAestheticToFolder,
  interpretRefine,
} from "../../lib/concept-studio/utils";
import FloatingMukoOrb from "@/components/FloatingMukoOrb";
import aestheticsData from "@/data/aesthetics.json";
import chipTensionsData from "@/data/chip_tensions.json";
import { ResizableSplitPanel } from "@/components/ui/ResizableSplitPanel";
import { PulseScoreRow } from "@/components/ui/PulseScoreRow";
import { MukoInsightSection } from "@/components/ui/MukoInsightSection";
import { buildConceptBlackboard, toAestheticSlug } from "@/lib/synthesizer/assemble";
import type { InsightData } from "@/lib/types/insight";
import { createClient } from "@/lib/supabase/client";
import { debounce } from "@/lib/utils/debounce";
import {
  checkMarketSaturation,
  getResonanceScore,
  getProxyMessage,
  type Aesthetic as ResearcherAesthetic,
} from "@/lib/agents/researcher";

/* ─── Pulse icons ─────────────────────────────────────────────────────────── */
function IconIdentity({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconResonance({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" stroke={color} strokeWidth="1.6" />
      <path d="M23 21V19C22.99 17.18 21.8 15.58 20 15.13" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3.13C17.8 3.58 18.99 5.18 18.99 7C18.99 8.82 17.8 10.42 16 10.87" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconExecution({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Design tokens ───────────────────────────────────────────────────────── */
const CHARTREUSE = "#A8B475";
const STEEL = BRAND.steelBlue;
const PULSE_GREEN = "#4D7A56";
const PULSE_YELLOW = "#9B7A3A";
const PULSE_RED = "#8A3A3A";
const OLIVE = BRAND.oliveInk;

/* ─── Type aliases ────────────────────────────────────────────────────────── */
type Confidence = "high" | "med" | "low";
type Interpretation = {
  base: string;
  modifiers: string[];
  note: string;
  confidence: Confidence;
  unsupportedHits: string[];
};

/* ─── Chip data types ─────────────────────────────────────────────────────── */
interface AestheticChip {
  label: string;
  type: "spec" | "mood";
  material: string | null;
  silhouette: Record<string, string> | null;
  complexity_mod: number;
  palette: string | null;
  isCustom?: boolean;
}

function getAestheticChips(aestheticName: string): AestheticChip[] {
  if (!aestheticName) return [];
  const slug = aestheticName.toLowerCase().replace(/\s+/g, "-");
  const entry = (
    aestheticsData as unknown as Array<{ id: string; name: string; chips: AestheticChip[] }>
  ).find((a) => a.id === slug || a.name === aestheticName);
  return entry?.chips ?? [];
}

/* ─── Universal silhouettes ──────────────────────────────────────────────── */
const CONCEPT_SILHOUETTES = [
  { id: "straight", name: "Straight", descriptor: "Clean lines, no distraction — lets the fabric carry the concept" },
  { id: "relaxed", name: "Relaxed", descriptor: "Ease with intention — comfort-forward without losing editorial quality" },
  { id: "structured", name: "Structured", descriptor: "Architectural precision — construction and shape are the design" },
  { id: "oversized", name: "Oversized", descriptor: "Statement through scale — confident volume that commands space" },
] as const;

/* ─── Silhouette icons for concept cards ─────────────────────────────────── */
const SILHOUETTE_ICONS: Record<string, React.ReactNode> = {
  straight: (
    <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
      <rect x="6" y="1" width="8" height="22" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  relaxed: (
    <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
      <path d="M7 1h6l2 22H5L7 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
  structured: (
    <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
      <path d="M3 1h14l-1 8-3 3 3 3 1 8H3l1-8 3-3-3-3-1-8z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
  oversized: (
    <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
      <path d="M1 1h18v19a2 2 0 01-2 2H3a2 2 0 01-2-2V1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
};

/* ─── Key piece category icons ──────────────────────────────────────────── */
const KEY_PIECE_CATEGORY_ICONS: Record<string, React.ReactNode> = {
  tops: (
    <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
      <path d="M1 6l4-5h10l4 5-3 3v14H4V9L1 6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
  dresses: (
    <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
      <path d="M7 1h6l2 8H5L7 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M5 9l-3 14h16L15 9H5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
  bottoms: (
    <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
      <path d="M3 1h14v8l-4 14H7L3 9V1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <line x1="10" y1="9" x2="10" y2="23" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  outerwear: (
    <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
      <path d="M1 5l4-4h2l3 4 3-4h2l4 4-3 4v14H4V9L1 5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
};

/* ─── Silhouette keyword map for scoring ─────────────────────────────────── */
const SILHOUETTE_KEYWORD_MAP: Record<string, string[]> = {
  straight: ["minimalist", "clean", "structured", "timeless", "architectural", "restrained"],
  relaxed: ["bohemian", "casual", "effortless", "soft", "romantic", "natural"],
  structured: ["architectural", "tailored", "sophisticated", "premium", "intentional", "refined"],
  oversized: ["bold", "rebellious", "deconstructed", "nonchalant", "dramatic", "edgy"],
};

/* ─── Palette keyword map for scoring ────────────────────────────────────── */
const PALETTE_KEYWORD_MAP: Record<string, string[]> = {
  cool_mineral: ["minimalist", "sophisticated", "moody", "urban", "restrained", "architectural"],
  warm_neutrals: ["timeless", "grounded", "tactile", "natural", "soft", "artisanal"],
  earth_tones: ["rustic", "sustainable", "natural", "grounded", "functional", "raw"],
  muted_pastels: ["romantic", "soft", "feminine", "playful", "nostalgic", "sweet"],
  high_contrast: ["bold", "dramatic", "edgy", "rebellious", "maximalist", "expressive"],
  tonal_darks: ["moody", "urban", "grunge", "protective", "utilitarian", "deconstructed"],
};

/* ─── Aesthetic data type with new fields ────────────────────────────────── */
interface AestheticDataEntry {
  id: string;
  name: string;
  trend_velocity: string;
  saturation_score: number;
  keywords: string[];
  silhouette_affinity?: string[];
  palette_affinity?: string[];
  palette_options?: Array<{ id: string; name: string; swatches: string[]; descriptor: string }>;
  chips: AestheticChip[];
  key_pieces?: Record<string, Array<KeyPiece & { implied_chips?: string[] }>>;
}

/* ─── Chip metadata for source tracking ─────────────────────────────────── */
interface ChipMeta {
  source: 'manual' | 'key-piece';
  userConfirmed: boolean;
}

type TensionState = 'none' | 'soft' | 'hard';

function getChipTensionState(chipLabel: string, selectedKeyPiece: KeyPiece | null): TensionState {
  if (!selectedKeyPiece || selectedKeyPiece.custom) return 'none';
  const tensions = (chipTensionsData as unknown as Record<string, { hard: string[]; soft: string[] }>)[selectedKeyPiece.type ?? ''];
  if (!tensions) return 'none';
  if (tensions.hard.includes(chipLabel)) return 'hard';
  if (tensions.soft.includes(chipLabel)) return 'soft';
  return 'none';
}

/* ─── Free-form aesthetic matcher ─────────────────────────────────────────── */
function matchFreeFormToAesthetic(input: string): string | null {
  if (!input.trim() || input.trim().length < 2) return null;
  const normalized = input.toLowerCase().trim();
  for (const aesthetic of AESTHETICS) {
    const aLower = aesthetic.toLowerCase();
    if (aLower === normalized || normalized.includes(aLower)) return aesthetic;
  }
  const keywordMap: Array<{ keywords: string[]; aesthetic: string }> = [
    { keywords: ["quiet luxury","minimal","minimalist","clean","sleek","structural","monochrome","old money","column silhouette","tonal","matte","architectural","refined","precision","crisp","pared","understated"], aesthetic: "Quiet Structure" },
    { keywords: ["rugged","outdoor","gorpcore","utility","durable","earthy","adventure","workwear","tactical","mountain","trail","protection","terrain","technical"], aesthetic: "Terrain Luxe" },
    { keywords: ["academic","poetry","poet","romantic","bookish","literary","vintage knit","blazer","dark academia","cinematic","analog","nostalgic romance","literary romance","knitwear"], aesthetic: "Romantic Analog" },
    { keywords: ["craft","artisan","handmade","sustainable","woven","natural","organic","fiber","handcraft","textile","loom","slow fashion","heritage","heirloom","circularity"], aesthetic: "Heritage Hand" },
    { keywords: ["grunge","indie","punk","edgy","distressed","90s","nineties","sleaze","raw","worn","grungy","garage","undone","anti-polish","messy"], aesthetic: "Undone Glam" },
    { keywords: ["gummy","jelly","squishy","haptic","rubber","bouncy","inflated","asmr","sensory","tactile softness","haptic play"], aesthetic: "Haptic Play" },
    { keywords: ["glam","glamour","sequin","power dressing","bold shoulders","metallic","80s","gold","maximalist","bold","diva","extra","opulent","eighties","high shine","showstopper","voltage"], aesthetic: "High Voltage" },
    { keywords: ["cute","kawaii","adorable","sweet","pastel","whimsy","cartoon","childlike","precious","toy","bubbly","saccharine","subversion","chunky","color blocking"], aesthetic: "Sweet Subversion" },
  ];
  let bestMatch: string | null = null;
  let bestScore = 0;
  for (const { keywords, aesthetic } of keywordMap) {
    let score = 0;
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) score += keyword.split(" ").length * 2;
    }
    if (score > bestScore) { bestScore = score; bestMatch = aesthetic; }
  }
  if (bestScore < 2) {
    const words = normalized.split(/\s+/).filter((w) => w.length > 3);
    for (const aesthetic of AESTHETICS) {
      const content = AESTHETIC_CONTENT[aesthetic];
      const description = (content?.description ?? "").toLowerCase();
      const aLower = aesthetic.toLowerCase();
      let score = 0;
      for (const word of words) {
        if (aLower.includes(word)) score += 3;
        if (description.includes(word)) score += 1;
      }
      if (score > bestScore) { bestScore = score; bestMatch = aesthetic; }
    }
  }
  return bestScore >= 2 ? bestMatch : null;
}

/* ─── Pulse status helpers ────────────────────────────────────────────────── */
function getIdentityStatus(score: number | undefined): { label: string; color: string; sublabel: string } {
  if (score === undefined) return { label: "—", color: "rgba(67,67,43,0.35)", sublabel: "Select a direction to score" };
  if (score >= 85) return { label: "Strong", color: PULSE_GREEN, sublabel: "Reinforces core DNA" };
  if (score >= 70) return { label: "Moderate", color: PULSE_YELLOW, sublabel: "Some tension with core values" };
  return { label: "Tension", color: PULSE_RED, sublabel: "Significant brand tension" };
}
function getResonanceStatus(pulse: { status: string; score: number; message: string } | null, saturationScore?: number, collectionsCount?: number): { label: string; color: string; sublabel: string } {
  if (!pulse) return { label: "—", color: "rgba(67,67,43,0.35)", sublabel: "Select a direction to score" };
  const color = pulse.status === "green" ? PULSE_GREEN : pulse.status === "yellow" ? PULSE_YELLOW : PULSE_RED;
  const satSuffix = saturationScore != null ? ` · ${saturationScore}% saturation` : "";
  const label = `${pulse.message}${satSuffix}`;
  const sublabel = collectionsCount != null ? `Seen in ${collectionsCount} collections analyzed` : "";
  return { label, color, sublabel };
}

/* ─── Aesthetic chip button (hover + selected + auto-selected + tension states) ── */
function AestheticChipButton({
  label,
  isActive,
  isClickable,
  onClick,
  isAutoSelected,
  tension,
}: {
  label: string;
  isActive: boolean;
  isClickable: boolean;
  onClick: () => void;
  isAutoSelected?: boolean;
  tension?: TensionState;
}) {
  const [hovered, setHovered] = useState(false);
  const inter = "var(--font-inter), system-ui, sans-serif";

  const tensionSuffix = tension === 'hard' ? ' ✕' : tension === 'soft' ? ' ~' : '';
  const borderColor = isActive
    ? tension === 'hard'
      ? 'rgba(169,95,95,0.70)'
      : tension === 'soft'
        ? 'rgba(184,135,59,0.60)'
        : 'rgba(125,150,172,0.55)'
    : hovered && isClickable
      ? 'rgba(125,150,172,0.35)'
      : 'rgba(67,67,43,0.18)';

  const tooltip = isAutoSelected
    ? 'Pre-selected based on your key piece. Tap to deselect.'
    : tension === 'hard'
      ? `Construction conflict with this piece type — this combination will affect your score.`
      : tension === 'soft'
        ? 'Tension with your key piece — Muko will note this in the analysis.'
        : undefined;

  return (
    <span
      onClick={isClickable ? onClick : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={tooltip}
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        fontFamily: inter,
        cursor: isClickable ? "pointer" : "default",
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        background: isActive
          ? "rgba(125,150,172,0.08)"
          : hovered && isClickable
            ? "rgba(125,150,172,0.05)"
            : "transparent",
        border: `1px solid ${borderColor}`,
        color: isActive
          ? tension === 'hard'
            ? 'rgba(169,95,95,0.90)'
            : tension === 'soft'
              ? 'rgba(184,135,59,0.90)'
              : "#7D96AC"
          : hovered && isClickable
            ? "rgba(125,150,172,0.80)"
            : "rgba(67,67,43,0.52)",
        transition: "all 150ms ease",
      }}
    >
      {isActive && isAutoSelected && (
        <span style={{ fontSize: 8, lineHeight: 1, color: "inherit", marginRight: 1 }}>●</span>
      )}
      {label}
      {isActive && tension !== 'none' && tension && (
        <span style={{ fontSize: 9, lineHeight: 1, color: "inherit", marginLeft: 1 }}>{tension === 'hard' ? '✕' : '~'}</span>
      )}
    </span>
  );
}

/* ─── Direction insight ───────────────────────────────────────────────────── */
function getDirectionInsight(
  aesthetic: string,
  identityScore: number,
  resonanceScore: number,
  topChips: string[],
  velocity: string
): { headline: string; p1: string; p2: string; p3: string; opportunity: string[]; editItems: string[]; sharpenChips: string[] } {
  const chipList = topChips.slice(0, 3).join(", ");
  const chipA = topChips[0] ?? "key material signals";
  const chipB = topChips[1] ?? "construction details";
  const highId = identityScore >= 80;
  const highRes = resonanceScore >= 80;
  const ascending = velocity === "emerging";
  if (highId && highRes) {
    return {
      headline: `${aesthetic} — strong alignment, move with confidence.`,
      p1: `Brand fit is high and market timing is favorable. ${aesthetic} maps naturally to your design language — the identity signals are consistent without forcing.`,
      p2: `${chipA} and ${chipB} are the strongest entry points here. They carry the aesthetic without overcommitting to the trend — exactly the right leverage.`,
      p3: ascending ? `The market window is open and still early. Move now with a full direction commitment — waiting dilutes the advantage.` : `Consumer appetite is strong. This is the moment to invest fully rather than test cautiously.`,
      opportunity: [`Lead with ${chipA} as the brand's signature entry into this direction`, `Invest in the hero fabrication — half-measures won't register`, `Own the aesthetic fully across touchpoints for maximum impact`],
      editItems: [`Tighten your refinement to specify the exact fabrication language you want to own`, `Narrowing to your three strongest chips would sharpen the direction signal`],
      sharpenChips: topChips.slice(3, 6),
    };
  }
  if (highId && !highRes) {
    return {
      headline: `${aesthetic} fits your brand — the market timing needs navigation.`,
      p1: `Brand alignment is solid at ${identityScore} — this direction maps well to your DNA. The challenge is market timing: consumer demand is present but softer than optimal.`,
      p2: `${chipA} and ${chipB} are the signals with clearest commercial read. Anchor in these rather than the broader aesthetic signals to sharpen the consumer proposition.`,
      p3: ascending ? `The market is still building. You have time to establish presence before saturation, but move deliberately.` : `Specificity is your differentiation play here — a tighter edit creates its own demand.`,
      opportunity: [`Use brand authenticity as the differentiator — this is genuinely your territory`, `${chipA} is the most commercially transferable signal in this direction`, `A tighter silhouette edit will sharpen the resonance without compromising identity`],
      editItems: [`A more targeted refinement would help navigate the timing gap — speak to what makes this direction yours`, `Lead with the chips that have strongest commercial traction`],
      sharpenChips: topChips.slice(2, 5),
    };
  }
  if (!highId && highRes) {
    return {
      headline: `${aesthetic} has real momentum — but requires intentional ownership.`,
      p1: `Market traction is building with clear upward velocity, but brand alignment is moderate — there's tension between ${aesthetic}'s signals and your core positioning. You can enter this space, but you need to do it on your terms.`,
      p2: `${chipA} and ${chipB} are the signals with the most traction, but they can read as costume if not handled with your specific brand lens. Lead with your brand's point of view, not the trend.`,
      p3: ascending ? `A limited capsule to test reception before committing to a full direction is the right call here.` : `Consumer appetite is strong, but differentiation is now required. Enter with a clear editorial position.`,
      opportunity: [`Lead with your existing credentials — approach the aesthetic through your brand's lens`, `${chipA} is the highest-traction signal — use it as an anchor, not decoration`, `Consider a capsule test before committing the full collection`],
      editItems: [`Refine your direction statement to bridge the identity gap — frame this through your brand's lens`, `A tighter chip selection focused on your brand's strengths would reduce the tension`],
      sharpenChips: topChips.slice(2, 5),
    };
  }
  return {
    headline: `${aesthetic} — proceed with clear creative conviction.`,
    p1: `Both brand alignment and market timing present real challenges here. ${aesthetic} requires significant creative investment to execute convincingly across brand and consumer touchpoints.`,
    p2: `${chipList ? `The strongest entry signals are ${chipList}.` : "Focus on the most brand-adjacent signals in this direction."} Refinement is essential — the generic read of this aesthetic won't work for your positioning.`,
    p3: `If you have a strong creative reason to pursue this, proceed with conviction. A tentative approach in difficult territory produces the worst outcomes.`,
    opportunity: [`Push the aesthetic further than the category expects — half-measures won't work`, `Find the unexpected material within the direction to create differentiation`, `Anchor in your strongest brand signals to make the direction feel earned`],
    editItems: [`A sharper refinement statement would clarify your creative conviction for this direction`, `Revisit your aesthetic choice — consider a direction with stronger brand alignment`],
    sharpenChips: topChips.slice(0, 4),
  };
}

/* ─── Compute recommended aesthetic (brand-aware) ───────────────────────── */
//
// Rankings use two signals combined at equal weight:
//   1. Identity compatibility — static identity score penalised by tension hits
//   2. Resonance opportunity  — (100 - saturation) + velocity bonus
//
// Brand filtering: aesthetics with 3+ brand DNA keywords appearing in their
// tension_keywords[] are excluded entirely — they represent strong aesthetic
// incompatibility (e.g. Undone Glam tensions with Minimalist/Timeless/Serene,
// all core Reformation keywords).
//
// When brandKeywords is empty the filter is a no-op and we fall back to a
// pure market-opportunity ranking — acceptable when no brand profile exists.
function computeRecommendedAesthetic(brandKeywords: string[] = []): string {
  const normalizedBrand = brandKeywords.map(k => k.toLowerCase().trim());

  const scored = AESTHETICS.map((aesthetic) => {
    const content = AESTHETIC_CONTENT[aesthetic];
    const entry = (aestheticsData as Array<{
      id: string;
      name: string;
      trend_velocity: string;
      saturation_score: number;
      tension_keywords?: string[];
    }>).find((a) => a.name === aesthetic || a.id === aesthetic.toLowerCase().replace(/\s+/g, "-"));

    const velocity = entry?.trend_velocity ?? "peak";
    const saturation = entry?.saturation_score ?? 50;
    const tensionKws = (entry?.tension_keywords ?? []).map(k => k.toLowerCase().trim());

    // Count brand keywords that appear in this aesthetic's tension list
    const tensionHits = normalizedBrand.filter(k => tensionKws.includes(k)).length;

    // Hard filter: 3+ brand keywords in tension_keywords = strong incompatibility
    if (tensionHits >= 3) return { aesthetic, heroScore: -Infinity };

    // Resonance opportunity: inverse of saturation + velocity signal
    // "emerging" aesthetics get more opportunity credit than "ascending" or "peak"
    const velocityBonus = velocity === "emerging" ? 20 : velocity === "ascending" ? 10 : 0;
    const resonanceOpportunity = (100 - saturation) + velocityBonus;

    // Identity compatibility penalised per tension hit (15% per hit)
    // Prevents market-opportunity bonus from overriding brand fit
    const tensionMultiplier = Math.max(0, 1 - tensionHits * 0.15);
    const identityCompatibility = (content?.identityScore ?? 0) * tensionMultiplier;

    const heroScore = identityCompatibility * 0.5 + resonanceOpportunity * 0.5;
    return { aesthetic, heroScore };
  });

  scored.sort((a, b) => b.heroScore - a.heroScore);
  return scored[0]?.aesthetic ?? TOP_SUGGESTED[0];
}

/* ─── Load moodboard images for a given aesthetic ────────────────────────── */
function loadMoodboardImages(aesthetic: string): string[] {
  const folder = matchAestheticToFolder(aesthetic);
  if (!folder) return [];
  const all = Array.from({ length: 10 }, (_, i) => `/images/aesthetics/${folder}/${i + 1}.jpg`);
  return seededShuffle(all, `${aesthetic}::`).slice(0, 9);
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function ConceptStudioPage() {
  const router = useRouter();
  const {
    season,
    collectionName: storeCollectionName,
    refinementModifiers,
    aestheticInput,
    setAestheticInput,
    identityPulse,
    resonancePulse,
    conceptLocked,
    lockConcept,
    setCurrentStep,
    conceptSilhouette,
    setConceptSilhouette,
    conceptPalette,
    setConceptPalette,
    chipSelection: storeChipSelection,
    customChips: storeCustomChips,
    setCustomChips: setStoreCustomChips,
    setSelectedKeyPiece,
    intentGoals,
    intentTradeoff,
    collectionRole: storeCollectionRole,
  } = useSessionStore();

  const [headerCollectionName, setHeaderCollectionName] = useState<string>("Collection");
  const [headerSeasonLabel, setHeaderSeasonLabel] = useState<string>(season || "—");

  useEffect(() => { setCurrentStep(2); }, [setCurrentStep]);
  useEffect(() => {
    try {
      const n = window.localStorage.getItem("muko_collectionName");
      const s = window.localStorage.getItem("muko_seasonLabel");
      if (n) setHeaderCollectionName(n);
      if (s) setHeaderSeasonLabel(s);
      else setHeaderSeasonLabel(season || "—");
    } catch { setHeaderSeasonLabel(season || "—"); }
  }, [season]);

  // Real Critic identity scores for all aesthetics, populated once brandProfileId resolves.
  // Empty until the batch fetch completes — falls back to static scoring in the meantime.
  const [allCriticScores, setAllCriticScores] = useState<Record<string, number>>({});

  const { recommendedAesthetic, mukoPickLabel } = useMemo(() => {
    // No real scores yet — fall back to static brand-agnostic ranking
    if (Object.keys(allCriticScores).length === 0) {
      return { recommendedAesthetic: computeRecommendedAesthetic(refinementModifiers), mukoPickLabel: "Muko's Pick" };
    }

    // Score each aesthetic using real Critic identity + static resonance
    const scored = AESTHETICS.map((aesthetic) => {
      const identityScore = allCriticScores[aesthetic] ?? 0;
      const resonanceScore = AESTHETIC_CONTENT[aesthetic]?.resonanceScore ?? 0;
      return { aesthetic, identityScore, heroScore: identityScore * 0.5 + resonanceScore * 0.5 };
    });

    // Filter: only aesthetics where Critic identity >= 50 are eligible for Pick
    const eligible = scored.filter((s) => s.identityScore >= 50);

    if (eligible.length > 0) {
      eligible.sort((a, b) => b.heroScore - a.heroScore);
      return { recommendedAesthetic: eligible[0].aesthetic, mukoPickLabel: "Muko's Pick" };
    }

    // No aesthetic clears the threshold — surface the closest-fit with a different label
    scored.sort((a, b) => b.identityScore - a.identityScore);
    return { recommendedAesthetic: scored[0]?.aesthetic ?? computeRecommendedAesthetic(refinementModifiers), mukoPickLabel: "Closest Match" };
  }, [allCriticScores, refinementModifiers]);
  const selectedAesthetic = AESTHETICS.includes(aestheticInput as any) ? aestheticInput : null;
  const selectedIsAlternative = Boolean(selectedAesthetic && selectedAesthetic !== recommendedAesthetic);

  // Top-slot card: which aesthetic occupies the hero position
  const topAesthetic = selectedAesthetic ?? recommendedAesthetic;

  // Moodboard images for the top card
  const [topMoodboardImages, setTopMoodboardImages] = useState<string[]>(() => loadMoodboardImages(computeRecommendedAesthetic()));

  useEffect(() => {
    setTopMoodboardImages(loadMoodboardImages(topAesthetic));
  }, [topAesthetic]);

  // Hovered list card & its moodboard images
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredImages, setHoveredImages] = useState<string[]>([]);

  useEffect(() => {
    if (!hoveredCard) { setHoveredImages([]); return; }
    setHoveredImages(loadMoodboardImages(hoveredCard));
  }, [hoveredCard]);

  // Resonance Pulse states: WAITING (no input), LOADING (LLM in flight), RESOLVED
  const [resonanceLoading, setResonanceLoading] = useState(false);
  const [resonanceProxyMessage, setResonanceProxyMessage] = useState<string | null>(null);
  const [resonanceSaturationScore, setResonanceSaturationScore] = useState<number | null>(null);
  const [resonanceCollectionsCount, setResonanceCollectionsCount] = useState<number | null>(null);

  const [pulseExpandedRow, setPulseExpandedRow] = useState<string | null>(null);
  const [selectedElements, setSelectedElements] = useState<Set<string>>(() => {
    // Restore from store on mount
    const cs = useSessionStore.getState().chipSelection;
    const ai = useSessionStore.getState().aestheticInput;
    if (cs && cs.activatedChips.length > 0 && ai) {
      return new Set(cs.activatedChips.map((chip) => `${ai}::${chip.label}`));
    }
    return new Set();
  });

  // Track chip source + confirmation state (key-piece auto-selected vs manual)
  const [chipMeta, setChipMeta] = useState<Map<string, ChipMeta>>(new Map());
  const [customChips, setCustomChips] = useState<Record<string, AestheticChip[]>>(() => {
    return useSessionStore.getState().customChips ?? {};
  });
  const toggleElement = (key: string) => {
    setSelectedElements((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
    // Mark as user-confirmed (once clicked, the user owns it regardless of source)
    setChipMeta((prev) => {
      const next = new Map(prev);
      const existing = next.get(key);
      if (existing) {
        next.set(key, { ...existing, userConfirmed: true });
      } else {
        next.set(key, { source: 'manual', userConfirmed: true });
      }
      return next;
    });
  };

  const removeElement = (chip: string) => {
    if (!selectedAesthetic) return;
    setSelectedElements((prev) => {
      const next = new Set(prev);
      next.delete(`${selectedAesthetic}::${chip}`);
      return next;
    });
  };

  const addedChipLabels = useMemo(() => {
    if (!selectedAesthetic) return new Set<string>();
    const prefix = `${selectedAesthetic}::`;
    const rawLabels = new Set<string>();
    selectedElements.forEach((key) => {
      if (key.startsWith(prefix)) rawLabels.add(key.replace(prefix, ""));
    });
    return rawLabels;
  }, [selectedAesthetic, selectedElements]);

  // ─── Resonance scoring helper ────────────────────────────────────────────
  const computeAndSetResonance = useCallback((aestheticName: string) => {
    const entry = (aestheticsData as unknown as ResearcherAesthetic[]).find(
      (a) => a.name === aestheticName || a.id === aestheticName.toLowerCase().replace(/\s+/g, "-")
    );
    if (!entry) return;
    const saturation = checkMarketSaturation(entry);
    const score = getResonanceScore(entry);
    setResonanceSaturationScore(saturation.saturation_score);
    setResonanceCollectionsCount(saturation.collections_count);
    setResonanceLoading(false);
    setResonanceProxyMessage(null);
    useSessionStore.setState({
      resonancePulse: {
        score,
        status: saturation.status,
        message: saturation.message,
      },
    });
  }, []);

  // Sync customChips to store whenever they change
  useEffect(() => {
    setStoreCustomChips(customChips as Record<string, import("@/lib/store/sessionStore").ActivatedChip[]>);
  }, [customChips, setStoreCustomChips]);

  // Sync chip selection to store whenever selectedElements change
  useEffect(() => {
    if (!selectedAesthetic) return;
    const activeKeys = Array.from(selectedElements).filter((k) => k.startsWith(`${selectedAesthetic}::`));
    const libraryChips = getAestheticChips(selectedAesthetic);
    const customChipsForDir = customChips[selectedAesthetic] ?? [];
    const activatedChips = activeKeys.map((k) => {
      const label = k.replace(`${selectedAesthetic}::`, "");
      const lib = libraryChips.find((c) => c.label === label);
      if (lib) return { ...lib, isCustom: false as const };
      const custom = customChipsForDir.find((c) => c.label === label);
      if (custom) return { ...custom, isCustom: true as const };
      return { label, type: "mood" as const, material: null, silhouette: null, complexity_mod: 0, palette: null, isCustom: false as const };
    });
    useSessionStore.setState({
      chipSelection: { directionId: selectedAesthetic.toLowerCase().replace(/\s+/g, "-"), activatedChips },
    });
  }, [selectedElements, selectedAesthetic, customChips]);

  const yourConceptRef = useRef<HTMLDivElement>(null);

  // ─── Synthesizer: reactive MUKO INSIGHT (streaming) ──────────────────────
  const conceptAbortRef = useRef<AbortController | null>(null);
  const [conceptInsightData, setConceptInsightData] = useState<InsightData | null>(null);
  const [conceptInsightLoading, setConceptInsightLoading] = useState(false);
  const [conceptStreamingText, setConceptStreamingText] = useState('');

  const addedChipKey = useMemo(
    () => Array.from(addedChipLabels).sort().join(','),
    [addedChipLabels]
  );

  useEffect(() => {
    if (!selectedAesthetic) {
      setConceptInsightData(null);
      setConceptStreamingText('');
      return;
    }
    const slug = toAestheticSlug(selectedAesthetic);
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

    const blackboard = buildConceptBlackboard({
      aestheticInput: aestheticInput || selectedAesthetic,
      aestheticSlug: slug,
      brandKeywords: refinementModifiers,
      identity_score: identityPulse?.score ?? 80,
      resonance_score: resonancePulse?.score ?? 75,
      season: season || 'SS27',
      collectionName: storeCollectionName || headerCollectionName,
      intent: intentPayload,
    });
    if (!blackboard) return;

    conceptAbortRef.current?.abort();
    const controller = new AbortController();
    conceptAbortRef.current = controller;

    const timer = window.setTimeout(async () => {
      setConceptInsightLoading(true);
      setConceptStreamingText('');
      try {
        const res = await fetch('/api/synthesizer/concept', {
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
              setConceptStreamingText(prev => {
                const accumulated = prev + chunk;
                // Extract partial brand_alignment value for display
                const match = accumulated.match(/"brand_alignment"\s*:\s*"([^"]*)/);
                return match ? match[1] : prev;
              });
            } catch { /* ignore parse errors on partial chunks */ }
          } else if (event === 'complete' || event === 'fallback') {
            try {
              const result = JSON.parse(data) as { data: InsightData; meta: { method: string } };
              if (!controller.signal.aborted) {
                setConceptInsightData(result.data);
                setConceptStreamingText('');
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
          setConceptInsightLoading(false);
          setConceptStreamingText('');
        }
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAesthetic, conceptSilhouette, conceptPalette, addedChipKey]);

  const [freeFormDraft, setFreeFormDraft] = useState("");
  const [freeFormMatch, setFreeFormMatch] = useState<string | null>(null);
  const [freeFormLoading, setFreeFormLoading] = useState(false);
  useEffect(() => {
    const trimmed = freeFormDraft.trim();
    if (trimmed.length < 2) { setFreeFormMatch(null); setFreeFormLoading(false); return; }
    setFreeFormLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/match-aesthetic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: trimmed }) });
        const data = await res.json();
        setFreeFormMatch(data.match ?? null);
      } catch { setFreeFormMatch(matchFreeFormToAesthetic(trimmed)); }
      finally { setFreeFormLoading(false); }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [freeFormDraft]);

  const [refineText, setRefineText] = useState("");
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);
  useEffect(() => {
    if (!selectedAesthetic) { setRefineText(""); setInterpretation(null); return; }
    setRefineText(`${selectedAesthetic}, but…`);
    setInterpretation({ base: selectedAesthetic, modifiers: [], note: `Interpreting this as: ${selectedAesthetic}`, confidence: "high", unsupportedHits: [] });
  }, [selectedAesthetic]);

  // Pulse scores are only populated after the user selects a direction


  // ─── Critic Agent: Brand Alignment Scoring ────────────────────────────────
  // When a brand_profile_id is available (future: from Supabase auth/settings),
  // calls the Critic Agent API to compute the Identity Pulse from real brand data.
  // Falls back to the existing static scoring above when no brand profile exists.

  const brandProfileId = useRef<string | null>(null);
  const [noBrandProfile, setNoBrandProfile] = useState(false);

  // On mount: resolve the current user's brand profile id from Supabase
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setNoBrandProfile(true);
        return;
      }
      supabase
        .from('brand_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.id) {
            brandProfileId.current = data.id;
            setNoBrandProfile(false);

            // Batch-score all aesthetics against the brand profile so Pick selection
            // can use real Critic identity scores instead of static constants.
            const profileId = data.id;
            const allEntries = aestheticsData as unknown as AestheticDataEntry[];
            Promise.allSettled(
              AESTHETICS.map(async (aesthetic) => {
                const entry = allEntries.find((a) => a.name === aesthetic);
                if (!entry?.keywords?.length) return { aesthetic, score: 0 };
                const res = await fetch("/api/agents/critic", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    aesthetic_keywords: entry.keywords,
                    aesthetic_name: aesthetic,
                    brand_profile_id: profileId,
                  }),
                });
                if (!res.ok) return { aesthetic, score: 0 };
                const json = await res.json();
                return { aesthetic, score: json.pulse?.score ?? 0 };
              })
            ).then((results) => {
              const scores: Record<string, number> = {};
              for (const result of results) {
                if (result.status === "fulfilled") {
                  scores[result.value.aesthetic] = result.value.score;
                }
              }
              setAllCriticScores(scores);
            });
          } else {
            setNoBrandProfile(true);
          }
        });
    });
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const runCriticAnalysis = useCallback(
    debounce(async (aestheticKeywords: string[], aestheticName: string) => {
      if (!aestheticKeywords.length || !brandProfileId.current) return;

      // Set loading state via store
      useSessionStore.setState({
        identityPulse: { score: identityPulse?.score ?? 0, status: identityPulse?.status ?? "yellow", message: "Analyzing..." },
      });

      try {
        const res = await fetch("/api/agents/critic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aesthetic_keywords: aestheticKeywords,
            aesthetic_name: aestheticName,
            brand_profile_id: brandProfileId.current,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Critic agent request failed (${res.status})`);
        }
        const data = await res.json();
        useSessionStore.setState({
          identityPulse: {
            status: data.pulse.status,
            score: data.pulse.score,
            message: data.pulse.message,
          },
        });
      } catch (error) {
        console.error("Identity pulse update failed:", error);
        useSessionStore.setState({
          identityPulse: {
            status: "yellow",
            score: 50,
            message: "Analysis unavailable",
          },
        });
      }
    }, 400),
    []
  );

  // Fire critic when aesthetic changes and brand profile is available
  useEffect(() => {
    if (!selectedAesthetic || !brandProfileId.current) return;
    const entry = (aestheticsData as unknown as AestheticDataEntry[]).find(
      (a) => a.name === selectedAesthetic || a.id === selectedAesthetic.toLowerCase().replace(/\s+/g, "-")
    );
    if (entry?.keywords) {
      runCriticAnalysis(entry.keywords, selectedAesthetic);
    }
  }, [selectedAesthetic, runCriticAnalysis]);

  const identityScore = identityPulse?.score;
  const resonanceScore = resonancePulse?.score;
  const selectedAestheticEntry = selectedAesthetic
    ? (aestheticsData as unknown as AestheticDataEntry[]).find((a) => a.name === selectedAesthetic)
    : null;
  const selectedAestheticData = selectedAesthetic
    ? (aestheticsData as unknown as AestheticDataEntry[]).find((a) => a.name === selectedAesthetic || a.id === selectedAesthetic.toLowerCase().replace(/\s+/g, "-"))
    : null;

  // KEY PIECES — derived from aesthetic + season
  const keyPieces = useMemo((): KeyPiece[] => {
    if (!selectedAesthetic) return [];
    const entry = (aestheticsData as unknown as AestheticDataEntry[]).find(
      (a) => a.name === selectedAesthetic || a.id === selectedAesthetic.toLowerCase().replace(/\s+/g, "-")
    );
    if (!entry?.key_pieces) return [];
    const seasonKey = (season.includes("FW") || season.includes("Fall") || season.includes("fall")) ? "fw26" : "ss27";
    return entry.key_pieces[seasonKey] ?? entry.key_pieces["fw26"] ?? Object.values(entry.key_pieces)[0] ?? [];
  }, [selectedAesthetic, season]);

  const [selectedKeyPieceLocal, setSelectedKeyPieceLocal] = useState<KeyPiece | null>(null);
  const [customKeyPieceText, setCustomKeyPieceText] = useState("");
  const [customKeyPieceConfirmed, setCustomKeyPieceConfirmed] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Auto-select implied chips when key piece changes
  useEffect(() => {
    if (!selectedAesthetic || !selectedKeyPieceLocal || selectedKeyPieceLocal.custom) {
      // Key piece deselected or is custom: remove unconfirmed key-piece chips
      setSelectedElements((prev) => {
        const next = new Set(prev);
        chipMeta.forEach((meta, key) => {
          if (meta.source === 'key-piece' && !meta.userConfirmed) {
            next.delete(key);
          }
        });
        return next;
      });
      return;
    }

    const entry = (aestheticsData as unknown as AestheticDataEntry[]).find(
      (a) => a.name === selectedAesthetic || a.id === selectedAesthetic.toLowerCase().replace(/\s+/g, '-')
    );
    if (!entry) return;

    const seasonKey = (useSessionStore.getState().season?.includes('FW') || useSessionStore.getState().season?.includes('Fall')) ? 'fw26' : 'ss27';
    const allPieces = [
      ...(entry.key_pieces?.[seasonKey] ?? []),
      ...(entry.key_pieces?.['fw26'] ?? []),
      ...(entry.key_pieces?.['ss27'] ?? []),
    ];
    const matchedPiece = allPieces.find((p) => p.item === selectedKeyPieceLocal.item);
    const impliedChips: string[] = (matchedPiece as (typeof matchedPiece & { implied_chips?: string[] }) | undefined)?.implied_chips ?? [];

    if (impliedChips.length === 0) return;

    const availableChipLabels = new Set(entry.chips.map((c) => c.label));

    setSelectedElements((prev) => {
      const next = new Set(prev);
      impliedChips.forEach((label) => {
        if (availableChipLabels.has(label)) {
          const key = `${selectedAesthetic}::${label}`;
          if (!next.has(key)) {
            next.add(key);
          }
        }
      });
      return next;
    });

    setChipMeta((prev) => {
      const next = new Map(prev);
      impliedChips.forEach((label) => {
        if (availableChipLabels.has(label)) {
          const key = `${selectedAesthetic}::${label}`;
          if (!next.has(key)) {
            next.set(key, { source: 'key-piece', userConfirmed: false });
          }
          // If already exists as manual, leave it alone
        }
      });
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKeyPieceLocal, selectedAesthetic]);

  // ─── Recalculate identity + resonance pulses when silhouette/palette/key piece changes ──────────
  useEffect(() => {
    if (!selectedAesthetic || !identityPulse) return;
    const base = AESTHETIC_CONTENT[selectedAesthetic];
    const baseIdentity = base?.identityScore ?? 80;
    const entry = (aestheticsData as unknown as AestheticDataEntry[]).find(
      (a) => a.name === selectedAesthetic || a.id === selectedAesthetic.toLowerCase().replace(/\s+/g, "-")
    );
    const silAffinity = entry?.silhouette_affinity ?? [];
    const palAffinity = entry?.palette_affinity ?? [];

    let idMod = 0;

    if (conceptSilhouette) {
      if (silAffinity.includes(conceptSilhouette)) {
        idMod += 5;
      } else {
        idMod -= 3;
      }
    }

    if (conceptPalette) {
      if (palAffinity.includes(conceptPalette)) {
        idMod += 5;
      } else {
        idMod -= 3;
      }
    }

    // Key piece: committing to a specific market piece sharpens direction → identity boost
    if (selectedKeyPieceLocal && !selectedKeyPieceLocal.custom) {
      idMod += 3;
    }

    // Chip tension penalty: manually selected chips that conflict with the key piece type
    if (selectedKeyPieceLocal && !selectedKeyPieceLocal.custom && selectedKeyPieceLocal.type) {
      const tensions = (chipTensionsData as unknown as Record<string, { hard: string[]; soft: string[] }>)[selectedKeyPieceLocal.type];
      if (tensions) {
        let tensionMod = 0;
        const prefix = `${selectedAesthetic}::`;
        selectedElements.forEach((key) => {
          if (!key.startsWith(prefix)) return;
          const label = key.replace(prefix, '');
          const meta = chipMeta.get(key);
          // Implied chips never self-penalize
          if (meta?.source === 'key-piece') return;
          if (tensions.hard.includes(label)) tensionMod -= 8;
          else if (tensions.soft.includes(label)) tensionMod -= 3;
        });
        tensionMod = Math.max(tensionMod, -20);
        idMod += tensionMod;
      }
    }

    const newIdentity = Math.max(0, Math.min(100, baseIdentity + idMod));
    useSessionStore.setState({
      identityPulse: {
        score: newIdentity,
        status: newIdentity >= 80 ? "green" : newIdentity >= 60 ? "yellow" : "red",
        message: newIdentity >= 80 ? "Strong alignment" : newIdentity >= 60 ? "Moderate alignment" : "Weak alignment",
      },
    });

    // Key piece signal reflects market momentum → update resonance (always recompute to handle deselect)
    if (entry) {
      const baseResonance = getResonanceScore(entry as ResearcherAesthetic);
      const resDelta = (selectedKeyPieceLocal && !selectedKeyPieceLocal.custom)
        ? selectedKeyPieceLocal.signal === 'ascending' ? 6
          : selectedKeyPieceLocal.signal === 'high-volume' ? 4
          : selectedKeyPieceLocal.signal === 'emerging' ? 2
          : 0
        : 0;
      const newResonance = Math.max(0, Math.min(100, baseResonance + resDelta));
      const saturation = checkMarketSaturation(entry as ResearcherAesthetic);
      useSessionStore.setState({
        resonancePulse: {
          score: newResonance,
          status: newResonance >= 80 ? "green" : newResonance >= 60 ? "yellow" : "red",
          message: saturation.message,
        },
      });
    }
  }, [conceptSilhouette, conceptPalette, selectedAesthetic, selectedKeyPieceLocal, selectedElements, chipMeta, identityPulse?.score !== undefined]);

  const idStatus = getIdentityStatus(identityScore);
  const resStatus = getResonanceStatus(resonancePulse, resonanceSaturationScore ?? undefined, resonanceCollectionsCount ?? undefined);
  const scoreColor = (score: number) => score >= 80 ? CHARTREUSE : score >= 65 ? BRAND.camel : BRAND.rose;

  /* ─── Select handler ──────────────────────────────────────────────────────── */
  const handleSelectAesthetic = (aesthetic: string) => {
    setSelectedElements(new Set());
    setCustomChips({});
    setChipMeta(new Map());
    // Clear silhouette/palette when aesthetic changes (affinity recommendations change)
    setConceptSilhouette('');
    setConceptPalette(null);
    setAestheticInput(aesthetic);

    // If pulse is already pre-populated (e.g. Muko's Pick on first load), just lock — don't recalculate identity
    if (!identityPulse) {
      const base = AESTHETIC_CONTENT[aesthetic];
      const mockIdentity = base?.identityScore ?? Math.floor(Math.random() * 30) + 70;
      const identityStatus = mockIdentity >= 80 ? "green" : mockIdentity >= 60 ? "yellow" : "red";
      useSessionStore.setState({
        identityPulse: { score: mockIdentity, status: identityStatus, message: identityStatus === "green" ? "Strong alignment" : identityStatus === "yellow" ? "Moderate alignment" : "Weak alignment" },
      });
    }
    // Always recompute resonance from real saturation data
    computeAndSetResonance(aesthetic);
    useSessionStore.setState({ conceptLocked: true });
    try { lockConcept?.(); } catch {}
    setTimeout(() => { yourConceptRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
  };

  /* ─── Sorted base list ────────────────────────────────────────────────────── */
  const aestheticSorter = (rec: string) => (a: string, b: string) => {
    if (a === rec) return -1;
    if (b === rec) return 1;
    const sa = ((AESTHETIC_CONTENT[a]?.identityScore ?? 0) * 0.5) + ((AESTHETIC_CONTENT[a]?.resonanceScore ?? 0) * 0.5);
    const sb = ((AESTHETIC_CONTENT[b]?.identityScore ?? 0) * 0.5) + ((AESTHETIC_CONTENT[b]?.resonanceScore ?? 0) * 0.5);
    return sb - sa;
  };

  const sortedDirections = useMemo(() => {
    return [...AESTHETICS].sort(aestheticSorter(recommendedAesthetic));
  }, [recommendedAesthetic]);

  // All aesthetics except the selected one, with Muko's Pick always at the top
  const orderedDirections = useMemo(() => {
    const base = selectedIsAlternative
      ? [...AESTHETICS].filter((a) => a !== selectedAesthetic)
      : [...AESTHETICS];
    return base.sort(aestheticSorter(recommendedAesthetic));
  }, [sortedDirections, selectedAesthetic, selectedIsAlternative, recommendedAesthetic]);

  /* ─── Muko Insight ────────────────────────────────────────────────────────── */
  const insightContent = useMemo(() => {
    const ae = selectedAesthetic ?? recommendedAesthetic;
    const content = AESTHETIC_CONTENT[ae];
    const chips = getAestheticChips(ae).map((c) => c.label);
    const entry = (aestheticsData as unknown as AestheticDataEntry[]).find((a) => a.name === ae);
    const base = getDirectionInsight(ae, content?.identityScore ?? 80, content?.resonanceScore ?? 75, chips, entry?.trend_velocity ?? "peak");

    // Extend headline with silhouette/palette context
    if (conceptSilhouette && selectedAesthetic) {
      const silName = CONCEPT_SILHOUETTES.find((s) => s.id === conceptSilhouette)?.name ?? conceptSilhouette;
      const silAffinity = entry?.silhouette_affinity ?? [];
      const isAligned = silAffinity.includes(conceptSilhouette);
      const silNote = isAligned
        ? `a ${silName} silhouette reinforces the ${ae} mood`
        : `a ${silName} silhouette adds creative tension with ${ae}`;

      if (conceptPalette) {
        const palOption = entry?.palette_options?.find((p) => p.id === conceptPalette);
        const palName = palOption?.name ?? conceptPalette;
        base.headline = `${ae} with ${silName} proportions and ${palName} — ${silNote}.`;
      } else {
        base.headline = `${ae} with ${silName} proportions — ${silNote}.`;
      }
    }

    return base;
  }, [selectedAesthetic, recommendedAesthetic, conceptSilhouette, conceptPalette]);

  const nextMoveItems = useMemo(() => {
    const ae = selectedAesthetic ?? recommendedAesthetic;
    const allChips = getAestheticChips(ae);
    const labels = insightContent.sharpenChips.slice(0, 3);

    // Rotating action-phrase prefixes for micro-trend chip titles
    const chipPrefixes = [
      (l: string) => `Layer in ${l}`,
      (l: string) => `Consider ${l}`,
      (l: string) => `Try ${l}`,
    ];

    // Collection-health rationale per dimension / chip type
    const dimensionRationale: Record<string, string> = {
      identity: "Strengthens brand alignment for this direction",
      resonance: "Adds trend-aware commercial traction",
      execution: "Improves build specificity and production clarity",
    };
    const typeRationale: Record<string, string> = {
      spec: "Sharpens the spec language",
      mood: "Reinforces the mood and visual tone",
    };

    const items: Array<{ label: string; rationale: string; type?: 'chip' | 'silhouette_swap' | 'palette_swap' }> = labels.map((label, idx) => {
      const chip = allChips.find((c) => c.label === label);
      const dim = (chip as unknown as Record<string, unknown>)?.primary_dimension as string | undefined;
      const rationale = dim && dimensionRationale[dim]
        ? dimensionRationale[dim]
        : chip?.type && typeRationale[chip.type]
          ? typeRationale[chip.type]
          : "Adds specificity to this direction";
      const prefix = chipPrefixes[idx % chipPrefixes.length];
      return { label: prefix(label), rationale, type: 'chip' };
    });

    // Add silhouette swap suggestion if not aligned
    if (selectedAesthetic && conceptSilhouette) {
      const entry = (aestheticsData as unknown as AestheticDataEntry[]).find(
        (a) => a.name === selectedAesthetic || a.id === selectedAesthetic.toLowerCase().replace(/\s+/g, "-")
      );
      const silAffinity = entry?.silhouette_affinity ?? [];
      if (!silAffinity.includes(conceptSilhouette)) {
        const suggested = silAffinity[0];
        if (suggested) {
          const suggestedName = CONCEPT_SILHOUETTES.find((s) => s.id === suggested)?.name ?? suggested;
          items.unshift({
            label: `Swap to ${suggestedName} silhouette`,
            rationale: `Strengthens the ${ae} proportion language`,
            type: 'silhouette_swap',
          });
        }
      }

      // Add palette swap suggestion if not aligned
      const palAffinity = entry?.palette_affinity ?? [];
      if (conceptPalette && !palAffinity.includes(conceptPalette)) {
        const suggestedPal = palAffinity[0];
        if (suggestedPal) {
          const palOption = entry?.palette_options?.find((p) => p.id === suggestedPal);
          const palName = palOption?.name ?? suggestedPal;
          items.unshift({
            label: `Swap to ${palName} palette`,
            rationale: `Better alignment with ${ae} visual language`,
            type: 'palette_swap',
          });
        }
      }
    }

    return items.slice(0, 4);
  }, [selectedAesthetic, recommendedAesthetic, insightContent, conceptSilhouette, conceptPalette]);

  const canContinue = Boolean(selectedAesthetic) && Boolean(conceptSilhouette);
  const sohne = "var(--font-sohne-breit), system-ui, sans-serif";
  const inter = "var(--font-inter), system-ui, sans-serif";

  /* ─── Pulse rows ──────────────────────────────────────────────────────────── */
  const pulseRows = [
    { key: "identity", label: "Identity", icon: (c: string) => <IconIdentity size={14} color={c} />, score: identityScore != null ? `${identityScore}` : "—", scoreNum: identityScore ?? 0, color: identityScore != null ? scoreColor(identityScore) : "rgba(67,67,43,0.35)", chip: identityScore != null ? { variant: idStatus.color === PULSE_GREEN ? "green" as const : idStatus.color === PULSE_YELLOW ? "amber" as const : idStatus.color === PULSE_RED ? "red" as const : "amber" as const, status: idStatus.label } : null, subLabel: noBrandProfile ? "Complete Brand DNA setup to see identity scores" : idStatus.sublabel, what: `Identity measures how well this direction aligns with your brand DNA — keywords, aesthetic positioning, and customer profile. A high score means this direction reinforces who you already are. A low score signals tension that requires intentional navigation.`, how: `Keyword overlap between your brand profile and this direction's signals, weighted by conflict detection. Intentional tensions acknowledged in onboarding are factored in.`, pending: false },
    { key: "resonance", label: "Resonance", icon: (c: string) => <IconResonance size={14} color={c} />, score: resonanceLoading ? "—" : resonanceScore != null ? `${resonanceScore}` : "—", scoreNum: resonanceLoading ? 0 : resonanceScore ?? 0, color: resonanceLoading ? "rgba(67,67,43,0.35)" : resonanceScore != null ? scoreColor(resonanceScore) : "rgba(67,67,43,0.35)", chip: resonanceLoading ? { variant: "gray" as const, status: "Matching direction..." } : resonanceScore != null ? { variant: resStatus.color === PULSE_GREEN ? "green" as const : resStatus.color === PULSE_YELLOW ? "amber" as const : resStatus.color === PULSE_RED ? "red" as const : "amber" as const, status: resStatus.label } : null, subLabel: resonanceLoading ? "\u00A0" : resStatus.sublabel || "\u00A0", what: `Resonance measures market timing — how much consumer interest exists for this direction right now, and whether you're entering at the right moment. High resonance with ascending velocity means the window is open. Peak saturation means you're late.`, how: `Based on checkMarketSaturation(): saturation score from our curated aesthetics library, weighted by trend velocity. Resonance = 100 − saturation, with a 15-point penalty for declining velocity.`, pending: false },
    { key: "execution", label: "Execution", icon: (c: string) => <IconExecution size={14} color={c} />, score: "—", scoreNum: 0, color: "rgba(67,67,43,0.35)", chip: null, subLabel: "Unlocks in Spec Studio", what: `Execution measures whether the physical product you're building is feasible given your timeline, materials, and construction complexity. It unlocks in Spec Studio once you define your product inputs.`, how: `Timeline buffer score based on material lead times and construction complexity relative to your season deadline. Negative buffer scores red. Margin gate applied as a 30% score penalty if COGS exceeds target.`, pending: true },
  ];

  /* ─── Top card chip data ──────────────────────────────────────────────────── */
  const topChips = getAestheticChips(topAesthetic);
  const topSpecChips = topChips.filter((c) => c.type === "spec").slice(0, 4);
  const topMoodChips = topChips.filter((c) => c.type === "mood").slice(0, 2);
  const topDisplayChips = [...topSpecChips, ...topMoodChips];
  const topContent = AESTHETIC_CONTENT[topAesthetic];

  /* ─── RENDER ──────────────────────────────────────────────────────────────── */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#FAF9F6", overflow: "hidden" }}>

      {/* ── Fixed Header ─────────────────────────────────────────────────────── */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, height: 72, background: "rgba(250,249,246,0.92)", backdropFilter: "blur(24px) saturate(160%)", WebkitBackdropFilter: "blur(24px) saturate(160%)", borderBottom: "1px solid rgba(67,67,43,0.09)", zIndex: 200, display: "flex", alignItems: "center", padding: "0 40px", justifyContent: "space-between", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ fontFamily: sohne, fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", color: OLIVE }}>muko</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {[{ label: "Intent", done: true, active: false }, { label: "Concept", done: false, active: true }, { label: "Spec", done: false, active: false }, { label: "Report", done: false, active: false }].map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, border: s.done ? `1.5px solid ${CHARTREUSE}` : s.active ? `1.5px solid ${STEEL}` : "1.5px solid rgba(67,67,43,0.10)", background: s.done ? "rgba(168,180,117,0.08)" : s.active ? "rgba(125,150,172,0.07)" : "rgba(67,67,43,0.03)", fontFamily: sohne, fontSize: 11, fontWeight: 600, letterSpacing: "0.01em", color: s.done ? "rgba(67,67,43,0.70)" : s.active ? OLIVE : "rgba(67,67,43,0.35)" }}>
                {s.done ? <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M4.5 7.2L6.2 8.8L9.5 5.5" stroke={CHARTREUSE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> : s.active ? <span style={{ width: 7, height: 7, borderRadius: 999, background: STEEL, boxShadow: `0 0 0 3px rgba(125,150,172,0.20)` }} /> : <span style={{ width: 6, height: 6, borderRadius: 999, background: "rgba(67,67,43,0.18)" }} />}
                {s.label}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: sohne, fontSize: 12, fontWeight: 600, color: "rgba(67,67,43,0.50)", letterSpacing: "0.03em" }}>{headerSeasonLabel}<span style={{ padding: "0 7px", opacity: 0.35 }}>·</span>{headerCollectionName}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => window.history.back()} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 13px 7px 10px", borderRadius: 999, border: "1px solid rgba(67,67,43,0.14)", background: "transparent", fontFamily: sohne, fontSize: 11, fontWeight: 600, color: "rgba(67,67,43,0.62)", cursor: "pointer", letterSpacing: "0.01em" }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Back
            </button>
            <button onClick={() => {}} style={{ padding: "7px 14px", borderRadius: 999, border: "none", background: OLIVE, fontFamily: sohne, fontSize: 11, fontWeight: 600, color: "#F5F0E8", cursor: "pointer", letterSpacing: "0.01em" }}>SAVE & CLOSE</button>
          </div>
        </div>
      </header>

      {/* ── Two-column body ───────────────────────────────────────────────────── */}
      <ResizableSplitPanel
        defaultLeftPercent={50}
        storageKey="muko_concept_splitPanel"
        topOffset={72}
        leftContent={
          <>
          {/* Title */}
          <div style={{ padding: "36px 44px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
            <div>
              <h1 style={{ margin: 0, fontFamily: sohne, fontWeight: 500, fontSize: 28, color: OLIVE, letterSpacing: "-0.01em", lineHeight: 1.1 }}>Concept Studio</h1>
              <p style={{ margin: "10px 0 0", fontFamily: inter, fontSize: 13, color: "rgba(67,67,43,0.52)", lineHeight: 1.55, maxWidth: 460 }}>
                We analyzed your brand DNA against live market data to find your strongest direction. Start with our pick or explore all eight below.
              </p>
            </div>
            <button
              onClick={() => handleSelectAesthetic(recommendedAesthetic)}
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
                {mukoPickLabel}
              </span>
            </button>
          </div>

          <div style={{ padding: "0 44px 48px" }}>

            {/* ── YOUR CONCEPT (shown after selection) ────────────────────────────── */}
            {selectedAesthetic && (
              <>
                <div ref={yourConceptRef} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: CHARTREUSE, whiteSpace: "nowrap" }}>
                    Your Concept
                  </span>
                  <div style={{ flex: 1, height: 1, background: "rgba(168,180,117,0.25)" }} />
                </div>

                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    textAlign: "left",
                    padding: "18px 20px",
                    borderRadius: 10,
                    background: "transparent",
                    border: `1px solid ${CHARTREUSE}`,
                    boxShadow: "0 4px 16px rgba(168,180,117,0.18), 0 1px 4px rgba(0,0,0,0.06)",
                    marginBottom: 28,
                    overflow: "hidden",
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ position: "absolute", top: 10, right: 10, width: 22, height: 22, borderRadius: "50%", background: CHARTREUSE, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>

                  <span style={{ fontFamily: sohne, fontWeight: 500, fontSize: 20, color: OLIVE, letterSpacing: "-0.01em", lineHeight: 1.15, display: "block", marginBottom: 8 }}>
                    {topAesthetic}
                  </span>

                  {topContent?.description && (
                    <p style={{ margin: "0 0 12px", fontFamily: inter, fontSize: 12.5, color: "rgba(67,67,43,0.58)", lineHeight: 1.55 }}>
                      {topContent.description}
                    </p>
                  )}

                  <div style={{ padding: "0 18px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 14 }}>
                      {topMoodboardImages.map((src, i) => (
                        <div key={`top-mb-${i}`} style={{ aspectRatio: "1", borderRadius: 8, overflow: "hidden", animation: `fadeIn 220ms ease ${i * 20}ms both` }}>
                          <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ height: 1, background: "rgba(67,67,43,0.10)", margin: "18px 0 16px" }} />
                  <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(67,67,43,0.50)", marginBottom: 6 }}>
                    SHAPE YOUR DIRECTION
                  </div>
                  <div style={{ fontFamily: inter, fontSize: 11, fontStyle: "italic", color: "rgba(67,67,43,0.44)", marginBottom: 16 }}>
                    Complete your creative vision before moving to production specs.
                  </div>

                  {/* KEY PIECES */}
                  {keyPieces.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontFamily: inter, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(67,67,43,0.40)", marginBottom: 4 }}>
                        Key Pieces
                      </div>
                      <div style={{ fontFamily: inter, fontSize: 11, fontStyle: "italic", color: "rgba(67,67,43,0.44)", marginBottom: 12 }}>
                        What the market is moving toward for {selectedAesthetic} this season.
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                        {keyPieces.map((piece, i) => {
                          const isSelected = selectedKeyPieceLocal?.item === piece.item && !selectedKeyPieceLocal?.custom;
                          const signalStyle = piece.signal === "high-volume"
                            ? { bg: "rgba(169,123,143,0.15)", color: "#6B3D52", label: "HIGH VOLUME" }
                            : piece.signal === "ascending"
                            ? { bg: "rgba(168,180,117,0.15)", color: "#5B6A38", label: "ASCENDING ↑" }
                            : { bg: "rgba(125,150,172,0.15)", color: "#3D5A72", label: "EMERGING" };
                          const icon = KEY_PIECE_CATEGORY_ICONS[piece.category ?? ""] ?? null;
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedKeyPieceLocal(null);
                                  setSelectedKeyPiece(null);
                                } else {
                                  setSelectedKeyPieceLocal(piece);
                                  setSelectedKeyPiece(piece);
                                }
                              }}
                              style={{
                                textAlign: "left",
                                borderRadius: 14,
                                padding: "14px 14px 12px",
                                background: isSelected ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.55)",
                                border: isSelected ? `1.5px solid ${CHARTREUSE}` : "1px solid rgba(67,67,43,0.10)",
                                boxShadow: isSelected ? "0 14px 40px rgba(67,67,43,0.10)" : "0 8px 24px rgba(67,67,43,0.05)",
                                cursor: "pointer",
                                outline: "none",
                                transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                                transform: isSelected ? "translateY(-1px)" : "translateY(0)",
                                position: "relative",
                              }}
                            >
                              {isSelected && (
                                <div style={{ position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: "50%", background: CHARTREUSE, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                              )}
                              <div style={{ fontSize: 13, marginBottom: 6, color: "rgba(67,67,43,0.35)" }}>
                                {icon}
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 650, color: OLIVE, fontFamily: sohne, marginBottom: 4 }}>
                                {piece.item}
                              </div>
                              {piece.signal && (
                                <div style={{ marginBottom: 6 }}>
                                  <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" as const, background: signalStyle.bg, color: signalStyle.color, fontFamily: inter }}>
                                    {signalStyle.label}
                                  </span>
                                </div>
                              )}
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                                {piece.category && (
                                  <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 500, fontFamily: inter, border: "1px solid rgba(67,67,43,0.14)", color: "rgba(67,67,43,0.52)" }}>
                                    {piece.category}
                                  </span>
                                )}
                                {piece.type && (
                                  <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 500, fontFamily: inter, border: "1px solid rgba(67,67,43,0.14)", color: "rgba(67,67,43,0.52)" }}>
                                    {piece.type}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                        {/* Custom entry */}
                        {!showCustomInput ? (
                          <button
                            onClick={() => setShowCustomInput(true)}
                            style={{
                              textAlign: "left",
                              padding: "14px 14px 12px",
                              borderRadius: 14,
                              border: "1px dashed rgba(67,67,43,0.22)",
                              background: "transparent",
                              cursor: "pointer",
                              fontFamily: inter,
                              fontSize: 12,
                              color: "rgba(67,67,43,0.50)",
                              outline: "none",
                            }}
                          >
                            + Add your own piece
                          </button>
                        ) : (
                          <div style={{ padding: "14px 14px 12px", borderRadius: 14, border: "1px dashed rgba(67,67,43,0.22)", background: "rgba(255,255,255,0.60)" }}>
                            <input
                              autoFocus
                              value={customKeyPieceText}
                              onChange={(e) => setCustomKeyPieceText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && customKeyPieceText.trim()) {
                                  const custom: KeyPiece = { item: customKeyPieceText.trim(), signal: null, category: null, type: null, recommended_material_id: null, redirect_material_id: null, custom: true };
                                  setSelectedKeyPieceLocal(custom);
                                  setSelectedKeyPiece(custom);
                                  setCustomKeyPieceConfirmed(true);
                                }
                              }}
                              onBlur={() => {
                                if (customKeyPieceText.trim()) {
                                  const custom: KeyPiece = { item: customKeyPieceText.trim(), signal: null, category: null, type: null, recommended_material_id: null, redirect_material_id: null, custom: true };
                                  setSelectedKeyPieceLocal(custom);
                                  setSelectedKeyPiece(custom);
                                  setCustomKeyPieceConfirmed(true);
                                }
                              }}
                              placeholder="e.g. Asymmetric Hem Midi Dress"
                              style={{ width: "100%", boxSizing: "border-box", border: "none", background: "transparent", fontFamily: inter, fontSize: 13, color: "rgba(67,67,43,0.80)", outline: "none" }}
                            />
                            {customKeyPieceConfirmed && (
                              <div style={{ marginTop: 6, fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.44)", fontStyle: "italic" }}>
                                Muko doesn&apos;t have market data on this piece yet — it won&apos;t affect your score but we&apos;ll track it.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Silhouette selector (required) */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontFamily: inter, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(67,67,43,0.40)", marginBottom: 10 }}>
                      Silhouette <span style={{ fontWeight: 500, letterSpacing: "0.04em", textTransform: "none", color: "rgba(67,67,43,0.32)" }}>(required)</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                      {CONCEPT_SILHOUETTES.map((sil) => {
                        const isSel = conceptSilhouette === sil.id;
                        const isAffinity = selectedAestheticData?.silhouette_affinity?.includes(sil.id) ?? false;
                        return (
                          <button
                            key={sil.id}
                            onClick={() => setConceptSilhouette(sil.id)}
                            style={{
                              textAlign: "left",
                              borderRadius: 14,
                              padding: "14px 14px 12px",
                              background: isSel ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.55)",
                              border: isSel ? `1.5px solid ${CHARTREUSE}` : "1px solid rgba(67,67,43,0.10)",
                              boxShadow: isSel ? "0 14px 40px rgba(67,67,43,0.10)" : "0 8px 24px rgba(67,67,43,0.05)",
                              cursor: "pointer",
                              outline: "none",
                              transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                              transform: isSel ? "translateY(-1px)" : "translateY(0)",
                              position: "relative",
                            }}
                          >
                            {isAffinity && !isSel && (
                              <div style={{ position: "absolute", top: 8, right: 8 }}>
                                <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" as const, background: "rgba(169,123,143,0.10)", border: "1px solid rgba(169,123,143,0.30)", color: BRAND.rose, fontFamily: inter, whiteSpace: "nowrap" }}>
                                  Best fit
                                </span>
                              </div>
                            )}
                            <div style={{ fontSize: 13, marginBottom: 4, color: "rgba(67,67,43,0.35)" }}>
                              {SILHOUETTE_ICONS[sil.id]}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 650, color: OLIVE, fontFamily: sohne, marginBottom: 2 }}>
                              {sil.name}
                            </div>
                            <div style={{ fontSize: 11, color: "rgba(67,67,43,0.45)", fontFamily: inter, marginTop: 6, lineHeight: 1.4 }}>
                              {sil.descriptor}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Palette selector (optional) */}
                  {selectedAestheticData?.palette_options && selectedAestheticData.palette_options.length > 0 && (
                    <div>
                      <div style={{ fontFamily: inter, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(67,67,43,0.40)", marginBottom: 10 }}>
                        Palette <span style={{ fontWeight: 500, letterSpacing: "0.04em", textTransform: "none", color: "rgba(67,67,43,0.32)" }}>(optional)</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                        {selectedAestheticData.palette_options.map((pal) => {
                          const isSel = conceptPalette === pal.id;
                          const isAffinity = selectedAestheticData?.palette_affinity?.includes(pal.id) ?? false;
                          return (
                            <button
                              key={pal.id}
                              onClick={() => setConceptPalette(isSel ? null : pal.id)}
                              style={{
                                textAlign: "left",
                                borderRadius: 14,
                                padding: "14px 14px 12px",
                                background: isSel ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.55)",
                                border: isSel ? `1.5px solid ${CHARTREUSE}` : "1px solid rgba(67,67,43,0.10)",
                                boxShadow: isSel ? "0 14px 40px rgba(67,67,43,0.10)" : "0 8px 24px rgba(67,67,43,0.05)",
                                cursor: "pointer",
                                outline: "none",
                                transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                                transform: isSel ? "translateY(-1px)" : "translateY(0)",
                                position: "relative",
                              }}
                            >
                              {isAffinity && !isSel && (
                                <div style={{ position: "absolute", top: 8, right: 8 }}>
                                  <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" as const, background: "rgba(169,123,143,0.10)", border: "1px solid rgba(169,123,143,0.30)", color: BRAND.rose, fontFamily: inter, whiteSpace: "nowrap" }}>
                                    Best fit
                                  </span>
                                </div>
                              )}
                              <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
                                {pal.swatches.slice(0, 6).map((hex, i) => (
                                  <div key={i} style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: hex, border: "1px solid rgba(0,0,0,0.06)" }} />
                                ))}
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 650, color: OLIVE, fontFamily: sohne, marginBottom: 2 }}>
                                {pal.name}
                              </div>
                              <div style={{ fontSize: 11, color: "rgba(67,67,43,0.45)", fontFamily: inter, marginTop: 6, lineHeight: 1.4 }}>
                                {pal.descriptor}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* LAYER THESE IN */}
                  {topDisplayChips.length > 0 && (
                    <>
                      <div style={{ height: 1, background: "rgba(67,67,43,0.07)", margin: "16px 0 14px" }} />
                      <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(67,67,43,0.50)", marginBottom: 4 }}>
                        Layer these in
                      </div>
                      <div style={{ fontFamily: inter, fontSize: 11, fontStyle: "italic", color: "rgba(67,67,43,0.44)", marginBottom: 12 }}>
                        Creative signals that shape this direction — activate the ones that feel right to amplify your vision.
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {topDisplayChips.map((chip) => {
                          const chipKey = `${topAesthetic}::${chip.label}`;
                          const isActive = selectedElements.has(chipKey);
                          const meta = chipMeta.get(chipKey);
                          const isAutoSelected = meta?.source === 'key-piece';
                          // Only compute tension for manually selected chips (auto-selected chips never self-penalize)
                          const tension: TensionState = isActive && !isAutoSelected
                            ? getChipTensionState(chip.label, selectedKeyPieceLocal)
                            : 'none';
                          return (
                            <AestheticChipButton
                              key={chip.label}
                              label={chip.label}
                              isActive={isActive}
                              isClickable={true}
                              onClick={() => toggleElement(chipKey)}
                              isAutoSelected={isAutoSelected}
                              tension={tension}
                            />
                          );
                        })}
                        <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 500, fontFamily: inter, background: "transparent", border: `1px dashed ${STEEL}`, color: STEEL }}>+ add</span>
                      </div>
                    </>
                  )}
                </div>

              </>
            )}

            {/* ── EXPLORE OTHER DIRECTIONS ───────────────────────────────────────── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(67,67,43,0.40)", marginBottom: 5 }}>EXPLORE OTHER DIRECTIONS</div>
              <div style={{ fontFamily: inter, fontSize: 12, fontStyle: "italic", color: "rgba(67,67,43,0.44)", marginBottom: 12 }}>Type a direction and we'll match it — or select from below.</div>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={freeFormDraft}
                  onChange={(e) => setFreeFormDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && freeFormMatch) { handleSelectAesthetic(freeFormMatch); setFreeFormDraft(""); } }}
                  placeholder="e.g. quiet luxury with edge, grunge romance, coastal dark…"
                  style={{ width: "100%", boxSizing: "border-box", padding: "12px 48px 12px 14px", fontSize: 13, borderRadius: 10, border: "1px solid rgba(67,67,43,0.12)", background: "rgba(255,255,255,0.80)", color: OLIVE, fontFamily: inter, outline: "none" }}
                />
                <button
                  onClick={() => { if (freeFormMatch) { handleSelectAesthetic(freeFormMatch); setFreeFormDraft(""); } }}
                  disabled={!freeFormMatch || !freeFormDraft.trim()}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, borderRadius: 999, border: "1px solid rgba(67,67,43,0.12)", background: "rgba(255,255,255,0.90)", cursor: !freeFormMatch || !freeFormDraft.trim() ? "not-allowed" : "pointer", opacity: !freeFormMatch || !freeFormDraft.trim() ? 0.45 : 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "rgba(67,67,43,0.65)" }}
                >→</button>
              </div>
              {freeFormLoading && freeFormDraft.trim().length > 1 && <div style={{ marginTop: 7, fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.36)" }}>Interpreting…</div>}
              {!freeFormLoading && freeFormMatch && freeFormDraft.trim().length > 1 && (
                <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.40)" }}>Closest match:</span>
                  <button onClick={() => { handleSelectAesthetic(freeFormMatch); setFreeFormDraft(""); }} style={{ padding: "4px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: "rgba(125,150,172,0.08)", border: `1px solid ${STEEL}`, color: STEEL, cursor: "pointer", fontFamily: inter }}>{freeFormMatch} →</button>
                </div>
              )}
            </div>

            {/* ── DIRECTION LIST ─────────────────────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {orderedDirections.map((aesthetic) => {
                const isHovered = hoveredCard === aesthetic;
                const content = AESTHETIC_CONTENT[aesthetic];
                const chips = getAestheticChips(aesthetic).slice(0, 3);
                const idCol = scoreColor(content?.identityScore ?? 0);
                const resCol = scoreColor(content?.resonanceScore ?? 0);
                const cardImages = isHovered ? hoveredImages : [];

                return (
                  <motion.div key={aesthetic} layout transition={{ duration: 0.22, ease: "easeInOut" }} style={{ borderRadius: 8 }}>
                    <DirectionCard
                      aesthetic={aesthetic}
                      content={content}
                      chips={chips}
                      isHovered={isHovered}
                      moodboardImages={cardImages}
                      idColor={idCol}
                      resColor={resCol}
                      topIdScore={topContent?.identityScore ?? null}
                      topResScore={topContent?.resonanceScore ?? null}
                      onHoverEnter={() => setHoveredCard(aesthetic)}
                      onHoverLeave={() => setHoveredCard(null)}
                      onSelect={() => handleSelectAesthetic(aesthetic)}
                      inter={inter}
                      sohne={sohne}
                      steelBlue={STEEL}
                      chartreuse={CHARTREUSE}
                      isMukoPick={aesthetic === recommendedAesthetic}
                      mukoPickLabel={mukoPickLabel}
                    />
                  </motion.div>
                );
              })}
            </div>
            {/* Spacer for sticky footer */}
            <div style={{ height: 72 }} />
          </div>

          {/* Sticky CTA */}
          <div style={{ position: "sticky", bottom: 0, padding: "0 44px 24px", background: "linear-gradient(to bottom, rgba(250,249,246,0) 0%, rgba(250,249,246,0.92) 16%, rgba(250,249,246,1) 100%)", paddingTop: 20, zIndex: 10 }}>
            <button
              onClick={() => {
                if (!canContinue) return;
                useSessionStore.setState({ aestheticMatchedId: selectedAesthetic, refinementModifiers: interpretation?.modifiers ?? [], moodboardImages: topMoodboardImages, conceptSilhouette, conceptPalette });
                setCurrentStep(3);
                router.push("/spec");
              }}
              disabled={!canContinue}
              style={{ width: "100%", padding: "14px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, fontFamily: sohne, letterSpacing: "0.02em", color: canContinue ? STEEL : "rgba(67,67,43,0.30)", background: canContinue ? "rgba(125,150,172,0.07)" : "rgba(255,255,255,0.46)", border: canContinue ? `1.5px solid ${STEEL}` : "1.5px solid rgba(67,67,43,0.10)", cursor: canContinue ? "pointer" : "not-allowed", transition: "all 280ms ease", opacity: canContinue ? 1 : 0.65, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
            >
              <span>{selectedAesthetic && !conceptSilhouette ? "Select a silhouette to continue" : "Lock direction & build specs"}</span>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ opacity: canContinue ? 1 : 0.4 }}><path d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          </>
        }
        rightContent={
          <>
          <div style={{ padding: "36px 44px 0" }}>

            {/* PULSE RAIL */}
            <div style={{ marginBottom: 0 }}>
              <div style={{ fontFamily: sohne, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(67,67,43,0.38)", marginBottom: 16 }}>Pulse</div>
              {pulseRows.map((row) => (
                <React.Fragment key={row.key}>
                  {/* Proxy message — shown above Resonance when LLM matched a different aesthetic */}
                  {row.key === "resonance" && resonanceProxyMessage && !resonanceLoading && (
                    <div style={{ fontSize: 11, color: "rgba(67,67,43,0.50)", fontFamily: inter, marginBottom: 8, lineHeight: 1.5 }}>
                      {resonanceProxyMessage}
                    </div>
                  )}
                  <PulseScoreRow
                    dimensionKey={row.key}
                    label={row.label}
                    icon={row.icon(row.color)}
                    displayScore={row.score}
                    numericPercent={row.scoreNum}
                    scoreColor={row.color}
                    pill={row.chip ? { variant: row.chip.variant, label: row.chip.status } : null}
                    subLabel={row.subLabel}
                    whatItMeans={row.what}
                    howCalculated={row.how}
                    isPending={row.pending}
                    isExpanded={pulseExpandedRow === row.key}
                    onToggleExpand={() => setPulseExpandedRow(pulseExpandedRow === row.key ? null : row.key)}
                  />
                </React.Fragment>
              ))}
            </div>

            {/* MUKO INSIGHT */}
            {!selectedAesthetic ? (
              <div style={{ marginBottom: 28 }}>
                <div style={{ height: 1, background: "rgba(67,67,43,0.12)", margin: "24px 0" }} />
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(67,67,43,0.38)",
                    marginBottom: 16,
                  }}
                >
                  MUKO INSIGHT
                </div>
                <p style={{ margin: 0, fontFamily: inter, fontSize: 13, color: "rgba(67,67,43,0.35)", fontStyle: "italic" }}>
                  Select a direction to see Muko&apos;s analysis
                </p>
              </div>
            ) : conceptInsightLoading && !conceptInsightData && !conceptStreamingText ? (
              <div style={{ marginBottom: 28 }}>
                <div style={{ height: 1, background: "rgba(67,67,43,0.12)", margin: "24px 0" }} />
                <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(67,67,43,0.38)", marginBottom: 16 }}>
                  MUKO INSIGHT
                </div>
                {/* Skeleton — shown only before first streaming chunk arrives */}
                {[80, 60, 90, 55].map((w, i) => (
                  <div key={i} style={{ height: i === 0 ? 18 : 12, borderRadius: 6, background: "rgba(67,67,43,0.07)", marginBottom: i === 0 ? 14 : 8, width: `${w}%`, animation: "pulse 1.4s ease-in-out infinite" }} />
                ))}
              </div>
            ) : (
              <MukoInsightSection
                headline={conceptInsightData?.statements[0] ?? insightContent.headline}
                paragraphs={
                  conceptInsightData
                    ? [conceptInsightData.statements[1] ?? '', conceptInsightData.statements[2] ?? ''].filter(Boolean)
                    : [insightContent.p1, insightContent.p2, insightContent.p3]
                }
                bullets={{
                  label: conceptInsightData?.editLabel ?? 'POSITIONING',
                  items: conceptInsightData?.edit ?? insightContent.opportunity,
                }}
                mode={conceptInsightData?.mode}
                isStreaming={conceptInsightLoading && !!conceptStreamingText}
                streamingText={conceptStreamingText}
                nextMove={{
                  mode: "concept",
                  items: nextMoveItems,
                  onAdd: (label) => {
                    const item = nextMoveItems.find((i) => i.label === label);
                    if (item?.type === 'silhouette_swap') {
                      const match = label.match(/(\w+) silhouette/);
                      if (match) setConceptSilhouette(match[1].toLowerCase());
                    } else if (item?.type === 'palette_swap') {
                      const entry = (aestheticsData as unknown as AestheticDataEntry[]).find(
                        (a) => a.name === selectedAesthetic || a.id === selectedAesthetic?.toLowerCase().replace(/\s+/g, "-")
                      );
                      const palAffinity = entry?.palette_affinity ?? [];
                      if (palAffinity[0]) setConceptPalette(palAffinity[0]);
                    } else if (selectedAesthetic) {
                      const chipName = label.replace(/^(Layer in |Consider |Try )/, "");
                      toggleElement(`${selectedAesthetic}::${chipName}`);
                    }
                  },
                  onRemove: (label) => {
                    const chipName = label.replace(/^(Layer in |Consider |Try |Swap to )/, "");
                    removeElement(chipName);
                  },
                  addedItems: new Set(
                    nextMoveItems
                      .filter((i) => {
                        if (i.type === 'silhouette_swap' || i.type === 'palette_swap') return false;
                        const chipName = i.label.replace(/^(Layer in |Consider |Try )/, "");
                        return addedChipLabels.has(chipName);
                      })
                      .map((i) => i.label)
                  ),
                }}
              />
            )}

          </div>
          </>
        }
      />

      {/* ═══ FLOATING MUKO ORB ═══ */}
      <FloatingMukoOrb
        step="concept"
        context={{ aesthetic: selectedAesthetic, refineText, identityScore: identityPulse?.score, resonanceScore: resonancePulse?.score }}
        conceptName={(() => {
          if (!selectedAesthetic) return undefined;
          const entry = (aestheticsData as Array<{ id: string; name: string }>).find(a => a.id === selectedAesthetic);
          return entry?.name ?? selectedAesthetic;
        })()}
        identityScore={identityPulse?.score}
        resonanceScore={resonancePulse?.score}
      />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes expandDown { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
        /* ResizableSplitPanel handles mobile stacking */
      `}</style>
    </div>
  );
}

/* ─── Direction Card ──────────────────────────────────────────────────────── */
function DirectionCard({
  aesthetic, content, chips, isHovered, moodboardImages,
  idColor, resColor, topIdScore, topResScore, onHoverEnter, onHoverLeave, onSelect,
  inter, sohne, steelBlue, chartreuse, isMukoPick, mukoPickLabel = "Muko's Pick",
}: {
  aesthetic: string;
  content: { description: string; identityScore: number; resonanceScore: number } | undefined;
  chips: AestheticChip[];
  isHovered: boolean;
  moodboardImages: string[];
  idColor: string;
  resColor: string;
  topIdScore: number | null;
  topResScore: number | null;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  onSelect: () => void;
  inter: string;
  sohne: string;
  steelBlue: string;
  chartreuse: string;
  isMukoPick?: boolean;
  mukoPickLabel?: string;
}) {
  const idScore = content?.identityScore ?? 0;
  const resScore = content?.resonanceScore ?? 0;
  const idDelta = topIdScore != null ? idScore - topIdScore : null;
  const resDelta = topResScore != null ? resScore - topResScore : null;
  const deltaColor = (d: number) => d > 0 ? "#4D7A56" : d < 0 ? "#8A3A3A" : "rgba(67,67,43,0.35)";
  const deltaLabel = (d: number) => d > 0 ? `+${d}` : `${d}`;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 8,
        background: "transparent",
        border: isHovered ? "1px solid rgba(67,67,43,0.18)" : "1px solid rgba(67,67,43,0.08)",
        boxShadow: isHovered ? "0 4px 14px rgba(0,0,0,0.07)" : "none",
        padding: "14px 16px",
        cursor: "pointer",
        transition: "border-color 150ms ease, box-shadow 150ms ease",
        overflow: "hidden",
      }}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      onClick={onSelect}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(67,67,43,0.20)", flexShrink: 0 }} />
          <span style={{ fontFamily: sohne, fontWeight: 500, fontSize: 13.5, color: "rgba(67,67,43,0.78)", letterSpacing: "-0.005em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {aesthetic}
          </span>
          {/* Delta scores against the top selected card */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0, marginLeft: 4 }}>
            {idDelta !== null ? (
              <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 650, color: deltaColor(idDelta), display: "flex", alignItems: "center", gap: 2 }}>
                <IconIdentity size={10} color={deltaColor(idDelta)} />{deltaLabel(idDelta)}
              </span>
            ) : (
              <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 650, color: idColor, display: "flex", alignItems: "center", gap: 2 }}>
                <IconIdentity size={10} color={idColor} />{idScore}
              </span>
            )}
            {resDelta !== null ? (
              <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 650, color: deltaColor(resDelta), display: "flex", alignItems: "center", gap: 2 }}>
                <IconResonance size={10} color={deltaColor(resDelta)} />{deltaLabel(resDelta)}
              </span>
            ) : (
              <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 650, color: resColor, display: "flex", alignItems: "center", gap: 2 }}>
                <IconResonance size={10} color={resColor} />{resScore}
              </span>
            )}
          </div>
        </div>

        {/* Right: muko's pick badge + select button */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {isMukoPick && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 999, background: "rgba(168,180,117,0.12)", border: "1px solid rgba(168,180,117,0.40)" }}>
              <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#A8B475", flexShrink: 0 }} />
              <span style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#6B7A3E", whiteSpace: "nowrap" }}>{mukoPickLabel}</span>
            </div>
          )}
          {/* Select button — clips to 0 width when not hovered */}
          <div style={{ overflow: "hidden", maxWidth: isHovered ? "80px" : "0px", opacity: isHovered ? 1 : 0, transition: "max-width 180ms ease, opacity 150ms ease" }}>
            <span style={{ display: "block", whiteSpace: "nowrap", padding: "4px 11px", borderRadius: 999, fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", border: `1px solid ${chartreuse}`, background: "transparent", color: chartreuse, fontFamily: inter, pointerEvents: "none" }}>
              Select
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      {content?.description && (
        <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.52)", lineHeight: 1.5, marginBottom: chips.length > 0 ? 8 : 0, paddingLeft: 12 }}>
          {content.description}
        </div>
      )}

      {/* Chips */}
      {chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, paddingLeft: 12 }}>
          {chips.map((chip) => (
            <span key={chip.label} style={{ padding: "3px 8px", borderRadius: 999, fontSize: 10.5, fontWeight: 500, background: "transparent", border: "1px solid rgba(67,67,43,0.14)", color: "rgba(67,67,43,0.46)", fontFamily: inter }}>
              {chip.label}
            </span>
          ))}
        </div>
      )}

      {/* Moodboard — reveals on hover */}
      <div style={{ maxHeight: isHovered ? "1200px" : "0", overflow: "hidden", transition: "max-height 220ms ease" }}>
        <div style={{ padding: "0 18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 10 }}>
            {moodboardImages.map((src, i) => (
              <div key={`mb-${aesthetic}-${i}`} style={{ aspectRatio: "1", borderRadius: 8, overflow: "hidden", opacity: isHovered ? 1 : 0, transition: `opacity 180ms ease ${i * 20}ms` }}>
                <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── SharpenRow ──────────────────────────────────────────────────────────── */
function SharpenRow({ label, onAdd, inter, steelBlue }: { label: string; onAdd: () => void; inter: string; steelBlue: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 6, border: `1px dashed ${hovered ? steelBlue : "rgba(67,67,43,0.16)"}`, marginBottom: 6, transition: "border-color 150ms ease", cursor: "pointer" }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onAdd}>
      <span style={{ fontFamily: inter, fontSize: 12.5, color: "rgba(67,67,43,0.65)" }}>{label}</span>
      <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: steelBlue, opacity: hovered ? 1 : 0.6, transition: "opacity 150ms ease" }}>ADD</span>
    </div>
  );
}
