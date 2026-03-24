"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useSessionStore } from "@/lib/store/sessionStore";
import type { CollectionRoleId, KeyPiece, PieceRolesById } from "@/lib/store/sessionStore";
import { useShallow } from "zustand/react/shallow";
import {
  BRAND,
  AESTHETICS,
  TOP_SUGGESTED,
  AESTHETIC_CONTENT,
} from "../../lib/concept-studio/constants";
import {
  seededShuffle,
  matchAestheticToFolder,
} from "../../lib/concept-studio/utils";
import AskMuko from "@/components/AskMuko";
import type { AskMukoContext } from "@/lib/synthesizer/askMukoResponse";
import aestheticsData from "@/data/aesthetics.json";
import chipTensionsData from "@/data/chip_tensions.json";
import { ResizableSplitPanel } from "@/components/ui/ResizableSplitPanel";
import { PulseScoreRow } from "@/components/ui/PulseScoreRow";
import { MukoInsightSection } from "@/components/ui/MukoInsightSection";
import { MukoStreamingParagraph } from "@/components/ui/MukoStreamingParagraph";
import { buildConceptBlackboard, toAestheticSlug } from "@/lib/synthesizer/assemble";
import type { InsightData } from "@/lib/types/insight";
import { createClient } from "@/lib/supabase/client";
import { debounce } from "@/lib/utils/debounce";
import {
  checkMarketSaturation,
  getResonanceScore,
  type Aesthetic as ResearcherAesthetic,
} from "@/lib/agents/researcher";
import { getFlatForPiece } from "@/components/flats";
import { combineDirection } from "@/lib/concept-studio/combineDirection";
import { SUGGESTED_INTERPRETATION_CHIPS } from "@/lib/concept-studio/interpretations";
import { buildSelectedPieceImage } from "@/lib/piece-image";

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
const PULSE_GREEN = "#A8B475";   // Chartreuse — brand positive
const PULSE_YELLOW = "#B8876B";  // Camel — brand moderate
const PULSE_RED = "#A97B8F";     // Rose — brand tension
const OLIVE = BRAND.oliveInk;

/* ─── Type aliases ────────────────────────────────────────────────────────── */
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

function extractPartialJsonString(raw: string, key: string): string {
  const match = raw.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)`));
  if (!match) return "";

  return match[1]
    .replace(/\\"/g, '"')
    .replace(/\\n/g, " ")
    .trim();
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

interface ConceptLanguageRead {
  headline: string;
  silhouette_steer: string;
  palette_steer: string;
  signals_note: string;
}

type TensionState = 'none' | 'soft' | 'hard';

const COLLECTION_AESTHETIC_STORAGE_KEY = "muko_collection_aesthetic";
const AESTHETIC_INFLECTION_STORAGE_KEY = "muko_aesthetic_inflection";

function getChipTensionState(chipLabel: string, selectedKeyPiece: KeyPiece | null): TensionState {
  if (!selectedKeyPiece || selectedKeyPiece.custom) return 'none';
  const tensions = (chipTensionsData as unknown as Record<string, { hard: string[]; soft: string[] }>)[selectedKeyPiece.type ?? ''];
  if (!tensions) return 'none';
  if (tensions.hard.includes(chipLabel)) return 'hard';
  if (tensions.soft.includes(chipLabel)) return 'soft';
  return 'none';
}

function resolveAestheticName(value: string | null | undefined): string | null {
  if (!value) return null;
  if (AESTHETICS.includes(value as (typeof AESTHETICS)[number])) return value;
  const entry = (
    aestheticsData as unknown as Array<{ id: string; name: string }>
  ).find((aesthetic) => aesthetic.id === value || aesthetic.name.toLowerCase() === value.toLowerCase());
  return entry?.name ?? null;
}

function splitInterpretationPhrases(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function addInterpretationPhrase(currentValue: string, phrase: string): string {
  const nextPhrase = phrase.trim();
  if (!nextPhrase) return currentValue;
  const parts = splitInterpretationPhrases(currentValue);
  if (parts.some((part) => part.toLowerCase() === nextPhrase.toLowerCase())) return currentValue;
  return [...parts, nextPhrase].join(", ");
}

function removeInterpretationPhrase(currentValue: string, phrase: string): string {
  const nextPhrase = phrase.trim().toLowerCase();
  if (!nextPhrase) return currentValue;
  return splitInterpretationPhrases(currentValue)
    .filter((part) => part.toLowerCase() !== nextPhrase)
    .join(", ");
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
        : '#A8B475'
    : hovered && isClickable
      ? 'rgba(168,180,117,0.55)'
      : '#D4CFC8';

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
        fontWeight: isActive ? 600 : 500,
        fontFamily: inter,
        cursor: isClickable ? "pointer" : "default",
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        background: isActive
          ? tension === 'hard'
            ? 'rgba(169,95,95,0.08)'
            : tension === 'soft'
              ? 'rgba(184,135,107,0.08)'
              : '#A8B47515'
          : "transparent",
        border: `1.5px solid ${borderColor}`,
        color: isActive
          ? tension === 'hard'
            ? 'rgba(169,95,95,0.90)'
            : tension === 'soft'
              ? 'rgba(184,135,59,0.90)'
              : '#6B7A40'
          : hovered && isClickable
            ? 'rgba(107,121,64,0.75)'
            : '#6B6560',
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

/* ─── Key Pieces placeholder (used when getFlatForPiece returns null) ─────── */
function KeyPiecePlaceholder({ category }: { category: string | null }) {
  const step = 6;
  const w = 110, h = 150, x0 = 5, y0 = 5;
  const lines: React.ReactNode[] = [];
  for (let i = 0; i * step <= w + h; i++) {
    const o = i * step;
    lines.push(<line key={`d${i}`} x1={x0 + Math.min(o, w)} y1={o <= w ? y0 : y0 + (o - w)} x2={o <= h ? x0 : x0 + (o - h)} y2={y0 + Math.min(o, h)} stroke="rgba(0,0,0,0.06)" strokeWidth="0.8" />);
  }
  for (let x = x0; x <= x0 + w; x += step) {
    lines.push(<line key={`v${x}`} x1={x} y1={y0} x2={x} y2={y0 + h} stroke="rgba(0,0,0,0.06)" strokeWidth="0.8" />);
  }
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 160" fill="none">
      <rect x={x0} y={y0} width={w} height={h} rx="8" fill="#E8E3D6" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
      <clipPath id="ph-clip"><rect x={x0} y={y0} width={w} height={h} rx="8" /></clipPath>
      <g clipPath="url(#ph-clip)">{lines}</g>
      <text x="60" y="85" textAnchor="middle" fontSize="10" fill="#A8A09A" fontFamily="system-ui, sans-serif">{category ?? ""}</text>
    </svg>
  );
}

type ConceptStageId = "direction" | "language" | "product";

type PieceRecommendationEntry = {
  piece: KeyPiece;
  recommendation: { bucket: "core" | "interpretation"; reason: string } | null;
};

const COLLECTION_ROLE_OPTIONS = [
  { id: "hero", name: "Hero", description: "The statement piece that carries the season." },
  { id: "directional", name: "Directional", description: "Pushes the collection forward without losing commercial footing." },
  { id: "core-evolution", name: "Core Evolution", description: "A proven category refreshed for this direction." },
  { id: "volume-driver", name: "Volume Driver", description: "The stabilizer that keeps the assortment commercially grounded." },
] as const;

type ProductStructureSummary = {
  counts: Record<CollectionRoleId, number>;
  assignedCount: number;
  notes: string[];
  categoryBreakdown: Array<{ category: string; count: number }>;
  complexityBreakdown: Array<{ tier: string; count: number }>;
};

type CollectionBalanceContext = {
  totalPieceCount: number;
  assignedRoleCount: number;
  heroAssigned: boolean;
  roleCounts: Record<string, number>;
  categoryBreakdown: { category: string; count: number }[];
  complexityBreakdown: { tier: string; count: number }[];
};

type ProductPieceSuggestion = {
  summary: string;
  suggestedRoles: CollectionRoleId[];
};

type ProductPieceRead = {
  title?: string;
  body: string;
};

type ProductStrategicImplication = {
  summary: string;
  suggestedRoles: CollectionRoleId[];
};

const PRODUCT_PIECE_READ_FALLBACK_BODY =
  "This piece carries the clearest expression of the collection direction. Assign its role before moving to specs.";

function buildProductPieceReadFallback(pieceName: string): ProductPieceRead {
  return {
    title: pieceName,
    body: PRODUCT_PIECE_READ_FALLBACK_BODY,
  };
}

function getConceptSilhouetteLabel(conceptSilhouette: string): string {
  return (
    CONCEPT_SILHOUETTES.find((silhouette) => silhouette.id === conceptSilhouette)?.name.toLowerCase() ??
    conceptSilhouette
  );
}

function getStageIndex(stage: ConceptStageId): number {
  if (stage === "direction") return 0;
  if (stage === "language") return 1;
  return 2;
}

function getRoleName(role: CollectionRoleId): string {
  return COLLECTION_ROLE_OPTIONS.find((option) => option.id === role)?.name ?? role;
}

function MukoPickTag({ label = "Muko Pick" }: { label?: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 7px",
        borderRadius: 999,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        color: "#6B7A40",
        background: "rgba(168,180,117,0.12)",
        border: "1px solid rgba(168,180,117,0.24)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}


function getSuggestedRolesForPiece(
  entry: PieceRecommendationEntry,
  options: {
    conceptSilhouette: string;
    conceptPaletteName: string | null;
    interpretationSummary: string;
    signalCount: number;
  },
  balance: CollectionBalanceContext
): CollectionRoleId[] {
  // Collection balance overrides
  if (!balance.heroAssigned && entry.piece.signal === "ascending") {
    return ["hero", "directional"];
  }
  if (balance.heroAssigned && entry.piece.signal === "ascending") {
    // Hero slot is filled — push toward directional
    return ["directional", "core-evolution"];
  }
  const volumeDriverCount = balance.roleCounts["volume-driver"] ?? 0;
  const totalAssigned = balance.assignedRoleCount;
  const piecesRemaining = balance.totalPieceCount - totalAssigned;
  if (volumeDriverCount === 0 && piecesRemaining <= 3 && entry.piece.signal === "high-volume") {
    return ["volume-driver", "core-evolution"];
  }

  const isStructuredLanguage = options.conceptSilhouette === "structured" || options.conceptSilhouette === "straight";
  const isInterpretationLed = entry.recommendation?.bucket === "interpretation" || options.interpretationSummary !== "Pure direction";

  if (entry.piece.custom) return ["directional", "core-evolution"];
  if (entry.piece.signal === "high-volume") return ["volume-driver", "core-evolution"];
  if (entry.piece.signal === "ascending" && isStructuredLanguage && !isInterpretationLed) return ["hero", "directional"];
  if (entry.piece.signal === "ascending") return ["directional", "hero"];
  if (isInterpretationLed && options.signalCount >= 2) return ["directional", "core-evolution"];
  if (entry.piece.signal === "emerging") return ["directional", "core-evolution"];
  return options.conceptPaletteName ? ["core-evolution", "volume-driver"] : ["volume-driver", "core-evolution"];
}

const EMPTY_BALANCE: CollectionBalanceContext = {
  totalPieceCount: 0,
  assignedRoleCount: 0,
  heroAssigned: false,
  roleCounts: {},
  categoryBreakdown: [],
  complexityBreakdown: [],
};

function getPrimarySuggestedRole(
  entry: PieceRecommendationEntry,
  options: {
    conceptSilhouette: string;
    conceptPaletteName: string | null;
    interpretationSummary: string;
    signalCount: number;
  },
  balance: CollectionBalanceContext = EMPTY_BALANCE
): CollectionRoleId {
  return getSuggestedRolesForPiece(entry, options, balance)[0];
}

function scoreStartingPiecePriority(
  entry: PieceRecommendationEntry,
  options: {
    conceptSilhouette: string;
    conceptPaletteName: string | null;
    interpretationSummary: string;
    signalCount: number;
  }
): number {
  const primaryRole = getPrimarySuggestedRole(entry, options);
  const roleScore =
    primaryRole === "hero"
      ? 40
      : primaryRole === "directional"
      ? 30
      : primaryRole === "core-evolution"
      ? 22
      : 14;
  const signalScore =
    entry.piece.signal === "ascending"
      ? 12
      : entry.piece.signal === "emerging"
      ? 8
      : entry.piece.signal === "high-volume"
      ? 6
      : 2;
  const sourceScore =
    options.interpretationSummary !== "Pure direction"
      ? entry.recommendation?.bucket === "interpretation"
        ? 10
        : 6
      : entry.recommendation?.bucket === "core"
      ? 10
      : 4;
  const customPenalty = entry.piece.custom ? -12 : 0;

  return roleScore + signalScore + sourceScore + customPenalty;
}

function buildPieceSuggestion(
  entry: PieceRecommendationEntry,
  options: {
    conceptSilhouette: string;
    conceptPaletteName: string | null;
    interpretationSummary: string;
    signalCount: number;
  },
  balance: CollectionBalanceContext
): ProductPieceSuggestion {
  const suggestedRoles = getSuggestedRolesForPiece(entry, options, balance);
  const roleLine =
    suggestedRoles[0] === "hero"
      ? "This piece is one of the strongest candidates to carry the lead expression."
      : suggestedRoles[0] === "directional"
      ? "This piece is strongest when it sharpens the point of view rather than carrying the whole assortment."
      : suggestedRoles[0] === "core-evolution"
      ? "This piece reads as a stabilizing expression of the direction."
      : "This piece is better suited to commercial grounding than directional leadership.";

  return {
    summary: roleLine,
    suggestedRoles,
  };
}

function buildStrategicImplication(
  entry: PieceRecommendationEntry,
  options: {
    conceptSilhouette: string;
    conceptPaletteName: string | null;
    interpretationSummary: string;
    signalCount: number;
  },
  balance: CollectionBalanceContext
): ProductStrategicImplication {
  const suggestedRoles = getSuggestedRolesForPiece(entry, options, balance);
  const summary =
    suggestedRoles[0] === "hero" && !balance.heroAssigned
      ? "No Hero has been set yet — this piece has the signal to lead the collection."
      : suggestedRoles[0] === "hero" && balance.heroAssigned
      ? "A Hero is already assigned. This piece could reinforce direction instead."
      : suggestedRoles[0] === "directional"
      ? "This piece is better suited to sharpening the assortment than stabilizing it."
      : suggestedRoles[0] === "core-evolution"
      ? "This piece stabilizes the collection rather than leading it."
      : "This piece works best as the commercial spine of the assortment.";

  return {
    summary,
    suggestedRoles,
  };
}

function buildCollectionStructureSummary(
  persistedPieces: Array<{
    piece_name: string;
    collection_role: string | null;
    category: string | null;
    construction_tier: string | null;
  }> = []
): ProductStructureSummary {
  const counts: Record<CollectionRoleId, number> = {
    hero: 0,
    directional: 0,
    "core-evolution": 0,
    "volume-driver": 0,
  };

  // Counts reflect only fully built pieces (saved analyses in Supabase).
  persistedPieces.forEach((p) => {
    const role = p.collection_role as CollectionRoleId | null;
    if (role && role in counts) counts[role] += 1;
  });

  const assignedCount = persistedPieces.length;
  const notes: string[] = [];

  if (persistedPieces.length === 0 || persistedPieces.some((p) => !p.collection_role)) {
    notes.push("Assign roles piece by piece to start revealing the collection structure.");
  } else {
    if (counts.hero === 0) notes.push("A Hero has not yet been assigned.");
    if (counts["volume-driver"] === 0 && assignedCount >= 2) notes.push("The assortment is currently anchored in directional and core pieces with no volume driver yet.");
    if (counts["core-evolution"] === 0 && assignedCount >= 2) notes.push("The mix still needs a grounded core evolution layer.");
    if (counts.directional >= 2 && counts["core-evolution"] === 0) notes.push("You have directional energy, but the assortment needs more stabilizing clarity.");
    if (notes.length === 0) notes.push("The role mix is reading balanced, with a clear structure emerging.");
  }

  // Category breakdown from persisted pieces.
  const categoryMap = new Map<string, number>();
  persistedPieces.forEach((p) => {
    const cat = p.category ?? "unspecified";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
  });
  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Complexity breakdown from persisted pieces.
  const complexityMap = new Map<string, number>();
  persistedPieces.forEach((p) => {
    const tier = p.construction_tier ?? "unspecified";
    complexityMap.set(tier, (complexityMap.get(tier) ?? 0) + 1);
  });
  const complexityBreakdown = Array.from(complexityMap.entries())
    .map(([tier, count]) => ({ tier, count }))
    .sort((a, b) => b.count - a.count);

  return {
    counts,
    assignedCount,
    notes: notes.slice(0, 2),
    categoryBreakdown,
    complexityBreakdown,
  };
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
    lockConcept,
    setCurrentStep,
    conceptSilhouette,
    setConceptSilhouette,
    conceptPalette,
    setConceptPalette,
    collectionAesthetic: storeCollectionAesthetic,
    setCollectionAesthetic,
    directionInterpretationText: storeDirectionInterpretationText,
    directionInterpretationChips: storeDirectionInterpretationChips,
    setDirectionInterpretationText,
    setDirectionInterpretationModifiers,
    setDirectionInterpretationChips,
    setCustomChips: setStoreCustomChips,
    setSelectedKeyPiece,
    decisionGuidanceState,
    setDecisionGuidanceState,
    intentGoals,
    intentTradeoff,
    collectionRole: storeCollectionRole,
    setCollectionRole,
    activeProductPieceId,
    setActiveProductPieceId,
    pieceRolesById,
    setPieceRolesById,
    setSelectedPieceImage,
    setConceptInsight,
    clearConceptInsight,
    isProxyMatch,
    setIsProxyMatch,
  } = useSessionStore(
    useShallow((state) => ({
      season: state.season,
      collectionName: state.collectionName,
      refinementModifiers: state.refinementModifiers,
      aestheticInput: state.aestheticInput,
      setAestheticInput: state.setAestheticInput,
      identityPulse: state.identityPulse,
      resonancePulse: state.resonancePulse,
      lockConcept: state.lockConcept,
      setCurrentStep: state.setCurrentStep,
      conceptSilhouette: state.conceptSilhouette,
      setConceptSilhouette: state.setConceptSilhouette,
      conceptPalette: state.conceptPalette,
      setConceptPalette: state.setConceptPalette,
      collectionAesthetic: state.collectionAesthetic,
      setCollectionAesthetic: state.setCollectionAesthetic,
      directionInterpretationText: state.directionInterpretationText,
      directionInterpretationChips: state.directionInterpretationChips,
      setDirectionInterpretationText: state.setDirectionInterpretationText,
      setDirectionInterpretationModifiers: state.setDirectionInterpretationModifiers,
      setDirectionInterpretationChips: state.setDirectionInterpretationChips,
      setCustomChips: state.setCustomChips,
      setSelectedKeyPiece: state.setSelectedKeyPiece,
      decisionGuidanceState: state.decisionGuidanceState,
      setDecisionGuidanceState: state.setDecisionGuidanceState,
      intentGoals: state.intentGoals,
      intentTradeoff: state.intentTradeoff,
      collectionRole: state.collectionRole,
      setCollectionRole: state.setCollectionRole,
      activeProductPieceId: state.activeProductPieceId,
      setActiveProductPieceId: state.setActiveProductPieceId,
      pieceRolesById: state.pieceRolesById,
      setPieceRolesById: state.setPieceRolesById,
      setSelectedPieceImage: state.setSelectedPieceImage,
      setConceptInsight: state.setConceptInsight,
      clearConceptInsight: state.clearConceptInsight,
      isProxyMatch: state.isProxyMatch,
      setIsProxyMatch: state.setIsProxyMatch,
    }))
  );

  const [headerCollectionName, setHeaderCollectionName] = useState<string>("Collection");
  const [headerSeasonLabel, setHeaderSeasonLabel] = useState<string>(season || "—");
  const [lockedCollectionAesthetic, setLockedCollectionAesthetic] = useState<string | null>(storeCollectionAesthetic);
  const [isAestheticSelectionUnlocked, setIsAestheticSelectionUnlocked] = useState(false);
  const [showAestheticChangeModal, setShowAestheticChangeModal] = useState(false);
  const [aestheticInflection, setAestheticInflection] = useState(storeDirectionInterpretationText);
  const [selectedInterpretationChips, setSelectedInterpretationChips] = useState<string[]>(storeDirectionInterpretationChips);
  // Draft states — user types/clicks chips here; committed on arrow click
  const [inflectionDraft, setInflectionDraft] = useState(storeDirectionInterpretationText);
  const [chipsDraft, setChipsDraft] = useState<string[]>(storeDirectionInterpretationChips);
  const [inflectionSuggestions, setInflectionSuggestions] = useState<string[]>([]);
  const [loadingInflectionSuggestions, setLoadingInflectionSuggestions] = useState(false);
  const [brandProfile3, setBrandProfile3] = useState<{
    brand_name: string | null;
    keywords: string[] | null;
    customer_profile: string | null;
    price_tier: string | null;
    target_margin: number | null;
    tension_context: string | null;
  } | null>(null);
  const brandKeywordSource = brandProfile3?.keywords ?? refinementModifiers;

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

  const { recommendedAesthetic } = useMemo(() => {
    // No real scores yet — fall back to static brand-agnostic ranking
    if (Object.keys(allCriticScores).length === 0) {
      return { recommendedAesthetic: computeRecommendedAesthetic(brandKeywordSource) };
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
      return { recommendedAesthetic: eligible[0].aesthetic };
    }

    // No aesthetic clears the threshold — surface the closest-fit option.
    scored.sort((a, b) => b.identityScore - a.identityScore);
    return { recommendedAesthetic: scored[0]?.aesthetic ?? computeRecommendedAesthetic(brandKeywordSource) };
  }, [allCriticScores, brandKeywordSource]);
  const selectedAesthetic = AESTHETICS.includes(aestheticInput as (typeof AESTHETICS)[number]) ? aestheticInput : null;
  const selectedIsAlternative = Boolean(selectedAesthetic && selectedAesthetic !== recommendedAesthetic);
  const lockedAestheticName = useMemo(
    () => resolveAestheticName(lockedCollectionAesthetic),
    [lockedCollectionAesthetic]
  );
  const isAestheticSelectorLocked = Boolean(lockedCollectionAesthetic) && !isAestheticSelectionUnlocked;

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

  const persistInflectionDraft = useMemo(
    () =>
      debounce((value: string) => {
        try {
          window.localStorage.setItem(AESTHETIC_INFLECTION_STORAGE_KEY, value);
        } catch {
          // Ignore storage failures.
        }
      }, 300),
    []
  );

  useEffect(() => {
    persistInflectionDraft(aestheticInflection);
  }, [aestheticInflection, persistInflectionDraft]);

  useEffect(() => {
    setDirectionInterpretationText(aestheticInflection);
  }, [aestheticInflection, setDirectionInterpretationText]);

  useEffect(() => {
    setDirectionInterpretationChips(selectedInterpretationChips);
  }, [selectedInterpretationChips, setDirectionInterpretationChips]);

  useEffect(() => {
    if (!selectedAesthetic || resonancePulse) return;
    computeAndSetResonance(selectedAesthetic);
  }, [computeAndSetResonance, resonancePulse, selectedAesthetic]);

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

  // ─── Brand profile state (must be declared before synthesizer useEffect) ──
  const brandProfileId = useRef<string | null>(null);
  const [noBrandProfile, setNoBrandProfile] = useState(false);
  const [brandProfileName, setBrandProfileName] = useState<string | null>(null);
  const [customerProfile, setCustomerProfile] = useState<string | null>(null);
  const [referenceBrands, setReferenceBrands] = useState<string[]>([]);
  const [excludedBrands, setExcludedBrands] = useState<string[]>([]);

  // ─── Collection context state for Decision Guidance ──────────────────────
  const [collectionPieces, setCollectionPieces] = useState<Array<{
    id: string;
    piece_name: string;
    score: number;
    dimensions: Record<string, number> | null;
    collection_role: string | null;
    category: string | null;
    silhouette: string | null;
    aesthetic_matched_id: string | null;
    aesthetic_inflection: string | null;
    construction_tier: string | null;
  }>>([]);
  useEffect(() => {
    if (lockedCollectionAesthetic || isAestheticSelectionUnlocked || collectionPieces.length === 0) return;
    const inferredCollectionAesthetic =
      storeCollectionAesthetic ??
      collectionPieces.find((piece) => piece.aesthetic_matched_id)?.aesthetic_matched_id ??
      null;
    if (!inferredCollectionAesthetic) return;
    setLockedCollectionAesthetic(inferredCollectionAesthetic);
    setCollectionAesthetic(inferredCollectionAesthetic);
    const inferredAestheticName = resolveAestheticName(inferredCollectionAesthetic);
    if (inferredAestheticName) {
      setAestheticInput(inferredAestheticName);
    }
  }, [
    collectionPieces,
    isAestheticSelectionUnlocked,
    lockedCollectionAesthetic,
    setAestheticInput,
    setCollectionAesthetic,
    storeCollectionAesthetic,
  ]);
  const activeCollectionInflection = useMemo(() => {
    const trimmed = aestheticInflection.trim();
    if (trimmed) return trimmed;
    return collectionPieces.find((piece) => piece.aesthetic_inflection?.trim())?.aesthetic_inflection?.trim() ?? null;
  }, [aestheticInflection, collectionPieces]);
  const conceptReadTriggerPhase = selectedAesthetic
    ? ((aestheticInflection.trim() || selectedInterpretationChips.length > 0) ? "direction-defined" : "aesthetic-selected")
    : null;
  // ─── Synthesizer: reactive MUKO INSIGHT (streaming) ──────────────────────
  const conceptAbortRef = useRef<AbortController | null>(null);
  const conceptLanguageRequestKeyRef = useRef<string | null>(null);
  const conceptRawJsonRef = useRef<string>('');
  const criticAbortRef = useRef<AbortController | null>(null);
  const criticCacheRef = useRef<Map<string, number>>(new Map());
  const pieceReadAbortRef = useRef<AbortController | null>(null);
  const criticBatchAbortRef = useRef<AbortController | null>(null);
  const inflectionAbortRef = useRef<AbortController | null>(null);
  const matchAestheticAbortRef = useRef<AbortController | null>(null);
  const conceptLanguageAbortRef = useRef<AbortController | null>(null);
  const [step1ReadData, setStep1ReadData] = useState<InsightData | null>(null);
  const [step1ReadLoading, setStep1ReadLoading] = useState(false);
  const [step2ReadData, setStep2ReadData] = useState<ConceptLanguageRead | null>(null);
  const [step2ReadLoading, setStep2ReadLoading] = useState(false);
  const [activePieceRead, setActivePieceRead] = useState<ProductPieceRead | null>(null);
  const [pieceReadLoading, setPieceReadLoading] = useState(false);
  const [conceptStreamingText, setConceptStreamingText] = useState('');
  const [conceptStreamingParagraph, setConceptStreamingParagraph] = useState('');
  const [conceptIsParagraphStreaming, setConceptIsParagraphStreaming] = useState(false);
  const [step2StreamingText, setStep2StreamingText] = useState('');
  const [step2StreamingRows, setStep2StreamingRows] = useState<{ silhouette: string; palette: string; signals: string }>({ silhouette: '', palette: '', signals: '' });
  const step2RawRef = useRef<string>('');
  const [pieceStreamingTitle, setPieceStreamingTitle] = useState('');
  const [pieceStreamingBody, setPieceStreamingBody] = useState('');
  const pieceRawRef = useRef<string>('');

  useEffect(() => {
    console.log('[Muko] Synthesizer effect fired, aesthetic:', selectedAesthetic);
    if (!selectedAesthetic) {
      pieceReadAbortRef.current?.abort();
      pieceReadAbortRef.current = null;
      setActivePieceRead(null);
      setPieceReadLoading(false);
      setStep1ReadData(null);
      setStep2ReadData(null);
      setStep1ReadLoading(false);
      setStep2ReadLoading(false);
      setConceptStreamingText('');
      setConceptStreamingParagraph('');
      setConceptIsParagraphStreaming(false);
      setStep2StreamingText('');
      setStep2StreamingRows({ silhouette: '', palette: '', signals: '' });
      step2RawRef.current = '';
      setPieceStreamingTitle('');
      setPieceStreamingBody('');
      pieceRawRef.current = '';
      conceptLanguageRequestKeyRef.current = null;
      clearConceptInsight();
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
      brandKeywords: brandKeywordSource,
      identity_score: identityPulse?.score ?? 80,
      resonance_score: resonancePulse?.score ?? 75,
      season: season || 'SS27',
      collectionName: storeCollectionName || '',
      brandName: brandProfileName || '',
      intent: intentPayload,
      customerProfile: customerProfile,
      referenceBrands: referenceBrands,
      excludedBrands: excludedBrands,
      keyPieces: keyPieces.slice(0, 6).map((piece) => ({
        item: piece.item,
        type: piece.type ?? undefined,
        signal: piece.signal ?? undefined,
      })),
      chipSelection: useSessionStore.getState().chipSelection?.activatedChips.map((c) => c.label) ?? [],
      collection_context: {
        aesthetic_inflection: activeCollectionInflection,
        brand: {
          name: brandProfile3?.brand_name ?? brandProfileName,
          keywords: brandProfile3?.keywords ?? undefined,
          customer_profile: brandProfile3?.customer_profile ?? customerProfile,
          price_tier: brandProfile3?.price_tier ?? undefined,
          target_margin: brandProfile3?.target_margin ?? undefined,
          tension_context: brandProfile3?.tension_context ?? undefined,
        },
        existing_pieces: collectionPieces.map((p) => ({
          piece_name: p.piece_name,
          score: p.score,
          dimensions: p.dimensions,
          collection_role: p.collection_role,
          category: p.category,
          silhouette: p.silhouette,
          aesthetic_matched_id: p.aesthetic_matched_id,
          aesthetic_inflection: p.aesthetic_inflection,
          construction_tier: p.construction_tier,
        })),
        piece_count: collectionPieces.length,
      },
      isProxyMatch,
    });
    console.log('[Muko] blackboard result:', blackboard ? 'valid' : 'null');
    if (!blackboard) return;

    conceptAbortRef.current?.abort();
    const controller = new AbortController();
    conceptAbortRef.current = controller;

    const timer = window.setTimeout(async () => {
      console.log('[Muko] Synthesizer timer firing');
      setStep1ReadLoading(true);
      setConceptStreamingText('');
      setConceptStreamingParagraph('');
      setConceptIsParagraphStreaming(true);
      conceptRawJsonRef.current = '';
      try {
        const res = await fetch('/api/synthesizer/concept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blackboard),
          signal: controller.signal,
        });
        console.log('[Muko] Synthesizer fetch status:', res.status, 'ok:', res.ok);
        if (!res.ok || !res.body || controller.signal.aborted) return;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';
        let currentData = '';

        const processMessage = (event: string, data: string) => {
          console.log('[Muko] SSE event:', event, data?.slice(0, 100));
          if (event === 'chunk') {
            try {
              const parsed = JSON.parse(data) as { text: string };
              const chunk = parsed.text ?? '';
              conceptRawJsonRef.current += chunk;
              const accumulated = conceptRawJsonRef.current;
              // Extract partial insight_title value for display
              const match = accumulated.match(/"insight_title"\s*:\s*"([^"]*)/);
              setConceptStreamingText(match ? match[1] : (accumulated.length > 10 ? '...' : ''));
              setConceptStreamingParagraph(extractPartialJsonString(accumulated, 'insight_description'));
            } catch { /* ignore parse errors on partial chunks */ }
          } else if (event === 'complete' || event === 'fallback') {
            try {
              const result = JSON.parse(data) as { data: InsightData; meta: { method: string } };
              console.log('[Muko] Synthesizer setting data:', result?.data?.statements?.[0]);
              if (!controller.signal.aborted) {
                const insightData = result.data ?? result;
                setStep1ReadData(insightData);
                setConceptStreamingText('');
                setConceptStreamingParagraph(insightData.statements?.slice(1).join(' ').trim() ?? '');
                setConceptIsParagraphStreaming(false);
                // Persist insight fields to store for downstream stages
                try {
                  const title = insightData.statements?.[0] ?? '';
                  const description = insightData.statements?.[1] ?? '';
                  const positioning = insightData.edit?.slice(0, 3) ?? [];
                  // confidence is not in InsightData; attempt to extract from raw LLM output
                  let confidence: number | null = null;
                  try {
                    const raw = conceptRawJsonRef.current;
                    if (raw) {
                      const rawParsed = JSON.parse(raw) as Record<string, unknown>;
                      if (typeof rawParsed.confidence === 'number') confidence = rawParsed.confidence;
                    }
                  } catch { /* leave confidence null */ }
                  setConceptInsight({ title, description, positioning, confidence });
                } catch { /* do not block on insight persistence */ }
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
            if (controller.signal.aborted) break;
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
        console.log('[Muko] Synthesizer stream ended, aborted:', controller.signal.aborted);
        setStep1ReadLoading(false);
        setConceptIsParagraphStreaming(false);
        if (!controller.signal.aborted) {
          setConceptStreamingText('');
        }
      }
    }, 400);

    return () => {
      console.log('[Muko] Synthesizer cleanup running');
      window.clearTimeout(timer);
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAesthetic, conceptReadTriggerPhase]);

  const conceptLanguageRequestKey = useMemo(() => {
    if (!selectedAesthetic) return null;
    return JSON.stringify({
      aesthetic: selectedAesthetic,
      brandKeywords: brandKeywordSource,
      brandName: brandProfile3?.brand_name ?? brandProfileName ?? null,
    });
  }, [brandKeywordSource, brandProfile3?.brand_name, brandProfileName, selectedAesthetic]);


  useEffect(() => {
    if (!selectedAesthetic) {
      setInflectionSuggestions([]);
      setLoadingInflectionSuggestions(false);
      return;
    }

    inflectionAbortRef.current?.abort();
    inflectionAbortRef.current = new AbortController();
    const controller = inflectionAbortRef.current;
    const run = async () => {
      setLoadingInflectionSuggestions(true);
      try {
        const res = await fetch("/api/concept-inflections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aesthetic_name: selectedAesthetic,
            brand_keywords: brandKeywordSource,
          }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({ suggestions: [] }));
        if (!controller.signal.aborted) {
          setInflectionSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        }
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
        if (!controller.signal.aborted) {
          setInflectionSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingInflectionSuggestions(false);
        }
      }
    };

    run();

    return () => {
      inflectionAbortRef.current?.abort();
    };
  }, [brandKeywordSource, selectedAesthetic]);

  const [freeFormDraft, setFreeFormDraft] = useState("");
  const [freeFormMatch, setFreeFormMatch] = useState<string | null>(null);
  const [freeFormLoading, setFreeFormLoading] = useState(false);
  useEffect(() => {
    const trimmed = freeFormDraft.trim();
    if (trimmed.length < 2) { setFreeFormMatch(null); setIsProxyMatch(false); setFreeFormLoading(false); return; }
    setFreeFormLoading(true);
    matchAestheticAbortRef.current?.abort();
    matchAestheticAbortRef.current = new AbortController();
    const controller = matchAestheticAbortRef.current;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/match-aesthetic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: trimmed }), signal: controller.signal });
        const data = await res.json();
        setFreeFormMatch(data.match ?? null);
        setIsProxyMatch(data.match !== null && trimmed.toLowerCase() !== data.match.toLowerCase());
      } catch (e) { if ((e as Error)?.name === 'AbortError') return; setFreeFormMatch(matchFreeFormToAesthetic(trimmed)); }
      finally { setFreeFormLoading(false); }
    }, 400);
    return () => { window.clearTimeout(timer); matchAestheticAbortRef.current?.abort(); };
  }, [freeFormDraft]);

  // Pulse scores are only populated after the user selects a direction


  // ─── Critic Agent: Brand Alignment Scoring ────────────────────────────────
  // When a brand_profile_id is available (future: from Supabase auth/settings),
  // calls the Critic Agent API to compute the Identity Pulse from real brand data.
  // Falls back to the existing static scoring above when no brand profile exists.
  // (brandProfileId, brandProfileName, customerProfile, referenceBrands, excludedBrands
  //  are declared earlier — before the synthesizer useEffect that depends on them)

  // On mount: resolve the current user's brand profile id from Supabase
  useEffect(() => {
    const supabase = createClient();
    console.log('[Muko] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('[Muko] Supabase anon key (first 10):', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10));
    supabase.auth.getUser().then(async ({ data: { user }, error: getUserError }) => {
      console.log('[Muko] getUser() result:', { user, error: getUserError });
      if (!user) {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('[Muko] getSession() fallback result:', { session: sessionData?.session, error: sessionError });
        setNoBrandProfile(true);
        return;
      }
      console.log('[Muko] brand_profiles query — user.id:', user.id);
      console.log('[Muko] brand_profiles query — table: brand_profiles, filter: user_id =', user.id, ', select: id, brand_name, customer_profile, reference_brands, excluded_brands');
      // Fetch brand profile and collection pieces in parallel
      const collectionName = (() => {
        try { return window.localStorage.getItem('muko_collectionName') ?? ''; } catch { return ''; }
      })();

      const brandProfilePromise = supabase
        .from('brand_profiles')
        .select('id, brand_name, keywords, customer_profile, price_tier, target_margin, tension_context, reference_brands, excluded_brands')
        .eq('user_id', user.id)
        .single();

      const collectionPiecesPromise = collectionName
        ? supabase
            .from('analyses')
            .select('id, piece_name, score, dimensions, collection_role, category, silhouette, aesthetic_matched_id, aesthetic_inflection, construction_tier')
            .eq('collection_name', collectionName)
            .eq('user_id', user.id)
        : Promise.resolve({ data: [], error: null });

      Promise.all([brandProfilePromise, collectionPiecesPromise]).then(
        ([{ data, error }, { data: piecesData, error: piecesError }]) => {
          console.log('[Muko] brand_profiles query result — data:', data, '| error:', error);
          if (piecesError) console.warn('[Muko] collection pieces query error:', piecesError);

          if (piecesData) {
            const filtered = (piecesData as Array<{
              id: string;
              piece_name: string;
              score: number;
              dimensions: Record<string, number> | null;
              collection_role: string | null;
              category: string | null;
              silhouette: string | null;
              aesthetic_matched_id: string | null;
              aesthetic_inflection: string | null;
              construction_tier: string | null;
            }>).filter((p) => p.piece_name);
            setCollectionPieces(filtered);
            console.log('[COLLECTION_CONTEXT_DEBUG] piece_count:', filtered.length, 'first piece_name:', filtered[0]?.piece_name ?? null, 'collection_name used:', collectionName);
          }

          if (data && !error) {
            brandProfileId.current = data.id;
            criticCacheRef.current.clear();
            setBrandProfile3({
              brand_name: data.brand_name ?? null,
              keywords: data.keywords ?? null,
              customer_profile: data.customer_profile ?? null,
              price_tier: data.price_tier ?? null,
              target_margin: data.target_margin ?? null,
              tension_context: data.tension_context ?? null,
            });
            unstable_batchedUpdates(() => {
              if (data.brand_name) setBrandProfileName(data.brand_name);
              setCustomerProfile(data.customer_profile ?? null);
              setReferenceBrands(data.reference_brands ?? []);
              setExcludedBrands(data.excluded_brands ?? []);
              setNoBrandProfile(false);
            });

            // Batch-score all aesthetics against the brand profile so Pick selection
            // can use real Critic identity scores instead of static constants.
            const profileId = data.id;
            const allEntries = aestheticsData as unknown as AestheticDataEntry[];
            criticBatchAbortRef.current?.abort();
            criticBatchAbortRef.current = new AbortController();
            const batchController = criticBatchAbortRef.current;
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
                  signal: batchController.signal,
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

    return () => {
      criticBatchAbortRef.current?.abort();
    };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const runCriticAnalysis = useCallback(
    debounce(async (aestheticKeywords: string[], aestheticName: string) => {
      if (!aestheticKeywords.length || !brandProfileId.current) return;

      // Fix 2: cancel any in-flight request from a previous aesthetic selection
      criticAbortRef.current?.abort();
      criticAbortRef.current = new AbortController();

      // Fix 3: serve from cache if this aesthetic+brand combo was already scored
      const cacheKey = `${aestheticName}::${brandProfileId.current}`;
      const cachedScore = criticCacheRef.current.get(cacheKey);
      if (cachedScore !== undefined) {
        const cachedStatus = cachedScore >= 70 ? 'green' : cachedScore >= 40 ? 'yellow' : 'red';
        useSessionStore.setState({
          identityPulse: { score: cachedScore, status: cachedStatus, message: "Brand alignment confirmed" },
        });
        return;
      }

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
          signal: criticAbortRef.current.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Critic agent request failed (${res.status})`);
        }
        const data = await res.json();
        // Fix 3: store result so re-selecting this aesthetic skips the API call
        criticCacheRef.current.set(cacheKey, data.pulse.score);
        useSessionStore.setState({
          identityPulse: {
            status: data.pulse.status,
            score: data.pulse.score,
            message: data.pulse.message,
          },
        });
      } catch (error) {
        // Fix 2: silently ignore results from requests cancelled by a newer selection
        if (error instanceof Error && error.name === 'AbortError') return;
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
  const selectedAestheticData = selectedAesthetic
    ? (aestheticsData as unknown as AestheticDataEntry[]).find((a) => a.name === selectedAesthetic || a.id === selectedAesthetic.toLowerCase().replace(/\s+/g, "-"))
    : null;
  const combinedDirection = useMemo(
    () =>
      selectedAesthetic
        ? combineDirection({
            aestheticName: selectedAesthetic,
            freeText: aestheticInflection,
            selectedInterpretationChips,
            season,
          })
        : null,
    [aestheticInflection, season, selectedAesthetic, selectedInterpretationChips]
  );
  const interpretationSuggestions = useMemo(() => {
    const merged = [...selectedInterpretationChips, ...inflectionSuggestions, ...SUGGESTED_INTERPRETATION_CHIPS];
    return Array.from(new Set(merged)).slice(0, 8);
  }, [inflectionSuggestions, selectedInterpretationChips]);
  const interpretationSummary = useMemo(() => {
    if (combinedDirection?.interpretationText.trim()) return combinedDirection.interpretationText.trim();
    if (combinedDirection?.modifierLabels.length) return combinedDirection.modifierLabels.join(" + ");
    return "Pure direction";
  }, [combinedDirection]);

  useEffect(() => {
    setDirectionInterpretationModifiers(combinedDirection?.modifierLabels ?? []);
  }, [combinedDirection, setDirectionInterpretationModifiers]);

  // KEY PIECES — derived from aesthetic + season
  const keyPieces = useMemo((): KeyPiece[] => {
    if (combinedDirection) return combinedDirection.keyPieces.map((recommendation) => recommendation.piece);
    if (!selectedAesthetic) return [];
    const entry = (aestheticsData as unknown as AestheticDataEntry[]).find(
      (a) => a.name === selectedAesthetic || a.id === selectedAesthetic.toLowerCase().replace(/\s+/g, "-")
    );
    if (!entry?.key_pieces) return [];
    const seasonKey = (season.includes("FW") || season.includes("Fall") || season.includes("fall")) ? "fw26" : "ss27";
    return entry.key_pieces[seasonKey] ?? entry.key_pieces["fw26"] ?? Object.values(entry.key_pieces)[0] ?? [];
  }, [combinedDirection, selectedAesthetic, season]);

  const [selectedKeyPieceLocal, setSelectedKeyPieceLocal] = useState<KeyPiece | null>(null);
  const [customProductPieces, setCustomProductPieces] = useState<KeyPiece[]>([]);
  const [customKeyPieceText, setCustomKeyPieceText] = useState("");
  const [customKeyPieceConfirmed, setCustomKeyPieceConfirmed] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);

  const recommendedKeyPieces = useMemo(() => {
    const rankSignal = (signal?: string | null) => {
      if (signal === "ascending") return 3;
      if (signal === "high-volume") return 2;
      if (signal === "emerging") return 1;
      return 0;
    };

    return keyPieces
      .filter((piece) => !piece.custom && piece.item)
      .slice()
      .sort((a, b) => rankSignal(b.signal) - rankSignal(a.signal))
      .slice(0, 2)
      .map((piece) => piece.item);
  }, [keyPieces]);

  useEffect(() => {
    setCustomProductPieces([]);
    setPieceRolesById({});
    setActiveProductPieceId(null);
    setCollectionRole(null);
    setSelectedKeyPieceLocal(null);
    setSelectedKeyPiece(null);
    setSelectedPieceImage(null);
    setDecisionGuidanceState({ is_confirmed: false, selected_anchor_piece: null });
  }, [selectedAesthetic, setActiveProductPieceId, setCollectionRole, setDecisionGuidanceState, setPieceRolesById, setSelectedKeyPiece, setSelectedPieceImage]);

  useEffect(() => {
    const allStagePieceIds = new Set([...keyPieces, ...customProductPieces].map((piece) => piece.item));
    if (activeProductPieceId && !allStagePieceIds.has(activeProductPieceId)) {
      setActiveProductPieceId(null);
    }
  }, [activeProductPieceId, customProductPieces, keyPieces, setActiveProductPieceId]);

  const productPieceEntries = useMemo<PieceRecommendationEntry[]>(() => {
    // Exclude pieces already built in this collection (persisted to Supabase).
    const existingPieceNames = new Set(
      collectionPieces.map((p) => p.piece_name).filter(Boolean).map((n) => n.toLowerCase())
    );
    const availableKeyPieces = keyPieces.filter(
      (piece) => !existingPieceNames.has((piece.item ?? "").toLowerCase())
    );
    return [
      ...availableKeyPieces.map((piece) => ({
        piece,
        recommendation:
          combinedDirection?.keyPieces.find((candidate) => candidate.piece.item === piece.item) ??
          null,
      })),
      ...customProductPieces.map((piece) => ({
        piece,
        recommendation: null,
      })),
    ];
  }, [collectionPieces, combinedDirection?.keyPieces, customProductPieces, keyPieces]);

  const activeProductPieceEntry = useMemo(
    () => productPieceEntries.find((entry) => entry.piece.item === activeProductPieceId) ?? null,
    [activeProductPieceId, productPieceEntries]
  );

  useEffect(() => {
    if (!activeProductPieceEntry) {
      setSelectedKeyPieceLocal(null);
      setSelectedKeyPiece(null);
      setSelectedPieceImage(null);
      setDecisionGuidanceState({
        is_confirmed: false,
        selected_anchor_piece: null,
      });
      return;
    }
    setSelectedKeyPieceLocal(activeProductPieceEntry.piece);
    setSelectedKeyPiece(activeProductPieceEntry.piece);
    setSelectedPieceImage(
      buildSelectedPieceImage({
        type: activeProductPieceEntry.piece.type,
        signal: activeProductPieceEntry.piece.signal ?? null,
      })
    );
    setDecisionGuidanceState({
      is_confirmed: false,
      selected_anchor_piece: activeProductPieceEntry.piece.item,
    });
  }, [activeProductPieceEntry, setDecisionGuidanceState, setSelectedKeyPiece, setSelectedPieceImage]);

  const handleSelectProductPiece = useCallback((pieceName: string) => {
    // Once a role has been assigned to any piece, lock selection to that piece only
    if (Object.keys(pieceRolesById).length > 0 && pieceName !== activeProductPieceId) return;
    setActiveProductPieceId(pieceName);
  }, [setActiveProductPieceId, pieceRolesById, activeProductPieceId]);

  const handleAssignRoleToPiece = useCallback((pieceName: string, role: CollectionRoleId) => {
    const nextRoles: PieceRolesById = {};
    Object.entries(pieceRolesById).forEach(([id, existingRole]) => {
      if (existingRole === "hero" && role === "hero" && id !== pieceName) return;
      nextRoles[id] = existingRole;
    });
    nextRoles[pieceName] = role;
    setPieceRolesById(nextRoles);
  }, [pieceRolesById, setPieceRolesById]);

  const commitCustomProductPiece = useCallback(() => {
    const nextName = customKeyPieceText.trim();
    if (!nextName) return;
    const existing = [...keyPieces, ...customProductPieces].some((piece) => piece.item.toLowerCase() === nextName.toLowerCase());
    if (!existing) {
      setCustomProductPieces((prev) => [
        ...prev,
        {
          item: nextName,
          signal: null,
          category: null,
          type: null,
          recommended_material_id: null,
          redirect_material_id: null,
          custom: true,
        },
      ]);
    }
    setCustomKeyPieceConfirmed(true);
    setActiveProductPieceId(nextName);
    setShowCustomInput(false);
    setCustomKeyPieceText("");
  }, [customKeyPieceText, customProductPieces, keyPieces, setActiveProductPieceId]);

  const handleConfirmDirection = useCallback(async () => {
    const heroPieceName = Object.entries(pieceRolesById).find(([, role]) => role === "hero")?.[0] ?? null;
    const primaryPieceName = heroPieceName ?? activeProductPieceId ?? recommendedKeyPieces[0] ?? null;
    const primaryPiece = primaryPieceName
      ? [...keyPieces, ...customProductPieces].find((piece) => piece.item === primaryPieceName) ?? null
      : null;
    const executionLevers = step1ReadData?.decision_guidance?.execution_levers ?? [];
    const shouldPersistCollectionAesthetic = collectionPieces.length === 0 || isAestheticSelectionUnlocked;
    const selectedAestheticSlug = selectedAesthetic ? toAestheticSlug(selectedAesthetic) : null;
    const primaryRole = primaryPieceName ? pieceRolesById[primaryPieceName] ?? null : null;

    setDecisionGuidanceState({
      is_confirmed: true,
      selected_anchor_piece: primaryPieceName,
    });

    if (primaryPiece) {
      setSelectedKeyPieceLocal(primaryPiece);
      setSelectedKeyPiece(primaryPiece);
      setActiveProductPieceId(primaryPiece.item);
      setCollectionRole(primaryRole);
    }

    if (shouldPersistCollectionAesthetic && selectedAestheticSlug) {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        await supabase
          .from("analyses")
          .update({
            collection_aesthetic: selectedAestheticSlug,
            aesthetic_inflection: aestheticInflection.trim() || null,
          })
          .eq("user_id", user?.id ?? "")
          .eq("collection_name", storeCollectionName);
      } catch {
        // Local state remains the source of truth if this best-effort write fails.
      }

      try {
        window.localStorage.setItem(COLLECTION_AESTHETIC_STORAGE_KEY, selectedAestheticSlug);
      } catch {
        // Ignore storage failures.
      }

      setCollectionAesthetic(selectedAestheticSlug);
      setLockedCollectionAesthetic(selectedAestheticSlug);
      setIsAestheticSelectionUnlocked(false);
    }

    if (selectedAesthetic && executionLevers.length > 0) {
      setSelectedElements((prev) => {
        const next = new Set(prev);
        executionLevers.forEach((lever) => {
          next.add(`${selectedAesthetic}::${lever}`);
        });
        return next;
      });

      setChipMeta((prev) => {
        const next = new Map(prev);
        executionLevers.forEach((lever) => {
          const key = `${selectedAesthetic}::${lever}`;
          const existing = next.get(key);
          next.set(key, existing ? { ...existing, userConfirmed: true } : { source: 'manual', userConfirmed: true });
        });
        return next;
      });
    }
  }, [
    activeProductPieceId,
    step1ReadData?.decision_guidance?.execution_levers,
    customProductPieces,
    pieceRolesById,
    keyPieces,
    recommendedKeyPieces,
    selectedAesthetic,
    setActiveProductPieceId,
    setCollectionRole,
    setDecisionGuidanceState,
    setCollectionAesthetic,
    setSelectedKeyPiece,
    aestheticInflection,
    collectionPieces.length,
    isAestheticSelectionUnlocked,
    storeCollectionName,
  ]);

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
        message: identityPulse.message,
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

  const idStatus = {
    label: identityPulse?.status === "green" ? "Strong"
         : identityPulse?.status === "yellow" ? "Moderate"
         : identityPulse?.status === "red" ? "Tension"
         : "—",
    color: identityPulse?.status === "green" ? PULSE_GREEN
         : identityPulse?.status === "yellow" ? PULSE_YELLOW
         : identityPulse?.status === "red" ? PULSE_RED
         : "rgba(67,67,43,0.35)",
    sublabel: identityPulse?.message ?? "Select a direction to score",
  };
  const resStatus = getResonanceStatus(resonancePulse, resonanceSaturationScore ?? undefined, resonanceCollectionsCount ?? undefined);
  const scoreColor = (score: number) => score >= 80 ? CHARTREUSE : score >= 65 ? BRAND.camel : BRAND.rose;

  /* ─── Select handler ──────────────────────────────────────────────────────── */
  const handleSelectAesthetic = (aesthetic: string) => {
    if (isAestheticSelectorLocked) return;
    const aestheticSlug = toAestheticSlug(aesthetic);
    setCurrentStageState("direction");
    setStageTransitionDirection(1);
    setSelectedElements(new Set());
    setCustomChips({});
    setChipMeta(new Map());
    setSelectedInterpretationChips([]);
    setAestheticInflection("");
    setInflectionDraft("");
    setChipsDraft([]);
    setDirectionInterpretationModifiers([]);
    // Clear silhouette/palette and concept insight when aesthetic changes
    setConceptSilhouette('');
    setConceptPalette(null);
    setStep1ReadData(null);
    setStep2ReadData(null);
    setStep1ReadLoading(false);
    setStep2ReadLoading(false);
    setConceptStreamingText('');
    setStep2StreamingText('');
    setStep2StreamingRows({ silhouette: '', palette: '', signals: '' });
    step2RawRef.current = '';
    conceptLanguageRequestKeyRef.current = null;
    clearConceptInsight();
    setAestheticInput(aesthetic);
    setLockedCollectionAesthetic(aestheticSlug);
    setCollectionAesthetic(aestheticSlug);
    setIsAestheticSelectionUnlocked(false);
    try {
      window.localStorage.setItem(COLLECTION_AESTHETIC_STORAGE_KEY, aestheticSlug);
    } catch {
      // Ignore storage failures.
    }

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

  // All aesthetics except the selected one, with Muko's Pick always at the top
  const orderedDirections = useMemo(() => {
    const base = selectedIsAlternative
      ? [...AESTHETICS].filter((a) => a !== selectedAesthetic)
      : [...AESTHETICS];
    return base.sort(aestheticSorter(recommendedAesthetic));
  }, [selectedAesthetic, selectedIsAlternative, recommendedAesthetic]);

  /* ─── Muko Insight ────────────────────────────────────────────────────────── */
  const insightContent = useMemo(() => {
    const ae = selectedAesthetic ?? recommendedAesthetic;
    const content = AESTHETIC_CONTENT[ae];
    const chips = getAestheticChips(ae).map((c) => c.label);
    const entry = (aestheticsData as unknown as AestheticDataEntry[]).find((a) => a.name === ae);
    const base = getDirectionInsight(ae, content?.identityScore ?? 80, content?.resonanceScore ?? 75, chips, entry?.trend_velocity ?? "peak");

    if (combinedDirection && ae === selectedAesthetic) {
      base.headline = combinedDirection.insight.headline;
      base.p1 = combinedDirection.insight.summary;
      base.p2 = combinedDirection.insight.marketNote;
      base.p3 = combinedDirection.insight.opportunity;
      base.opportunity = combinedDirection.signals.slice(0, 3).map((signal) => `${signal.label} — ${signal.reason}`);
    }

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
  }, [combinedDirection, selectedAesthetic, recommendedAesthetic, conceptSilhouette, conceptPalette]);

  const canContinue = Boolean(selectedAesthetic) && Boolean(conceptSilhouette);
  const sohne = "var(--font-sohne-breit), system-ui, sans-serif";
  const inter = "var(--font-inter), system-ui, sans-serif";

  /* ─── Pulse rows ──────────────────────────────────────────────────────────── */
  const pulseRows = [
    { key: "identity", label: "Identity", icon: (c: string) => <IconIdentity size={14} color={c} />, score: identityScore != null ? `${identityScore}` : "—", scoreNum: identityScore ?? 0, color: idStatus.color, chip: identityScore != null ? { variant: idStatus.color === PULSE_GREEN ? "green" as const : idStatus.color === PULSE_YELLOW ? "amber" as const : idStatus.color === PULSE_RED ? "red" as const : "amber" as const, status: idStatus.label } : null, subLabel: noBrandProfile ? "Complete Brand DNA setup to see identity scores" : idStatus.sublabel, what: `Identity measures how well this direction aligns with your brand DNA — keywords, aesthetic positioning, and customer profile. A high score means this direction reinforces who you already are. A low score signals tension that requires intentional navigation.`, how: `Keyword overlap between your brand profile and this direction's signals, weighted by conflict detection. Intentional tensions acknowledged in onboarding are factored in.`, pending: false },
    { key: "resonance", label: "Resonance", icon: (c: string) => <IconResonance size={14} color={c} />, score: resonanceLoading ? "—" : resonanceScore != null ? `${resonanceScore}` : "—", scoreNum: resonanceLoading ? 0 : resonanceScore ?? 0, color: resonanceLoading ? "rgba(67,67,43,0.35)" : resonanceScore != null ? scoreColor(resonanceScore) : "rgba(67,67,43,0.35)", chip: resonanceLoading ? { variant: "gray" as const, status: "Matching direction..." } : resonanceScore != null ? { variant: resStatus.color === PULSE_GREEN ? "green" as const : resStatus.color === PULSE_YELLOW ? "amber" as const : resStatus.color === PULSE_RED ? "red" as const : "amber" as const, status: resStatus.label } : null, subLabel: resonanceLoading ? "\u00A0" : resStatus.sublabel || "\u00A0", what: `Resonance measures market timing — how much consumer interest exists for this direction right now, and whether you're entering at the right moment. High resonance with ascending velocity means the window is open. Peak saturation means you're late.`, how: `Based on checkMarketSaturation(): saturation score from our curated aesthetics library, weighted by trend velocity. Resonance = 100 − saturation, with a 15-point penalty for declining velocity.`, pending: false },
    { key: "execution", label: "Execution", icon: (c: string) => <IconExecution size={14} color={c} />, score: "—", scoreNum: 0, color: "rgba(67,67,43,0.35)", chip: null, subLabel: "Unlocks in Spec Studio", what: `Execution measures whether the physical product you're building is feasible given your timeline, materials, and construction complexity. It unlocks in Spec Studio once you define your product inputs.`, how: `Timeline buffer score based on material lead times and construction complexity relative to your season deadline. Negative buffer scores red. Margin gate applied as a 30% score penalty if COGS exceeds target.`, pending: true },
  ];

  /* ─── Top card chip data ──────────────────────────────────────────────────── */
  const topChips = getAestheticChips(topAesthetic);
  const topDisplayChips = selectedAesthetic && combinedDirection
    ? combinedDirection.signals.map((signal) => {
        const matchingChip = topChips.find((chip) => chip.label === signal.label);
        return matchingChip ?? {
          label: signal.label,
          type: "mood" as const,
          material: null,
          silhouette: null,
          complexity_mod: 0,
          palette: null,
        };
      })
    : [];
  const topContent = AESTHETIC_CONTENT[topAesthetic];
  const orderedSilhouettes = useMemo(() => {
    const order = combinedDirection?.silhouetteOrder ?? [];
    return CONCEPT_SILHOUETTES.slice().sort((a, b) => {
      const aIndex = order.indexOf(a.id);
      const bIndex = order.indexOf(b.id);
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
  }, [combinedDirection]);
  const orderedPaletteOptions = useMemo(() => {
    const options = selectedAestheticData?.palette_options ?? [];
    const order = combinedDirection?.paletteOrder ?? [];
    return options.slice().sort((a, b) => {
      const aIndex = order.indexOf(a.id);
      const bIndex = order.indexOf(b.id);
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
  }, [combinedDirection, selectedAestheticData?.palette_options]);
  const [showAllInterpretationSuggestions, setShowAllInterpretationSuggestions] = useState(false);
  const [showAllSignals, setShowAllSignals] = useState(false);
  const [currentStageState, setCurrentStageState] = useState<ConceptStageId>(
    () => (Object.keys(pieceRolesById).length > 0 ? "language" : "direction")
  );
  const [stageTransitionDirection, setStageTransitionDirection] = useState<1 | -1>(1);
  const isSubsequentPiece = collectionPieces.length > 0 || Object.keys(pieceRolesById).length > 0;
  const hasAutoAdvancedRef = useRef(false);
  useEffect(() => {
    if (hasAutoAdvancedRef.current) return;
    if (isSubsequentPiece) {
      hasAutoAdvancedRef.current = true;
      setCurrentStageState("language");
    }
  }, [isSubsequentPiece]);
  const visibleInterpretationSuggestions = showAllInterpretationSuggestions ? interpretationSuggestions : interpretationSuggestions.slice(0, 5);
  const visibleSignals = showAllSignals ? topDisplayChips : topDisplayChips.slice(0, 5);
  const hasInterpretationLayer = Boolean(aestheticInflection.trim() || selectedInterpretationChips.length > 0);
  const hasLanguageChoices = Boolean(conceptSilhouette || conceptPalette || selectedElements.size > 0);
  const canAdvanceToStage2 = Boolean(selectedAesthetic && hasInterpretationLayer);
  const canAdvanceToStage3 = Boolean(canAdvanceToStage2 && hasLanguageChoices);
  const assignedRoleCount = Object.keys(pieceRolesById).length;
  const heroAssignedPieceId = Object.entries(pieceRolesById).find(([, role]) => role === "hero")?.[0] ?? null;
  const canLockDirection = Boolean(canAdvanceToStage3 && assignedRoleCount > 0);
  const highestAvailableStage: ConceptStageId = canAdvanceToStage3 ? "product" : canAdvanceToStage2 ? "language" : "direction";
  const currentStage: ConceptStageId =
    currentStageState === "product" && !canAdvanceToStage3 && !isSubsequentPiece
      ? highestAvailableStage
      : currentStageState === "language" && !canAdvanceToStage2 && !isSubsequentPiece
      ? "direction"
      : currentStageState;
  const isStep3ProductStage = currentStage === "product";
  const step3PulseReferenceLabel = selectedAesthetic ? `Concept locked · ${selectedAesthetic}` : null;

  useEffect(() => {
    if (currentStage !== "language" || !selectedAesthetic || !conceptLanguageRequestKey) return;
    if (conceptLanguageRequestKeyRef.current === conceptLanguageRequestKey) return;

    conceptLanguageRequestKeyRef.current = conceptLanguageRequestKey;
    conceptLanguageAbortRef.current?.abort();
    conceptLanguageAbortRef.current = new AbortController();
    const controller = conceptLanguageAbortRef.current;

    const run = async () => {
      setStep2ReadLoading(true);
      setStep2StreamingText('');
      setStep2StreamingRows({ silhouette: '', palette: '', signals: '' });
      step2RawRef.current = '';
      try {
        const res = await fetch('/api/synthesizer/concept-language', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aesthetic_name: selectedAesthetic,
            brand_keywords: brandKeywordSource,
            brand_name: brandProfile3?.brand_name ?? brandProfileName ?? null,
            customer_profile: brandProfile3?.customer_profile ?? customerProfile ?? null,
            price_tier: brandProfile3?.price_tier ?? null,
            tension_context: brandProfile3?.tension_context ?? null,
            reference_brands: referenceBrands,
            excluded_brands: excludedBrands,
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body || controller.signal.aborted) {
          conceptLanguageRequestKeyRef.current = null;
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';
        let currentData = '';

        const processStep2Message = (event: string, data: string) => {
          if (event === 'chunk') {
            try {
              const parsed = JSON.parse(data) as { text: string };
              step2RawRef.current += parsed.text ?? '';
              const acc = step2RawRef.current;
              const headlineMatch = acc.match(/"headline"\s*:\s*"([^"]*)/);
              setStep2StreamingText(headlineMatch ? headlineMatch[1] : (acc.length > 10 ? '...' : ''));
              setStep2StreamingRows({
                silhouette: extractPartialJsonString(acc, 'silhouette_steer'),
                palette: extractPartialJsonString(acc, 'palette_steer'),
                signals: extractPartialJsonString(acc, 'signals_note'),
              });
            } catch { /* ignore partial parse errors */ }
          } else if (event === 'complete') {
            try {
              const result = JSON.parse(data) as ConceptLanguageRead;
              if (!controller.signal.aborted) {
                setStep2ReadData(result);
                setStep2StreamingText('');
                setStep2StreamingRows({ silhouette: '', palette: '', signals: '' });
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
            if (controller.signal.aborted) break;
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              currentData = line.slice(6);
            } else if (line === '') {
              if (currentEvent && currentData) processStep2Message(currentEvent, currentData);
              currentEvent = '';
              currentData = '';
            }
          }
        }
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
        conceptLanguageRequestKeyRef.current = null;
        // Leave the existing step 2 read intact on request failure.
      } finally {
        if (!controller.signal.aborted) {
          setStep2ReadLoading(false);
          setStep2StreamingText('');
        }
      }
    };

    run();

    return () => {
      conceptLanguageAbortRef.current?.abort();
    };
  }, [
    brandKeywordSource,
    brandProfile3?.brand_name,
    brandProfile3?.customer_profile,
    brandProfile3?.price_tier,
    brandProfile3?.tension_context,
    brandProfileName,
    conceptLanguageRequestKey,
    currentStage,
    customerProfile,
    excludedBrands,
    referenceBrands,
    selectedAesthetic,
  ]);
  const activePaletteName =
    orderedPaletteOptions.find((palette) => palette.id === conceptPalette)?.name ?? conceptPalette ?? null;
  const productSuggestionOptions = useMemo(
    () => ({
      conceptSilhouette,
      conceptPaletteName: activePaletteName,
      interpretationSummary,
      signalCount: (combinedDirection?.signals ?? []).length,
    }),
    [activePaletteName, combinedDirection?.signals, conceptSilhouette, interpretationSummary]
  );
  const suggestedStartingPieceEntry = useMemo(
    () =>
      productPieceEntries
        .slice()
        .sort((a, b) => scoreStartingPiecePriority(b, productSuggestionOptions) - scoreStartingPiecePriority(a, productSuggestionOptions))[0] ?? null,
    [productPieceEntries, productSuggestionOptions]
  );
  const pieceRecommendations = useMemo(() => {
    if (!suggestedStartingPieceEntry) return productPieceEntries;
    return productPieceEntries.slice().sort((a, b) => {
      if (a.piece.item === suggestedStartingPieceEntry.piece.item) return -1;
      if (b.piece.item === suggestedStartingPieceEntry.piece.item) return 1;
      return 0;
    });
  }, [productPieceEntries, suggestedStartingPieceEntry]);
  const pieceOrder = useMemo(() => pieceRecommendations.map((entry) => entry.piece.item), [pieceRecommendations]);
  const activePieceIndex = useMemo(
    () => (activeProductPieceId ? pieceOrder.indexOf(activeProductPieceId) : -1),
    [activeProductPieceId, pieceOrder]
  );
  const totalPieceCount = pieceOrder.length;
  const isAtFirstPiece = activePieceIndex <= 0;
  const isAtLastPiece = activePieceIndex === -1 || activePieceIndex >= totalPieceCount - 1;
  const reviewedPieceCount = assignedRoleCount;
  const nextPieceId = activePieceIndex >= 0 ? pieceOrder[activePieceIndex + 1] ?? null : pieceOrder[0] ?? null;

  useEffect(() => {
    if (activeProductPieceId || pieceOrder.length === 0) return;
    setActiveProductPieceId(pieceOrder[0]);
  }, [activeProductPieceId, pieceOrder, setActiveProductPieceId]);

  const stageFrames = [
    { id: "direction" as const, label: "Define Direction", helper: "Set the concept anchor and strategic read." },
    { id: "language" as const, label: "Shape Collection Language", helper: "Translate direction into silhouette, palette, and signals." },
    { id: "product" as const, label: "Build Product Expression", helper: "Evaluate pieces one by one and assign their role in the assortment." },
  ];
  const completedStages = {
    direction: canAdvanceToStage2,
    language: canAdvanceToStage3,
    product: canLockDirection,
  };
  const collectionStructureSummary = useMemo(
    () => buildCollectionStructureSummary(collectionPieces),
    [collectionPieces]
  );
  const collectionBalanceContext: CollectionBalanceContext = useMemo(() => {
    const roleCounts: Record<string, number> = {};
    // Balance context reflects only fully built pieces (Supabase) — not session-only selections.
    collectionPieces.forEach((p) => {
      if (p.collection_role) roleCounts[p.collection_role] = (roleCounts[p.collection_role] ?? 0) + 1;
    });
    return {
      totalPieceCount: collectionPieces.length,
      assignedRoleCount: collectionPieces.filter((p) => p.collection_role).length,
      heroAssigned: collectionPieces.some((p) => p.collection_role === "hero"),
      roleCounts,
      categoryBreakdown: collectionStructureSummary.categoryBreakdown ?? [],
      complexityBreakdown: collectionStructureSummary.complexityBreakdown ?? [],
    };
  }, [collectionPieces, collectionStructureSummary]);
  const activePieceSuggestion = useMemo(
    () =>
      activeProductPieceEntry
        ? buildPieceSuggestion(activeProductPieceEntry, productSuggestionOptions, collectionBalanceContext)
        : null,
    [activeProductPieceEntry, productSuggestionOptions, collectionBalanceContext]
  );
  useEffect(() => {
    pieceReadAbortRef.current?.abort();
    pieceReadAbortRef.current = null;

    if (currentStage !== "product") {
      setActivePieceRead(null);
      setPieceReadLoading(false);
      return;
    }

    const targetEntry = activeProductPieceEntry ?? suggestedStartingPieceEntry;
    if (!targetEntry) {
      setActivePieceRead(null);
      setPieceReadLoading(false);
      return;
    }

    const fallback = buildProductPieceReadFallback(targetEntry.piece.item);
    const controller = new AbortController();
    const isStartingPiece = !activeProductPieceEntry;
    pieceReadAbortRef.current = controller;
    setPieceReadLoading(true);
    setActivePieceRead(null);
    setPieceStreamingTitle('');
    setPieceStreamingBody('');
    pieceRawRef.current = '';

    void (async () => {
      try {
        const response = await fetch("/api/piece-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            piece: {
              item: targetEntry.piece.item,
              type: targetEntry.piece.type ?? "",
              signal: targetEntry.piece.signal ?? "",
              note: targetEntry.piece.note ?? "",
              bucket: targetEntry.recommendation?.bucket ?? "",
            },
            context: {
              aestheticName: selectedAesthetic ?? combinedDirection?.dnaLines[0] ?? "this direction",
              silhouetteLabel: getConceptSilhouetteLabel(conceptSilhouette),
              paletteName: activePaletteName ?? "unknown",
              resonanceScore: resonanceScore ?? null,
              interpretationSummary: interpretationSummary || null,
              isStartingPiece,
            },
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error(`Piece read request failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';
        let currentData = '';

        const processPieceMessage = (event: string, data: string) => {
          if (event === 'chunk') {
            try {
              const parsed = JSON.parse(data) as { text: string };
              pieceRawRef.current += parsed.text ?? '';
              const acc = pieceRawRef.current;
              const titleMatch = acc.match(/"title"\s*:\s*"([^"]*)/);
              setPieceStreamingTitle(titleMatch ? titleMatch[1] : '');
              setPieceStreamingBody(extractPartialJsonString(acc, 'body'));
            } catch { /* ignore partial parse errors */ }
          } else if (event === 'complete') {
            try {
              const result = JSON.parse(data) as { title: string; body: string };
              if (!controller.signal.aborted) {
                setActivePieceRead({
                  title: result.title ?? targetEntry.piece.item,
                  body: result.body ?? fallback.body,
                });
                setPieceStreamingTitle('');
                setPieceStreamingBody('');
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
            if (controller.signal.aborted) break;
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              currentData = line.slice(6);
            } else if (line === '') {
              if (currentEvent && currentData) processPieceMessage(currentEvent, currentData);
              currentEvent = '';
              currentData = '';
            }
          }
        }
      } catch {
        if (controller.signal.aborted) return;
        setActivePieceRead(fallback);
      } finally {
        if (controller.signal.aborted) return;
        if (pieceReadAbortRef.current === controller) {
          pieceReadAbortRef.current = null;
        }
        setPieceReadLoading(false);
        setPieceStreamingTitle('');
        setPieceStreamingBody('');
      }
    })();

    return () => {
      controller.abort();
      if (pieceReadAbortRef.current === controller) {
        pieceReadAbortRef.current = null;
      }
    };
  }, [
    activePaletteName,
    activeProductPieceEntry,
    combinedDirection?.dnaLines,
    conceptSilhouette,
    currentStage,
    interpretationSummary,
    resonanceScore,
    selectedAesthetic,
    suggestedStartingPieceEntry,
  ]);
  const activeStrategicImplication = useMemo(
    () =>
      activeProductPieceEntry
        ? buildStrategicImplication(activeProductPieceEntry, productSuggestionOptions, collectionBalanceContext)
        : null,
    [activeProductPieceEntry, productSuggestionOptions, collectionBalanceContext]
  );
  const stageAwareHeadline =
    currentStage === "language"
      ? step2ReadData?.headline ?? `Shape ${combinedDirection?.dnaLines[0] ?? selectedAesthetic ?? recommendedAesthetic} with disciplined visual clarity.`
      : step1ReadData?.statements[0] ?? insightContent.headline;
  const stageAwareParagraphs =
    currentStage === "language"
      ? []
      : step1ReadData
      ? [step1ReadData.statements[1] ?? "", step1ReadData.statements[2] ?? ""].filter(Boolean)
      : [insightContent.p1, insightContent.p2, insightContent.p3];
  const navigateStage = useCallback(
    (nextStage: ConceptStageId) => {
      const currentIndex = getStageIndex(currentStage);
      const nextIndex = getStageIndex(nextStage);
      const highestIndex = getStageIndex(highestAvailableStage);
      if (nextIndex > highestIndex) return;
      setStageTransitionDirection(nextIndex > currentIndex ? 1 : -1);
      setCurrentStageState(nextStage);
    },
    [currentStage, highestAvailableStage]
  );
  const handleSelectAdjacentPiece = useCallback(
    (direction: -1 | 1) => {
      if (pieceOrder.length === 0) return;
      const fallbackIndex = direction > 0 ? 0 : pieceOrder.length - 1;
      const nextIndex = activePieceIndex === -1 ? fallbackIndex : activePieceIndex + direction;
      const nextPiece = pieceOrder[nextIndex];
      if (!nextPiece) return;
      setActiveProductPieceId(nextPiece);
    },
    [activePieceIndex, pieceOrder, setActiveProductPieceId]
  );
  const stageTransitionProps = {
    initial: (direction: 1 | -1) => ({ opacity: 0, y: direction > 0 ? 24 : -18 }),
    animate: { opacity: 1, y: 0 },
    exit: (direction: 1 | -1) => ({ opacity: 0, y: direction > 0 ? -20 : 18 }),
    transition: { duration: 0.28, ease: [0.22, 0.8, 0.2, 1] },
  };
  const handleContinueToSpecs = useCallback(async () => {
    if (!canLockDirection || !selectedAesthetic) return;
    if (!heroAssignedPieceId) {
      const shouldContinue = window.confirm("You haven't assigned a Hero role yet. Continue anyway?");
      if (!shouldContinue) return;
    }
    await handleConfirmDirection();
    useSessionStore.setState({
      aestheticMatchedId: selectedAesthetic,
      moodboardImages: topMoodboardImages,
      conceptSilhouette,
      conceptPalette,
      directionInterpretationText: aestheticInflection.trim(),
      directionInterpretationModifiers: combinedDirection?.modifierLabels ?? [],
      directionInterpretationChips: selectedInterpretationChips,
    });
    setCurrentStep(3);
    router.push('/spec');
  }, [
    aestheticInflection,
    canLockDirection,
    combinedDirection?.modifierLabels,
    conceptPalette,
    conceptSilhouette,
    handleConfirmDirection,
    heroAssignedPieceId,
    router,
    selectedAesthetic,
    selectedInterpretationChips,
    setCurrentStep,
    topMoodboardImages,
  ]);
  /* ─── RENDER ──────────────────────────────────────────────────────────────── */
  const askMukoContext: AskMukoContext = {
    step: "concept",
    brand: {
      brandName: brandProfile3?.brand_name ?? undefined,
      keywords: brandProfile3?.keywords ?? undefined,
      priceTier: brandProfile3?.price_tier ?? undefined,
      targetMargin: brandProfile3?.target_margin ?? undefined,
      tensionContext: brandProfile3?.tension_context ?? undefined,
    },
    intent: {
      season,
      collectionName: storeCollectionName,
      collectionRole: storeCollectionRole ?? undefined,
    },
    aesthetic: {
      input: aestheticInput,
      matchedId: storeCollectionAesthetic ?? undefined,
      inflection: aestheticInflection ?? undefined,
    },
    scores: {
      identity: identityPulse?.score ?? undefined,
      resonance: resonancePulse?.score ?? undefined,
    },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#FAF9F6", overflow: "hidden" }}>

      {/* ── Fixed Header ─────────────────────────────────────────────────────── */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, height: 72, background: "rgba(250,249,246,0.92)", backdropFilter: "blur(24px) saturate(160%)", WebkitBackdropFilter: "blur(24px) saturate(160%)", borderBottom: "1px solid rgba(67,67,43,0.09)", zIndex: 200, display: "flex", alignItems: "center", padding: "0 40px", justifyContent: "space-between", gap: 20 }}>
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
                Choose one core collection direction, define how your brand is interpreting it this season, and let Muko translate that into grounded product guidance.
              </p>
            </div>
          </div>

          <div style={{ padding: "0 44px 48px" }}>

            {/* ── YOUR CONCEPT (shown after selection) ────────────────────────────── */}
            {selectedAesthetic && (
              <>
                <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 14 }}>
                  <button
                    onClick={() => setShowAestheticChangeModal(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: 0,
                      border: "none",
                      background: "none",
                      fontFamily: inter,
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "#6B86A0",
                      cursor: "pointer",
                    }}
                  >
                    Change collection aesthetic →
                  </button>
                </div>
                <div
                  ref={yourConceptRef}
                  style={{
                    marginBottom: 52,
                    padding: "28px",
                    borderRadius: 16,
                    background: "rgba(245,242,235,0.72)",
                  }}
                >
                  {selectedAesthetic ? (
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 184px", gap: 18, alignItems: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <div style={{ fontFamily: sohne, fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(67, 67, 43, 0.42)", marginBottom: 10 }}>
                          Collection Direction
                        </div>
                        <span style={{ fontFamily: sohne, fontWeight: 500, fontSize: 30, color: OLIVE, letterSpacing: "-0.02em", lineHeight: 1.04, display: "block", marginBottom: 10, maxWidth: 520 }}>
                          {topAesthetic}
                        </span>
                        <p style={{ margin: 0, fontFamily: inter, fontSize: 14, color: "rgba(67,67,43,0.58)", lineHeight: 1.55, maxWidth: 520 }}>
                          {combinedDirection?.dnaLines[1] ?? interpretationSummary}
                        </p>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                        {topMoodboardImages.slice(0, 6).map((src, i) => (
                          <div key={`top-mb-${i}`} style={{ aspectRatio: "1", borderRadius: 10, overflow: "hidden", animation: `fadeIn 220ms ease ${i * 20}ms both` }}>
                            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 184px", gap: 18, alignItems: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <div style={{ fontFamily: sohne, fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(67, 67, 43, 0.42)", marginBottom: 10 }}>
                          Collection Direction
                        </div>
                        <span style={{ fontFamily: sohne, fontWeight: 500, fontSize: 30, color: "rgba(67,67,43,0.32)", letterSpacing: "-0.02em", lineHeight: 1.04, display: "block", marginBottom: 10, maxWidth: 520 }}>
                          Select a direction
                        </span>
                        <p style={{ margin: 0, fontFamily: inter, fontSize: 14, color: "rgba(67,67,43,0.46)", lineHeight: 1.55, maxWidth: 520 }}>
                          Choose an aesthetic to begin shaping silhouette, palette, and product language.
                        </p>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div
                            key={`top-placeholder-${i}`}
                            style={{
                              aspectRatio: "1",
                              borderRadius: 10,
                              border: "1px dashed rgba(67,67,43,0.10)",
                              background: "rgba(255,255,255,0.55)",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr)", gap: 14, marginBottom: 42, paddingTop: 18, borderTop: "1px solid rgba(67,67,43,0.08)", alignItems: "start" }}>
                  {stageFrames.flatMap((stage, index) => {
                    const stageIndex = getStageIndex(stage.id);
                    const currentIndex = getStageIndex(currentStage);
                    const isActive = currentStage === stage.id;
                    const isComplete = completedStages[stage.id];
                    const isClickable = stageIndex <= getStageIndex(highestAvailableStage);
                    const nodes: React.ReactNode[] = [(
                      <button
                        key={stage.id}
                        onClick={() => isClickable && navigateStage(stage.id)}
                        style={{
                          textAlign: "left",
                          border: "none",
                          borderTop: isActive ? "2px solid rgba(168,180,117,0.55)" : "2px solid rgba(67,67,43,0.08)",
                          background: "transparent",
                          padding: "14px 0 0",
                          cursor: isClickable ? "pointer" : "default",
                          opacity: stageIndex > currentIndex && !isComplete && !isActive ? 0.72 : 1,
                        }}
                      >
                        <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: isActive ? "#6B7A40" : "rgba(67,67,43,0.36)", marginBottom: 6 }}>
                          {isComplete ? "Complete" : isActive ? "Current" : "Upcoming"}
                        </div>
                        <div style={{ fontFamily: sohne, fontSize: 16, fontWeight: 500, color: OLIVE, lineHeight: 1.15, marginBottom: 6 }}>
                          {stage.label}
                        </div>
                        <div style={{ fontFamily: inter, fontSize: 11, lineHeight: 1.55, color: "rgba(67,67,43,0.48)" }}>
                          {stage.helper}
                        </div>
                      </button>
                    )];
                    if (index < stageFrames.length - 1) {
                      nodes.push(
                        <div
                          key={`${stage.id}-arrow`}
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
                      );
                    }
                    return nodes;
                  })}
                </div>

                <div style={{ position: "relative", minHeight: 760 }}>
                  <AnimatePresence mode="wait" custom={stageTransitionDirection}>
                    <motion.div
                      key={currentStage}
                      custom={stageTransitionDirection}
                      variants={stageTransitionProps}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      style={{
                        padding: "8px 0 28px",
                      }}
                    >
                      {currentStage === "direction" && (
                        <>
                          <div style={{ paddingTop: 12, borderTop: "1px solid rgba(67,67,43,0.08)", marginBottom: 34 }}>
                            <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: CHARTREUSE, marginBottom: 8 }}>
                            Stage 1
                            </div>
                            <div style={{ fontFamily: sohne, fontSize: 28, fontWeight: 500, color: OLIVE, marginBottom: 8, letterSpacing: "-0.03em" }}>
                              Define Direction
                            </div>
                            <div style={{ fontFamily: inter, fontSize: 13.5, color: "rgba(67,67,43,0.56)", lineHeight: 1.62, maxWidth: 520 }}>
                              Set the concept anchor and define your interpretation.
                            </div>
                          </div>

                          <div style={{ marginBottom: 34 }}>
                            <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A09A", marginBottom: 6 }}>
                              Brand Interpretation
                            </div>
                            <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.56)", marginBottom: 10, lineHeight: 1.5 }}>
                              Define what makes your version of this direction distinct this season.
                            </div>
                            {/* Input with apply arrow */}
                            {(() => {
                              const hasPending =
                                inflectionDraft.trim() !== aestheticInflection.trim() ||
                                chipsDraft.join(",") !== selectedInterpretationChips.join(",");
                              const applyDraft = () => {
                                if (!hasPending) return;
                                setAestheticInflection(inflectionDraft.slice(0, 100));
                                setSelectedInterpretationChips(chipsDraft);
                              };
                              return (
                                <div style={{ position: "relative" }}>
                                  <input
                                    type="text"
                                    value={inflectionDraft}
                                    onChange={(e) => {
                                      setInflectionDraft(e.target.value.slice(0, 100));
                                      setChipsDraft([]);
                                    }}
                                    onKeyDown={(e) => { if (e.key === "Enter") applyDraft(); }}
                                    maxLength={100}
                                    placeholder="e.g. softer tailoring, fluid drape, matte restraint..."
                                    style={{ width: "100%", boxSizing: "border-box", padding: "12px 48px 12px 14px", fontSize: 13, borderRadius: 10, border: "1px solid rgba(67,67,43,0.12)", background: "rgba(255,255,255,0.88)", color: OLIVE, fontFamily: inter, outline: "none" }}
                                  />
                                  <motion.button
                                    onClick={applyDraft}
                                    disabled={!hasPending}
                                    animate={hasPending ? { x: [0, 3, 0] } : { x: 0 }}
                                    transition={hasPending ? { duration: 0.55, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" } : { duration: 0 }}
                                    style={{
                                      position: "absolute",
                                      right: 8,
                                      top: "calc(50% - 15px)",
                                      width: 30,
                                      height: 30,
                                      borderRadius: 999,
                                      border: hasPending ? "1px solid rgba(67,67,43,0.22)" : "1px solid rgba(67,67,43,0.08)",
                                      background: hasPending ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.55)",
                                      cursor: hasPending ? "pointer" : "default",
                                      opacity: hasPending ? 1 : 0.35,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 14,
                                      color: OLIVE,
                                    }}
                                  >
                                    →
                                  </motion.button>
                                </div>
                              );
                            })()}
                            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 7 }}>
                              {visibleInterpretationSuggestions.map((suggestion) => {
                                const isSelected = chipsDraft.includes(suggestion);
                                return (
                                  <button
                                    key={suggestion}
                                    onClick={() => {
                                      if (isSelected) {
                                        setChipsDraft([]);
                                        setInflectionDraft("");
                                        return;
                                      }
                                      setChipsDraft([suggestion]);
                                      setInflectionDraft(suggestion);
                                    }}
                                    style={{
                                      whiteSpace: "nowrap",
                                      padding: "6px 11px",
                                      borderRadius: 999,
                                      border: isSelected ? "1px solid rgba(168,180,117,0.70)" : "1px solid rgba(67,67,43,0.12)",
                                      background: isSelected ? "rgba(168,180,117,0.12)" : "rgba(255,255,255,0.62)",
                                      color: isSelected ? "#6B7A40" : "rgba(67,67,43,0.54)",
                                      fontFamily: inter,
                                      fontSize: 11,
                                      fontWeight: isSelected ? 600 : 500,
                                      cursor: "pointer",
                                    }}
                                  >
                                    {suggestion}
                                  </button>
                                );
                              })}
                              {interpretationSuggestions.length > visibleInterpretationSuggestions.length && (
                                <button
                                  onClick={() => setShowAllInterpretationSuggestions((value) => !value)}
                                  style={{ padding: "6px 11px", borderRadius: 999, border: "1px solid rgba(67,67,43,0.12)", background: "rgba(255,255,255,0.78)", color: "rgba(67,67,43,0.56)", fontFamily: inter, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                                >
                                  {showAllInterpretationSuggestions ? "Show less" : `+${interpretationSuggestions.length - visibleInterpretationSuggestions.length} more`}
                                </button>
                              )}
                            </div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => navigateStage("language")}
                              disabled={!canAdvanceToStage2}
                              style={{
                                padding: "12px 18px",
                                borderRadius: 999,
                                border: canAdvanceToStage2 ? "1.5px solid #7D96AC" : "1px solid rgba(67,67,43,0.10)",
                                background: canAdvanceToStage2 ? "rgba(125,150,172,0.08)" : "rgba(255,255,255,0.6)",
                                color: canAdvanceToStage2 ? "#7D96AC" : "rgba(67,67,43,0.30)",
                                fontFamily: sohne,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: canAdvanceToStage2 ? "pointer" : "not-allowed",
                              }}
                            >
                              Continue to Collection Language
                            </button>
                          </div>
                        </>
                      )}

                      {currentStage === "language" && (
                        <>
                          <div style={{ paddingTop: 12, borderTop: "1px solid rgba(67,67,43,0.08)", marginBottom: 34 }}>
                            <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: CHARTREUSE, marginBottom: 8 }}>
                            Stage 2
                            </div>
                            <div style={{ fontFamily: sohne, fontSize: 28, fontWeight: 500, color: OLIVE, marginBottom: 8, letterSpacing: "-0.03em" }}>
                              Shape Collection Language
                            </div>
                            <div style={{ fontFamily: inter, fontSize: 13.5, color: "rgba(67,67,43,0.56)", lineHeight: 1.62, maxWidth: 560 }}>
                              {isSubsequentPiece
                                ? "These collection-level settings are already defined. Continue to select a piece."
                                : "Translate the direction into silhouette, palette, and signals."}
                            </div>
                          </div>

                          {isSubsequentPiece ? (
                            <>
                              <div style={{ marginBottom: 30 }}>
                                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
                                  <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A09A" }}>
                                    Silhouette
                                  </div>
                                  <div style={{ fontFamily: inter, fontSize: 11, color: "#9C9690" }}>
                                    Set for this collection
                                  </div>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                                  {orderedSilhouettes.map((sil) => {
                                    const isSel = conceptSilhouette === sil.id;
                                    const isAffinity = selectedAestheticData?.silhouette_affinity?.includes(sil.id) ?? false;
                                    return (
                                      <div
                                        key={sil.id}
                                        style={{
                                          textAlign: "left",
                                          borderRadius: 0,
                                          padding: "14px 0 12px",
                                          background: "transparent",
                                          borderTop: isSel ? "2px solid #A8B475" : isAffinity ? "2px solid rgba(168,180,117,0.20)" : "2px solid #E8E3D6",
                                          cursor: "default",
                                          opacity: isSel ? 1 : 0.38,
                                        }}
                                      >
                                        <div style={{ fontSize: 15, fontWeight: 500, color: "#191919", fontFamily: sohne, marginBottom: 6 }}>
                                          {sil.name}
                                        </div>
                                        <div style={{ fontSize: 11.5, color: "#A8A09A", fontFamily: inter, marginTop: 6, lineHeight: 1.55, maxWidth: 180 }}>
                                          {sil.descriptor}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {selectedAestheticData?.palette_options && selectedAestheticData.palette_options.length > 0 && (
                                <div style={{ marginBottom: 30 }}>
                                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
                                    <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A09A" }}>
                                      Palette
                                    </div>
                                    <div style={{ fontFamily: inter, fontSize: 11, color: "#9C9690" }}>
                                      Set for this collection
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {orderedPaletteOptions.map((pal) => {
                                      const isSel = conceptPalette === pal.id;
                                      const isAffinity = selectedAestheticData?.palette_affinity?.includes(pal.id) ?? false;
                                      return (
                                        <div
                                          key={pal.id}
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 12,
                                            padding: "12px 0",
                                            borderTop: isSel ? "2px solid #A8B475" : isAffinity ? "2px solid rgba(168,180,117,0.18)" : "2px solid rgba(67,67,43,0.06)",
                                            cursor: "default",
                                            opacity: isSel ? 1 : 0.38,
                                          }}
                                        >
                                          <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                                            {pal.swatches.slice(0, 6).map((hex, i) => (
                                              <div key={i} style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: hex, border: "1px solid rgba(0,0,0,0.08)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)" }} />
                                            ))}
                                          </div>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                              <span style={{ fontFamily: sohne, fontSize: 15, fontWeight: 500, color: "#191919" }}>
                                                {pal.name}
                                              </span>
                                            </div>
                                            <div style={{ fontFamily: inter, fontSize: 11.5, color: "#A8A09A", lineHeight: 1.55, marginTop: 3 }}>
                                              {pal.descriptor}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {topDisplayChips.length > 0 && (
                                <div style={{ marginBottom: 36 }}>
                                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                                    <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A09A" }}>
                                      Layer These In
                                    </div>
                                    <div style={{ fontFamily: inter, fontSize: 11, color: "#9C9690" }}>
                                      Set for this collection
                                    </div>
                                  </div>
                                  <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.56)", marginBottom: 12, lineHeight: 1.5 }}>
                                    Signals that bring this collection DNA into focus.
                                  </div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {visibleSignals.map((chip) => {
                                      const chipKey = `${topAesthetic}::${chip.label}`;
                                      const isActive = selectedElements.has(chipKey);
                                      const meta = chipMeta.get(chipKey);
                                      const isAutoSelected = meta?.source === 'key-piece';
                                      return (
                                        <AestheticChipButton
                                          key={chip.label}
                                          label={chip.label}
                                          isActive={isActive}
                                          isClickable={false}
                                          onClick={() => {}}
                                          isAutoSelected={isAutoSelected}
                                          tension="none"
                                        />
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                <button
                                  onClick={() => setCurrentStageState("product")}
                                  style={{
                                    padding: "12px 18px",
                                    borderRadius: 999,
                                    border: "1.5px solid #7D96AC",
                                    background: "rgba(125,150,172,0.08)",
                                    color: "#7D96AC",
                                    fontFamily: sohne,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Continue to piece selection
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ marginBottom: 30 }}>
                                <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A09A", marginBottom: 10 }}>
                                  Silhouette
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                                  {orderedSilhouettes.map((sil) => {
                                    const isSel = conceptSilhouette === sil.id;
                                    const isAffinity = selectedAestheticData?.silhouette_affinity?.includes(sil.id) ?? false;
                                    return (
                                      <button
                                        key={sil.id}
                                        onClick={() => setConceptSilhouette(sil.id)}
                                        style={{
                                          textAlign: "left",
                                          borderRadius: 0,
                                          padding: "14px 0 12px",
                                          background: "transparent",
                                          border: "none",
                                          borderTop: isSel ? "2px solid #A8B475" : isAffinity ? "2px solid rgba(168,180,117,0.20)" : "2px solid #E8E3D6",
                                          cursor: "pointer",
                                        }}
                                      >
                                        <div style={{ fontSize: 15, fontWeight: 500, color: "#191919", fontFamily: sohne, marginBottom: 6 }}>
                                          {sil.name}
                                        </div>
                                        <div style={{ fontSize: 11.5, color: "#A8A09A", fontFamily: inter, marginTop: 6, lineHeight: 1.55, maxWidth: 180 }}>
                                          {sil.descriptor}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {selectedAestheticData?.palette_options && selectedAestheticData.palette_options.length > 0 && (
                                <div style={{ marginBottom: 30 }}>
                                  <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A09A", marginBottom: 10 }}>
                                    Palette
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {orderedPaletteOptions.map((pal) => {
                                      const isSel = conceptPalette === pal.id;
                                      const isAffinity = selectedAestheticData?.palette_affinity?.includes(pal.id) ?? false;
                                      return (
                                        <button
                                          key={pal.id}
                                          onClick={() => setConceptPalette(isSel ? null : pal.id)}
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 12,
                                            padding: "12px 0",
                                            borderRadius: 0,
                                            background: "transparent",
                                            border: "none",
                                            borderTop: isSel ? "2px solid #A8B475" : isAffinity ? "2px solid rgba(168,180,117,0.18)" : "2px solid rgba(67,67,43,0.06)",
                                            cursor: "pointer",
                                            textAlign: "left",
                                          }}
                                        >
                                          <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                                            {pal.swatches.slice(0, 6).map((hex, i) => (
                                              <div key={i} style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: hex, border: "1px solid rgba(0,0,0,0.08)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)" }} />
                                            ))}
                                          </div>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                              <span style={{ fontFamily: sohne, fontSize: 15, fontWeight: 500, color: "#191919" }}>
                                                {pal.name}
                                              </span>
                                            </div>
                                            <div style={{ fontFamily: inter, fontSize: 11.5, color: "#A8A09A", lineHeight: 1.55, marginTop: 3 }}>
                                              {pal.descriptor}
                                            </div>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {topDisplayChips.length > 0 && (
                                <div style={{ marginBottom: 36 }}>
                                  <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A09A", marginBottom: 4 }}>
                                    Layer These In
                                  </div>
                                  <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.56)", marginBottom: 12, lineHeight: 1.5 }}>
                                    Signals that bring this collection DNA into focus.
                                  </div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {visibleSignals.map((chip) => {
                                      const chipKey = `${topAesthetic}::${chip.label}`;
                                      const isActive = selectedElements.has(chipKey);
                                      const meta = chipMeta.get(chipKey);
                                      const isAutoSelected = meta?.source === 'key-piece';
                                      const tension: TensionState = isActive && !isAutoSelected ? getChipTensionState(chip.label, selectedKeyPieceLocal) : 'none';
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
                                    {topDisplayChips.length > visibleSignals.length && (
                                      <button
                                        onClick={() => setShowAllSignals((value) => !value)}
                                        style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: inter, background: "transparent", border: "1px solid rgba(67,67,43,0.12)", color: "rgba(67,67,43,0.56)", cursor: "pointer" }}
                                      >
                                        {showAllSignals ? "Show less" : `+${topDisplayChips.length - visibleSignals.length} more`}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                <button
                                  onClick={() => navigateStage("direction")}
                                  style={{ padding: "12px 18px", borderRadius: 999, border: "1px solid rgba(67,67,43,0.14)", background: "transparent", color: "rgba(67,67,43,0.62)", fontFamily: sohne, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                                >
                                  Back to Direction
                                </button>
                                <button
                                  onClick={() => navigateStage("product")}
                                  disabled={!canAdvanceToStage3}
                                  style={{
                                    padding: "12px 18px",
                                    borderRadius: 999,
                                    border: canAdvanceToStage3 ? "1.5px solid #7D96AC" : "1px solid rgba(67,67,43,0.10)",
                                    background: canAdvanceToStage3 ? "rgba(125,150,172,0.08)" : "rgba(255,255,255,0.6)",
                                    color: canAdvanceToStage3 ? "#7D96AC" : "rgba(67,67,43,0.30)",
                                    fontFamily: sohne,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: canAdvanceToStage3 ? "pointer" : "not-allowed",
                                  }}
                                >
                                  Continue to Product Expression
                                </button>
                              </div>
                            </>
                          )}
                        </>
                      )}

                      {currentStage === "product" && (
                        <>
                          <div style={{ paddingTop: 12, borderTop: "1px solid rgba(67,67,43,0.08)", marginBottom: 34 }}>
                            <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: CHARTREUSE, marginBottom: 8 }}>
                            Stage 3
                            </div>
                            <div style={{ fontFamily: sohne, fontSize: 28, fontWeight: 500, color: OLIVE, marginBottom: 8, letterSpacing: "-0.03em" }}>
                              Build Product Expression
                            </div>
                            <div style={{ fontFamily: inter, fontSize: 13.5, color: "rgba(67,67,43,0.56)", lineHeight: 1.62, maxWidth: 560 }}>
                              Select one piece to take into specs and assign its role in the collection.
                            </div>
                          </div>

                          <div style={{ marginBottom: 34 }}>
                            <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A09A", marginBottom: 4 }}>
                              Piece Selection
                            </div>
                            <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.56)", marginBottom: 12, lineHeight: 1.5 }}>
                              Pick one piece to take into specs this session. Select it below — you can return to assign others separately.
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                              {pieceRecommendations.map(({ piece, recommendation }) => {
                                const isSelected = activeProductPieceId === piece.item;
                                const isSuggestedStartingPiece = suggestedStartingPieceEntry?.piece.item === piece.item;
                                const assignedRole = pieceRolesById[piece.item] ?? null;
                                const anyRoleAssigned = Object.keys(pieceRolesById).length > 0;
                                const isLocked = anyRoleAssigned && !isSelected;
                                const fitLabel = piece.custom ? "From interpretation" : recommendation?.bucket === "interpretation" ? "From interpretation" : "Core to direction";
                                const fitPillStyle = fitLabel === "Core to direction"
                                  ? { background: "#EAF3DE", color: "#3B6D11" }
                                  : { background: "#F1EFE8", color: "#5F5E5A" };
                                const marketLabel = (
                                  piece.signal === "high-volume" ? "High volume" :
                                  piece.signal === "emerging" ? "Emerging" :
                                  piece.signal === "ascending" ? "Emerging" :
                                  null
                                ) as "High volume" | "Emerging" | "Peak" | null;
                                const marketPillStyle: { background: string; color: string } =
                                  marketLabel === "High volume" ? { background: "#E6F1FB", color: "#185FA5" } :
                                  marketLabel === "Peak" ? { background: "#FAECE7", color: "#993C1D" } :
                                  { background: "#FAEEDA", color: "#854F0B" };
                                return (
                                  <button
                                    key={piece.item}
                                    onClick={() => handleSelectProductPiece(piece.item)}
                                    disabled={isLocked}
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      position: "relative",
                                      borderRadius: 14,
                                      overflow: "hidden",
                                      border: isSelected ? "2px solid #A8B475" : isSuggestedStartingPiece ? "2px solid #B8876B" : "0.5px solid rgba(0,0,0,0.1)",
                                      boxShadow: isSelected ? "0 18px 42px rgba(67,67,43,0.10), 0 0 0 3px rgba(168,180,117,0.10)" : isSuggestedStartingPiece ? "0 14px 30px rgba(67,67,43,0.05)" : "0 10px 24px rgba(67,67,43,0.035)",
                                      background: isSelected ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,243,236,0.98) 100%)" : "rgba(255,255,255,0.92)",
                                      cursor: isLocked ? "default" : "pointer",
                                      textAlign: "left",
                                      padding: 0,
                                      transition: "border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease, opacity 180ms ease",
                                      transform: isSelected ? "translateY(-2px)" : isSuggestedStartingPiece && !isLocked ? "translateY(-1px)" : "translateY(0)",
                                      opacity: isLocked ? 0.38 : isSelected ? 1 : 0.88,
                                    }}
                                    onMouseEnter={(e) => { if (!isLocked) (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,0,0,0.22)"; }}
                                    onMouseLeave={(e) => { if (!isLocked) (e.currentTarget as HTMLButtonElement).style.borderColor = isSelected ? "#A8B475" : isSuggestedStartingPiece ? "#B8876B" : "rgba(0,0,0,0.1)"; }}
                                  >
                                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: isSelected ? "radial-gradient(circle at top left, rgba(168,180,117,0.12), transparent 48%)" : "transparent" }} />
                                    <div style={{ height: 152, background: isSelected ? "#F7F4EE" : isSuggestedStartingPiece ? "#F3F0EA" : "#F4F1EB", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                                      {(() => {
                                        const flatResult = getFlatForPiece(piece.type, piece.signal);
                                        if (!flatResult) return <KeyPiecePlaceholder category={piece.category} />;
                                        const { Flat, color } = flatResult;
                                        return <Flat color={color} />;
                                      })()}
                                      {(isSelected || isSuggestedStartingPiece) && (
                                        <div style={{
                                          position: "absolute",
                                          top: 8,
                                          left: 8,
                                          background: isSelected ? "#A8B475" : "#B8876B",
                                          color: "#fff",
                                          fontSize: 10,
                                          fontWeight: 500,
                                          letterSpacing: "0.06em",
                                          padding: "3px 8px",
                                          borderRadius: 20,
                                          fontFamily: "var(--font-inter), system-ui, sans-serif",
                                          whiteSpace: "nowrap",
                                        }}>
                                          {isSelected ? "Selected" : "Muko pick"}
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ background: isSelected ? "rgba(168,180,117,0.06)" : isSuggestedStartingPiece ? "rgba(168,180,117,0.03)" : "#FFFFFF", borderTop: "1px solid #F0EDE8", padding: "12px 14px 14px" }}>
                                      {assignedRole && (
                                        <div style={{ display: "inline-flex", alignItems: "center", padding: "4px 9px", borderRadius: 999, border: "1px solid rgba(67,67,43,0.10)", background: "rgba(255,255,255,0.75)", fontFamily: inter, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: assignedRole === "hero" ? "#6D7F8D" : "rgba(67,67,43,0.58)", marginBottom: 8 }}>
                                          {getRoleName(assignedRole)}
                                        </div>
                                      )}
                                      <div style={{ fontFamily: sohne, fontSize: 13, fontWeight: 500, color: "#191919", lineHeight: 1.35, marginBottom: 10 }}>
                                        {piece.item}
                                      </div>
                                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                          <span style={{ fontFamily: inter, fontSize: 10, color: "#9C9690", minWidth: 42 }}>Fit</span>
                                          <span style={{ ...fitPillStyle, fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" as const }}>
                                            {fitLabel}
                                          </span>
                                        </div>
                                        {marketLabel && (
                                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <span style={{ fontFamily: inter, fontSize: 10, color: "#9C9690", minWidth: 42 }}>Market</span>
                                            <span style={{ ...marketPillStyle, fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" as const }}>
                                              {marketLabel}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {!showCustomInput ? (
                              <button
                                onClick={() => setShowCustomInput(true)}
                                style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, padding: 0, border: "none", background: "none", cursor: "pointer", fontFamily: inter, fontSize: 12, fontWeight: 600, color: "#7D96AC", textAlign: "left" }}
                              >
                                + Add piece
                              </button>
                            ) : (
                              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(67,67,43,0.08)", maxWidth: 320 }}>
                                <input
                                  autoFocus
                                  value={customKeyPieceText}
                                  onChange={(e) => setCustomKeyPieceText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && customKeyPieceText.trim()) commitCustomProductPiece();
                                  }}
                                  onBlur={() => {
                                    if (customKeyPieceText.trim()) commitCustomProductPiece();
                                  }}
                                  placeholder="e.g. Asymmetric Hem Midi Dress"
                                  style={{ width: "100%", boxSizing: "border-box", border: "none", background: "transparent", fontFamily: inter, fontSize: 13, color: "rgba(67,67,43,0.80)", outline: "none", padding: 0 }}
                                />
                                {customKeyPieceConfirmed && (
                                  <div style={{ marginTop: 6, fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.44)", fontStyle: "italic" }}>
                                    Muko doesn&apos;t have market data on this piece yet. It won&apos;t affect scoring, but it will carry into specs.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {activeProductPieceId && (
                          <div style={{ marginBottom: 36 }}>
                            <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A09A", marginBottom: 6 }}>
                              Role Assignment
                            </div>
                            <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.56)", marginBottom: 12, lineHeight: 1.5 }}>
                              How should <strong style={{ color: "rgba(67,67,43,0.72)", fontWeight: 600 }}>{activeProductPieceEntry?.piece.item}</strong> function in this collection? This is the only piece you&apos;re assigning right now.
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              {COLLECTION_ROLE_OPTIONS.map((role) => {
                                const isSelected = activeProductPieceEntry ? pieceRolesById[activeProductPieceEntry.piece.item] === role.id : false;
                                const isSuggested = activePieceSuggestion?.suggestedRoles.includes(role.id);
                                return (
                                  <button
                                    key={role.id}
                                    onClick={() => activeProductPieceEntry && handleAssignRoleToPiece(activeProductPieceEntry.piece.item, role.id)}
                                    disabled={!activeProductPieceEntry}
                                    style={{
                                      textAlign: "left",
                                      padding: "15px 14px 14px",
                                      borderRadius: 14,
                                      border: isSelected
                                        ? "1px solid rgba(168,180,117,0.72)"
                                        : isSuggested
                                        ? "1px solid rgba(168,180,117,0.24)"
                                        : "1px solid rgba(67,67,43,0.08)",
                                      background: isSelected
                                        ? "linear-gradient(180deg, rgba(168,180,117,0.10) 0%, rgba(255,255,255,0.92) 100%)"
                                        : isSuggested
                                        ? "rgba(168,180,117,0.04)"
                                        : "rgba(255,255,255,0.68)",
                                      cursor: activeProductPieceEntry ? "pointer" : "not-allowed",
                                      opacity: activeProductPieceEntry ? 1 : 0.45,
                                      boxShadow: isSelected ? "0 14px 30px rgba(67,67,43,0.05)" : "none",
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                                      <div style={{ fontFamily: inter, fontSize: 12, fontWeight: 600, color: "#43432B" }}>
                                        {role.name}
                                      </div>
                                      {isSuggested && (
                                        <MukoPickTag />
                                      )}
                                    </div>
                                    <div style={{ fontFamily: inter, fontSize: 11, lineHeight: 1.5, color: "rgba(67,67,43,0.55)" }}>
                                      {role.description}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          )}

                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <button
                              onClick={() => navigateStage("language")}
                              style={{ padding: "12px 18px", borderRadius: 999, border: "1px solid rgba(67,67,43,0.14)", background: "transparent", color: "rgba(67,67,43,0.62)", fontFamily: sohne, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                            >
                              Back to Collection Language
                            </button>
                            <button
                              onClick={handleContinueToSpecs}
                              disabled={!canLockDirection}
                              style={{ padding: "12px 18px", borderRadius: 999, border: canLockDirection ? "1px solid rgba(125,150,172,0.34)" : "1px solid rgba(67,67,43,0.10)", background: canLockDirection ? "rgba(125,150,172,0.04)" : "rgba(255,255,255,0.6)", color: canLockDirection ? "rgba(89,112,133,0.92)" : "rgba(67,67,43,0.30)", fontFamily: sohne, fontSize: 12, fontWeight: 600, cursor: canLockDirection ? "pointer" : "not-allowed" }}
                            >
                              Lock Direction &amp; Build Specs
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

              </>
            )}

            {!isAestheticSelectorLocked && (
              <>
                {/* ── EXPLORE OTHER DIRECTIONS ───────────────────────────────────────── */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(67,67,43,0.40)", marginBottom: 5 }}>EXPLORE OTHER DIRECTIONS</div>
                  <div style={{ fontFamily: inter, fontSize: 12, fontStyle: "italic", color: "rgba(67,67,43,0.44)", marginBottom: 12 }}>Type a direction and we&apos;ll match it — or select from below.</div>
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
                          topIdScore={selectedAesthetic ? (topContent?.identityScore ?? null) : null}
                          topResScore={selectedAesthetic ? (topContent?.resonanceScore ?? null) : null}
                          onHoverEnter={() => setHoveredCard(aesthetic)}
                          onHoverLeave={() => setHoveredCard(null)}
                          onSelect={() => handleSelectAesthetic(aesthetic)}
                          inter={inter}
                          sohne={sohne}
                          steelBlue={STEEL}
                          chartreuse={CHARTREUSE}
                          isMukoPick={aesthetic === recommendedAesthetic}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          </>
        }
        rightContent={
          <div style={{ display: "flex", flexDirection: "row", height: "100%", minHeight: 0 }}>
          <div style={{ flex: 1, padding: "36px 44px 0", minWidth: 0, overflowY: "auto" }}>

            {/* PULSE RAIL — slim strip */}
            <div style={{ marginBottom: 0 }}>
              <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A09A", marginBottom: 14 }}>Pulse</div>
              {isStep3ProductStage && step3PulseReferenceLabel && (
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(67,67,43,0.34)",
                    marginBottom: 10,
                  }}
                >
                  {step3PulseReferenceLabel}
                </div>
              )}
              {pulseRows.map((row) => (
                <React.Fragment key={row.key}>
                  {/* Proxy message — shown above Resonance when LLM matched a different aesthetic */}
                  {row.key === "resonance" && resonanceProxyMessage && !resonanceLoading && !isStep3ProductStage && (
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
                    subLabel={
                      isStep3ProductStage && (row.key === "identity" || row.key === "resonance")
                        ? null
                        : isStep3ProductStage && row.key === "execution"
                        ? "Unlocks when you define material and construction"
                        : row.subLabel
                    }
                    whatItMeans={row.what}
                    howCalculated={row.how}
                    isPending={row.pending}
                    isExpanded={!isStep3ProductStage || row.key === "execution" ? pulseExpandedRow === row.key : false}
                    onToggleExpand={
                      isStep3ProductStage && (row.key === "identity" || row.key === "resonance")
                        ? undefined
                        : () => setPulseExpandedRow(pulseExpandedRow === row.key ? null : row.key)
                    }
                    rowOpacity={isStep3ProductStage && (row.key === "identity" || row.key === "resonance") ? 0.5 : 1}
                  />
                </React.Fragment>
              ))}
            </div>

            {/* Major section divider */}
            <div style={{ height: 1, background: "#E8E3D6", margin: "20px 0 24px" }} />

            {/* MUKO INSIGHT */}
            {!selectedAesthetic ? (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A09A", marginBottom: 14 }}>
                  Muko Guidance
                </div>
                <MukoStreamingParagraph
                  text="Select a direction to see Muko's analysis"
                  paragraphStyle={{ fontFamily: inter, fontSize: 13.5, color: "rgba(67,67,43,0.42)", fontStyle: "italic", lineHeight: 1.6 }}
                />
              </div>
            ) : (
              (currentStage !== "language" && currentStage !== "product" && step1ReadLoading && !step1ReadData && !conceptStreamingText) ? (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A09A", marginBottom: 14 }}>
                    Muko Guidance
                  </div>
                  {[80, 60, 90, 55].map((w, i) => (
                    <div key={i} style={{ height: i === 0 ? 18 : 12, borderRadius: 6, background: "rgba(67,67,43,0.07)", marginBottom: i === 0 ? 14 : 8, width: `${w}%`, animation: "pulse 1.4s ease-in-out infinite" }} />
                  ))}
                </div>
              ) : (
                <motion.div
                  key={`${currentStage}-${activeProductPieceId ?? "none"}-${step1ReadData?.statements?.[0] ?? step2ReadData?.headline ?? stageAwareHeadline}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: [0.22, 0.8, 0.2, 1] }}
                >
                  <MukoInsightSection
                    headline={stageAwareHeadline}
                    paragraphs={stageAwareParagraphs}
                    bullets={{
                      label: step1ReadData?.editLabel ?? 'POSITIONING',
                      items: step1ReadData?.edit ?? insightContent.opportunity,
                    }}
                    mode={step1ReadData?.mode}
                    isStreaming={currentStage !== "language" && currentStage !== "product" && step1ReadLoading && !!conceptStreamingText}
                    streamingText={conceptStreamingText}
                    streamingParagraph={conceptStreamingParagraph}
                    isParagraphStreaming={currentStage !== "language" && currentStage !== "product" && conceptIsParagraphStreaming && !!conceptStreamingParagraph}
                    languageStreamingText={step2StreamingText}
                    languageStreamingRows={step2StreamingRows}
                    isLanguageStreaming={currentStage === "language" && step2ReadLoading && !!step2StreamingText}
                    pieceStreamingTitle={pieceStreamingTitle}
                    pieceStreamingBody={pieceStreamingBody}
                    isPieceStreaming={currentStage === "product" && pieceReadLoading && !!(pieceStreamingTitle || pieceStreamingBody)}
                    pageMode="concept"
                    canContinue={canLockDirection}
                    conceptStage={currentStage}
                    languageRead={step2ReadData}
                    productPieceRead={activePieceRead}
                    productStrategicImplication={activeStrategicImplication}
                    productStructure={collectionStructureSummary}
                    hasSelectedProductPiece={Boolean(activeProductPieceEntry)}
                    showBrandContextLabel={Boolean(aestheticInflection.trim())}
                    onContinue={handleContinueToSpecs}
                    nextMove={{
                      mode: "concept",
                      guidance: step1ReadData?.decision_guidance ?? null,
                      recommendedKeyPieces,
                      selectedAnchorPiece: activeProductPieceId,
                      isConfirmed: decisionGuidanceState.is_confirmed,
                      confirmedAnchorPiece: heroAssignedPieceId,
                      onSelectAnchorPiece: handleSelectProductPiece,
                      onConfirm: step1ReadData?.decision_guidance ? handleConfirmDirection : undefined,
                      isLoading: step1ReadLoading && !step1ReadData?.decision_guidance,
                      onRoleSelect: (role) => activeProductPieceId && handleAssignRoleToPiece(activeProductPieceId, role),
                      currentRole: activeProductPieceId ? pieceRolesById[activeProductPieceId] ?? null : null,
                    }}
                  />
                </motion.div>
              )
            )}

          </div>
            <AskMuko
              step="concept"
              context={askMukoContext}
            />
          </div>
        }
      />


      {showAestheticChangeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(17,17,12,0.28)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
          <div style={{ width: "min(420px, calc(100vw - 32px))", borderRadius: 16, border: "1px solid rgba(67,67,43,0.10)", background: "#F8F5EF", boxShadow: "0 24px 64px rgba(17,17,12,0.18)", padding: "22px 22px 18px" }}>
            <div style={{ fontFamily: sohne, fontSize: 18, fontWeight: 500, color: OLIVE, marginBottom: 10 }}>
              Change collection aesthetic?
            </div>
            <p style={{ margin: "0 0 18px", fontFamily: inter, fontSize: 13, lineHeight: 1.6, color: "rgba(67,67,43,0.60)" }}>
              Changing your collection aesthetic will affect how all future pieces are evaluated. Past pieces will not change.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setShowAestheticChangeModal(false)}
                style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid rgba(67,67,43,0.14)", background: "transparent", fontFamily: inter, fontSize: 12, fontWeight: 600, color: "rgba(67,67,43,0.62)", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowAestheticChangeModal(false);
                  setIsAestheticSelectionUnlocked(true);
                  setLockedCollectionAesthetic(null);
                  setCollectionAesthetic(null);
                  setAestheticInput("");
                  setDirectionInterpretationModifiers([]);
                  try {
                    window.localStorage.removeItem(COLLECTION_AESTHETIC_STORAGE_KEY);
                  } catch {
                    // Ignore storage failures.
                  }
                }}
                style={{ padding: "8px 14px", borderRadius: 999, border: "none", background: OLIVE, fontFamily: inter, fontSize: 12, fontWeight: 600, color: "#F5F0E8", cursor: "pointer" }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

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
  inter, sohne, steelBlue, chartreuse, isMukoPick,
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
        background: isMukoPick ? "rgba(255,255,255,0.9)" : "transparent",
        border: isHovered ? "1px solid rgba(67,67,43,0.18)" : isMukoPick ? "1px solid rgba(168,180,117,0.18)" : "1px solid rgba(67,67,43,0.08)",
        boxShadow: isHovered ? "0 4px 14px rgba(0,0,0,0.07)" : isMukoPick ? "0 8px 22px rgba(67,67,43,0.04)" : "none",
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

        {/* Right: select affordance */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
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
