export type GarmentRoleLabel = "Hero" | "Volume Driver" | "Core Evolution" | "Directional Signal";

export interface GarmentArchetype {
  category: string;
  archetype: string;
  silhouette_rules: string[];
  construction_rules: string[];
  behavior_rules: string[];
  allowed_finishes: string[];
  disallowed_behaviors: string[];
}

const ARCHETYPES: GarmentArchetype[] = [
  {
    category: "jean",
    archetype: "cigarette",
    silhouette_rules: [
      "slim through hip and thigh",
      "straight line from knee to ankle",
      "ankle-length or slightly cropped",
      "minimal break at hem",
    ],
    construction_rules: [
      "structured waistband",
      "five-pocket construction or equivalent",
      "clean seam lines",
    ],
    behavior_rules: [
      "fabric must hold shape",
      "should not collapse or drape fluidly",
      "maintains a clean vertical line",
    ],
    allowed_finishes: ["matte", "tonal", "clean wash", "minimal hardware"],
    disallowed_behaviors: [
      "fluid drape",
      "silk-like movement",
      "clingy shaping",
      "overly decorative surface",
    ],
  },
  {
    category: "jean",
    archetype: "straight",
    silhouette_rules: [
      "straight through hip and leg",
      "clean vertical line from thigh to hem",
      "full length or ankle length",
    ],
    construction_rules: [
      "structured waistband",
      "five-pocket construction or equivalent",
      "clean topstitching",
    ],
    behavior_rules: [
      "holds a steady leg line",
      "should not cling to the body",
      "stays structured through wear",
    ],
    allowed_finishes: ["clean wash", "tonal", "matte", "minimal hardware"],
    disallowed_behaviors: ["fluid drape", "collapsed leg", "ornamental surface"],
  },
  {
    category: "blazer",
    archetype: "tailored",
    silhouette_rules: [
      "defined shoulder line",
      "controlled upper-body shape",
      "clean front closure",
    ],
    construction_rules: [
      "tailored collar and lapel structure",
      "set-in sleeve or equivalent tailored armhole",
      "clean seam placement",
    ],
    behavior_rules: [
      "holds its frame",
      "should not collapse like a shirt",
      "keeps a clear front line",
    ],
    allowed_finishes: ["matte", "tonal", "clean press", "minimal trim"],
    disallowed_behaviors: ["fluid drape", "slouchy collapse", "overworked decoration"],
  },
  {
    category: "blazer",
    archetype: "soft-shoulder",
    silhouette_rules: [
      "controlled body shape",
      "eased shoulder line",
      "clean front and hem",
    ],
    construction_rules: [
      "tailored collar and lapel structure",
      "set-in sleeve or equivalent tailored armhole",
      "clean seam placement",
    ],
    behavior_rules: [
      "keeps a tailored front",
      "softens only at the shoulder edge",
      "does not collapse through the body",
    ],
    allowed_finishes: ["matte", "tonal", "clean press", "minimal trim"],
    disallowed_behaviors: ["shirt-like drape", "collapsed front", "decorative overload"],
  },
  {
    category: "dress",
    archetype: "draped",
    silhouette_rules: [
      "falls close to the body",
      "controlled movement through one area of drape",
      "clean hem line",
    ],
    construction_rules: [
      "clean neckline finish",
      "resolved waist or side seam control",
      "clean seam transitions",
    ],
    behavior_rules: [
      "moves with control",
      "should not hold a rigid tailored frame",
      "keeps a continuous line through the body",
    ],
    allowed_finishes: ["low-shine", "tonal", "clean surface"],
    disallowed_behaviors: ["boxy stiffness", "hard tailored break", "heavy surface decoration"],
  },
  {
    category: "dress",
    archetype: "slip",
    silhouette_rules: [
      "narrow body-skimming line",
      "clean shoulder to hem fall",
      "minimal break at the body",
    ],
    construction_rules: [
      "clean strap or neckline finish",
      "minimal seam interruption",
      "clean hem",
    ],
    behavior_rules: [
      "moves lightly through the body",
      "should not read tailored",
      "keeps a continuous vertical line",
    ],
    allowed_finishes: ["low-shine", "tonal", "clean surface"],
    disallowed_behaviors: ["rigid structure", "heavy hardware", "bulky construction"],
  },
  {
    category: "trouser",
    archetype: "straight",
    silhouette_rules: [
      "clean line from hip to hem",
      "controlled straight leg",
      "minimal break",
    ],
    construction_rules: [
      "structured waistband",
      "clean closure",
      "pressed seam or equivalent clean leg line",
    ],
    behavior_rules: [
      "holds a clean vertical line",
      "should not collapse like soft loungewear",
      "keeps leg clarity in motion",
    ],
    allowed_finishes: ["pressed", "tonal", "matte"],
    disallowed_behaviors: ["fluid collapse", "clingy shaping", "decorative excess"],
  },
  {
    category: "trouser",
    archetype: "wide",
    silhouette_rules: [
      "clean set through waist and hip",
      "full leg volume from upper thigh down",
      "long uninterrupted line",
    ],
    construction_rules: [
      "structured waistband",
      "clean closure",
      "clean side seam line",
    ],
    behavior_rules: [
      "falls in a controlled column",
      "should not taper sharply",
      "keeps volume without collapse",
    ],
    allowed_finishes: ["pressed", "tonal", "matte"],
    disallowed_behaviors: ["clingy shaping", "ankle taper", "ornamental surface"],
  },
  {
    category: "skirt",
    archetype: "a-line",
    silhouette_rules: [
      "clean set through waist and hip",
      "controlled sweep through hem",
      "long uninterrupted line",
    ],
    construction_rules: [
      "structured waistband",
      "clean closure",
      "clean side seam line",
    ],
    behavior_rules: [
      "falls in a controlled column",
      "should not taper sharply",
      "keeps volume without collapse",
    ],
    allowed_finishes: ["pressed", "tonal", "matte"],
    disallowed_behaviors: ["clingy shaping", "ankle taper", "ornamental surface"],
  },
  {
    category: "shirt",
    archetype: "classic",
    silhouette_rules: [
      "clean body line",
      "controlled fit through shoulder and torso",
      "resolved hem and cuff",
    ],
    construction_rules: [
      "clean neckline",
      "clean shoulder transition",
      "resolved rib or edge finish",
    ],
    behavior_rules: [
      "follows the body without collapse",
      "should not read bulky unless stated",
      "keeps a clean surface",
    ],
    allowed_finishes: ["tonal", "clean face", "matte"],
    disallowed_behaviors: ["hard tailored frame", "ornamental clutter", "overworked texture"],
  },
  {
    category: "shirt",
    archetype: "blouse",
    silhouette_rules: [
      "clean body line",
      "controlled fit through shoulder and torso",
      "resolved hem and cuff",
    ],
    construction_rules: [
      "clean neckline",
      "clean shoulder transition",
      "resolved rib or edge finish",
    ],
    behavior_rules: [
      "follows the body without collapse",
      "should not read bulky unless stated",
      "keeps a clean surface",
    ],
    allowed_finishes: ["tonal", "clean face", "matte"],
    disallowed_behaviors: ["hard tailored frame", "ornamental clutter", "overworked texture"],
  },
  {
    category: "shirt",
    archetype: "tee",
    silhouette_rules: [
      "clean body line",
      "controlled fit through shoulder and torso",
      "resolved hem and cuff",
    ],
    construction_rules: [
      "clean neckline",
      "clean shoulder transition",
      "resolved rib or edge finish",
    ],
    behavior_rules: [
      "follows the body without collapse",
      "should not read bulky unless stated",
      "keeps a clean surface",
    ],
    allowed_finishes: ["tonal", "clean face", "matte"],
    disallowed_behaviors: ["hard tailored frame", "ornamental clutter", "overworked texture"],
  },
  {
    category: "shirt",
    archetype: "polo",
    silhouette_rules: [
      "clean body line",
      "controlled fit through shoulder and torso",
      "resolved hem and cuff",
    ],
    construction_rules: [
      "clean neckline",
      "clean shoulder transition",
      "resolved rib or edge finish",
    ],
    behavior_rules: [
      "follows the body without collapse",
      "should not read bulky unless stated",
      "keeps a clean surface",
    ],
    allowed_finishes: ["tonal", "clean face", "matte"],
    disallowed_behaviors: ["hard tailored frame", "ornamental clutter", "overworked texture"],
  },
  {
    category: "shirt",
    archetype: "vest",
    silhouette_rules: [
      "clean body line",
      "controlled fit through shoulder and torso",
      "resolved hem and cuff",
    ],
    construction_rules: [
      "clean neckline",
      "clean shoulder transition",
      "resolved rib or edge finish",
    ],
    behavior_rules: [
      "follows the body without collapse",
      "should not read bulky unless stated",
      "keeps a clean surface",
    ],
    allowed_finishes: ["tonal", "clean face", "matte"],
    disallowed_behaviors: ["hard tailored frame", "ornamental clutter", "overworked texture"],
  },
  {
    category: "knit",
    archetype: "fine-gauge",
    silhouette_rules: [
      "clean body line",
      "controlled fit through shoulder and torso",
      "resolved hem and cuff",
    ],
    construction_rules: [
      "clean neckline",
      "clean shoulder transition",
      "resolved rib or edge finish",
    ],
    behavior_rules: [
      "follows the body without collapse",
      "should not read bulky unless stated",
      "keeps a clean surface",
    ],
    allowed_finishes: ["tonal", "clean face", "matte"],
    disallowed_behaviors: ["hard tailored frame", "ornamental clutter", "overworked texture"],
  },
  {
    category: "outerwear",
    archetype: "oversized",
    silhouette_rules: [
      "expanded body and sleeve proportion",
      "clear shoulder and hem shape",
      "strong outer silhouette",
    ],
    construction_rules: [
      "structured collar or neckline",
      "clean closure",
      "clean panel or seam structure",
    ],
    behavior_rules: [
      "holds volume away from the body",
      "should not collapse like a cardigan",
      "keeps a strong outer line",
    ],
    allowed_finishes: ["matte", "tonal", "clean hardware"],
    disallowed_behaviors: ["soft collapse", "clingy line", "decorative overload"],
  },
];

const CATEGORY_KEYWORDS: Array<{ category: string; terms: string[] }> = [
  { category: "jean", terms: ["jean", "denim"] },
  { category: "blazer", terms: ["blazer"] },
  { category: "skirt", terms: ["slip skirt", "slip-skirt", "skirt", "mini skirt", "mini-skirt", "maxi skirt", "maxi-skirt"] },
  { category: "dress", terms: ["dress", "gown"] },
  { category: "shorts", terms: ["micro shorts", "micro-shorts", "short shorts", "short-shorts", "short", "shorts"] },
  { category: "trouser", terms: ["trouser", "pant", "pants"] },
  { category: "shirt", terms: ["shirt", "button-down", "button down", "blouse", "tee", "t-shirt", "t shirt", "polo", "vest", "waistcoat"] },
  { category: "knit", terms: ["knit", "sweater", "cardigan"] },
  { category: "outerwear", terms: ["coat", "jacket", "trench", "parka", "outerwear"] },
];

const ARCHETYPE_KEYWORDS: Array<{ archetype: string; terms: string[] }> = [
  { archetype: "cigarette", terms: ["cigarette"] },
  { archetype: "straight", terms: ["straight"] },
  { archetype: "oversized", terms: ["oversized"] },
  { archetype: "tailored", terms: ["tailored"] },
  { archetype: "soft-shoulder", terms: ["soft shoulder", "soft-shoulder"] },
  { archetype: "slip", terms: ["slip"] },
  { archetype: "draped", terms: ["draped", "drape", "wrap"] },
  { archetype: "wide", terms: ["wide", "wide leg", "wide-leg"] },
  { archetype: "a-line", terms: ["a-line", "aline", "skirt"] },
  { archetype: "classic", terms: ["shirt", "button-down", "button down"] },
  { archetype: "blouse", terms: ["blouse"] },
  { archetype: "tee", terms: ["tee", "t-shirt", "t shirt"] },
  { archetype: "polo", terms: ["polo"] },
  { archetype: "vest", terms: ["vest", "waistcoat"] },
  { archetype: "fine-gauge", terms: ["fine gauge", "fine-gauge", "fine knit"] },
];

function normalizeInput(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

export function inferGarmentArchetype(input: string): GarmentArchetype {
  const normalized = normalizeInput(input);

  const category =
    CATEGORY_KEYWORDS.find((entry) => includesAny(normalized, entry.terms))?.category ??
    "piece";

  const archetypeKeyword = ARCHETYPE_KEYWORDS.find((entry) => includesAny(normalized, entry.terms))?.archetype;
  const exact =
    ARCHETYPES.find((entry) => entry.category === category && entry.archetype === archetypeKeyword) ??
    ARCHETYPES.find((entry) => entry.category === category);

  if (exact) return exact;

  return {
    category,
    archetype: archetypeKeyword ?? "default",
    silhouette_rules: ["keep the garment recognizable through its line and proportion"],
    construction_rules: ["use clean, category-correct construction logic"],
    behavior_rules: ["the garment should behave like its category, not another one"],
    allowed_finishes: ["tonal", "matte", "clean finish"],
    disallowed_behaviors: ["category contradiction", "invented movement", "decorative overload"],
  };
}

export function inferRoleFromArchetype(input: string, archetype: GarmentArchetype): GarmentRoleLabel {
  const normalized = normalizeInput(input);
  if (includesAny(normalized, ["coat", "cape", "gown"])) return "Hero";
  if (includesAny(normalized, ["draped", "oversized", "soft shoulder", "wrap"])) return "Directional Signal";
  if (includesAny(normalized, ["jean", "shirt", "knit"])) return "Volume Driver";
  if (archetype.category === "trouser" || archetype.category === "blazer") return "Core Evolution";
  return "Core Evolution";
}

export function buildArchetypeFallbackExpression(
  input: string,
  archetype: GarmentArchetype,
  context: { direction: string; silhouette: string; palette: string; saturation?: string }
) {
  const pieceName = input
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const primaryLine = archetype.silhouette_rules[0] ?? "clean category-correct line";
  const secondaryLine = archetype.silhouette_rules[1] ?? "resolved proportion";
  const marketNote =
    context.saturation === "crowded"
      ? "so it does not disappear into market sameness"
      : context.saturation === "open"
      ? "so it establishes a clear position in the assortment"
      : "so it holds a clear place in the assortment";

  if (archetype.category === "jean") {
    return `${pieceName} should work through a controlled, vertical line rather than added information. Keep the proportion disciplined so it reads as a core anchor ${marketNote}.`;
  }

  if (archetype.category === "blazer") {
    return `${pieceName} should hold a clear line through the body and stay controlled in how it occupies the silhouette. Let it support the collection through proportion and restraint, not extra complexity.`;
  }

  if (archetype.category === "dress") {
    return `${pieceName} should carry the direction through line and movement, not decoration. Anchor it through a controlled silhouette so it reads distinct rather than overworked.`;
  }

  if (archetype.category === "trouser") {
    return `${pieceName} should read through line and proportion first. Keep the shape controlled enough to support the assortment without slipping into a standard trouser read.`;
  }

  if (archetype.category === "knit") {
    return `${pieceName} should stabilize the assortment through surface restraint and a clear silhouette. Let it anchor the ${context.palette.toLowerCase()} palette without flattening the direction.`;
  }

  return `${pieceName} should ${primaryLine} and ${secondaryLine}. Control the proportion so it sits in the assortment with clarity and supports the ${context.direction.toLowerCase()} direction without over-explaining itself.`;
}

export function validateArchetypeOutput(
  output: { read?: string | null; refined_expression?: string | null },
  archetype: GarmentArchetype
) {
  const combined = `${output.read ?? ""} ${output.refined_expression ?? ""}`.toLowerCase();
  const hasDisallowed = archetype.disallowed_behaviors.some((term) => combined.includes(term.toLowerCase()));
  const mentionsMaterial = /\b(cotton|wool|silk|denim|leather|linen|viscose|tencel|cashmere|nylon|polyester|satin)\b/i.test(combined);
  const violatesCategory =
    archetype.category === "jean" && /\bblazer|dress|shirt\b/i.test(combined)
      ? true
      : archetype.category === "blazer" && /\bjean|dress|skirt\b/i.test(combined)
      ? true
      : archetype.category === "dress" && /\bjean|blazer|trouser\b/i.test(combined)
      ? true
      : false;

  return {
    valid: !hasDisallowed && !mentionsMaterial && !violatesCategory,
    hasDisallowed,
    mentionsMaterial,
    violatesCategory,
  };
}
