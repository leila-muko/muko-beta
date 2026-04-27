"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
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
import { trackEvent } from "@/lib/analytics";
import type { AskMukoContext } from "@/lib/synthesizer/askMukoResponse";
import aestheticsData from "@/data/aesthetics.json";
import chipTensionsData from "@/data/chip_tensions.json";
import { ResizableSplitPanel } from "@/components/ui/ResizableSplitPanel";
import { PulseSection } from "@/components/ui/PulseSection";
import { MukoInsightSection } from "@/components/ui/MukoInsightSection";
import { MukoStreamingParagraph } from "@/components/ui/MukoStreamingParagraph";
import { buildConceptBlackboard, toAestheticSlug } from "@/lib/synthesizer/assemble";
import type { InsightData } from "@/lib/types/insight";
import { createClient } from "@/lib/supabase/client";
import { MukoNav } from "@/components/MukoNav";
import { debounce } from "@/lib/utils/debounce";
import {
  checkMarketSaturation,
  getResonanceScore,
  type Aesthetic as ResearcherAesthetic,
} from "@/lib/agents/researcher";
import { getFlatForPiece } from "@/components/flats";
import { combineDirection } from "@/lib/concept-studio/combineDirection";
import { SUGGESTED_INTERPRETATION_CHIPS } from "@/lib/concept-studio/interpretations";
import { buildSelectedPieceImage, resolvePieceImageType } from "@/lib/piece-image";
import { getCollectionLanguageLabels, getExpressionSignalLabels } from "@/lib/collection-signals";
import { CollectionReadBar, COLLECTION_READ_BAR_OFFSET } from "@/components/collection/CollectionReadBar";
import { buildProgressiveStrategySummary, buildStrategySummary } from "@/lib/strategy-summary";
import { CollectionContextBar, ContextBarSignalIcon, COLLECTION_CONTEXT_BAR_OFFSET } from "@/components/collection/CollectionContextBar";
import { buildPulseMicroInsight } from "@/lib/pulse/microInsight";
import { generateDirectionBrief } from "@/lib/synthesizer/conceptInsight";

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
const DEEP_BROWN = "#6B524F";
const PULSE_GREEN = "#A8B475";   // Chartreuse — brand positive
const PULSE_YELLOW = "#B8876B";  // Camel — brand moderate
const PULSE_RED = "#A97B8F";     // Rose — brand tension
const OLIVE = BRAND.oliveInk;
const TEXT = OLIVE;
const MUTED = "rgba(67,67,43,0.44)";
const GENERIC_STRATEGY_SUMMARY = "Define your collection stance";
const EDITORIAL_INTERPRETATION_PROMPTS = [
  "sensual fabric tension",
  "restrained emotional depth",
  "architectural softness",
  "sensual draping",
  "fluid minimalism",
  "heritage tailoring",
  "soft suiting",
  "tonal restraint",
] as const;

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

function extractPartialJsonStringArray(raw: string, key: string): string[] {
  const match = raw.match(new RegExp(`"${key}"\\s*:\\s*\\[((?:.|\\n|\\r)*?)\\]`));
  if (!match) return [];

  return Array.from(match[1].matchAll(/"((?:\\.|[^"\\])*)"/g))
    .map((entry) =>
      entry[1]
        .replace(/\\"/g, '"')
        .replace(/\\n/g, " ")
        .trim()
    )
    .filter(Boolean)
    .slice(0, 3);
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
  seen_in?: string[];
  risk_factors?: string[];
  seasonal_relevance?: string | Record<string, number>;
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
  core_read: string;
  execution_moves: string[];
  guardrail: string;
}

type TensionState = 'none' | 'soft' | 'hard';
type RecommendationRole = "primary" | "anchor" | "stretch";

type DirectionRecommendation = {
  aesthetic: string;
  role: RecommendationRole;
  descriptor: string;
  insight: string;
  identityScore: number;
  resonanceScore: number;
  saturationScore: number;
  velocity: string;
};

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

function getResonanceScoreColor(
  pulse: { status: string; score: number; message: string } | null,
  score: number | null | undefined
): string {
  if (pulse?.status === "green") return PULSE_GREEN;
  if (pulse?.status === "yellow") return PULSE_YELLOW;
  if (pulse?.status === "red") return PULSE_RED;
  if (typeof score === "number") return score >= 80 ? CHARTREUSE : score >= 65 ? BRAND.camel : BRAND.rose;
  return "rgba(67,67,43,0.35)";
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

function buildRecommendationInsight({
  role,
  isRecommended,
  identityScore,
  resonanceScore,
  saturationScore,
}: {
  role: RecommendationRole;
  isRecommended: boolean;
  identityScore: number;
  resonanceScore: number;
  saturationScore: number;
}) {
  const identityClause =
    identityScore >= 84
      ? "Grounded in your brand codes"
      : identityScore >= 80
      ? "Close to your brand codes"
      : "A sharper lens on your brand codes";

  const whitespaceClause =
    saturationScore <= 40
      ? "with low saturation and room to lead"
      : saturationScore <= 55
      ? "with growing traction and room to lead"
      : saturationScore <= 70
      ? "with live demand and room to sharpen"
      : "if you author it decisively";

  if (role === "anchor") {
    return `${identityClause}, with steadier commercial footing`;
  }

  if (role === "stretch") {
    return `${identityClause}, with room for sharper separation`;
  }

  if (isRecommended || resonanceScore >= 82) {
    return `${identityClause}, ${whitespaceClause}`;
  }

  return `${identityClause}, with a clear directional edge`;
}

function buildDirectionSelectionRead({
  recommendations,
  hoveredAesthetic,
  strategySummary,
}: {
  recommendations: DirectionRecommendation[];
  hoveredAesthetic?: string | null;
  strategySummary?: string | null;
}) {
  const bestFit = recommendations.find((item) => item.role === "primary") ?? recommendations[0];
  const anchor = recommendations.find((item) => item.role === "anchor") ?? recommendations[1] ?? bestFit;
  const stretch = recommendations.find((item) => item.role === "stretch") ?? recommendations[2] ?? anchor;
  const active = hoveredAesthetic
    ? recommendations.find((item) => item.aesthetic === hoveredAesthetic) ?? bestFit
    : null;

  if (active) {
    const fitLine =
      active.identityScore >= 84
        ? `${active.aesthetic} fits because it can carry the brand's point of view without forcing a new language.`
        : active.identityScore >= 78
        ? `${active.aesthetic} can work, but only if you author it hard enough to keep it from reading generic.`
        : `${active.aesthetic} only earns its place if you want a more exposed, authored move.`;
    const conditionLine =
      active.saturationScore <= 55
        ? "It works best when you claim the opening early and keep the execution edited."
        : active.saturationScore <= 70
        ? "It works only if the line is precise, because the middle of the market is already getting noisier."
        : "It works only if you strip it back to the part of the lane that still feels owned rather than familiar.";
    const failureLine =
      active.resonanceScore >= 82 && active.identityScore < 80
        ? "The failure mode is borrowing market energy without enough authorship."
        : active.saturationScore > 70
        ? "The failure mode is blending into a lane that already has too many competent versions."
        : "The failure mode is overworking it until the distinction disappears.";

    return {
      headline: `${active.aesthetic} can work, but the claim has to be deliberate.`,
      paragraphs: [
        fitLine,
        `${conditionLine} ${failureLine}`,
        active.role === "stretch"
          ? "Choose it if you want more separation, not more safety."
          : active.role === "anchor"
          ? "Choose it if you want clearer commercial footing without flattening the line."
          : "Choose it if you want the cleanest route to conviction.",
      ],
      bullets: { label: "Read", items: [] },
    };
  }

  const strategicLead = strategySummary?.trim()
    ? "The strategy is already set."
    : "The decision is less about taste than stance.";

  return {
    headline: "The real decision is how much differentiation you want to claim.",
    paragraphs: [
      `${strategicLead} ${bestFit.aesthetic} is the controlled route: stable, legible, and easiest to hold together without losing polish.`,
      `${anchor.aesthetic} gives you more room without asking for a full reset, while ${stretch.aesthetic} creates the sharpest separation but asks for stronger authorship.`,
      "What matters now is not which lane is attractive, but which level of risk you actually want the collection to carry once it has to read in-product.",
    ],
    bullets: { label: "Read", items: [] },
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

function isConceptStageId(value: string | null): value is ConceptStageId {
  return value === "direction" || value === "language" || value === "product";
}

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
  headline: string;
  core_read: string;
  move_that_matters: string;
  start_here: string;
};

type ProductStrategicImplication = {
  summary: string;
  suggestedRoles: CollectionRoleId[];
};

const PRODUCT_PIECE_READ_FALLBACK_BODY =
  "This piece carries the clearest expression of the collection direction. Assign its role before moving to specs.";

function buildProductPieceReadFallback(pieceName: string): ProductPieceRead {
  return {
    headline: `${pieceName} is the clearest route into the collection, but it still needs a sharper claim.`,
    core_read: PRODUCT_PIECE_READ_FALLBACK_BODY,
    move_that_matters:
      "If this piece does not establish a distinct proportion and market position now, the collection risks opening with taste instead of product authority.",
    start_here: `${pieceName} should be the first move because it can set the line’s silhouette role before the assortment starts to drift.`,
  };
}

function getConceptSilhouetteLabel(conceptSilhouette: string): string {
  return (
    CONCEPT_SILHOUETTES.find((silhouette) => silhouette.id === conceptSilhouette)?.name.toLowerCase() ??
    conceptSilhouette
  );
}

function getStrategySliderLabel(value: number, labels: [string, string, string]): string {
  if (value <= 30) return labels[0];
  if (value <= 69) return labels[1];
  return labels[2];
}

function getPieceReadBucket(
  role: CollectionRoleId | null | undefined,
  fallbackBucket?: string | null
): string {
  if (role === "hero") return "anchor";
  if (role === "volume-driver") return "commercial_base";
  if (role === "core-evolution") return "core";
  if (role === "directional") return "signal";
  return fallbackBucket?.trim() || "unknown";
}

function getStageIndex(stage: ConceptStageId): number {
  if (stage === "direction") return 0;
  if (stage === "language") return 1;
  return 2;
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

function getPersistedPieceName(piece: {
  piece_name?: string | null;
  category: string | null;
  silhouette: string | null;
  agent_versions?: {
    saved_piece_name?: string | null;
  } | null;
}) {
  return (
    piece.piece_name?.trim()
    || piece.agent_versions?.saved_piece_name?.trim()
    || piece.silhouette?.trim()
    || piece.category?.trim()
    || "Untitled Piece"
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */
function ConceptStudioPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    season,
    collectionName: storeCollectionName,
    refinementModifiers,
    aestheticInput,
    chipSelection: storeChipSelection,
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
    targetMsrp: storeTargetMsrp,
    targetMargin: storeTargetMargin,
    sliderTrend,
    sliderCreative,
    sliderElevated,
    sliderNovelty,
    collectionRole: storeCollectionRole,
    setCollectionRole,
    setCollectionName,
    setSeason,
    activeProductPieceId,
    setActiveProductPieceId,
    pieceRolesById,
    setPieceRolesById,
    pieceBuildContext,
    setSelectedPieceImage,
    setConceptInsight,
    clearConceptInsight,
    strategySummary,
    isProxyMatch,
    setIsProxyMatch,
    setCollectionContextSnapshot,
    savedAnalysisId,
    preloadedCriticScores,
    setPreloadedCriticScores,
  } = useSessionStore(
    useShallow((state) => ({
      season: state.season,
      collectionName: state.collectionName,
      refinementModifiers: state.refinementModifiers,
      aestheticInput: state.aestheticInput,
      chipSelection: state.chipSelection,
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
      targetMsrp: state.targetMsrp,
      targetMargin: state.targetMargin,
      sliderTrend: state.sliderTrend,
      sliderCreative: state.sliderCreative,
      sliderElevated: state.sliderElevated,
      sliderNovelty: state.sliderNovelty,
      collectionRole: state.collectionRole,
      setCollectionRole: state.setCollectionRole,
      setCollectionName: state.setCollectionName,
      setSeason: state.setSeason,
      activeProductPieceId: state.activeProductPieceId,
      setActiveProductPieceId: state.setActiveProductPieceId,
      pieceRolesById: state.pieceRolesById,
      setPieceRolesById: state.setPieceRolesById,
      pieceBuildContext: state.pieceBuildContext,
      setSelectedPieceImage: state.setSelectedPieceImage,
      setConceptInsight: state.setConceptInsight,
      clearConceptInsight: state.clearConceptInsight,
      strategySummary: state.strategySummary,
      isProxyMatch: state.isProxyMatch,
      setIsProxyMatch: state.setIsProxyMatch,
      setCollectionContextSnapshot: state.setCollectionContextSnapshot,
      savedAnalysisId: state.savedAnalysisId,
      preloadedCriticScores: state.preloadedCriticScores,
      setPreloadedCriticScores: state.setPreloadedCriticScores,
    }))
  );

  const [headerCollectionName, setHeaderCollectionName] = useState<string>("Collection");
  const [headerSeasonLabel, setHeaderSeasonLabel] = useState<string>(season || "—");
  const [lockedCollectionAesthetic, setLockedCollectionAesthetic] = useState<string | null>(storeCollectionAesthetic);
  const [isAestheticSelectionUnlocked, setIsAestheticSelectionUnlocked] = useState(false);
  const [isReviewingDirectionSelection, setIsReviewingDirectionSelection] = useState(false);
  const [showAestheticChangeModal, setShowAestheticChangeModal] = useState(false);
  const [pendingAestheticChange, setPendingAestheticChange] = useState<string | null>(null);
  const [aestheticInflection, setAestheticInflection] = useState(storeDirectionInterpretationText);
  const [selectedInterpretationChips, setSelectedInterpretationChips] = useState<string[]>(storeDirectionInterpretationChips);
  // Draft states — user types/clicks here; committed after a short pause.
  const [inflectionDraft, setInflectionDraft] = useState(storeDirectionInterpretationText);
  const [chipsDraft, setChipsDraft] = useState<string[]>(storeDirectionInterpretationChips);
  const [isInflectionSettling, setIsInflectionSettling] = useState(false);
  const [suggestionFillPulse, setSuggestionFillPulse] = useState(0);
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
    let storedCollectionName = "";
    let storedSeason = "";

    try {
      const n = window.localStorage.getItem("muko_collectionName");
      const s = window.localStorage.getItem("muko_seasonLabel");
      storedCollectionName = n?.trim() || "";
      storedSeason = s?.trim() || "";
      if (n) setHeaderCollectionName(n);
      if (s) setHeaderSeasonLabel(s);
      else setHeaderSeasonLabel(season || "—");
    } catch { setHeaderSeasonLabel(season || "—"); }

    const needsCollectionName = !storedCollectionName;
    const needsSeasonLabel = !storedSeason;
    if ((!needsCollectionName && !needsSeasonLabel) || !savedAnalysisId) return;

    let cancelled = false;

    void (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("analyses")
          .select("collection_name, season")
          .eq("id", savedAnalysisId)
          .maybeSingle();

        if (cancelled || error || !data) return;

        const dbCollectionName = data.collection_name?.trim() || "";
        const dbSeason = data.season?.trim() || "";

        if (needsCollectionName && dbCollectionName) {
          setCollectionName(dbCollectionName);
          setHeaderCollectionName(dbCollectionName);
        }

        if (needsSeasonLabel && dbSeason) {
          setSeason(dbSeason);
          setHeaderSeasonLabel(dbSeason);
        }
      } catch (error) {
        console.error("Failed to hydrate concept header context", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [savedAnalysisId, season, setCollectionName, setSeason]);

  // Real Critic identity scores for all aesthetics, populated once brandProfileId resolves.
  // Empty until the batch fetch completes — falls back to static scoring in the meantime.
  const [allCriticScores, setAllCriticScores] = useState<Record<string, number>>(preloadedCriticScores);

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
  const lockedAestheticName = useMemo(
    () => resolveAestheticName(lockedCollectionAesthetic),
    [lockedCollectionAesthetic]
  );
  const selectedAesthetic =
    AESTHETICS.includes(aestheticInput as (typeof AESTHETICS)[number])
      ? aestheticInput
      : lockedAestheticName && AESTHETICS.includes(lockedAestheticName as (typeof AESTHETICS)[number])
      ? lockedAestheticName
      : null;
  const selectedIsAlternative = Boolean(selectedAesthetic && selectedAesthetic !== recommendedAesthetic);
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

  // Resonance Pulse states: WAITING (no input), LOADING (LLM in flight), RESOLVED
  const [resonanceLoading, setResonanceLoading] = useState(false);
  const [resonanceProxyMessage, setResonanceProxyMessage] = useState<string | null>(null);
  const [resonanceSaturationScore, setResonanceSaturationScore] = useState<number | null>(null);
  const [resonanceCollectionsCount, setResonanceCollectionsCount] = useState<number | null>(null);

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
    let didToggle = false;
    setSelectedElements((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        didToggle = true;
        return next;
      }

      const directionPrefix = `${key.split("::")[0]}::`;
      let selectedCount = 0;
      next.forEach((entry) => {
        if (entry.startsWith(directionPrefix)) selectedCount += 1;
      });
      if (selectedCount >= 3) return prev;

      next.add(key);
      didToggle = true;
      return next;
    });
    if (!didToggle) return;
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
    const nextText = inflectionDraft.slice(0, 100);
    const draftMatchesCommitted =
      nextText.trim() === aestheticInflection.trim() &&
      chipsDraft.join(",") === selectedInterpretationChips.join(",");

    if (draftMatchesCommitted) {
      setIsInflectionSettling(false);
      return;
    }

    setIsInflectionSettling(true);
    const timer = window.setTimeout(() => {
      setAestheticInflection(nextText);
      setSelectedInterpretationChips(chipsDraft);
      setIsInflectionSettling(false);
    }, 380);

    return () => window.clearTimeout(timer);
  }, [aestheticInflection, chipsDraft, inflectionDraft, selectedInterpretationChips]);

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
  const [marketMoment, setMarketMoment] = useState<string | null>(null);
  const [directionBriefHeadline, setDirectionBriefHeadline] = useState<string | null>(null);
  const [directionBriefLoading, setDirectionBriefLoading] = useState(false);
  const [directionBriefStreamingHeadline, setDirectionBriefStreamingHeadline] = useState("");
  const [directionBriefStreamingBody, setDirectionBriefStreamingBody] = useState("");
  const [directionBriefIsStreaming, setDirectionBriefIsStreaming] = useState(false);
  const [marketMomentSeed, setMarketMomentSeed] = useState<{
    brandName: string;
    brandKeywords: string[];
    customerProfile: string;
    priceTier: string;
  } | null>(null);
  const marketMomentRequestedRef = useRef(false);
  const directionBriefAnimationRunRef = useRef(0);
  const directionBriefTimeoutsRef = useRef<number[]>([]);

  // ─── Collection context state for Decision Guidance ──────────────────────
  const [collectionPieces, setCollectionPieces] = useState<Array<{
    id: string;
    piece_name: string | null;
    score: number;
    dimensions: Record<string, number> | null;
    collection_role: string | null;
    collection_aesthetic: string | null;
    category: string | null;
    silhouette: string | null;
    aesthetic_matched_id: string | null;
    aesthetic_inflection: string | null;
    construction_tier: string | null;
    agent_versions?: {
      saved_piece_name?: string | null;
    } | null;
  }>>([]);
  useEffect(() => {
    if (lockedCollectionAesthetic || isAestheticSelectionUnlocked || collectionPieces.length === 0) return;
    const inferredCollectionAesthetic =
      collectionPieces.find((piece) => piece.collection_aesthetic)?.collection_aesthetic ??
      collectionPieces.find((piece) => piece.aesthetic_matched_id)?.aesthetic_matched_id ??
      storeCollectionAesthetic ??
      null;
    if (!inferredCollectionAesthetic) return;
    const inferredAestheticName = resolveAestheticName(inferredCollectionAesthetic);
    if (!inferredAestheticName) return;
    setLockedCollectionAesthetic(inferredAestheticName);
    setCollectionAesthetic(inferredAestheticName);
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
  const conceptReadTriggerKey = useMemo(
    () =>
      selectedAesthetic
        ? JSON.stringify({
            aesthetic: selectedAesthetic,
            pointOfView: aestheticInflection.trim(),
            interpretationChips: [...selectedInterpretationChips].sort(),
          })
        : null,
    [aestheticInflection, selectedAesthetic, selectedInterpretationChips]
  );
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
  const [step2StreamingRead, setStep2StreamingRead] = useState<{ core_read: string; execution_moves: string[]; guardrail: string }>({ core_read: '', execution_moves: [], guardrail: '' });
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
      setStep2StreamingRead({ core_read: '', execution_moves: [], guardrail: '' });
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
    if (intentGoals || intentTradeoff || storeCollectionRole) {
      intentPayload = {
        primary_goals: intentGoals,
        tradeoff: intentTradeoff,
        piece_role: storeCollectionRole ?? '',
        tension_sliders: {
          trend_forward: sliderTrend ?? 50,
          creative_expression: sliderCreative ?? 50,
          elevated_design: sliderElevated ?? 50,
          novelty: sliderNovelty ?? 50,
        },
      };
    }

    const blackboard = buildConceptBlackboard({
      aestheticInput: aestheticInput || selectedAesthetic,
      aestheticSlug: slug,
      brandKeywords: brandKeywordSource,
      identity_score: identityPulse?.score ?? 80,
      resonance_score: resonancePulse?.score ?? 75,
      season: season || 'SS27',
      collectionName: storeCollectionName || '',
      brandName: brandProfileName || '',
      priceTier: brandProfile3?.price_tier ?? null,
      targetMargin: brandProfile3?.target_margin ?? null,
      tensionContext: brandProfile3?.tension_context ?? null,
      intent: intentPayload,
      customerProfile: customerProfile,
      referenceBrands: referenceBrands,
      excludedBrands: excludedBrands,
      strategySummary: conceptStrategySummary,
      expressionSignals: useSessionStore.getState().chipSelection?.activatedChips.map((c) => c.label) ?? [],
      brandInterpretation: storeDirectionInterpretationText?.trim() || interpretationSummary || null,
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
          piece_name: p.piece_name ?? "Untitled Piece",
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

    setStep1ReadData(null);
    setStep1ReadLoading(true);
    setConceptStreamingText('');
    setConceptStreamingParagraph('');
    setConceptIsParagraphStreaming(true);

    const timer = window.setTimeout(async () => {
      console.log('[Muko] Synthesizer timer firing');
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
  }, [selectedAesthetic, conceptReadTriggerKey]);

  const selectedExpressionSignals = useMemo(
    () => getExpressionSignalLabels(storeChipSelection),
    [storeChipSelection]
  );
  const selectedCollectionLanguage = useMemo(
    () => getCollectionLanguageLabels(selectedInterpretationChips, aestheticInflection),
    [aestheticInflection, selectedInterpretationChips]
  );
  const conceptStrategySummary = useMemo(() => {
    if (strategySummary?.trim()) return strategySummary.trim();
    return buildStrategySummary({
      priorities: intentGoals,
      trendLabel: getStrategySliderLabel(sliderTrend, ["Trend-forward", "Balanced Horizon", "Timeless"]),
      creativeLabel: getStrategySliderLabel(sliderCreative, ["Creative-led", "Balanced Creativity", "Commercially safe"]),
      elevatedLabel: getStrategySliderLabel(sliderElevated, ["Design-elevated", "Balanced Value", "Accessible"]),
      noveltyLabel: getStrategySliderLabel(sliderNovelty, ["Novelty-forward", "Continuity-aware", "Continuity-first"]),
      targetMargin: storeTargetMargin,
      targetMsrp: storeTargetMsrp,
      sliderTrendValue: sliderTrend,
      sliderCreativeValue: sliderCreative,
      sliderElevatedValue: sliderElevated,
      sliderNoveltyValue: sliderNovelty,
    });
  }, [
    intentGoals,
    sliderCreative,
    sliderElevated,
    sliderNovelty,
    sliderTrend,
    storeTargetMargin,
    storeTargetMsrp,
    strategySummary,
  ]);
  const effectiveConceptBarSummary = useMemo(() => {
    const strategy = conceptStrategySummary?.trim();
    return strategy && strategy !== GENERIC_STRATEGY_SUMMARY ? strategy : null;
  }, [conceptStrategySummary]);
  const hasInterpretationLayer = Boolean(aestheticInflection.trim() || selectedInterpretationChips.length > 0);
  const hasLanguageChoices = Boolean(conceptSilhouette || conceptPalette || selectedElements.size > 0);
  const canAdvanceToStage2 = Boolean(selectedAesthetic && hasInterpretationLayer);
  const canAdvanceToStage3 = Boolean(canAdvanceToStage2 && hasLanguageChoices);
  const assignedRoleCount = Object.keys(pieceRolesById).length;
  const heroAssignedPieceId = Object.entries(pieceRolesById).find(([, role]) => role === "hero")?.[0] ?? null;
  const canLockDirection = Boolean(canAdvanceToStage3 && assignedRoleCount > 0);
  const persistLockedCollectionContext = useCallback(() => {
    const resolvedCollectionName = storeCollectionName.trim() || headerCollectionName.trim();
    if (!resolvedCollectionName || resolvedCollectionName === "Collection") return;

    setCollectionContextSnapshot(resolvedCollectionName, {
      collection_aesthetic: selectedAesthetic?.trim() || storeCollectionAesthetic?.trim() || null,
      aesthetic_inflection: aestheticInflection.trim() || null,
      aesthetic_matched_id: selectedAesthetic?.toLowerCase().replace(/\s+/g, "-") || null,
      silhouette: conceptSilhouette?.trim() || null,
      season: season?.trim() || headerSeasonLabel.trim() || null,
      mood_board_images: topMoodboardImages,
      agent_versions: {
        strategy_summary: effectiveConceptBarSummary,
        selected_palette: conceptPalette?.trim() || null,
        concept_setup_complete: JSON.stringify(canLockDirection),
        direction_interpretation_chips: JSON.stringify(selectedInterpretationChips),
        collection_language: JSON.stringify(selectedCollectionLanguage),
        expression_signals: JSON.stringify(selectedExpressionSignals),
        chip_selection: storeChipSelection ? JSON.stringify(storeChipSelection) : null,
      },
    });
  }, [
    aestheticInflection,
    conceptPalette,
    conceptSilhouette,
    canLockDirection,
    effectiveConceptBarSummary,
    headerCollectionName,
    headerSeasonLabel,
    season,
    selectedAesthetic,
    selectedCollectionLanguage,
    selectedExpressionSignals,
    selectedInterpretationChips,
    setCollectionContextSnapshot,
    storeChipSelection,
    storeCollectionAesthetic,
    storeCollectionName,
    topMoodboardImages,
  ]);
  const conceptStrategyRead = useMemo(
    () =>
      buildProgressiveStrategySummary({
        priorities: intentGoals,
        trendLabel: getStrategySliderLabel(sliderTrend, ["Trend-forward", "Balanced Horizon", "Timeless"]),
        creativeLabel: getStrategySliderLabel(sliderCreative, ["Creative-led", "Balanced Creativity", "Commercially safe"]),
        elevatedLabel: getStrategySliderLabel(sliderElevated, ["Design-elevated", "Balanced Value", "Accessible"]),
        noveltyLabel: getStrategySliderLabel(sliderNovelty, ["Novelty-forward", "Continuity-aware", "Continuity-first"]),
        targetMargin: storeTargetMargin,
        targetMsrp: storeTargetMsrp,
        sliderTrendValue: sliderTrend,
        sliderCreativeValue: sliderCreative,
        sliderElevatedValue: sliderElevated,
        sliderNoveltyValue: sliderNovelty,
      }),
    [
      intentGoals,
      sliderCreative,
      sliderElevated,
      sliderNovelty,
      sliderTrend,
      storeTargetMargin,
      storeTargetMsrp,
    ]
  );

  const conceptLanguageRequestKey = useMemo(() => {
    if (!selectedAesthetic) return null;
    return JSON.stringify({
      aesthetic: selectedAesthetic,
      brandKeywords: brandKeywordSource,
      brandName: brandProfile3?.brand_name ?? brandProfileName ?? null,
      strategySummary: conceptStrategySummary,
      interpretation: storeDirectionInterpretationText?.trim() || aestheticInflection?.trim() || null,
      silhouettes: conceptSilhouette ? [getConceptSilhouetteLabel(conceptSilhouette)] : [],
      palette: conceptPalette ?? null,
      collectionLanguage: selectedCollectionLanguage,
      expressionSignals: selectedExpressionSignals,
      referenceBrands,
      excludedBrands,
      customerProfile,
    });
  }, [
    brandKeywordSource,
    brandProfile3?.brand_name,
    brandProfileName,
    aestheticInflection,
    conceptPalette,
    conceptSilhouette,
    conceptStrategySummary,
    selectedAesthetic,
    selectedCollectionLanguage,
    selectedExpressionSignals,
    storeDirectionInterpretationText,
    referenceBrands,
    excludedBrands,
    customerProfile,
  ]);


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
            .select('*')
            .eq('collection_name', collectionName)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null });

      Promise.all([brandProfilePromise, collectionPiecesPromise]).then(
        async ([{ data, error }, { data: piecesData, error: piecesError }]) => {
          console.log('[Muko] brand_profiles query result — data:', data, '| error:', error);
          const normalizedPiecesData: Array<{
            id: string;
            piece_name?: string | null;
            score: number;
            dimensions: Record<string, number> | null;
            collection_role: string | null;
            collection_aesthetic: string | null;
            category: string | null;
            silhouette: string | null;
            aesthetic_matched_id: string | null;
            aesthetic_inflection: string | null;
            construction_tier: string | null;
            agent_versions?: {
              saved_piece_name?: string | null;
            } | null;
          }> | null = (piecesData as Array<{
            id: string;
            piece_name?: string | null;
            score: number;
            dimensions: Record<string, number> | null;
            collection_role: string | null;
            collection_aesthetic: string | null;
            category: string | null;
            silhouette: string | null;
            aesthetic_matched_id: string | null;
            aesthetic_inflection: string | null;
            construction_tier: string | null;
            agent_versions?: {
              saved_piece_name?: string | null;
            } | null;
          }> | null) ?? null;

          if (piecesError) {
            console.warn('[Muko] collection pieces query error:', piecesError);
          }

          if (normalizedPiecesData) {
            const normalized = (normalizedPiecesData as Array<{
              id: string;
              piece_name?: string | null;
              score: number;
              dimensions: Record<string, number> | null;
              collection_role: string | null;
              collection_aesthetic: string | null;
              category: string | null;
              silhouette: string | null;
              aesthetic_matched_id: string | null;
              aesthetic_inflection: string | null;
              construction_tier: string | null;
              agent_versions?: {
                saved_piece_name?: string | null;
              } | null;
            }>).map((piece) => ({
              ...piece,
              piece_name: getPersistedPieceName(piece),
            }));
            setCollectionPieces(normalized);
            console.log('[COLLECTION_CONTEXT_DEBUG] piece_count:', normalized.length, 'first piece_name:', normalized[0]?.piece_name ?? null, 'collection_name used:', collectionName);
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

            if (data.brand_name) {
              setMarketMomentSeed({
                brandName: data.brand_name,
                brandKeywords: Array.isArray(data.keywords) ? data.keywords : brandKeywordSource,
                customerProfile: data.customer_profile ?? "",
                priceTier: data.price_tier ?? "",
              });
            }

            // Batch-score all aesthetics against the brand profile so Pick selection
            // can use real Critic identity scores instead of static constants.
            const profileId = data.id;
            const allEntries = aestheticsData as unknown as AestheticDataEntry[];
            criticBatchAbortRef.current?.abort();
            criticBatchAbortRef.current = new AbortController();
            const batchController = criticBatchAbortRef.current;
            if (Object.keys(preloadedCriticScores).length > 0) {
              setAllCriticScores(preloadedCriticScores);
              return;
            }

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
              setPreloadedCriticScores(scores);
            });
          } else {
            setNoBrandProfile(true);
          }
        });
    });

    return () => {
      criticBatchAbortRef.current?.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (Object.keys(preloadedCriticScores).length === 0) return;
    setAllCriticScores(preloadedCriticScores);
  }, [preloadedCriticScores]);

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
    const merged = Array.from(
      new Set([
        ...EDITORIAL_INTERPRETATION_PROMPTS,
        ...selectedInterpretationChips,
        ...inflectionSuggestions,
        ...SUGGESTED_INTERPRETATION_CHIPS,
      ])
    );
    const queryTokens = inflectionDraft
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((token) => token.length > 2);

    if (queryTokens.length === 0) {
      return merged.slice(0, 8);
    }

    return merged
      .slice()
      .sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const aScore = queryTokens.reduce((score, token) => score + (aLower.includes(token) ? 2 : 0), 0);
        const bScore = queryTokens.reduce((score, token) => score + (bLower.includes(token) ? 2 : 0), 0);
        const aStarts = aLower.startsWith(queryTokens[0] ?? "") ? 1 : 0;
        const bStarts = bLower.startsWith(queryTokens[0] ?? "") ? 1 : 0;
        return (bScore + bStarts) - (aScore + aStarts);
      })
      .slice(0, 8);
  }, [inflectionDraft, inflectionSuggestions, selectedInterpretationChips]);
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
      collectionPieces
        .map((p) => p.piece_name)
        .filter((name): name is string => Boolean(name))
        .map((name) => name.toLowerCase())
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
        pieceName: activeProductPieceEntry.piece.item,
        category: activeProductPieceEntry.piece.category,
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
      const inferredType = resolvePieceImageType({ pieceName: nextName });
      const inferredCategory =
        inferredType === "straight-pant" || inferredType === "trouser" || inferredType === "skirt" || inferredType === "mini-skirt"
          ? "bottoms"
          : inferredType?.includes("dress")
            ? "dresses"
            : inferredType === "jacket" || inferredType === "trench" || inferredType === "coat" || inferredType === "parka" || inferredType === "puffer" || inferredType === "raincoat"
              ? "outerwear"
              : inferredType === "knit-sweater" || inferredType === "cardigan"
                ? "knitwear"
                : inferredType
                  ? "tops"
                  : null;
      setCustomProductPieces((prev) => [
        ...prev,
        {
          item: nextName,
          signal: null,
          category: inferredCategory,
          type: inferredType,
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
    const confirmedAesthetic = selectedAesthetic;
    const selectedAestheticSlug = confirmedAesthetic ? toAestheticSlug(confirmedAesthetic) : null;
    const primaryRole = primaryPieceName ? pieceRolesById[primaryPieceName] ?? null : null;

    setDecisionGuidanceState({
      is_confirmed: true,
      selected_anchor_piece: primaryPieceName,
    });

    if (primaryPiece) {
      setSelectedKeyPieceLocal(primaryPiece);
      setSelectedKeyPiece(primaryPiece);
      setSelectedPieceImage(
        buildSelectedPieceImage({
          type: primaryPiece.type,
          pieceName: primaryPiece.item,
          category: primaryPiece.category,
          signal: primaryPiece.signal ?? null,
        })
      );
      setActiveProductPieceId(primaryPiece.item);
      setCollectionRole(primaryRole);
    }

    if (shouldPersistCollectionAesthetic && confirmedAesthetic && selectedAestheticSlug) {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { data: latestAnalysis } = await supabase
          .from("analyses")
          .select("id")
          .eq("user_id", user?.id ?? "")
          .eq("collection_name", storeCollectionName)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestAnalysis?.id) {
          await supabase
            .from("analyses")
            .update({
              collection_aesthetic: confirmedAesthetic,
              aesthetic_matched_id: selectedAestheticSlug,
              aesthetic_inflection: aestheticInflection.trim() || null,
            })
            .eq("id", latestAnalysis.id);
        }
      } catch {
        // Local state remains the source of truth if this best-effort write fails.
      }

      try {
        window.localStorage.setItem(COLLECTION_AESTHETIC_STORAGE_KEY, confirmedAesthetic);
      } catch {
        // Ignore storage failures.
      }

      setCollectionAesthetic(confirmedAesthetic);
      setLockedCollectionAesthetic(confirmedAesthetic);
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
    setSelectedPieceImage,
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
          status: saturation.status,
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
  const resonanceDisplayColor = getResonanceScoreColor(resonancePulse, resonanceScore);

  /* ─── Select handler ──────────────────────────────────────────────────────── */
  const applyAestheticSelection = useCallback((aesthetic: string) => {
    const aestheticSlug = toAestheticSlug(aesthetic);
    setCurrentStageState("direction");
    setStageTransitionDirection(1);
    setIsReviewingDirectionSelection(false);
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
    setStep2StreamingRead({ core_read: '', execution_moves: [], guardrail: '' });
    step2RawRef.current = '';
    conceptLanguageRequestKeyRef.current = null;
    clearConceptInsight();
    setAestheticInput(aesthetic);
    setLockedCollectionAesthetic(aesthetic);
    setCollectionAesthetic(aesthetic);
    setIsAestheticSelectionUnlocked(false);
    try {
      window.localStorage.setItem(COLLECTION_AESTHETIC_STORAGE_KEY, aesthetic);
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
  }, [
    clearConceptInsight,
    computeAndSetResonance,
    identityPulse,
    lockConcept,
    setAestheticInput,
    setCollectionAesthetic,
    setConceptPalette,
    setConceptSilhouette,
    setDirectionInterpretationModifiers,
  ]);

  const handleSelectAesthetic = useCallback((aesthetic: string) => {
    if (isAestheticSelectorLocked) {
      if (aesthetic === selectedAesthetic) {
        setIsReviewingDirectionSelection(false);
        setCurrentStageState("direction");
        setStageTransitionDirection(-1);
        return;
      }
      setPendingAestheticChange(aesthetic);
      setShowAestheticChangeModal(true);
      return;
    }
    applyAestheticSelection(aesthetic);
  }, [applyAestheticSelection, isAestheticSelectorLocked, selectedAesthetic]);

  const handleBackToDirection = useCallback(() => {
    setIsReviewingDirectionSelection(true);
    setStageTransitionDirection(-1);
    setCurrentStageState("direction");
    setTimeout(() => { yourConceptRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
  }, []);

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

  const curatedRecommendations = useMemo(() => {
    const intentPayload = {
      tension_sliders: {
        trend_forward: sliderTrend,
        creative_expression: sliderCreative,
        elevated_design: sliderElevated,
        novelty: sliderNovelty,
      },
    };
    // Read intent sliders — default to 50 (neutral) if intentPayload is absent
    const ts = intentPayload?.tension_sliders;
    const trendForward = ts?.trend_forward ?? 50; // 75=trend, 25=timeless
    const creativeExpress = ts?.creative_expression ?? 50; // 75=creative, 25=commercial
    const novelty = ts?.novelty ?? 50; // 75=novelty, 25=continuity

    const candidates = [...AESTHETICS].map((aesthetic) => {
      const content = AESTHETIC_CONTENT[aesthetic];
      const entry = (aestheticsData as unknown as AestheticDataEntry[]).find((item) => item.name === aesthetic);
      return {
        aesthetic,
        descriptor: content?.description ?? "",
        identityScore: content?.identityScore ?? 0,
        resonanceScore: content?.resonanceScore ?? 0,
        saturationScore: entry?.saturation_score ?? 60,
        velocity: entry?.trend_velocity ?? "peak",
      };
    });

    const primary = candidates.find((candidate) => candidate.aesthetic === recommendedAesthetic) ?? candidates[0];
    const remaining = candidates.filter((candidate) => candidate.aesthetic !== primary?.aesthetic);
    // Commercial Anchor: favor identity alignment; boost further when intent leans commercial
    // commercial lean = creativeExpression < 50; timeless lean = trendForward < 50
    const commercialLean = (50 - creativeExpress) / 50; // -1..1, positive = commercial
    const timelessLean = (50 - trendForward) / 50; // -1..1, positive = timeless
    const anchor =
      remaining
        .slice()
        .sort((a, b) => {
          const velocityPenaltyA = timelessLean > 0
            ? timelessLean * (a.velocity === "emerging" || a.velocity === "ascending" ? 8 : 0)
            : 0;
          const velocityPenaltyB = timelessLean > 0
            ? timelessLean * (b.velocity === "emerging" || b.velocity === "ascending" ? 8 : 0)
            : 0;
          const anchorScoreA = a.identityScore + a.resonanceScore * 0.35
            + commercialLean * 6
            - velocityPenaltyA;
          const anchorScoreB = b.identityScore + b.resonanceScore * 0.35
            + commercialLean * 6
            - velocityPenaltyB;
          return anchorScoreB - anchorScoreA;
        })[0] ??
      remaining[0];
    const stretchPool = remaining.filter((candidate) => candidate.aesthetic !== anchor?.aesthetic);
    // Stretch Path: favor resonance + novelty; amplify when intent leans trend-forward or novel
    const noveltyLean = (novelty - 50) / 50; // -1..1, positive = novelty
    const trendLean = (trendForward - 50) / 50; // -1..1, positive = trend
    const stretch =
      stretchPool
        .slice()
        .sort((a, b) => {
          const lowSatBonusA = a.saturationScore <= 55 ? 10 : 0;
          const lowSatBonusB = b.saturationScore <= 55 ? 10 : 0;
          const velocityBonusA = trendLean > 0
            ? trendLean * (a.velocity === "emerging" ? 10 : a.velocity === "ascending" ? 5 : 0)
            : 0;
          const velocityBonusB = trendLean > 0
            ? trendLean * (b.velocity === "emerging" ? 10 : b.velocity === "ascending" ? 5 : 0)
            : 0;
          const stretchScoreA = a.resonanceScore
            + lowSatBonusA * (1 + noveltyLean * 0.5)
            + velocityBonusA
            - a.identityScore * 0.15;
          const stretchScoreB = b.resonanceScore
            + lowSatBonusB * (1 + noveltyLean * 0.5)
            + velocityBonusB
            - b.identityScore * 0.15;
          return stretchScoreB - stretchScoreA;
        })[0] ?? stretchPool[0];

    return [primary, anchor, stretch]
      .filter(Boolean)
      .map((candidate, index) => ({
        aesthetic: candidate!.aesthetic,
        role: (index === 0 ? "primary" : index === 1 ? "anchor" : "stretch") as RecommendationRole,
        descriptor: candidate!.descriptor,
        identityScore: candidate!.identityScore,
        resonanceScore: candidate!.resonanceScore,
        saturationScore: candidate!.saturationScore,
        velocity: candidate!.velocity,
        insight: buildRecommendationInsight({
          role: (index === 0 ? "primary" : index === 1 ? "anchor" : "stretch") as RecommendationRole,
          isRecommended: candidate!.aesthetic === recommendedAesthetic,
          identityScore: candidate!.identityScore,
          resonanceScore: candidate!.resonanceScore,
          saturationScore: candidate!.saturationScore,
        }),
      }))
      .filter((item, index, array) => array.findIndex((entry) => entry.aesthetic === item.aesthetic) === index) as DirectionRecommendation[];
  }, [recommendedAesthetic, sliderTrend, sliderCreative, sliderElevated, sliderNovelty]);
  const exploreDirections = useMemo(
    () => orderedDirections.filter((aesthetic) => !curatedRecommendations.some((recommendation) => recommendation.aesthetic === aesthetic)),
    [curatedRecommendations, orderedDirections]
  );
  const hoveredRecommendation = useMemo(() => {
    if (!hoveredCard) return null;
    const existing = curatedRecommendations.find((item) => item.aesthetic === hoveredCard);
    if (existing) return existing;
    const content = AESTHETIC_CONTENT[hoveredCard];
    const entry = (aestheticsData as unknown as AestheticDataEntry[]).find((item) => item.name === hoveredCard);
    if (!content || !entry) return null;
    return {
      aesthetic: hoveredCard,
      role: "stretch" as RecommendationRole,
      descriptor: content.description ?? "",
      identityScore: content.identityScore ?? 0,
      resonanceScore: content.resonanceScore ?? 0,
      saturationScore: entry.saturation_score ?? 60,
      velocity: entry.trend_velocity ?? "peak",
      insight: buildRecommendationInsight({
        role: "stretch",
        isRecommended: hoveredCard === recommendedAesthetic,
        identityScore: content.identityScore ?? 0,
        resonanceScore: content.resonanceScore ?? 0,
        saturationScore: entry.saturation_score ?? 60,
      }),
    };
  }, [curatedRecommendations, hoveredCard, recommendedAesthetic]);
  const selectedRecommendation = useMemo(() => {
    if (!selectedAesthetic) return null;
    const existing = curatedRecommendations.find((item) => item.aesthetic === selectedAesthetic);
    if (existing) return existing;
    const content = AESTHETIC_CONTENT[selectedAesthetic];
    const entry = (aestheticsData as unknown as AestheticDataEntry[]).find((item) => item.name === selectedAesthetic);
    if (!content || !entry) return null;
    return {
      aesthetic: selectedAesthetic,
      role: (selectedAesthetic === recommendedAesthetic ? "primary" : "stretch") as RecommendationRole,
      descriptor: content.description ?? "",
      identityScore: content.identityScore ?? 0,
      resonanceScore: content.resonanceScore ?? 0,
      saturationScore: entry.saturation_score ?? 60,
      velocity: entry.trend_velocity ?? "peak",
      insight: buildRecommendationInsight({
        role: (selectedAesthetic === recommendedAesthetic ? "primary" : "stretch") as RecommendationRole,
        isRecommended: selectedAesthetic === recommendedAesthetic,
        identityScore: content.identityScore ?? 0,
        resonanceScore: content.resonanceScore ?? 0,
        saturationScore: entry.saturation_score ?? 60,
      }),
    };
  }, [curatedRecommendations, recommendedAesthetic, selectedAesthetic]);
  const directionSelectionRead = useMemo(() => {
    return buildDirectionSelectionRead({
      recommendations: hoveredRecommendation
        ? [
            ...curatedRecommendations.filter((item) => item.aesthetic !== hoveredRecommendation.aesthetic),
            hoveredRecommendation,
          ]
        : curatedRecommendations,
      hoveredAesthetic: hoveredCard,
      strategySummary: conceptStrategySummary,
    });
  }, [conceptStrategySummary, curatedRecommendations, hoveredCard, hoveredRecommendation]);
  const clearDirectionBriefAnimation = useCallback(() => {
    directionBriefAnimationRunRef.current += 1;
    directionBriefTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    directionBriefTimeoutsRef.current = [];
  }, []);
  const runDirectionBriefAnimation = useCallback(async (headlineText: string, bodyText: string) => {
    clearDirectionBriefAnimation();
    const runId = directionBriefAnimationRunRef.current;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const timeoutId = window.setTimeout(() => resolve(), ms);
        directionBriefTimeoutsRef.current.push(timeoutId);
      });

    setDirectionBriefIsStreaming(true);
    setDirectionBriefStreamingHeadline("");
    setDirectionBriefStreamingBody("");
    setDirectionBriefHeadline(null);
    setMarketMoment(null);

    for (let index = 1; index <= headlineText.length; index += 1) {
      if (runId !== directionBriefAnimationRunRef.current) return;
      setDirectionBriefStreamingHeadline(headlineText.slice(0, index));
      await wait(headlineText[index - 1] === " " ? 10 : 18);
    }

    await wait(140);

    for (let index = 1; index <= bodyText.length; index += 1) {
      if (runId !== directionBriefAnimationRunRef.current) return;
      setDirectionBriefStreamingBody(bodyText.slice(0, index));
      await wait(bodyText[index - 1] === " " ? 8 : 12);
    }

    if (runId !== directionBriefAnimationRunRef.current) return;

    setDirectionBriefHeadline(headlineText);
    setMarketMoment(bodyText);
    setDirectionBriefStreamingHeadline("");
    setDirectionBriefStreamingBody("");
    setDirectionBriefIsStreaming(false);
  }, [clearDirectionBriefAnimation]);
  useEffect(() => {
    if (marketMomentRequestedRef.current || !marketMomentSeed || curatedRecommendations.length === 0) return;
    const bestFit = curatedRecommendations.find((item) => item.role === "primary")?.aesthetic ?? curatedRecommendations[0]?.aesthetic ?? "";
    const anchor = curatedRecommendations.find((item) => item.role === "anchor")?.aesthetic ?? curatedRecommendations[1]?.aesthetic ?? bestFit;
    const stretch = curatedRecommendations.find((item) => item.role === "stretch")?.aesthetic ?? curatedRecommendations[2]?.aesthetic ?? anchor;
    if (!bestFit) return;

    marketMomentRequestedRef.current = true;
    setDirectionBriefLoading(true);
    setDirectionBriefHeadline(null);
    setMarketMoment(null);
    setDirectionBriefStreamingHeadline("");
    setDirectionBriefStreamingBody("");
    setDirectionBriefIsStreaming(false);
    generateDirectionBrief({
      ...marketMomentSeed,
      intentGoals: intentGoals.join(", "),
      intentTradeoff,
      bestFit,
      anchor,
      stretch,
    })
      .then(async (result) => {
        setDirectionBriefLoading(false);
        if (result.headline.trim() && result.body.trim()) {
          await runDirectionBriefAnimation(result.headline.trim(), result.body.trim());
        }
      })
      .catch((marketMomentError) => {
        setDirectionBriefLoading(false);
        console.warn("[Muko] market moment generation failed:", marketMomentError);
      });
    return () => {
      clearDirectionBriefAnimation();
    };
  }, [clearDirectionBriefAnimation, curatedRecommendations, intentGoals, intentTradeoff, marketMomentSeed, runDirectionBriefAnimation]);

  /* ─── Muko Insight ────────────────────────────────────────────────────────── */
  const insightContent = useMemo(() => {
    const ae = selectedAesthetic ?? hoveredCard ?? curatedRecommendations[0]?.aesthetic ?? recommendedAesthetic;
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
  }, [combinedDirection, conceptPalette, conceptSilhouette, curatedRecommendations, hoveredCard, recommendedAesthetic, selectedAesthetic]);

  const canContinue = Boolean(selectedAesthetic) && Boolean(conceptSilhouette);
  const sohne = "var(--font-sohne-breit), system-ui, sans-serif";
  const inter = "var(--font-inter), system-ui, sans-serif";

  /* ─── Pulse rows ──────────────────────────────────────────────────────────── */
  const pulseRows = [
    { key: "identity", label: "Identity", icon: (c: string) => <IconIdentity size={14} color={c} />, infoCopy: "How well this direction aligns with your brand's established aesthetic and values. Measured against your Brand DNA — the keywords, price positioning, and creative tensions you set in onboarding. A high score means the direction feels like you. A low score means there's drift worth examining before you commit.", score: identityScore != null ? `${identityScore}` : "—", scoreNum: identityScore ?? 0, color: idStatus.color, chip: identityScore != null ? { variant: idStatus.color === PULSE_GREEN ? "green" as const : idStatus.color === PULSE_YELLOW ? "amber" as const : idStatus.color === PULSE_RED ? "red" as const : "amber" as const, status: idStatus.label } : null, subLabel: noBrandProfile ? "Complete Brand DNA setup to see identity scores" : idStatus.sublabel, what: `Identity measures how well this direction aligns with your brand DNA — keywords, aesthetic positioning, and customer profile. A high score means this direction reinforces who you already are. A low score signals tension that requires intentional navigation.`, how: `Keyword overlap between your brand profile and this direction's signals, weighted by conflict detection. Intentional tensions acknowledged in onboarding are factored in.`, pending: false },
    { key: "resonance", label: "Resonance", icon: (c: string) => <IconResonance size={14} color={c} />, infoCopy: "How much runway this direction has in the current market. Measured against trend saturation, category momentum, and how legible this concept is to your customer right now. High upside means the market has room for this. Crowding means you're entering a saturated conversation.", score: resonanceLoading ? "—" : resonanceScore != null ? `${resonanceScore}` : "—", scoreNum: resonanceLoading ? 0 : resonanceScore ?? 0, color: resonanceLoading ? "rgba(67,67,43,0.35)" : resonanceDisplayColor, chip: resonanceLoading ? { variant: "gray" as const, status: "Matching direction..." } : resonanceScore != null ? { variant: resStatus.color === PULSE_GREEN ? "green" as const : resStatus.color === PULSE_YELLOW ? "amber" as const : resStatus.color === PULSE_RED ? "red" as const : "amber" as const, status: resStatus.label } : null, subLabel: resonanceLoading ? "\u00A0" : resStatus.sublabel || "\u00A0", what: `Resonance measures market timing — the base market lane plus any lift coming from the piece signal you have chosen. High resonance means the window is open or still building. Peak saturation means the lane is crowded or late.`, how: `Base market state comes from a shared saturation model across concept and spec. Resonance score = 100 − saturation, with a 15-point penalty for declining velocity and a small piece-signal uplift when a key piece strengthens the commercial read.`, pending: false },
    { key: "execution", label: "Execution", icon: (c: string) => <IconExecution size={14} color={c} />, infoCopy: "Whether this collection can actually be delivered as designed. Measured against construction complexity, material lead times, and your available production window. A tight score means something needs to give — timeline, complexity, or both.", score: "—", scoreNum: 0, color: "rgba(67,67,43,0.35)", chip: null, subLabel: "Unlocks in Spec Studio", what: `Execution measures whether the physical product you're building is feasible given your timeline, materials, and construction complexity. It unlocks in Spec Studio once you define your product inputs.`, how: `Timeline buffer score based on material lead times and construction complexity relative to your season deadline. Negative buffer scores red. Margin gate applied as a 30% score penalty if COGS exceeds target.`, pending: true },
  ];
  const collapsedPulseInsight = useMemo(() => buildPulseMicroInsight({
    stage: "concept",
    identity: {
      score: identityPulse?.score,
      status: identityPulse?.status ?? null,
      pending: !identityPulse,
    },
    resonance: {
      score: resonanceScore,
      status: resonanceLoading ? "yellow" : resonancePulse?.status ?? null,
      pending: !resonancePulse || resonanceLoading,
      label: resonancePulse?.message ?? null,
    },
    execution: {
      pending: true,
    },
    context: {
      silhouetteSelected: Boolean(conceptSilhouette),
      paletteSelected: Boolean(conceptPalette),
    },
  }), [
    conceptPalette,
    conceptSilhouette,
    identityPulse,
    resonanceLoading,
    resonancePulse,
    resonanceScore,
  ]);
  const conceptCollapsedBadges = useMemo(() => {
    const getBadgeConfig = (score?: number | null) => {
      if (typeof score !== "number") {
        return {
          value: "Locked",
          background: "rgba(67,67,43,0.06)",
          color: "rgba(67,67,43,0.4)",
        };
      }

      if (score >= 70) {
        return {
          value: "Strong",
          background: "#eef1e3",
          color: "#43432B",
        };
      }

      if (score >= 50) {
        return {
          value: "Mixed",
          background: "#f5ede6",
          color: "#8B5E3C",
        };
      }

      return {
        value: "Weak",
        background: "#f5ede6",
        color: "#8B5E3C",
      };
    };

    return [
      {
        label: "Identity",
        ...getBadgeConfig(identityPulse?.score),
      },
      {
        label: "Resonance",
        ...getBadgeConfig(resonanceLoading ? null : resonanceScore),
      },
      {
        label: "Execution",
        value: "Locked",
        background: "rgba(67,67,43,0.06)",
        color: "rgba(67,67,43,0.4)",
      },
    ];
  }, [identityPulse?.score, resonanceLoading, resonanceScore]);

  /* ─── Top card chip data ──────────────────────────────────────────────────── */
  const topChips = getAestheticChips(topAesthetic);
  const topDisplayChips = useMemo(() => {
    if (!(selectedAesthetic && combinedDirection)) return [];

    return combinedDirection.signals
      .map((signal, index) => {
        const matchingChip = topChips.find((chip) => chip.label === signal.label);
        const chip = matchingChip ?? {
          label: signal.label,
          type: "mood" as const,
          material: null,
          silhouette: null,
          complexity_mod: 0,
          palette: null,
        };
        const chipKey = `${topAesthetic}::${chip.label}`;
        const isActive = selectedElements.has(chipKey);
        const isAutoSelected = chipMeta.get(chipKey)?.source === "key-piece";
        const priority = isAutoSelected ? 0 : isActive ? 1 : 2;

        return { chip, index, priority };
      })
      .sort((a, b) => a.priority - b.priority || a.index - b.index)
      .map(({ chip }) => chip);
  }, [chipMeta, combinedDirection, selectedAesthetic, selectedElements, topAesthetic, topChips]);
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
  const [showAllExpressionSignals, setShowAllExpressionSignals] = useState(false);
  const requestedStage = useMemo<ConceptStageId | null>(() => {
    const stageParam = searchParams.get("stage");
    return isConceptStageId(stageParam) ? stageParam : null;
  }, [searchParams]);
  const [currentStageState, setCurrentStageState] = useState<ConceptStageId>(requestedStage ?? "direction");
  const [stageTransitionDirection, setStageTransitionDirection] = useState<1 | -1>(1);
  const isSubsequentPiece = collectionPieces.length > 0 || Object.keys(pieceRolesById).length > 0;
  const visibleInterpretationSuggestions = showAllInterpretationSuggestions ? interpretationSuggestions : interpretationSuggestions.slice(0, 4);
  const hiddenInterpretationSuggestionCount = Math.max(interpretationSuggestions.length - visibleInterpretationSuggestions.length, 0);
  useEffect(() => {
    setShowAllExpressionSignals(false);
  }, [selectedAesthetic, aestheticInflection, selectedInterpretationChips, topDisplayChips.length]);
  const visibleSignals = showAllExpressionSignals ? topDisplayChips : topDisplayChips.slice(0, 9);
  const hiddenSignalCount = Math.max(topDisplayChips.length - visibleSignals.length, 0);
  const expressionSelectionCount = topDisplayChips.reduce((count, chip) => {
    const chipKey = `${topAesthetic}::${chip.label}`;
    return selectedElements.has(chipKey) ? count + 1 : count;
  }, 0);
  const highestAvailableStage: ConceptStageId = canAdvanceToStage3 ? "product" : canAdvanceToStage2 ? "language" : "direction";
  const currentStage: ConceptStageId =
    currentStageState === "product" && !canAdvanceToStage3 && !isSubsequentPiece
      ? highestAvailableStage
      : currentStageState === "language" && !canAdvanceToStage2 && !isSubsequentPiece
      ? "direction"
      : currentStageState;
  useEffect(() => {
    if (!requestedStage) return;
    setCurrentStageState(requestedStage);
  }, [requestedStage]);
  const isStep3ProductStage = currentStage === "product";
  const step3PulseReferenceLabel = selectedAesthetic ? `Concept locked · ${selectedAesthetic}` : null;
  const shouldLoadConceptLanguageRead = currentStage === "language" || currentStage === "product";

  useEffect(() => {
    if (!shouldLoadConceptLanguageRead || !selectedAesthetic || !conceptLanguageRequestKey) return;
    if (conceptLanguageRequestKeyRef.current === conceptLanguageRequestKey) return;

    conceptLanguageRequestKeyRef.current = conceptLanguageRequestKey;
    conceptLanguageAbortRef.current?.abort();
    conceptLanguageAbortRef.current = new AbortController();
    const controller = conceptLanguageAbortRef.current;

    const run = async () => {
      setStep2ReadLoading(true);
      setStep2StreamingText('');
      setStep2StreamingRead({ core_read: '', execution_moves: [], guardrail: '' });
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
            strategy_summary: conceptStrategySummary,
            brand_interpretation: storeDirectionInterpretationText?.trim() || interpretationSummary || null,
            selected_silhouettes: conceptSilhouette ? [getConceptSilhouetteLabel(conceptSilhouette)] : [],
            selected_palette: activePaletteName ?? null,
            collection_language: selectedCollectionLanguage,
            expression_signals: selectedExpressionSignals,
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
              setStep2StreamingRead({
                core_read: extractPartialJsonString(acc, 'core_read'),
                execution_moves: extractPartialJsonStringArray(acc, 'execution_moves'),
                guardrail: extractPartialJsonString(acc, 'guardrail'),
              });
            } catch { /* ignore partial parse errors */ }
          } else if (event === 'complete') {
            try {
              const result = JSON.parse(data) as ConceptLanguageRead;
              if (!controller.signal.aborted) {
                setStep2ReadData(result);
                setStep2StreamingText('');
                setStep2StreamingRead({ core_read: '', execution_moves: [], guardrail: '' });
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
          setStep2StreamingRead({ core_read: '', execution_moves: [], guardrail: '' });
        }
      }
    };

    run();

    return () => {
      conceptLanguageAbortRef.current?.abort();
      conceptLanguageRequestKeyRef.current = null;
      setStep2ReadLoading(false);
    };
  }, [
    brandKeywordSource,
    brandProfile3?.brand_name,
    brandProfile3?.customer_profile,
    brandProfile3?.price_tier,
    brandProfile3?.tension_context,
    brandProfileName,
    conceptLanguageRequestKey,
    conceptSilhouette,
    conceptStrategySummary,
    customerProfile,
    excludedBrands,
    interpretationSummary,
    referenceBrands,
    selectedAesthetic,
    selectedCollectionLanguage,
    selectedExpressionSignals,
    shouldLoadConceptLanguageRead,
    storeDirectionInterpretationText,
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
    { id: "direction" as const, label: "Set the Point of View", helper: "Claim the direction through a brand-owned angle." },
    { id: "language" as const, label: "Translate into Product", helper: "Carry the point of view into silhouette, palette, and signals." },
    { id: "product" as const, label: "Build Product Expression", helper: "Evaluate pieces one by one and assign their role in the assortment." },
  ];
  const conceptStepperSteps = [
    { id: "language" as const, label: "Language" },
    { id: "product" as const, label: "Product" },
  ];
  const completedStages = {
    direction: canAdvanceToStage2,
    language: canAdvanceToStage3,
    product: canLockDirection,
  };
  const collectionBalanceContext: CollectionBalanceContext = useMemo(() => {
    const roleCounts: Record<string, number> = {};
    const categoryMap = new Map<string, number>();
    const complexityMap = new Map<string, number>();
    // Balance context reflects only fully built pieces (Supabase) — not session-only selections.
    collectionPieces.forEach((p) => {
      if (p.collection_role) roleCounts[p.collection_role] = (roleCounts[p.collection_role] ?? 0) + 1;
      const category = p.category ?? "unspecified";
      const tier = p.construction_tier ?? "unspecified";
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + 1);
      complexityMap.set(tier, (complexityMap.get(tier) ?? 0) + 1);
    });
    return {
      totalPieceCount: collectionPieces.length,
      assignedRoleCount: collectionPieces.filter((p) => p.collection_role).length,
      heroAssigned: collectionPieces.some((p) => p.collection_role === "hero"),
      roleCounts,
      categoryBreakdown: Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      complexityBreakdown: Array.from(complexityMap.entries())
        .map(([tier, count]) => ({ tier, count }))
        .sort((a, b) => b.count - a.count),
    };
  }, [collectionPieces]);
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
        const collectionExpressionSignals = Array.from(selectedElements)
          .filter((key) => key.startsWith(`${topAesthetic}::`))
          .map((key) => key.replace(`${topAesthetic}::`, ""))
          .filter((value) => Boolean(value.trim()));
        const pieceWithPromptFields = targetEntry.piece as KeyPiece & {
          material?: string | null;
          construction?: string | null;
          construction_tier?: string | null;
        };
        const assignedRole = pieceRolesById[targetEntry.piece.item] ?? null;
        const pieceBuildExpression =
          pieceBuildContext &&
          (
            pieceBuildContext.adaptedTitle === targetEntry.piece.item ||
            pieceBuildContext.originalLabel === targetEntry.piece.item
          )
            ? pieceBuildContext.expression?.trim()
            : null;
        const derivedCustomSignal =
          targetEntry.piece.custom
            ? [
                pieceBuildExpression,
                ...collectionExpressionSignals,
              ].find((value): value is string => Boolean(value?.trim())) ?? null
            : null;

        const response = await fetch("/api/piece-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            piece: {
              item: targetEntry.piece.item,
              type: targetEntry.piece.type ?? "",
              signal: targetEntry.piece.signal ?? derivedCustomSignal ?? "unknown",
              note: targetEntry.piece.note ?? "",
              bucket: getPieceReadBucket(
                assignedRole,
                targetEntry.recommendation?.bucket ?? null
              ),
              category: targetEntry.piece.category ?? undefined,
              material: pieceWithPromptFields.material?.trim() || undefined,
              construction:
                pieceWithPromptFields.construction?.trim() ||
                pieceWithPromptFields.construction_tier?.trim() ||
                undefined,
            },
            context: {
              aestheticName: selectedAesthetic ?? combinedDirection?.dnaLines[0] ?? "this direction",
              season: season || undefined,
              silhouetteLabel: getConceptSilhouetteLabel(conceptSilhouette),
              paletteName: activePaletteName ?? "unknown",
              resonanceScore: resonanceScore ?? null,
              interpretationSummary: interpretationSummary || null,
              collectionDirection: selectedAesthetic ?? null,
              collectionLanguage: selectedInterpretationChips,
              expressionSignals: collectionExpressionSignals,
              priorities: intentGoals,
              tradeoffs: {
                trend_exposure: getStrategySliderLabel(sliderTrend, ["low", "balanced", "high"]),
                expression: getStrategySliderLabel(sliderCreative, ["restrained", "balanced", "assertive"]),
                value: getStrategySliderLabel(sliderElevated, ["accessible", "balanced", "premium"]),
                innovation: getStrategySliderLabel(sliderNovelty, ["continuity-aware", "balanced", "novelty-led"]),
              },
              commercial: {
                target_msrp: typeof storeTargetMsrp === "number" && storeTargetMsrp > 0 ? storeTargetMsrp : null,
                margin: typeof storeTargetMargin === "number" && storeTargetMargin > 0 ? storeTargetMargin : null,
                cost_ceiling:
                  typeof storeTargetMsrp === "number" &&
                  typeof storeTargetMargin === "number" &&
                  storeTargetMsrp > 0 &&
                  storeTargetMargin > 0
                    ? Math.round(storeTargetMsrp * (1 - storeTargetMargin / 100))
                    : null,
              },
              isStartingPiece,
              existingPieces: Object.entries(pieceRolesById)
                .filter(([name]) => name !== targetEntry.piece.item)
                .map(([name, roleId]) => {
                  const allPieces = [...keyPieces, ...customProductPieces];
                  const found = allPieces.find((p) => p.item === name);
                  return {
                    name,
                    role: ({ hero: 'Hero', 'volume-driver': 'Volume Driver', 'core-evolution': 'Core Evolution', directional: 'Directional Signal' } as Record<string, string>)[roleId] ?? roleId,
                    category: found?.category ?? '',
                  };
                }),
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
              setPieceStreamingTitle(extractPartialJsonString(acc, 'headline'));
              setPieceStreamingBody(extractPartialJsonString(acc, 'core_read'));
            } catch { /* ignore partial parse errors */ }
          } else if (event === 'complete') {
            try {
              const result = JSON.parse(data) as ProductPieceRead;
              if (!controller.signal.aborted) {
                setActivePieceRead({
                  headline: result.headline ?? fallback.headline,
                  core_read: result.core_read ?? fallback.core_read,
                  move_that_matters: result.move_that_matters ?? fallback.move_that_matters,
                  start_here: result.start_here ?? fallback.start_here,
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
    intentGoals,
    interpretationSummary,
    resonanceScore,
    season,
    selectedAesthetic,
    selectedElements,
    selectedInterpretationChips,
    sliderCreative,
    sliderElevated,
    sliderNovelty,
    sliderTrend,
    storeTargetMargin,
    storeTargetMsrp,
    suggestedStartingPieceEntry,
    topAesthetic,
    pieceBuildContext,
    pieceRolesById,
  ]);
  const activeStrategicImplication = useMemo(
    () =>
      activeProductPieceEntry
        ? buildStrategicImplication(activeProductPieceEntry, productSuggestionOptions, collectionBalanceContext)
        : null,
    [activeProductPieceEntry, productSuggestionOptions, collectionBalanceContext]
  );
  const stageAwareHeadline =
    currentStage === "product"
      ? activePieceRead?.headline || pieceStreamingTitle || buildProductPieceReadFallback(activeProductPieceEntry?.piece.item ?? suggestedStartingPieceEntry?.piece.item ?? "Opening Piece").headline
      : currentStage === "language"
      ? step2ReadData?.headline ?? `Translate ${combinedDirection?.dnaLines[0] ?? selectedAesthetic ?? recommendedAesthetic} into disciplined product language.`
      : !selectedAesthetic
      ? directionBriefHeadline ?? directionSelectionRead.headline
      : step1ReadData?.statements[0] ?? insightContent.headline;
  const stageAwareParagraphs =
    currentStage === "product"
      ? [
          activePieceRead?.core_read || pieceStreamingBody || "",
          activePieceRead?.move_that_matters ? `Balance: ${activePieceRead.move_that_matters}` : "",
          activePieceRead?.start_here ? `Start Here: ${activePieceRead.start_here}` : "",
        ].filter(Boolean)
      : currentStage === "language"
      ? []
      : !selectedAesthetic
      ? marketMoment
        ? []
        : directionSelectionRead.paragraphs
      : step1ReadData
      ? [step1ReadData.statements[1] ?? "", step1ReadData.statements[2] ?? ""].filter(Boolean)
      : [insightContent.p1, insightContent.p2, insightContent.p3];
  const navigateStage = useCallback(
    (nextStage: ConceptStageId) => {
      const currentIndex = getStageIndex(currentStage);
      const nextIndex = getStageIndex(nextStage);
      const highestIndex = getStageIndex(highestAvailableStage);
      if (nextIndex > highestIndex) return;
      setIsReviewingDirectionSelection(false);
      setStageTransitionDirection(nextIndex > currentIndex ? 1 : -1);
      setCurrentStageState(nextStage);
    },
    [currentStage, highestAvailableStage]
  );
  const applyInterpretationSuggestion = useCallback((suggestion: string) => {
    setChipsDraft([suggestion]);
    setInflectionDraft(suggestion);
    setSuggestionFillPulse((value) => value + 1);
  }, []);
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
  const collectionContextTopOffset = selectedAesthetic
    ? 72 + COLLECTION_CONTEXT_BAR_OFFSET
    : 72 + COLLECTION_READ_BAR_OFFSET;
  const preClickMarketMoment = !selectedAesthetic ? (marketMoment ?? undefined) : undefined;
  const showDirectionSelection = !selectedAesthetic || isReviewingDirectionSelection;
  const showPointOfViewStage =
    Boolean(selectedAesthetic) && currentStage === "direction" && !isReviewingDirectionSelection;
  const handleContinueToSpecs = useCallback(async () => {
    if (!canLockDirection || !selectedAesthetic) return;
    if (!heroAssignedPieceId) {
      const shouldContinue = window.confirm("You haven't assigned a Hero role yet. Continue anyway?");
      if (!shouldContinue) return;
    }
    await handleConfirmDirection();
    persistLockedCollectionContext();
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
    persistLockedCollectionContext,
    router,
    selectedAesthetic,
    selectedInterpretationChips,
    setCurrentStep,
    topMoodboardImages,
  ]);

  const handleLockAndStartPieces = useCallback(async () => {
    if (!canAdvanceToStage3 || !selectedAesthetic) return;
    await handleConfirmDirection();
    persistLockedCollectionContext();
    useSessionStore.setState({
      aestheticMatchedId: selectedAesthetic,
      moodboardImages: topMoodboardImages,
      conceptSilhouette,
      conceptPalette,
      directionInterpretationText: aestheticInflection.trim(),
      directionInterpretationModifiers: combinedDirection?.modifierLabels ?? [],
      directionInterpretationChips: selectedInterpretationChips,
    });
    trackEvent(null, "step_completed", {
      from_step: "setup",
      to_step: "pieces",
      collection_id: useSessionStore.getState().activeCollection || useSessionStore.getState().collectionName || null,
    });
    setCurrentStep(3);
    router.push('/pieces');
  }, [
    aestheticInflection,
    canAdvanceToStage3,
    combinedDirection?.modifierLabels,
    conceptPalette,
    conceptSilhouette,
    handleConfirmDirection,
    persistLockedCollectionContext,
    router,
    selectedAesthetic,
    selectedInterpretationChips,
    setCurrentStep,
    topMoodboardImages,
  ]);

  const handleSaveAndClose = useCallback(async () => {
    const resolvedCollectionName = storeCollectionName.trim() || headerCollectionName.trim();
    const resolvedSeasonLabel = season?.trim() || headerSeasonLabel.trim();

    if (selectedAesthetic) {
      await handleConfirmDirection();
      persistLockedCollectionContext();
      useSessionStore.setState({
        activeCollection: resolvedCollectionName || useSessionStore.getState().activeCollection,
        collectionName: resolvedCollectionName || useSessionStore.getState().collectionName,
        season: resolvedSeasonLabel || useSessionStore.getState().season,
        aestheticMatchedId: selectedAesthetic,
        moodboardImages: topMoodboardImages,
        conceptSilhouette,
        conceptPalette,
        directionInterpretationText: aestheticInflection.trim(),
        directionInterpretationModifiers: combinedDirection?.modifierLabels ?? [],
        directionInterpretationChips: selectedInterpretationChips,
      });
    }

    try {
      if (resolvedCollectionName) {
        localStorage.setItem('muko_collectionName', resolvedCollectionName);
      }
      if (resolvedSeasonLabel) {
        localStorage.setItem('muko_seasonLabel', resolvedSeasonLabel);
      }
    } catch {}

    if (resolvedCollectionName) {
      router.push(`/collections?collection=${encodeURIComponent(resolvedCollectionName)}`);
      return;
    }

    const activeCollection = useSessionStore.getState().activeCollection;
    if (activeCollection) {
      router.push(`/collections?collection=${encodeURIComponent(activeCollection)}`);
    } else {
      router.push('/collections');
    }
  }, [
    aestheticInflection,
    combinedDirection?.modifierLabels,
    conceptPalette,
    conceptSilhouette,
    handleConfirmDirection,
    headerCollectionName,
    headerSeasonLabel,
    persistLockedCollectionContext,
    router,
    season,
    selectedAesthetic,
    selectedInterpretationChips,
    storeCollectionName,
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

      <MukoNav
        activeTab="setup"
        setupComplete={false}
        piecesComplete={false}
        collectionName={headerCollectionName}
        seasonLabel={headerSeasonLabel}
        onBack={() => window.history.back()}
        onSaveClose={() => {
          void handleSaveAndClose();
        }}
      />

      {selectedAesthetic ? (
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
            strategySummary={effectiveConceptBarSummary}
            collectionName={headerCollectionName}
            season={headerSeasonLabel}
            direction={selectedAesthetic ?? undefined}
            pointOfView={aestheticInflection || undefined}
            collectionLanguage={selectedCollectionLanguage}
            silhouette={conceptSilhouette ? getConceptSilhouetteLabel(conceptSilhouette) : undefined}
            palette={activePaletteName ?? undefined}
            expressionSignals={selectedExpressionSignals}
            moodboardImages={topMoodboardImages}
            action={
              <button
                onClick={handleBackToDirection}
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
              >
                Review direction
              </button>
            }
          />
        </div>
      ) : (
        <CollectionReadBar
          collectionName={headerCollectionName}
          season={headerSeasonLabel}
          summary={conceptStrategyRead.text}
          stage={conceptStrategyRead.stage}
          stickyTop={72}
          isSticky
          chips={intentGoals.length > 0 ? intentGoals : undefined}
          onEditSetup={() => router.push("/intent")}
        />
      )}

      {/* ── Two-column body ───────────────────────────────────────────────────── */}
      <ResizableSplitPanel
        defaultLeftPercent={50}
        storageKey="muko_concept_splitPanel"
        topOffset={collectionContextTopOffset}
        leftContent={
          <>
          <div style={{ padding: "0 44px 48px" }}>
            <div style={{ padding: "2px 0 20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
              <div>
                <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#888078", marginBottom: 10 }}>
                  Concept Studio
                </div>
                <h1 style={{ margin: 0, fontFamily: sohne, fontWeight: 500, fontSize: 32, color: OLIVE, letterSpacing: "-0.04em", lineHeight: 0.98, maxWidth: 720 }}>
                  Choose the lens
                </h1>
                <p style={{ margin: "12px 0 0", fontFamily: inter, fontSize: 13.5, color: "rgba(67,67,43,0.56)", lineHeight: 1.62, maxWidth: 620 }}>
                  Start inside Muko&apos;s strongest frame, then move outside it only if you want a different creative risk profile.
                </p>
              </div>
            </div>

            {selectedAesthetic && !isReviewingDirectionSelection && (
              <>
                <div ref={yourConceptRef} />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    marginBottom: 38,
                  }}
                >
                  {conceptStepperSteps.map((step, index) => {
                    const isActive =
                      step.id === "language"
                        ? currentStage === "direction"
                        : currentStage === "language" || currentStage === "product";

                    return (
                    <React.Fragment key={step.id}>
                      <div
                        style={{
                          fontFamily: inter,
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          color: isActive ? TEXT : MUTED,
                        }}
                      >
                        {step.label}
                      </div>
                      {index < conceptStepperSteps.length - 1 && (
                        <div style={{ width: 34, height: 1, background: "rgba(67,67,43,0.12)" }} />
                      )}
                    </React.Fragment>
                    );
                  })}
                </div>

                <div
                  style={{
                    position: "relative",
                    minHeight: currentStage === "direction" ? "auto" : "clamp(560px, calc(100vh - 320px), 760px)",
                    display: "flex",
                    alignItems: currentStage === "product" ? "stretch" : "center",
                  }}
                >
                  <AnimatePresence mode="wait" custom={stageTransitionDirection}>
                    <motion.div
                      key={currentStage}
                      custom={stageTransitionDirection}
                      variants={stageTransitionProps}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      style={{
                        width: "100%",
                        padding: "8px 0 28px",
                      }}
                    >
                      {showPointOfViewStage && (
                        <>
                          <div style={{ paddingTop: 12, marginBottom: 28 }}>
                            <div style={{ fontFamily: sohne, fontSize: 24, fontWeight: 500, color: OLIVE, marginBottom: 8, letterSpacing: "-0.03em" }}>
                              Set the Point of View
                            </div>
                            <div style={{ fontFamily: inter, fontSize: 13.5, color: "rgba(67,67,43,0.56)", lineHeight: 1.62, maxWidth: 500 }}>
                              Write the defining line for how your brand should hold this direction. Muko recalibrates the read as the phrasing sharpens.
                            </div>
                          </div>

                          <div style={{ marginBottom: 34, maxWidth: 720 }}>
                            <div
                              style={{
                                position: "relative",
                                padding: "6px 0 10px",
                                borderBottom: isInflectionSettling ? "1px solid rgba(125,150,172,0.28)" : "1px solid rgba(67,67,43,0.10)",
                                background: "linear-gradient(180deg, rgba(250,249,246,0) 0%, rgba(255,255,255,0.36) 100%)",
                                boxShadow: isInflectionSettling ? "0 16px 30px rgba(67,67,43,0.05)" : "none",
                                transition: "border-color 180ms ease, box-shadow 220ms ease",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 6 }}>
                                <span style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#888078" }}>
                                  Point of View
                                </span>
                                <motion.span
                                  initial={false}
                                  animate={{
                                    opacity: isInflectionSettling ? 1 : loadingInflectionSuggestions ? 0.6 : 0.34,
                                  }}
                                  style={{
                                    fontFamily: inter,
                                    fontSize: 10.5,
                                    letterSpacing: "0.02em",
                                    color: "rgba(67,67,43,0.52)",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {isInflectionSettling ? "Muko is recalibrating" : "Shapes Muko's read live"}
                                </motion.span>
                              </div>
                              <motion.div
                                key={suggestionFillPulse}
                                initial={false}
                                animate={suggestionFillPulse > 0 ? { opacity: [0.82, 1], y: [2, 0] } : { opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, ease: [0.22, 0.8, 0.2, 1] }}
                              >
                                <input
                                  type="text"
                                  className="point-of-view-input"
                                  value={inflectionDraft}
                                  onChange={(e) => {
                                    setInflectionDraft(e.target.value.slice(0, 100));
                                    setChipsDraft([]);
                                  }}
                                  maxLength={100}
                                  aria-label="Set the point of view"
                                  placeholder="with restrained romantic detail"
                                  style={{
                                    width: "100%",
                                    boxSizing: "border-box",
                                    padding: "0 0 2px",
                                    fontSize: 28,
                                    lineHeight: 1.22,
                                    border: "none",
                                    background: "transparent",
                                    color: OLIVE,
                                    fontFamily: sohne,
                                    letterSpacing: "-0.035em",
                                    outline: "none",
                                  }}
                                />
                              </motion.div>
                              <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                <div style={{ fontFamily: inter, fontSize: 11.5, color: "rgba(67,67,43,0.42)", lineHeight: 1.5 }}>
                                  Keep it concise, authored, and directional.
                                </div>
                                <div style={{ fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.34)", whiteSpace: "nowrap" }}>
                                  {inflectionDraft.trim().length}/100
                                </div>
                              </div>
                            </div>
                            <div style={{ marginTop: 14 }}>
                              <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, color: "#888078", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
                                Try a direction
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {visibleInterpretationSuggestions.map((suggestion) => {
                                  const isSelected = chipsDraft.includes(suggestion) || inflectionDraft.trim().toLowerCase() === suggestion.trim().toLowerCase();
                                  return (
                                    <motion.button
                                      key={suggestion}
                                      type="button"
                                      onClick={() => applyInterpretationSuggestion(suggestion)}
                                      whileHover={{ scale: 1 }}
                                      whileTap={{ scale: 0.98 }}
                                      style={{
                                        height: 30,
                                        padding: "0 12px",
                                        borderRadius: 999,
                                        border: isSelected ? "1px solid rgba(125,150,172,0.34)" : "1px solid rgba(67,67,43,0.08)",
                                        background: isSelected
                                          ? "linear-gradient(180deg, rgba(125,150,172,0.16) 0%, rgba(125,150,172,0.09) 100%)"
                                          : "rgba(255,255,255,0.56)",
                                        boxShadow: isSelected ? "inset 0 1px 0 rgba(255,255,255,0.48)" : "inset 0 1px 0 rgba(255,255,255,0.3)",
                                        color: isSelected ? OLIVE : "rgba(67,67,43,0.72)",
                                        fontFamily: inter,
                                        fontSize: 12,
                                        fontWeight: isSelected ? 600 : 500,
                                        letterSpacing: "0.01em",
                                        cursor: "pointer",
                                        opacity: isSelected ? 1 : 0.78,
                                        transition: "opacity 180ms ease, background-color 180ms ease, border-color 180ms ease, color 180ms ease",
                                      }}
                                    >
                                      {suggestion}
                                    </motion.button>
                                  );
                                })}
                                {showAllInterpretationSuggestions && hiddenInterpretationSuggestionCount === 0 && interpretationSuggestions.length > 4 && (
                                  <motion.button
                                    type="button"
                                    onClick={() => setShowAllInterpretationSuggestions(false)}
                                    whileHover={{ scale: 1 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                      height: 30,
                                      padding: "0 12px",
                                      borderRadius: 999,
                                      border: "1px solid rgba(67,67,43,0.08)",
                                      background: "rgba(255,255,255,0.36)",
                                      color: "rgba(67,67,43,0.56)",
                                      fontFamily: inter,
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      opacity: 0.72,
                                      transition: "opacity 180ms ease, background-color 180ms ease, border-color 180ms ease, color 180ms ease",
                                    }}
                                  >
                                    Show less
                                  </motion.button>
                                )}
                                {!showAllInterpretationSuggestions && hiddenInterpretationSuggestionCount > 0 && (
                                  <motion.button
                                    type="button"
                                    onClick={() => setShowAllInterpretationSuggestions(true)}
                                    whileHover={{ scale: 1 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                      height: 30,
                                      padding: "0 12px",
                                      borderRadius: 999,
                                      border: "1px solid rgba(67,67,43,0.08)",
                                      background: "rgba(255,255,255,0.36)",
                                      color: "rgba(67,67,43,0.58)",
                                      fontFamily: inter,
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      opacity: 0.72,
                                      transition: "opacity 180ms ease, background-color 180ms ease, border-color 180ms ease, color 180ms ease",
                                    }}
                                  >
                                    +{hiddenInterpretationSuggestionCount} more
                                  </motion.button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <button
                              onClick={handleBackToDirection}
                              style={{
                                padding: "12px 18px",
                                borderRadius: 999,
                                border: "1px solid rgba(67,67,43,0.14)",
                                background: "transparent",
                                color: "rgba(67,67,43,0.62)",
                                fontFamily: sohne,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Back to Direction
                            </button>
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
                              Continue to Product →
                            </button>
                          </div>
                        </>
                      )}

                      {currentStage === "language" && (
                        <>
                          <div style={{ paddingTop: 12, marginBottom: 30 }}>
                            <div style={{ fontFamily: sohne, fontSize: 24, fontWeight: 500, color: OLIVE, marginBottom: 8, letterSpacing: "-0.03em" }}>
                              Translate into Product
                            </div>
                            <div style={{ fontFamily: inter, fontSize: 13.5, color: "rgba(67,67,43,0.56)", lineHeight: 1.62, maxWidth: 520 }}>
                              {isSubsequentPiece
                                ? "This collection language is already set. Move into the pieces."
                                : `Shape how ${aestheticInflection.trim() || "this direction"} shows up across silhouette, color, and expression.`}
                            </div>
                          </div>

                          {isSubsequentPiece ? (
                            <>
                              <div style={{ marginBottom: 38 }}>
                                <div style={{ marginBottom: 14 }}>
                                  <div style={{ fontFamily: sohne, fontSize: 18, fontWeight: 500, color: OLIVE, letterSpacing: "-0.03em", marginBottom: 4 }}>
                                    Silhouette
                                  </div>
                                  <div style={{ fontFamily: inter, fontSize: 12.5, color: "rgba(67,67,43,0.52)", lineHeight: 1.55 }}>
                                    The anchor proportion is already set for this collection.
                                  </div>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                                  {orderedSilhouettes.map((sil) => {
                                    const isSel = conceptSilhouette === sil.id;
                                    const isAffinity = selectedAestheticData?.silhouette_affinity?.includes(sil.id) ?? false;
                                    return (
                                      <div
                                        key={sil.id}
                                        style={{
                                          textAlign: "left",
                                          borderRadius: 999,
                                          padding: "18px 18px 16px",
                                          background: isSel ? "linear-gradient(180deg, rgba(248,245,238,0.96) 0%, rgba(255,255,255,0.94) 100%)" : "rgba(255,255,255,0.58)",
                                          border: isSel ? "1px solid rgba(168,180,117,0.48)" : isAffinity ? "1px solid rgba(168,180,117,0.18)" : "1px solid rgba(67,67,43,0.08)",
                                          boxShadow: isSel ? "0 18px 36px rgba(67,67,43,0.08)" : "none",
                                          cursor: "default",
                                          opacity: isSel ? 1 : 0.58,
                                        }}
                                      >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                                          <div style={{ fontSize: 18, fontWeight: 500, color: "#191919", fontFamily: sohne, letterSpacing: "-0.02em" }}>
                                            {sil.name}
                                          </div>
                                          {isSel && (
                                            <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: CHARTREUSE }}>
                                              Selected
                                            </div>
                                          )}
                                        </div>
                                        <div style={{ fontSize: 12, color: "rgba(67,67,43,0.60)", fontFamily: inter, marginTop: 6, lineHeight: 1.6, maxWidth: 220 }}>
                                          {sil.descriptor}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {selectedAestheticData?.palette_options && selectedAestheticData.palette_options.length > 0 && (
                                <div style={{ marginBottom: 34 }}>
                                  <div style={{ marginBottom: 12 }}>
                                    <div style={{ fontFamily: sohne, fontSize: 18, fontWeight: 500, color: OLIVE, letterSpacing: "-0.02em", marginBottom: 4 }}>
                                      Palette
                                    </div>
                                    <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.48)", lineHeight: 1.55 }}>
                                      The color register supporting the silhouette.
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {orderedPaletteOptions.map((pal) => {
                                      const isSel = conceptPalette === pal.id;
                                      const isAffinity = selectedAestheticData?.palette_affinity?.includes(pal.id) ?? false;
                                      return (
                                        <div
                                          key={pal.id}
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 14,
                                            padding: "14px 16px",
                                            borderRadius: 999,
                                            background: isSel ? "rgba(248,245,238,0.92)" : "rgba(255,255,255,0.52)",
                                            border: isSel ? "1px solid rgba(168,180,117,0.42)" : isAffinity ? "1px solid rgba(168,180,117,0.16)" : "1px solid rgba(67,67,43,0.07)",
                                            cursor: "default",
                                            opacity: isSel ? 1 : 0.62,
                                          }}
                                        >
                                          <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                                            {pal.swatches.slice(0, 6).map((hex, i) => (
                                              <div key={i} style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: hex, border: "1px solid rgba(0,0,0,0.08)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)" }} />
                                            ))}
                                          </div>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                              <span style={{ fontFamily: sohne, fontSize: 16, fontWeight: 500, color: "#191919", letterSpacing: "-0.02em" }}>
                                                {pal.name}
                                              </span>
                                              {isSel && (
                                                <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: CHARTREUSE }}>
                                                  Selected
                                                </span>
                                              )}
                                            </div>
                                            <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.56)", lineHeight: 1.6, marginTop: 3 }}>
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
                                  <div style={{ marginBottom: 12 }}>
                                    <div style={{ fontFamily: sohne, fontSize: 18, fontWeight: 500, color: OLIVE, letterSpacing: "-0.02em", marginBottom: 4 }}>
                                      Expression
                                    </div>
                                    <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.48)", lineHeight: 1.55 }}>
                                      The final signals carrying the collection read.
                                    </div>
                                  </div>
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                                    {visibleSignals.map((chip) => {
                                      const chipKey = `${topAesthetic}::${chip.label}`;
                                      const isActive = selectedElements.has(chipKey);
                                      const meta = chipMeta.get(chipKey);
                                      const isAutoSelected = meta?.source === 'key-piece';
                                      return (
                                        <div
                                          key={chip.label}
                                          style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            gap: 12,
                                            padding: "12px 0",
                                            borderBottom: "1px solid rgba(67,67,43,0.08)",
                                            opacity: isActive ? 1 : 0.54,
                                          }}
                                        >
                                          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: inter, fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? DEEP_BROWN : "rgba(67,67,43,0.58)" }}>
                                            <span style={{ color: isActive ? DEEP_BROWN : "rgba(67,67,43,0.38)" }}>
                                              <ContextBarSignalIcon />
                                            </span>
                                            <span>{chip.label}</span>
                                          </span>
                                          <span style={{ fontFamily: inter, fontSize: 10.5, color: "rgba(67,67,43,0.38)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                            {isAutoSelected ? "Auto" : isActive ? "Selected" : "Quiet"}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {hiddenSignalCount > 0 && (
                                    <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-start" }}>
                                      <button
                                        type="button"
                                        onClick={() => setShowAllExpressionSignals(true)}
                                        style={{
                                          height: 32,
                                          padding: "0 14px",
                                          borderRadius: 999,
                                          border: "1px solid rgba(67,67,43,0.08)",
                                          background: "rgba(255,255,255,0.36)",
                                          color: "rgba(67,67,43,0.58)",
                                          fontFamily: inter,
                                          fontSize: 12,
                                          fontWeight: 600,
                                          cursor: "pointer",
                                        }}
                                      >
                                        Show more
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                <button
                                  onClick={() => navigateStage("direction")}
                                  style={{
                                    padding: "12px 18px",
                                    borderRadius: 999,
                                    border: "1px solid rgba(67,67,43,0.14)",
                                    background: "transparent",
                                    color: "rgba(67,67,43,0.62)",
                                    fontFamily: sohne,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Back to Language
                                </button>
                                <button
                                  onClick={() => setCurrentStageState("product")}
                                  style={{
                                    padding: "12px 28px",
                                    borderRadius: 999,
                                    border: "1.5px solid #7D96AC",
                                    background: "rgba(125,150,172,0.08)",
                                    color: "#7D96AC",
                                    fontFamily: sohne,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                    cursor: "pointer",
                                  }}
                                >
                                  Start Pieces →
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ marginBottom: 38 }}>
                                <div style={{ marginBottom: 14 }}>
                                  <div style={{ fontFamily: sohne, fontSize: 18, fontWeight: 500, color: OLIVE, letterSpacing: "-0.03em", marginBottom: 4 }}>
                                    Silhouette
                                  </div>
                                  <div style={{ fontFamily: inter, fontSize: 12.5, color: "rgba(67,67,43,0.52)", lineHeight: 1.55 }}>
                                    Set the collection stance first.
                                  </div>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                                  {orderedSilhouettes.map((sil) => {
                                    const isSel = conceptSilhouette === sil.id;
                                    const isAffinity = selectedAestheticData?.silhouette_affinity?.includes(sil.id) ?? false;
                                    return (
                                      <button
                                        key={sil.id}
                                        onClick={() => setConceptSilhouette(sil.id)}
                                        style={{
                                          textAlign: "left",
                                          borderRadius: 18,
                                          padding: "18px 18px 16px",
                                          background: isSel ? "linear-gradient(180deg, rgba(248,245,238,0.96) 0%, rgba(255,255,255,0.94) 100%)" : "rgba(255,255,255,0.62)",
                                          border: isSel ? "1px solid rgba(168,180,117,0.48)" : isAffinity ? "1px solid rgba(168,180,117,0.18)" : "1px solid rgba(67,67,43,0.08)",
                                          boxShadow: isSel ? "0 18px 36px rgba(67,67,43,0.08)" : "none",
                                          cursor: "pointer",
                                        }}
                                      >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                                          <div style={{ fontSize: 18, fontWeight: 500, color: "#191919", fontFamily: sohne, letterSpacing: "-0.02em" }}>
                                            {sil.name}
                                          </div>
                                          {isSel && (
                                            <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: CHARTREUSE }}>
                                              Selected
                                            </div>
                                          )}
                                        </div>
                                        <div style={{ fontSize: 12, color: "rgba(67,67,43,0.60)", fontFamily: inter, marginTop: 6, lineHeight: 1.6, maxWidth: 220 }}>
                                          {sil.descriptor}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {selectedAestheticData?.palette_options && selectedAestheticData.palette_options.length > 0 && (
                                <div style={{ marginBottom: 34 }}>
                                  <div style={{ marginBottom: 12 }}>
                                    <div style={{ fontFamily: sohne, fontSize: 18, fontWeight: 500, color: OLIVE, letterSpacing: "-0.02em", marginBottom: 4 }}>
                                      Palette
                                    </div>
                                    <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.48)", lineHeight: 1.55 }}>
                                      Choose the color register supporting the silhouette.
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                                            gap: 14,
                                            padding: "14px 16px",
                                            borderRadius: 16,
                                            background: isSel ? "rgba(248,245,238,0.92)" : "rgba(255,255,255,0.56)",
                                            border: isSel ? "1px solid rgba(168,180,117,0.42)" : isAffinity ? "1px solid rgba(168,180,117,0.16)" : "1px solid rgba(67,67,43,0.07)",
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
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                              <span style={{ fontFamily: sohne, fontSize: 16, fontWeight: 500, color: "#191919", letterSpacing: "-0.02em" }}>
                                                {pal.name}
                                              </span>
                                              {isSel && (
                                                <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: CHARTREUSE }}>
                                                  Selected
                                                </span>
                                              )}
                                            </div>
                                            <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.56)", lineHeight: 1.6, marginTop: 3 }}>
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
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 12 }}>
                                    <div>
                                      <div style={{ fontFamily: sohne, fontSize: 18, fontWeight: 500, color: OLIVE, letterSpacing: "-0.02em", marginBottom: 4 }}>
                                        Expression
                                      </div>
                                      <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.48)", lineHeight: 1.55 }}>
                                        Introduce 1-3 signals that define the read.
                                      </div>
                                    </div>
                                    <div style={{ fontFamily: inter, fontSize: 11, color: expressionSelectionCount > 3 ? BRAND.camel : "rgba(67,67,43,0.42)" }}>
                                      {expressionSelectionCount} selected
                                    </div>
                                  </div>
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                                    {visibleSignals.map((chip) => {
                                      const chipKey = `${topAesthetic}::${chip.label}`;
                                      const isActive = selectedElements.has(chipKey);
                                      const meta = chipMeta.get(chipKey);
                                      const isAutoSelected = meta?.source === 'key-piece';
                                      const tension: TensionState = isActive && !isAutoSelected ? getChipTensionState(chip.label, selectedKeyPieceLocal) : 'none';
                                      const tensionLabel = tension === 'hard' ? 'Conflict' : tension === 'soft' ? 'Tension' : null;
                                      return (
                                        <button
                                          key={chip.label}
                                          onClick={() => toggleElement(chipKey)}
                                          style={{
                                            padding: "12px 0",
                                            border: "none",
                                            borderBottom: isActive ? "1px solid rgba(67,67,43,0.24)" : "1px solid rgba(67,67,43,0.08)",
                                            background: "none",
                                            cursor: "pointer",
                                            textAlign: "left",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            gap: 12,
                                            color: isActive ? DEEP_BROWN : "rgba(67,67,43,0.58)",
                                          }}
                                          title={
                                            isAutoSelected
                                              ? 'Pre-selected based on your key piece. Tap to deselect.'
                                              : tension === 'hard'
                                                ? 'Construction conflict with this piece type — this combination will affect your score.'
                                                : tension === 'soft'
                                                  ? 'Tension with your key piece — Muko will note this in the analysis.'
                                                  : undefined
                                          }
                                        >
                                          <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: inter, fontSize: 13, fontWeight: isActive ? 600 : 500, color: "inherit" }}>
                                              <span style={{ color: isActive ? DEEP_BROWN : "rgba(67,67,43,0.38)" }}>
                                                <ContextBarSignalIcon />
                                              </span>
                                              <span>{chip.label}</span>
                                            </span>
                                            {(isAutoSelected || tensionLabel) && (
                                              <span style={{ fontFamily: inter, fontSize: 10.5, color: tension === 'hard' ? "rgba(169,95,95,0.82)" : tension === 'soft' ? "rgba(184,135,59,0.82)" : "rgba(67,67,43,0.36)" }}>
                                                {isAutoSelected ? "Auto-selected from key piece" : tensionLabel}
                                              </span>
                                            )}
                                          </span>
                                          <span style={{ fontFamily: inter, fontSize: 10.5, color: isActive ? DEEP_BROWN : "rgba(67,67,43,0.30)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                            {isActive ? "Included" : "Add"}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {hiddenSignalCount > 0 && (
                                    <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-start" }}>
                                      <button
                                        type="button"
                                        onClick={() => setShowAllExpressionSignals(true)}
                                        style={{
                                          height: 32,
                                          padding: "0 14px",
                                          borderRadius: 999,
                                          border: "1px solid rgba(67,67,43,0.08)",
                                          background: "rgba(255,255,255,0.36)",
                                          color: "rgba(67,67,43,0.58)",
                                          fontFamily: inter,
                                          fontSize: 12,
                                          fontWeight: 600,
                                          cursor: "pointer",
                                        }}
                                      >
                                        Show more
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              <div
                                style={{
                                  position: "sticky",
                                  bottom: 0,
                                  backgroundColor: "#FAF9F6",
                                  borderTop: "0.5px solid rgba(0,0,0,0.08)",
                                  padding: "12px 0 20px",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 12,
                                  flexWrap: "wrap",
                                  zIndex: 10,
                                  marginTop: 20,
                                }}
                              >
                                <button
                                  onClick={() => navigateStage("direction")}
                                  style={{ padding: "12px 18px", borderRadius: 999, border: "1px solid rgba(67,67,43,0.14)", background: "transparent", color: "rgba(67,67,43,0.62)", fontFamily: sohne, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                                >
                                  Return to Point of View
                                </button>
                                <button
                                  onClick={handleLockAndStartPieces}
                                  disabled={!canAdvanceToStage3}
                                  style={{
                                    padding: "11px 24px",
                                    borderRadius: 999,
                                    border: "none",
                                    background: canAdvanceToStage3 ? "#191919" : "rgba(67,67,43,0.10)",
                                    color: canAdvanceToStage3 ? "#FFFFFF" : "rgba(67,67,43,0.30)",
                                    fontFamily: sohne,
                                    fontSize: 13,
                                    fontWeight: 500,
                                    cursor: canAdvanceToStage3 ? "pointer" : "not-allowed",
                                  }}
                                >
                                  Start Building →
                                </button>
                              </div>
                            </>
                          )}
                        </>
                      )}

                    </motion.div>
                  </AnimatePresence>
                </div>

              </>
            )}

            {selectedAesthetic && showPointOfViewStage && <div ref={yourConceptRef} />}

            {showDirectionSelection && (
              <>
                {selectedAesthetic && selectedRecommendation && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 30 }}>
                    <div>
                      <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(67,67,43,0.36)", marginBottom: 6 }}>
                        Locked Direction
                      </div>
                      <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.50)", lineHeight: 1.55 }}>
                        This is the direction currently set for the collection. Choosing another one will restart the concept and piece setup.
                      </div>
                    </div>

                    <motion.div layout transition={{ duration: 0.22, ease: "easeInOut" }} style={{ borderRadius: 20 }}>
                      <DirectionCard
                        aesthetic={selectedAesthetic}
                        isHovered={hoveredCard === selectedAesthetic}
                        moodboardImages={loadMoodboardImages(selectedAesthetic)}
                        onHoverEnter={() => setHoveredCard(selectedAesthetic)}
                        onHoverLeave={() => setHoveredCard(null)}
                        onSelect={() => handleSelectAesthetic(selectedAesthetic)}
                        inter={inter}
                        sohne={sohne}
                        chartreuse={CHARTREUSE}
                        recommendation={selectedRecommendation}
                        ctaLabel="Locked"
                        locked
                      />
                    </motion.div>
                  </div>
                )}

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(67,67,43,0.36)", marginBottom: 6 }}>
                    {selectedAesthetic ? "Change Direction" : "Muko Edit"}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 30 }}>
                  {curatedRecommendations
                    .filter((recommendation) => recommendation.aesthetic !== selectedAesthetic)
                    .map((recommendation) => {
                    const aesthetic = recommendation.aesthetic;
                    const isHovered = hoveredCard === aesthetic;
                    const cardImages = loadMoodboardImages(aesthetic);

                    return (
                      <motion.div key={aesthetic} layout transition={{ duration: 0.22, ease: "easeInOut" }} style={{ borderRadius: 20 }}>
                        <DirectionCard
                          aesthetic={aesthetic}
                          isHovered={isHovered}
                          moodboardImages={cardImages}
                          onHoverEnter={() => setHoveredCard(aesthetic)}
                          onHoverLeave={() => setHoveredCard(null)}
                          onSelect={() => handleSelectAesthetic(aesthetic)}
                          inter={inter}
                          sohne={sohne}
                          chartreuse={CHARTREUSE}
                          recommendation={recommendation}
                        />
                      </motion.div>
                    );
                  })}
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(67,67,43,0.40)", marginBottom: 5 }}>
                    {selectedAesthetic ? "Explore More Directions" : "Explore Outside Your Recommended Frame"}
                  </div>
                  <div style={{ fontFamily: inter, fontSize: 12, fontStyle: "italic", color: "rgba(67,67,43,0.44)", marginBottom: 12 }}>
                    Type a direction and we&apos;ll match it, or review the broader set below.
                  </div>
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

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {exploreDirections
                    .filter((aesthetic) => aesthetic !== selectedAesthetic)
                    .map((aesthetic) => {
                    const isHovered = hoveredCard === aesthetic;
                    const content = AESTHETIC_CONTENT[aesthetic];
                    const entry = (aestheticsData as unknown as AestheticDataEntry[]).find((item) => item.name === aesthetic);
                    const cardImages = loadMoodboardImages(aesthetic);

                    return (
                      <motion.div key={aesthetic} layout transition={{ duration: 0.22, ease: "easeInOut" }} style={{ borderRadius: 20 }}>
                        <DirectionCard
                          aesthetic={aesthetic}
                          isHovered={isHovered}
                          moodboardImages={cardImages}
                          onHoverEnter={() => setHoveredCard(aesthetic)}
                          onHoverLeave={() => setHoveredCard(null)}
                          onSelect={() => handleSelectAesthetic(aesthetic)}
                          inter={inter}
                          sohne={sohne}
                          chartreuse={CHARTREUSE}
                          recommendation={{
                            aesthetic,
                            role: "stretch",
                            descriptor: content?.description ?? "",
                            identityScore: content?.identityScore ?? 0,
                            resonanceScore: content?.resonanceScore ?? 0,
                            saturationScore: entry?.saturation_score ?? 60,
                            velocity: entry?.trend_velocity ?? "peak",
                            insight: buildRecommendationInsight({
                              role: "stretch",
                              isRecommended: aesthetic === recommendedAesthetic,
                              identityScore: content?.identityScore ?? 0,
                              resonanceScore: content?.resonanceScore ?? 0,
                              saturationScore:
                                ((aestheticsData as unknown as AestheticDataEntry[]).find((item) => item.name === aesthetic)?.saturation_score ?? 60),
                            }),
                          }}
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

            {/* MUKO INSIGHT */}
            {!selectedAesthetic ? (
              directionBriefLoading && !directionBriefIsStreaming && !directionBriefHeadline && !marketMoment ? (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888078", marginBottom: 20 }}>
                    Muko&apos;s Read
                  </div>
                  {[82, 58, 88, 64].map((w, i) => (
                    <div key={i} style={{ height: i === 0 ? 18 : 12, borderRadius: 6, background: "rgba(67,67,43,0.07)", marginBottom: i === 0 ? 14 : 8, width: `${w}%`, animation: "pulse 1.4s ease-in-out infinite" }} />
                  ))}
                </div>
              ) : (
                <div style={{ marginBottom: 28 }}>
                  <MukoInsightSection
                    marketMoment={preClickMarketMoment}
                    headline={directionBriefHeadline ?? ""}
                    paragraphs={[]}
                    bullets={directionSelectionRead.bullets}
                    mode={undefined}
                    pageMode="concept"
                    conceptStage="direction"
                    isStreaming={directionBriefIsStreaming}
                    streamingText={directionBriefStreamingHeadline}
                    streamingParagraph={directionBriefStreamingBody}
                    isParagraphStreaming={directionBriefIsStreaming}
                    nextMove={{
                      mode: "concept",
                      guidance: null,
                    }}
                  />
                </div>
              )
            ) : (
              (currentStage !== "language" && currentStage !== "product" && step1ReadLoading && !step1ReadData && !conceptStreamingText) ? (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888078", marginBottom: 20 }}>
                    Muko&apos;s Read
                  </div>
                  {[80, 60, 90, 55].map((w, i) => (
                    <div key={i} style={{ height: i === 0 ? 18 : 12, borderRadius: 6, background: "rgba(67,67,43,0.07)", marginBottom: i === 0 ? 14 : 8, width: `${w}%`, animation: "pulse 1.4s ease-in-out infinite" }} />
                  ))}
                </div>
              ) : (
                <motion.div
                  key={`${currentStage}-${activeProductPieceId ?? "none"}-${activePieceRead?.headline ?? step1ReadData?.statements?.[0] ?? step2ReadData?.headline ?? stageAwareHeadline}`}
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
                    isStreaming={currentStage !== "language" && step1ReadLoading && !!conceptStreamingText}
                    streamingText={conceptStreamingText}
                    streamingParagraph={conceptStreamingParagraph}
                    isParagraphStreaming={currentStage !== "language" && conceptIsParagraphStreaming && !!conceptStreamingParagraph}
                    languageStreamingText={step2StreamingText}
                    languageStreamingRows={step2StreamingRead}
                    isLanguageStreaming={currentStage === "language" && step2ReadLoading && !!step2StreamingText}
                    isLanguageLoading={currentStage === "language" && step2ReadLoading}
                    pageMode="concept"
                    conceptStage={currentStage}
                    languageRead={step2ReadData}
                    productPieceRead={activePieceRead ? {
                      title: activePieceRead.headline,
                      body: activePieceRead.core_read,
                    } : undefined}
                    pieceStreamingTitle={pieceStreamingTitle}
                    pieceStreamingBody={pieceStreamingBody}
                    hasSelectedProductPiece={!!activePieceRead}
                    nextMove={{
                      mode: "concept",
                      guidance: step1ReadData?.decision_guidance ?? null,
                      recommendedKeyPieces,
                      selectedAnchorPiece: activeProductPieceId,
                      isConfirmed: decisionGuidanceState.is_confirmed,
                      confirmedAnchorPiece: heroAssignedPieceId,
                      onConfirm: step1ReadData?.decision_guidance ? handleConfirmDirection : undefined,
                      isLoading: step1ReadLoading && !step1ReadData?.decision_guidance,
                    }}
                  />
                </motion.div>
              )
            )}

            <div style={{
              padding: '8px 0 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '7px',
            }}>
              <span style={{ fontSize: '20px', color: 'rgba(77,48,47,0.52)', lineHeight: '1', marginTop: '-2px' }}>✳</span>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(77,48,47,0.52)', lineHeight: '1.4', fontFamily: inter }}>
                Muko uses AI — always apply your own judgment.
              </p>
            </div>

            <PulseSection
              collapsedInsight={collapsedPulseInsight}
              collapsedBadges={conceptCollapsedBadges}
              items={pulseRows.map((row) => ({
                dimensionKey: row.key,
                label: row.label,
                icon: row.icon(row.color),
                infoCopy: row.infoCopy,
                displayScore: row.score,
                numericPercent: row.scoreNum,
                scoreColor: row.color,
                pill: row.chip ? { variant: row.chip.variant, label: row.chip.status } : null,
                subLabel: row.subLabel,
                whatItMeans: row.what,
                howCalculated: row.how,
                isPending: row.pending,
              }))}
              helperText={resonanceProxyMessage && !resonanceLoading ? resonanceProxyMessage : null}
            />

          </div>
	            <AskMuko
	              step="concept"
	              context={askMukoContext}
	            />
	          </div>
        }
      />


      {showAestheticChangeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(23,23,18,0.34)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16 }}>
          <div style={{ width: "min(520px, calc(100vw - 32px))", borderRadius: 20, border: "1px solid rgba(67,67,43,0.10)", background: "linear-gradient(180deg, rgba(248,245,239,0.98) 0%, rgba(255,255,255,0.96) 100%)", boxShadow: "0 28px 80px rgba(17,17,12,0.18)", padding: "24px 24px 20px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(168,180,117,0.28)", background: "rgba(168,180,117,0.10)", color: "#6F7C46", fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14 }}>
              Direction Change
            </div>
            <div style={{ fontFamily: sohne, fontSize: 24, fontWeight: 500, color: OLIVE, marginBottom: 10, letterSpacing: "-0.03em", lineHeight: 1.04 }}>
              Change the collection direction?
            </div>
            <p style={{ margin: "0 0 14px", fontFamily: inter, fontSize: 13.5, lineHeight: 1.65, color: "rgba(67,67,43,0.62)" }}>
              {pendingAestheticChange
                ? `You’re about to switch from ${selectedAesthetic ?? "your current direction"} to ${pendingAestheticChange}.`
                : "You’re about to switch away from the current locked direction."}
            </p>
            <div style={{ marginBottom: 18, padding: "14px 16px", borderRadius: 20, border: "1px solid rgba(77,48,47,0.10)", background: "rgba(255,255,255,0.58)" }}>
              <div style={{ fontFamily: inter, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(77,48,47,0.52)", marginBottom: 8 }}>
                What Changes
              </div>
              <div style={{ fontFamily: inter, fontSize: 13, lineHeight: 1.65, color: "rgba(67,67,43,0.72)" }}>
                Changing direction clears the current language setup, product choices, and piece selections so Muko can restart the collection from the new lens.
              </div>
            </div>
            <p style={{ margin: "0 0 20px", fontFamily: inter, fontSize: 12, lineHeight: 1.6, color: "rgba(67,67,43,0.48)" }}>
              Your existing direction stays locked unless you confirm.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => {
                  setPendingAestheticChange(null);
                  setShowAestheticChangeModal(false);
                }}
                style={{ padding: "10px 15px", borderRadius: 999, border: "1px solid rgba(67,67,43,0.14)", background: "rgba(255,255,255,0.68)", fontFamily: inter, fontSize: 12, fontWeight: 600, color: "rgba(67,67,43,0.62)", cursor: "pointer" }}
              >
                Keep current direction
              </button>
              <button
                onClick={() => {
                  const nextAesthetic = pendingAestheticChange;
                  if (!nextAesthetic) {
                    setShowAestheticChangeModal(false);
                    return;
                  }
                  useSessionStore.setState({
                    aestheticInput: "",
                    conceptLocked: false,
                    collectionAesthetic: null,
                    selectedKeyPiece: null,
                    selectedPieceImage: null,
                    activeProductPieceId: null,
                    pieceRolesById: {},
                    pieceBuildContext: null,
                    collectionRole: null,
                  });
                  setCollectionPieces([]);
                  setCustomProductPieces([]);
                  setSelectedKeyPieceLocal(null);
                  setDecisionGuidanceState({ is_confirmed: false, selected_anchor_piece: null });
                  setShowAestheticChangeModal(false);
                  setPendingAestheticChange(null);
                  setIsAestheticSelectionUnlocked(false);
                  applyAestheticSelection(nextAesthetic);
                }}
                style={{ padding: "10px 16px", borderRadius: 999, border: "none", background: OLIVE, boxShadow: "0 12px 30px rgba(67,67,43,0.16)", fontFamily: inter, fontSize: 12, fontWeight: 700, letterSpacing: "0.02em", color: "#F5F0E8", cursor: "pointer" }}
              >
                Restart with new direction
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

export default function ConceptStudioPage() {
  return (
    <React.Suspense fallback={null}>
      <ConceptStudioPageContent />
    </React.Suspense>
  );
}

/* ─── Direction Card ──────────────────────────────────────────────────────── */
function DirectionCard({
  aesthetic, isHovered, moodboardImages,
  onHoverEnter, onHoverLeave, onSelect,
  inter, sohne, chartreuse, recommendation, ctaLabel = "Select", locked = false,
}: {
  aesthetic: string;
  isHovered: boolean;
  moodboardImages: string[];
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  onSelect: () => void;
  inter: string;
  sohne: string;
  chartreuse: string;
  recommendation: DirectionRecommendation;
  ctaLabel?: string;
  locked?: boolean;
}) {
  const roleLabel =
    recommendation.role === "primary"
      ? "Best Fit"
      : recommendation.role === "anchor"
      ? "Commercial Anchor"
      : "Stretch Path";
  const defaultImages = moodboardImages.length > 0
    ? moodboardImages.slice(0, 4)
    : Array.from({ length: 4 }, (_, index) => `placeholder-${index}`);
  const expandedImages = moodboardImages.length > 0
    ? moodboardImages
    : Array.from({ length: 9 }, (_, index) => `placeholder-${index}`);

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 20,
        background: "rgba(255,255,255,0.88)",
        border: isHovered ? "1px solid rgba(67,67,43,0.16)" : "1px solid rgba(67,67,43,0.08)",
        boxShadow: isHovered ? "0 18px 38px rgba(17,17,12,0.08)" : "0 10px 26px rgba(67,67,43,0.04)",
        padding: "24px 28px",
        cursor: "pointer",
        transition: "border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease",
        overflow: "hidden",
        transform: isHovered ? "translateY(-2px)" : "none",
      }}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      onFocus={onHoverEnter}
      onBlur={onHoverLeave}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      tabIndex={0}
    >
      <div style={{ display: "grid", gap: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: isHovered ? "minmax(0, 1fr)" : "minmax(0, 1fr) 144px", gap: 28, alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "5px 9px",
                borderRadius: 999,
                background: recommendation.role === "primary" ? "rgba(168,180,117,0.14)" : "rgba(67,67,43,0.05)",
                border: recommendation.role === "primary" ? "1px solid rgba(168,180,117,0.35)" : "1px solid rgba(67,67,43,0.08)",
                color: recommendation.role === "primary" ? "#6F7C46" : "rgba(67,67,43,0.58)",
                fontFamily: inter,
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              {roleLabel}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                color: locked ? "#6F7C46" : "rgba(67,67,43,0.62)",
                fontFamily: inter,
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {ctaLabel}
              <span style={{ color: locked ? "#6F7C46" : chartreuse }}>{locked ? "•" : "→"}</span>
            </span>
          </div>
          <div style={{ fontFamily: sohne, fontWeight: 500, fontSize: 24, color: "rgba(67,67,43,0.92)", letterSpacing: "-0.04em", lineHeight: 0.98, marginBottom: 16 }}>
            {aesthetic}
          </div>
          <div style={{ fontFamily: inter, fontSize: 13, color: "rgba(67,67,43,0.60)", lineHeight: 1.68, maxWidth: 420 }}>
            {recommendation.descriptor}
          </div>
        </div>

        {!isHovered ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {defaultImages.map((src, i) => (
              <div
                key={`mb-${aesthetic}-default-${i}`}
                style={{
                  aspectRatio: "1",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "linear-gradient(135deg, rgba(67,67,43,0.05), rgba(67,67,43,0.02))",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
                }}
              >
                {src.startsWith("placeholder-") ? null : (
                  <img
                    src={src}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      transform: "scale(1)",
                      transition: "transform 220ms ease",
                    }}
                    loading="lazy"
                  />
                )}
              </div>
            ))}
          </div>
        ) : null}
        </div>

        {isHovered ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 8,
              paddingTop: 2,
              animation: "fadeIn 180ms ease",
            }}
          >
            {expandedImages.map((src, i) => (
            <div
              key={`mb-${aesthetic}-expanded-${i}`}
              style={{
                aspectRatio: "1",
                borderRadius: 12,
                overflow: "hidden",
                background: "linear-gradient(135deg, rgba(67,67,43,0.05), rgba(67,67,43,0.02))",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
              }}
            >
              {src.startsWith("placeholder-") ? null : (
                <img
                  src={src}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    transform: "scale(1.03)",
                    transition: "transform 220ms ease",
                  }}
                  loading="lazy"
                />
              )}
            </div>
          ))}
          </div>
        ) : null}
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
