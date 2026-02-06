// Deterministic shuffle (so moodboard "shifts" without new assets)
const hashString = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (a: number) => {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const seededShuffle = (arr: string[], seed: string) => {
  const rng = mulberry32(hashString(seed));
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const matchAestheticToFolder = (input: string): string | null => {
  const normalized = input.toLowerCase().trim();
  const map: Record<string, string> = {
    poetcore: 'poetcore',
    poet: 'poetcore',
    academic: 'poetcore',
    bookish: 'poetcore',
    literary: 'poetcore',

    'rugged luxury': 'rugged-luxury',
    rugged: 'rugged-luxury',
    gorpcore: 'rugged-luxury',
    outdoor: 'rugged-luxury',

    glamoratti: 'glamoratti',
    '80s': 'glamoratti',
    eighties: 'glamoratti',
    'power suit': 'glamoratti',

    'refined clarity': 'refined-clarity',
    minimal: 'refined-clarity',
    minimalist: 'refined-clarity',
    'quiet luxury': 'refined-clarity',

    'modern craft': 'modern-craft',
    artisan: 'modern-craft',
    heritage: 'modern-craft',
    sustainable: 'modern-craft',

    'indie chic grunge': 'indie-chic-grunge',
    grunge: 'indie-chic-grunge',
    'indie sleaze': 'indie-chic-grunge',

    gummy: 'gummy-aesthetic',
    jelly: 'gummy-aesthetic',
    squishy: 'gummy-aesthetic',

    'cult of cute': 'cult-of-cute',
    kawaii: 'cult-of-cute',
    cute: 'cult-of-cute',
  };

  if (normalized in map) return map[normalized];

  for (const [k, v] of Object.entries(map)) {
    if (normalized.includes(k) || k.includes(normalized)) return v;
  }
  return null;
};

type Confidence = 'high' | 'med' | 'low';

export const interpretRefine = (
  base: string,
  text: string
): {
  base: string;
  modifiers: string[];
  note: string;
  confidence: Confidence;
  unsupportedHits: string[];
} => {
  const t = (text || '').toLowerCase();

  const buckets: Record<string, string[]> = {
    Sculptural: ['sculptural', 'architectural', 'structured', '3d', 'volume'],
    Raw: ['raw', 'hand-worked', 'handworked', 'imperfect', 'rough', 'distressed'],
    Organic: ['organic', 'natural', 'earthy', 'botanical', 'fiber', 'linen'],
    Nostalgic: ['nostalgic', 'vintage', 'heritage', 'retro', 'throwback'],
    Playful: ['playful', 'cute', 'kawaii', 'toy', 'whimsical'],
    Polished: ['polished', 'refined', 'clean', 'sleek', 'tailored'],
    Soft: ['soft', 'delicate', 'airy', 'sheer', 'gentle'],
    Utility: ['utility', 'cargo', 'workwear', 'pocket', 'technical'],
  };

  const modifiers = Object.entries(buckets)
    .filter(([, kws]) => kws.some((kw) => t.includes(kw)))
    .map(([label]) => label);

  const unsupportedPhrases = [
    'goblincore',
    'coastal grandma',
    'coquette',
    'blokecore',
    'weird girl',
    'tomato girl',
    'gorpcore',
  ];
  const unsupportedHits = unsupportedPhrases.filter((p) => t.includes(p));

  const confidence: Confidence = unsupportedHits.length > 0 ? 'low' : modifiers.length > 0 ? 'high' : 'med';

  const note =
    unsupportedHits.length > 0
      ? `We don't yet analyze that aesthetic directly — interpreting it as closest to ${base} with ${
          modifiers.length ? modifiers.join(' / ') : 'organic + nostalgic'
        } influences`
      : `Interpreting this as: ${base}${modifiers.length ? ` → ${modifiers.join(' / ')}` : ''}`;

  return { base, modifiers, note, confidence, unsupportedHits };
};

// lib/concept-studio/utils.ts

export function generateMukoInsight(identityScore?: number, resonanceScore?: number): string {
  if (typeof identityScore !== 'number' || typeof resonanceScore !== 'number') {
    return "Once identity and market signals are available, Muko will surface a directional insight here.";
  }

  const hi = 80;
  const mid = 60;

  // High Identity / High Resonance
  if (identityScore >= hi && resonanceScore >= hi) {
    return (
      "This is a strong all-around direction. To avoid blending in, focus on a specific point of view — a material choice, silhouette bias, or styling contrast that makes the aesthetic feel unmistakably yours."
    );
  }

  // High Identity / Medium Resonance
  if (identityScore >= hi && resonanceScore >= mid) {
    return (
      "This direction aligns naturally with your brand. Market interest exists, but clarity matters — tightening the concept around one defining trait can help it stand out."
    );
  }

  // High Identity / Low Resonance
  if (identityScore >= hi && resonanceScore < mid) {
    return (
      "This feels very on-brand, but the market is more selective right now. It tends to work best when reinterpreted through a modern lens — updated proportions, unexpected textures, or a lighter styling hand."
    );
  }

  // Medium Identity / High Resonance
  if (identityScore >= mid && resonanceScore >= hi) {
    return (
      "There’s clear market energy here, but it may drift from your core DNA. Consider pulling it back toward familiar brand codes so it feels intentional rather than trend-driven."
    );
  }

  // Medium / Medium
  if (identityScore >= mid && resonanceScore >= mid) {
    return (
      "This sits in a flexible middle ground. It can work, but benefits from sharper definition — refining the mood, era reference, or construction level can improve clarity."
    );
  }

  // Low / Low
  if (identityScore < mid && resonanceScore < mid) {
    return (
      "This is a riskier direction as-is. If you’re drawn to it, narrowing the scope — fewer references, clearer styling intent — can help strengthen the signal."
    );
  }

  // Catch-all
  return (
    "Signals are mixed. Refining the language or narrowing the aesthetic focus may help clarify whether this direction is worth pursuing."
  );
}
