import aestheticsData from "@/data/aesthetics.json";
import { interpretRefine } from "@/lib/concept-studio/utils";
import {
  DIRECTION_MODIFIERS,
  getDirectionModifierByLabel,
  type DirectionModifierDefinition,
  type DirectionModifierKey,
} from "@/lib/concept-studio/interpretations";

type SignalSource = "core" | "interpretation";
type PieceBucket = "core" | "interpretation";

interface AestheticChip {
  label: string;
}

interface AestheticPaletteOption {
  id: string;
  name: string;
  swatches: string[];
  descriptor: string;
}

interface KeyPiece {
  item: string;
  signal: "high-volume" | "ascending" | "emerging" | null;
  note?: string;
  category: string | null;
  type: string | null;
  recommended_material_id: string | null;
  redirect_material_id: string | null;
  custom?: boolean;
}

interface AestheticEntry {
  id: string;
  name: string;
  description?: string;
  trend_velocity?: string;
  saturation_score?: number;
  consumer_insight?: string;
  risk_factors?: string[];
  silhouette_affinity?: string[];
  palette_affinity?: string[];
  palette_options?: AestheticPaletteOption[];
  chips?: AestheticChip[];
  key_pieces?: Record<string, KeyPiece[]>;
}

export interface CombinedSignal {
  label: string;
  source: SignalSource;
  reason: string;
}

export interface CombinedPieceRecommendation {
  piece: KeyPiece;
  bucket: PieceBucket;
  reason: string;
}

export interface CombinedDirectionInsight {
  headline: string;
  summary: string;
  marketNote: string;
  opportunity: string;
}

export interface CombinedDirectionResult {
  aesthetic: string;
  interpretationText: string;
  dnaLines: string[];
  modifierKeys: DirectionModifierKey[];
  modifierLabels: string[];
  signals: CombinedSignal[];
  keyPieces: CombinedPieceRecommendation[];
  silhouetteOrder: string[];
  paletteOrder: string[];
  insight: CombinedDirectionInsight;
}

const aesthetics = aestheticsData as AestheticEntry[];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function getAestheticEntry(aestheticName: string): AestheticEntry | null {
  const normalized = normalize(aestheticName);
  return (
    aesthetics.find((entry) => entry.name.toLowerCase() === normalized || entry.id === normalized.replace(/\s+/g, "-")) ??
    null
  );
}

function getSeasonKey(season: string): string {
  return season.toUpperCase().includes("FW") || season.toLowerCase().includes("fall") ? "fw26" : "ss27";
}

const VALID_FLAT_REGISTRY_KEYS = [
  "puffer",
  "parka",
  "jacket",
  "raincoat",
  "trench",
  "coat",
  "cape",
  "shell",
  "boilersuit",
  "knit-sweater",
  "cardigan",
  "blazer",
  "blouse",
  "corset-top",
  "tank",
  "top",
  "tunic",
  "mid-layer",
  "vest",
  "trouser",
  "straight-pant",
  "skirt",
  "mini-skirt",
  "midi-dress",
  "maxi-dress",
  "slip-dress",
  "shirt-dress",
  "sundress",
  "babydoll-dress",
  "column-dress",
] as const;

type FlatRegistryKey = (typeof VALID_FLAT_REGISTRY_KEYS)[number];

const CATEGORY_TYPE_FALLBACKS: Record<string, FlatRegistryKey> = {
  outerwear: "jacket",
  tops: "top",
  bottoms: "trouser",
  dresses: "column-dress",
};

const PIECE_TYPE_INFERENCE_RULES: Array<{
  match: string[];
  category: string;
  type: FlatRegistryKey;
}> = [
  { match: ["shirt dress", "shirt-dress"], category: "dresses", type: "shirt-dress" },
  { match: ["slip dress", "slip-dress"], category: "dresses", type: "slip-dress" },
  { match: ["baby doll dress", "babydoll dress", "babydoll-dress"], category: "dresses", type: "babydoll-dress" },
  { match: ["sun dress", "sundress"], category: "dresses", type: "sundress" },
  { match: ["maxi dress", "maxi-dress"], category: "dresses", type: "maxi-dress" },
  { match: ["midi dress", "midi-dress"], category: "dresses", type: "midi-dress" },
  { match: ["column dress", "column-dress"], category: "dresses", type: "column-dress" },
  { match: ["dress"], category: "dresses", type: "column-dress" },
  { match: ["mini skirt", "mini-skirt"], category: "bottoms", type: "mini-skirt" },
  { match: ["skirt"], category: "bottoms", type: "skirt" },
  { match: ["straight pant", "straight-pant", "straight leg pant", "straight-leg pant"], category: "bottoms", type: "straight-pant" },
  { match: ["pant", "trouser"], category: "bottoms", type: "trouser" },
  { match: ["corset top", "corset-top"], category: "tops", type: "corset-top" },
  { match: ["tank"], category: "tops", type: "tank" },
  { match: ["cardigan"], category: "tops", type: "cardigan" },
  { match: ["blouse"], category: "tops", type: "blouse" },
  { match: ["blazer"], category: "outerwear", type: "blazer" },
  { match: ["waistcoat"], category: "tops", type: "vest" },
  { match: ["vest"], category: "tops", type: "vest" },
  { match: ["tunic"], category: "tops", type: "tunic" },
  { match: ["mid layer", "mid-layer"], category: "tops", type: "mid-layer" },
  { match: ["shell layer", "shell-layer"], category: "tops", type: "shell" },
  { match: ["shell"], category: "tops", type: "shell" },
  { match: ["knit sweater", "knit-sweater"], category: "tops", type: "knit-sweater" },
  { match: ["sweater"], category: "tops", type: "knit-sweater" },
  { match: ["knit top", "knit-top", "knit"], category: "tops", type: "knit-sweater" },
  { match: ["top"], category: "tops", type: "top" },
  { match: ["blouson", "bomber", "jacket"], category: "outerwear", type: "jacket" },
  { match: ["trench"], category: "outerwear", type: "trench" },
  { match: ["raincoat"], category: "outerwear", type: "raincoat" },
  { match: ["parka"], category: "outerwear", type: "parka" },
  { match: ["puffer"], category: "outerwear", type: "puffer" },
  { match: ["cape"], category: "outerwear", type: "cape" },
  { match: ["coat"], category: "outerwear", type: "coat" },
  { match: ["boilersuit"], category: "dresses", type: "boilersuit" },
];

function inferPieceCategory(pieceName: string): { category: string | null; type: string | null } {
  const normalized = pieceName.toLowerCase();

  for (const rule of PIECE_TYPE_INFERENCE_RULES) {
    if (rule.match.some((term) => normalized.includes(term))) {
      return { category: rule.category, type: rule.type };
    }
  }

  const fallbackCategory = normalized.includes("outerwear")
    ? "outerwear"
    : normalized.includes("dress")
    ? "dresses"
    : normalized.includes("skirt") || normalized.includes("pant") || normalized.includes("trouser")
    ? "bottoms"
    : normalized.includes("top") || normalized.includes("shirt") || normalized.includes("blouse") || normalized.includes("knit")
    ? "tops"
    : null;

  if (fallbackCategory) {
    return { category: fallbackCategory, type: CATEGORY_TYPE_FALLBACKS[fallbackCategory] };
  }

  return { category: null, type: null };
}

function scorePiece(piece: KeyPiece, modifiers: DirectionModifierDefinition[]): number {
  const haystack = `${piece.item} ${piece.note ?? ""} ${piece.category ?? ""} ${piece.type ?? ""}`.toLowerCase();
  let score = piece.signal === "ascending" ? 5 : piece.signal === "high-volume" ? 4 : piece.signal === "emerging" ? 3 : 1;

  for (const modifier of modifiers) {
    if (modifier.pieceBiases.some((term) => haystack.includes(term.toLowerCase()))) score += 4;
    if (modifier.keywords.some((term) => haystack.includes(term))) score += 2;
  }

  return score;
}

function dedupe<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function combineDirection(options: {
  aestheticName: string;
  freeText?: string;
  selectedInterpretationChips?: string[];
  season?: string;
}): CombinedDirectionResult | null {
  const entry = getAestheticEntry(options.aestheticName);
  if (!entry) return null;

  const selectedChipLabels = dedupe((options.selectedInterpretationChips ?? []).map((chip) => chip.trim()).filter(Boolean));
  const parsed = interpretRefine(options.aestheticName, options.freeText ?? "");
  const normalizedFreeText = normalize(options.freeText ?? "");

  const activeModifiers = DIRECTION_MODIFIERS.filter((modifier) => {
    if (selectedChipLabels.some((chip) => normalize(chip) === normalize(modifier.label))) return true;
    if (modifier.keywords.some((keyword) => normalizedFreeText.includes(keyword))) return true;
    return modifier.relatedConcepts.some((concept) => parsed.modifiers.includes(concept));
  });

  const modifierLabels = activeModifiers.map((modifier) => modifier.label);
  const interpretationText = (options.freeText ?? "").trim();
  const dnaLines = [
    entry.name,
    interpretationText || modifierLabels[0] || "Pure direction",
  ];

  const signalMap = new Map<string, { score: number; source: SignalSource; reason: string }>();

  for (const chip of entry.chips ?? []) {
    signalMap.set(chip.label, {
      score: 3,
      source: "core",
      reason: "Anchored in the base direction",
    });
  }

  for (const modifier of activeModifiers) {
    for (const chipLabel of modifier.chipBiases) {
      const existing = signalMap.get(chipLabel);
      signalMap.set(chipLabel, {
        score: (existing?.score ?? 0) + 4,
        source: existing?.source ?? "interpretation",
        reason: `Surfaced by ${modifier.label}`,
      });
    }
  }

  const signals = Array.from(signalMap.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 6)
    .map(([label, meta]) => ({
      label,
      source: meta.source,
      reason: meta.reason,
    }));

  const seasonKey = getSeasonKey(options.season ?? "SS27");
  const baseKeyPieces = entry.key_pieces?.[seasonKey] ?? entry.key_pieces?.fw26 ?? entry.key_pieces?.ss27 ?? [];
  const rankedBasePieces = baseKeyPieces
    .slice()
    .sort((a, b) => scorePiece(b, activeModifiers) - scorePiece(a, activeModifiers))
    .slice(0, 4)
    .map((piece) => ({
      piece,
      bucket: "core" as const,
      reason: activeModifiers.length > 0 ? "Still core to the direction, but reprioritized through your interpretation" : "Core to the direction",
    }));

  const interpretationPieces = activeModifiers
    .flatMap((modifier) => modifier.pieceBiases.map((pieceName) => ({ modifier, pieceName })))
    .filter(({ pieceName }, index, array) => array.findIndex((item) => item.pieceName === pieceName) === index)
    .filter(({ pieceName }) => !rankedBasePieces.some((candidate) => candidate.piece.item === pieceName))
    .slice(0, 4)
    .map(({ modifier, pieceName }) => {
      const inferred = inferPieceCategory(pieceName);
      return {
        piece: {
          item: pieceName,
          signal: "emerging" as const,
          note: `Suggested to express ${modifier.label} without losing ${entry.name}.`,
          category: inferred.category,
          type: inferred.type,
          recommended_material_id: null,
          redirect_material_id: null,
        },
        bucket: "interpretation" as const,
        reason: `Suggested from ${modifier.label}`,
      };
    });

  const silhouetteOrder = dedupe([
    ...activeModifiers.flatMap((modifier) => modifier.silhouetteBiases),
    ...(entry.silhouette_affinity ?? []),
    "straight",
    "relaxed",
    "structured",
    "oversized",
  ]);

  const paletteOrder = dedupe([
    ...activeModifiers.flatMap((modifier) => modifier.paletteBiases),
    ...(entry.palette_affinity ?? []),
    ...(entry.palette_options ?? []).map((palette) => palette.id),
  ]);

  const modifierPhrase = modifierLabels.length > 0 ? modifierLabels.join(" + ") : null;
  const tonalDescriptors = dedupe(activeModifiers.flatMap((modifier) => modifier.toneDescriptors)).slice(0, 3);
  const saturation = entry.saturation_score ?? 50;
  const velocity = entry.trend_velocity ?? "steady";

  return {
    aesthetic: entry.name,
    interpretationText,
    dnaLines,
    modifierKeys: activeModifiers.map((modifier) => modifier.key),
    modifierLabels,
    signals,
    keyPieces: [...rankedBasePieces, ...interpretationPieces],
    silhouetteOrder,
    paletteOrder,
    insight: {
      headline: modifierPhrase ? `${entry.name} through ${modifierPhrase}` : `${entry.name} held with clarity`,
      summary: modifierPhrase
        ? `${entry.name} remains the collection anchor, while ${modifierPhrase} makes the direction read ${tonalDescriptors.join(", ") || "more specific"}.`
        : `${entry.name} is reading clearly; add an interpretation layer to sharpen what your brand owns inside it.`,
      marketNote: modifierPhrase
        ? `${velocity.charAt(0).toUpperCase() + velocity.slice(1)} momentum and ${saturation}% saturation mean specificity matters. Your interpretation is where whitespace opens.`
        : `${velocity.charAt(0).toUpperCase() + velocity.slice(1)} momentum with ${saturation}% saturation means the base direction is viable, but generic execution will blend in quickly.`,
      opportunity: modifierPhrase
        ? `Lean into ${modifierPhrase} in silhouette, fabric hand, and hero-piece choice so the collection feels authored, not trend-following.`
        : "Define the brand's point of view now so the rest of the assortment can build from a single, legible DNA.",
    },
  };
}

export function getInterpretationChipDefinitions(labels: string[]): DirectionModifierDefinition[] {
  return labels
    .map((label) => getDirectionModifierByLabel(label))
    .filter((modifier): modifier is DirectionModifierDefinition => Boolean(modifier));
}
