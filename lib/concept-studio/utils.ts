// ============================================================================
// MUKO CONCEPT STUDIO UTILS
// ============================================================================

// ============================================================================
// MOODBOARD UTILITIES
// ============================================================================

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

// ============================================================================
// AESTHETIC FOLDER MATCHING
// ============================================================================

export const matchAestheticToFolder = (input: string): string | null => {
  const normalized = input.toLowerCase().trim();
  const map: Record<string, string> = {
    'romantic analog': 'poetcore',
    poetcore: 'poetcore',
    poet: 'poetcore',
    academic: 'poetcore',
    bookish: 'poetcore',
    literary: 'poetcore',
    'dark academia': 'poetcore',

    'terrain luxe': 'rugged-luxury',
    'rugged luxury': 'rugged-luxury',
    rugged: 'rugged-luxury',
    gorpcore: 'rugged-luxury',
    outdoor: 'rugged-luxury',

    'high voltage': 'glamoratti',
    glamoratti: 'glamoratti',
    '80s': 'glamoratti',
    eighties: 'glamoratti',
    'power suit': 'glamoratti',

    'quiet structure': 'refined-clarity',
    'refined clarity': 'refined-clarity',
    minimal: 'refined-clarity',
    minimalist: 'refined-clarity',
    'quiet luxury': 'refined-clarity',

    'heritage hand': 'modern-craft',
    'modern craft': 'modern-craft',
    artisan: 'modern-craft',
    heritage: 'modern-craft',
    sustainable: 'modern-craft',

    'undone glam': 'indie-chic-grunge',
    'indie chic grunge': 'indie-chic-grunge',
    grunge: 'indie-chic-grunge',
    'indie sleaze': 'indie-chic-grunge',

    'haptic play': 'gummy-aesthetic',
    gummy: 'gummy-aesthetic',
    jelly: 'gummy-aesthetic',
    squishy: 'gummy-aesthetic',

    'sweet subversion': 'cult-of-cute',
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

// ============================================================================
// PULSE INSIGHTS GENERATOR
// ============================================================================

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
      "There's clear market energy here, but it may drift from your core DNA. Consider pulling it back toward familiar brand codes so it feels intentional rather than trend-driven."
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
      "This is a riskier direction as-is. If you're drawn to it, narrowing the scope — fewer references, clearer styling intent — can help strengthen the signal."
    );
  }

  // Catch-all
  return (
    "Signals are mixed. Refining the language or narrowing the aesthetic focus may help clarify whether this direction is worth pursuing."
  );
}

// ============================================================================
// ENHANCED AESTHETIC INTERPRETER v2.0
// ============================================================================

type Confidence = 'high' | 'med' | 'low';

export interface InterpretationResult {
  base: string;
  modifiers: string[];
  note: string;
  confidence: Confidence;
  unsupportedHits: string[];
  intensityShifts: string[];
  conflictWarnings: string[];
  seasonalContext?: string;
  eraContext?: string;
}

// --- MODIFIER TAXONOMY ---

const MODIFIER_BUCKETS: Record<string, string[]> = {
  // Texture & Materiality
  Sculptural: [
    'sculptural', 'architectural', 'structured', '3d', 'volume', 'sharp', 
    'angular', 'boxy', 'rigid', 'geometric', 'constructed', 'dimensional',
    'exaggerated', 'statement', 'bold', 'dramatic silhouette'
  ],
  
  Raw: [
    'raw', 'unpolished', 'hand-worked', 'handworked', 'imperfect', 'rough',
    'distressed', 'grunge', 'punk', 'worn', 'washed', 'frayed', 'ripped',
    'abrasive', 'gritty', 'unfinished', 'deconstructed', 'DIY', 'homemade',
    'lived-in', 'weathered', 'vintage', 'broken-in'
  ],
  
  Organic: [
    'organic', 'natural', 'earthy', 'botanical', 'fiber', 'linen', 'hemp',
    'cotton', 'leather', 'suede', 'woodsy', 'plant-based', 'biodegradable',
    'sustainable', 'eco', 'green', 'renewable', 'raw materials', 'artisanal'
  ],
  
  Soft: [
    'soft', 'delicate', 'airy', 'sheer', 'gentle', 'romantic', 'floaty',
    'drapey', 'light', 'flowing', 'ethereal', 'gauzy', 'wispy', 'featherlight',
    'billowy', 'fluid', 'cascading', 'gossamer', 'tender', 'subtle'
  ],
  
  Tactile: [
    'textured', 'tactile', 'touchable', 'sensory', 'dimensional', 'layered',
    'quilted', 'ribbed', 'knit', 'woven', 'embossed', 'raised', 'relief',
    'grainy', 'fuzzy', 'bouclé', 'chenille', 'cable', 'waffle'
  ],

  // Aesthetic Mood
  Polished: [
    'polished', 'refined', 'clean', 'sleek', 'tailored', 'luxe', 'luxury',
    'elevated', 'minimal', 'crisp', 'sharp', 'precision', 'sophisticated',
    'pristine', 'immaculate', 'flawless', 'professional', 'executive',
    'corporate', 'investment', 'timeless', 'classic'
  ],
  
  Dark: [
    'dark', 'moody', 'goth', 'noir', 'shadow', 'ink', 'blackened', 'brooding',
    'mysterious', 'somber', 'melancholic', 'gothic', 'witchy', 'occult',
    'Victorian', 'macabre', 'dramatic', 'intense', 'heavy', 'midnight'
  ],
  
  Nostalgic: [
    'nostalgic', 'vintage', 'heritage', 'retro', 'throwback', '90s', '00s',
    'y2k', 'archive', '90\'s', '2000s', '80s', '70s', '60s', '50s',
    'mid-century', 'era-inspired', 'period', 'archival', 'revival',
    'callback', 'reference', 'homage'
  ],
  
  Playful: [
    'playful', 'cute', 'kawaii', 'toy', 'whimsical', 'camp', 'quirky', 'fun',
    'bubbly', 'cheeky', 'irreverent', 'tongue-in-cheek', 'lighthearted',
    'childlike', 'naive', 'cartoonish', 'animated', 'colorful', 'bright',
    'exuberant', 'joyful'
  ],

  // Gender & Expression
  Feminine: [
    'feminine', 'girly', 'coquette', 'ruffle', 'lace', 'bow', 'corset', 'sweet',
    'pretty', 'dainty', 'pearl', 'silk', 'satin', 'floral', 'romantic',
    'soft femininity', 'ladylike', 'graceful', 'elegant', 'delicate'
  ],
  
  Masculine: [
    'masculine', 'menswear', 'tomboy', 'androgynous', 'boxy', 'oversized',
    'boyfriend', 'utilitarian', 'workwear', 'military', 'borrowed from boys',
    'strong', 'powerful', 'structured', 'broad-shouldered'
  ],
  
  Androgynous: [
    'androgynous', 'gender-neutral', 'unisex', 'non-binary', 'fluid',
    'ambiguous', 'minimal gender', 'neutral', 'balanced', 'universal'
  ],

  // Function & Lifestyle
  Utility: [
    'utility', 'cargo', 'workwear', 'pocket', 'technical', 'functional',
    'tactical', 'performance', 'outdoor', 'activewear', 'gear', 'hardware',
    'straps', 'buckles', 'modular', 'multipurpose', 'practical'
  ],
  
  Sporty: [
    'sporty', 'athletic', 'track', 'jersey', 'tennis', 'running', 'gym',
    'athleisure', 'active', 'performance', 'sports-inspired', 'mesh',
    'racing', 'varsity', 'team', 'court', 'field'
  ],
  
  Loungewear: [
    'lounge', 'comfort', 'cozy', 'relaxed', 'casual', 'easy', 'effortless',
    'laid-back', 'chill', 'homewear', 'sleepwear-inspired', 'pajama', 'stretchy', 'forgiving'
  ],

  // Cultural References
  Western: [
    'western', 'cowboy', 'ranch', 'rodeo', 'frontier', 'denim', 'fringe',
    'leather', 'boots', 'prairie', 'americana', 'southwest', 'desert',
    'country', 'rustic'
  ],
  
  Urban: [
    'urban', 'streetwear', 'street', 'city', 'metropolitan', 'downtown',
    'hip-hop', 'skate', 'sneaker', 'hoodie', 'oversized', 'logo',
    'graphic', 'layered', 'contemporary', 'modern'
  ],
  
  Coastal: [
    'coastal', 'beach', 'seaside', 'nautical', 'maritime', 'resort',
    'vacation', 'mediterranean', 'riviera', 'breezy', 'linen', 'stripe',
    'relaxed', 'effortless', 'sun-bleached'
  ],
  
  Bohemian: [
    'bohemian', 'boho', 'hippie', 'free-spirit', 'artisan', 'ethnic',
    'tribal', 'folk', 'festival', 'nomadic', 'wanderlust', 'eclectic',
    'mixed', 'layered', 'fringe', 'embroidery', 'handcrafted'
  ],

  // Intensity & Volume
  Maximalist: [
    'maximalist', 'extra', 'ornate', 'embellished', 'detailed',
    'layered', 'busy', 'complex', 'rich', 'opulent', 'baroque', 'rococo',
    'decorative', 'pattern-on-pattern', 'clashing', 'eclectic'
  ],
  
  Minimalist: [
    'minimalist', 'minimal', 'simple', 'clean', 'pared-back',
    'stripped', 'essential', 'bare', 'monochrome', 'tonal', 'uniform',
    'streamlined', 'understated', 'quiet', 'subtle', 'restrained'
  ],

  // Color & Tone
  Colorful: [
    'colorful', 'bright', 'vibrant', 'saturated', 'bold', 'neon',
    'technicolor', 'rainbow', 'multi-color', 'chromatic', 'vivid',
    'jewel tone', 'punchy', 'eye-catching'
  ],
  
  Neutral: [
    'neutral', 'tonal', 'earth tone', 'sand', 'beige', 'cream', 'camel',
    'taupe', 'khaki', 'natural', 'monochrome', 'muted', 'subdued',
    'desaturated', 'pale', 'soft color', 'warm'
  ],
  
  Moody: [
    'moody', 'rich', 'deep', 'jewel', 'saturated', 'intense', 'dark',
    'burgundy', 'forest', 'navy', 'plum', 'wine', 'emerald', 'midnight'
  ],

  // Silhouette
  Oversized: [
    'oversized', 'baggy', 'loose', 'slouchy', 'voluminous', 'cocoon',
    'drop-shoulder', 'relaxed', 'roomy', 'billowy', 'generous'
  ],
  
  Fitted: [
    'fitted', 'tight', 'body-con', 'slim', 'skinny', 'second-skin',
    'contoured', 'hugging', 'tailored', 'sculpted', 'close-to-body'
  ],
};

// --- PHRASE-LEVEL HINTS ---

const PHRASE_HINTS: Array<{ phrase: string; adds: string[] }> = [
  // Subculture references
  { phrase: 'indie sleaze', adds: ['Nostalgic', 'Raw', 'Dark'] },
  { phrase: 'dive bar', adds: ['Raw', 'Nostalgic', 'Dark'] },
  { phrase: 'garage band', adds: ['Raw', 'Nostalgic'] },
  { phrase: 'art school', adds: ['Raw', 'Dark', 'Androgynous'] },
  
  // Lifestyle aesthetics
  { phrase: 'coastal grandma', adds: ['Coastal', 'Soft', 'Neutral'] },
  { phrase: 'coastal grandmother', adds: ['Coastal', 'Soft', 'Neutral'] },
  { phrase: 'clean girl', adds: ['Polished', 'Minimalist', 'Soft'] },
  { phrase: 'old money', adds: ['Polished', 'Neutral', 'Minimalist'] },
  { phrase: 'mob wife', adds: ['Maximalist', 'Polished', 'Feminine'] },
  { phrase: 'tomato girl', adds: ['Coastal', 'Colorful', 'Soft'] },
  { phrase: 'weird girl', adds: ['Androgynous', 'Dark', 'Raw'] },
  
  // Material references
  { phrase: 'leather', adds: ['Raw', 'Utility'] },
  { phrase: 'silk', adds: ['Polished', 'Soft', 'Feminine'] },
  { phrase: 'denim', adds: ['Western', 'Raw', 'Utility'] },
  { phrase: 'linen', adds: ['Organic', 'Coastal', 'Soft'] },
  
  // Intensity modifiers
  { phrase: 'more grunge', adds: ['Raw', 'Dark'] },
  { phrase: 'more punk', adds: ['Raw', 'Dark'] },
  { phrase: 'more rugged', adds: ['Utility', 'Raw', 'Masculine'] },
  { phrase: 'more luxury', adds: ['Polished', 'Soft'] },
  { phrase: 'more luxe', adds: ['Polished', 'Soft'] },
  { phrase: 'more polished', adds: ['Polished'] },
  { phrase: 'more refined', adds: ['Polished', 'Minimalist'] },
  { phrase: 'more romantic', adds: ['Soft', 'Feminine'] },
  { phrase: 'more feminine', adds: ['Feminine', 'Soft'] },
  { phrase: 'more masculine', adds: ['Masculine', 'Sculptural'] },
  { phrase: 'more dark', adds: ['Dark', 'Moody'] },
  { phrase: 'more edgy', adds: ['Raw', 'Dark'] },
  { phrase: 'more bohemian', adds: ['Bohemian', 'Organic'] },
  { phrase: 'more minimal', adds: ['Minimalist', 'Polished'] },
  { phrase: 'more maximalist', adds: ['Maximalist', 'Playful'] },
  { phrase: 'more colorful', adds: ['Colorful', 'Playful'] },
  { phrase: 'more neutral', adds: ['Neutral', 'Minimalist'] },
  { phrase: 'more modern', adds: ['Polished', 'Minimalist'] },
  { phrase: 'more vintage', adds: ['Nostalgic', 'Soft'] },
  { phrase: 'more retro', adds: ['Nostalgic', 'Playful'] },
];

// --- NEGATION PATTERNS ---

const NEGATION_PATTERNS: Record<string, string> = {
  'less raw': 'Raw',
  'less grunge': 'Raw',
  'less grungy': 'Raw',
  'less punk': 'Raw',
  'less edgy': 'Raw',
  'less utility': 'Utility',
  'less utilitarian': 'Utility',
  'less polished': 'Polished',
  'less refined': 'Polished',
  'less playful': 'Playful',
  'less cute': 'Playful',
  'less nostalgic': 'Nostalgic',
  'less vintage': 'Nostalgic',
  'less soft': 'Soft',
  'less romantic': 'Soft',
  'less dark': 'Dark',
  'less moody': 'Moody',
  'less feminine': 'Feminine',
  'less masculine': 'Masculine',
  'less minimal': 'Minimalist',
  'less busy': 'Maximalist',
  'less colorful': 'Colorful',
  'less bright': 'Colorful',
  'without being too feminine': 'Feminine',
  'without being too masculine': 'Masculine',
  'without being too polished': 'Polished',
  'without being too raw': 'Raw',
  'not too sweet': 'Playful',
  'not overly feminine': 'Feminine',
  'not too structured': 'Sculptural',
  'not too corporate': 'Polished',
};

// --- CONFLICT DETECTION ---

const CONFLICTING_PAIRS: Array<[string, string]> = [
  ['Minimalist', 'Maximalist'],
  ['Polished', 'Raw'],
  ['Feminine', 'Masculine'],
  ['Dark', 'Playful'],
  ['Fitted', 'Oversized'],
  ['Colorful', 'Neutral'],
];

// --- SEASONAL & ERA DETECTION ---

const SEASONAL_KEYWORDS: Record<string, string> = {
  'spring': 'Spring',
  'summer': 'Summer',
  'fall': 'Fall',
  'autumn': 'Fall',
  'winter': 'Winter',
  'resort': 'Resort',
  'holiday': 'Holiday',
  'transitional': 'Transitional',
};

const ERA_KEYWORDS: Record<string, string> = {
  '40s': '1940s',
  '1940s': '1940s',
  'forties': '1940s',
  '50s': '1950s',
  '1950s': '1950s',
  'fifties': '1950s',
  '60s': '1960s',
  '1960s': '1960s',
  'sixties': '1960s',
  '70s': '1970s',
  '1970s': '1970s',
  'seventies': '1970s',
  '80s': '1980s',
  '1980s': '1980s',
  'eighties': '1980s',
  '90s': '1990s',
  '1990s': '1990s',
  'nineties': '1990s',
  'y2k': 'Y2K',
  '2000s': '2000s',
  'aughts': '2000s',
};

// --- CORE INTERPRETATION FUNCTION ---

export const interpretRefine = (
  base: string,
  text: string
): InterpretationResult => {
  const normalizedBase = (base || '').trim();
  const rawOriginal = (text || '').trim();

  if (!normalizedBase) {
    return {
      base: '',
      modifiers: [],
      note: '',
      confidence: 'low',
      unsupportedHits: [],
      intensityShifts: [],
      conflictWarnings: [],
    };
  }

  // Check for seeded prompt (no user refinement yet)
  const seededVariants = new Set([
    `${normalizedBase}, but…`,
    `${normalizedBase}, but...`,
    `${normalizedBase}, but`,
    `${normalizedBase}, but …`,
    `${normalizedBase}, but ...`,
  ]);

  const rawNoCase = rawOriginal.toLowerCase();
  const baseNoCase = normalizedBase.toLowerCase();

  const isOnlySeeded =
    rawOriginal.length === 0 ||
    seededVariants.has(rawOriginal) ||
    rawNoCase === `${baseNoCase}, but…` ||
    rawNoCase === `${baseNoCase}, but...` ||
    rawNoCase === `${baseNoCase}, but` ||
    (rawNoCase.startsWith(`${baseNoCase}, but`) &&
      rawNoCase.replace(`${baseNoCase}, but`, '').trim().length === 0);

  if (isOnlySeeded) {
    return {
      base: normalizedBase,
      modifiers: [],
      note: `Interpreting this as: ${normalizedBase}`,
      confidence: 'high',
      unsupportedHits: [],
      intensityShifts: [],
      conflictWarnings: [],
    };
  }

  // Parse user clause
  let clause = rawNoCase;
  if (clause.startsWith(baseNoCase)) {
    clause = clause.slice(baseNoCase.length);
  }

  const butIdx = clause.indexOf('but');
  if (butIdx >= 0) {
    clause = clause.slice(butIdx + 3);
  }

  clause = clause.trim();

  // Normalize punctuation
  const normalized = clause
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^a-z0-9\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Detect modifiers
  const foundModifiers = new Set<string>();
  const intensityShifts: string[] = [];

  // Check all modifier buckets
  for (const [label, keywords] of Object.entries(MODIFIER_BUCKETS)) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      foundModifiers.add(label);
    }
  }

  // Check phrase hints
  for (const hint of PHRASE_HINTS) {
    if (normalized.includes(hint.phrase)) {
      hint.adds.forEach((mod) => foundModifiers.add(mod));
      
      if (hint.phrase.startsWith('more ') || hint.phrase.startsWith('less ')) {
        intensityShifts.push(hint.phrase);
      }
    }
  }

  // Handle negations
  for (const [phrase, modifierToRemove] of Object.entries(NEGATION_PATTERNS)) {
    if (normalized.includes(phrase)) {
      foundModifiers.delete(modifierToRemove);
    }
  }

  // Detect conflicts
  const conflictWarnings: string[] = [];
  const modArray = Array.from(foundModifiers);
  
  for (const [mod1, mod2] of CONFLICTING_PAIRS) {
    if (modArray.includes(mod1) && modArray.includes(mod2)) {
      conflictWarnings.push(`${mod1} + ${mod2} creates intentional tension`);
    }
  }

  // Detect seasonal context
  let seasonalContext: string | undefined;
  for (const [keyword, season] of Object.entries(SEASONAL_KEYWORDS)) {
    if (normalized.includes(keyword)) {
      seasonalContext = season;
      break;
    }
  }

  // Detect era context
  let eraContext: string | undefined;
  for (const [keyword, era] of Object.entries(ERA_KEYWORDS)) {
    if (normalized.includes(keyword)) {
      eraContext = era;
      break;
    }
  }

  // Check for unsupported aesthetics
  const supportedCores = new Set([
    'poetcore', 'gummycore', 'gummy', 'cultcore', 'gorpcore',
    'blokecore', 'normcore', 'cottagecore', 'dark academia'
  ]);

  const unsupportedPhrases = [
    'coastal grandma', 'weird girl', 'tomato girl', 'mob wife',
    'clean girl', 'old money', 'that girl', 'vanilla girl'
  ];

  const coreMatches = normalized.match(/\b[a-z]+core\b/g) ?? [];
  const unknownCores = coreMatches.filter((c) => !supportedCores.has(c));
  
  const unsupportedFound = unsupportedPhrases.filter((p) => normalized.includes(p));
  const unsupportedHits = [...new Set([...unknownCores, ...unsupportedFound])];

  // Generate confidence & note
  const modifiers = Array.from(foundModifiers);
  
  let confidence: Confidence;
  if (unsupportedHits.length > 0 && modifiers.length === 0) {
    confidence = 'low';
  } else if (modifiers.length > 0) {
    confidence = 'high';
  } else {
    confidence = 'med';
  }

  // Build interpretation note
  let note = '';
  
  if (unsupportedHits.length > 0 && modifiers.length === 0) {
    note = `We don't yet analyze "${unsupportedHits[0]}" directly — interpreting as closest to ${normalizedBase}`;
  } else if (modifiers.length > 0) {
    const parts: string[] = [`${normalizedBase}`];
    parts.push(`→ ${modifiers.join(' / ')}`);
    
    if (eraContext) {
      parts.push(`(${eraContext} influence)`);
    }
    
    if (seasonalContext) {
      parts.push(`[${seasonalContext}]`);
    }
    
    note = `Interpreting this as: ${parts.join(' ')}`;
    
    if (conflictWarnings.length > 0) {
      note += ` • Note: ${conflictWarnings[0]}`;
    }
  } else {
    note = `Interpreting this as: ${normalizedBase}`;
  }

  return {
    base: normalizedBase,
    modifiers,
    note,
    confidence,
    unsupportedHits,
    intensityShifts,
    conflictWarnings,
    seasonalContext,
    eraContext,
  };
};

// --- HELPER: Generate example refinements ---

export const generateExampleRefinements = (baseAesthetic: string): string[] => {
  const examples: Record<string, string[]> = {
    'poetcore': [
      'more romantic and soft',
      'with a darker, moodier edge',
      'leaning into vintage academia'
    ],
    'indie-chic-grunge': [
      'more polished and refined',
      'with 90s nostalgia',
      'less distressed, more intentional'
    ],
    'refined-clarity': [
      'with subtle feminine touches',
      'leaning into architectural shapes',
      'warmer neutrals'
    ],
    'rugged-luxury': [
      'more urban and modern',
      'softer, less technical',
      'with heritage craft details'
    ],
  };

  return examples[baseAesthetic] || [
    'more polished',
    'with darker tones',
    'leaning into vintage references'
  ];
};