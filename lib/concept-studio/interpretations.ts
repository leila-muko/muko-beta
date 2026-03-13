export type DirectionModifierKey =
  | "sensual_draping"
  | "romantic_restraint"
  | "heritage_tailoring"
  | "fluid_minimalism"
  | "sculptural_volume"
  | "soft_suiting"
  | "artisanal_finish"
  | "tonal_restraint";

export interface DirectionModifierDefinition {
  key: DirectionModifierKey;
  label: string;
  relatedConcepts: string[];
  keywords: string[];
  adds: string[];
  suppresses: string[];
  silhouetteBiases: string[];
  paletteBiases: string[];
  chipBiases: string[];
  pieceBiases: string[];
  toneDescriptors: string[];
}

export const DIRECTION_MODIFIERS: DirectionModifierDefinition[] = [
  {
    key: "sensual_draping",
    label: "sensual draping",
    relatedConcepts: ["Soft", "Tactile", "Feminine"],
    keywords: ["sensual", "drape", "draping", "body-aware", "bias", "slip", "fluid fabric", "softly wrapped"],
    adds: ["fluidity", "tactility", "body-awareness"],
    suppresses: ["severity", "rigid geometry"],
    silhouetteBiases: ["relaxed", "straight"],
    paletteBiases: ["warm_neutrals", "muted_pastels"],
    chipBiases: ["fluid drape", "body-aware lines", "matte-lustre contrast", "softened tailoring"],
    pieceBiases: ["Soft Drape Column Dress", "Fluid Wrap Coat", "Bias Panel Skirt", "Second-skin Knit Top"],
    toneDescriptors: ["more tactile", "more body-aware", "less severe"],
  },
  {
    key: "romantic_restraint",
    label: "romantic restraint",
    relatedConcepts: ["Soft", "Polished", "Minimalist"],
    keywords: ["romantic restraint", "romantic", "restraint", "vintage", "soft romance", "poetic", "delicate"],
    adds: ["romance", "softness", "controlled emotion"],
    suppresses: ["hard severity", "overt drama"],
    silhouetteBiases: ["straight", "relaxed"],
    paletteBiases: ["muted_pastels", "warm_neutrals"],
    chipBiases: ["powdered neutrals", "soft structure", "poetic layering", "delicate finish"],
    pieceBiases: ["Soft Tie-neck Blouse", "Skim Column Skirt", "Romantic Shell Dress"],
    toneDescriptors: ["more emotional", "more softened", "still disciplined"],
  },
  {
    key: "heritage_tailoring",
    label: "heritage tailoring",
    relatedConcepts: ["Polished", "Organic", "Masculine"],
    keywords: ["heritage tailoring", "tailoring", "heritage", "tradition", "sartorial", "classic suiting", "old-world"],
    adds: ["structure", "craft authority", "tailored rigor"],
    suppresses: ["casual looseness"],
    silhouetteBiases: ["structured", "straight"],
    paletteBiases: ["warm_neutrals", "earth_tones"],
    chipBiases: ["tailored authority", "heirloom texture", "measured structure", "refined utility"],
    pieceBiases: ["Heritage Waistcoat", "Precise Longline Blazer", "Pressed Pleat Trouser"],
    toneDescriptors: ["more tailored", "more assured", "more heritage-led"],
  },
  {
    key: "fluid_minimalism",
    label: "fluid minimalism",
    relatedConcepts: ["Soft", "Polished", "Minimalist"],
    keywords: ["fluid minimalism", "fluid", "minimal", "quiet sensuality", "ease", "clean drape", "supple"],
    adds: ["ease", "clean movement", "soft polish"],
    suppresses: ["overbuilt detail"],
    silhouetteBiases: ["relaxed", "straight"],
    paletteBiases: ["cool_mineral", "warm_neutrals"],
    chipBiases: ["clean drape", "soft minimal layers", "quiet shine", "supple tailoring"],
    pieceBiases: ["Fluid Longline Vest", "Relaxed Column Pant", "Supple Wrap Dress"],
    toneDescriptors: ["more relaxed", "more fluid", "still clean"],
  },
  {
    key: "sculptural_volume",
    label: "sculptural volume",
    relatedConcepts: ["Sculptural", "Polished"],
    keywords: ["sculptural volume", "volume", "voluminous", "sculptural", "architectural", "cocoon", "exaggerated"],
    adds: ["drama", "shape", "editorial lift"],
    suppresses: ["flatness", "overly literal tailoring"],
    silhouetteBiases: ["oversized", "structured"],
    paletteBiases: ["cool_mineral", "tonal_darks"],
    chipBiases: ["exaggerated proportion", "cocoon shape", "shadow play", "architectural fold"],
    pieceBiases: ["Cocoon Coat", "Volume Sleeve Dress", "Balloon Hem Skirt"],
    toneDescriptors: ["more dramatic", "more sculptural", "more directional"],
  },
  {
    key: "soft_suiting",
    label: "soft suiting",
    relatedConcepts: ["Soft", "Polished", "Masculine"],
    keywords: ["soft suiting", "soft tailoring", "relaxed tailoring", "slouchy suiting", "unstructured"],
    adds: ["ease", "tailored softness", "commercial wearability"],
    suppresses: ["harsh construction"],
    silhouetteBiases: ["relaxed", "structured"],
    paletteBiases: ["warm_neutrals", "cool_mineral"],
    chipBiases: ["unstructured tailoring", "soft shoulder", "easy trouser", "quiet polish"],
    pieceBiases: ["Soft Shoulder Blazer", "Easy Pleat Trouser", "Relaxed Suit Vest"],
    toneDescriptors: ["more approachable", "more wearable", "still elevated"],
  },
  {
    key: "artisanal_finish",
    label: "artisanal finish",
    relatedConcepts: ["Organic", "Raw", "Tactile"],
    keywords: ["artisanal finish", "artisanal", "hand-finished", "handmade", "craft", "worked surface", "stitched"],
    adds: ["craft depth", "surface richness", "human touch"],
    suppresses: ["sterility", "machine-perfect finish"],
    silhouetteBiases: ["structured", "relaxed"],
    paletteBiases: ["earth_tones", "warm_neutrals"],
    chipBiases: ["worked surface", "hand-finished detail", "textural layering", "craft tension"],
    pieceBiases: ["Hand-finished Utility Jacket", "Worked Seam Dress", "Textured Knit Tunic"],
    toneDescriptors: ["more tactile", "more crafted", "more human"],
  },
  {
    key: "tonal_restraint",
    label: "tonal restraint",
    relatedConcepts: ["Polished", "Minimalist"],
    keywords: ["tonal restraint", "tonal", "monochrome", "restraint", "quiet palette", "disciplined color"],
    adds: ["discipline", "clarity", "luxury quietness"],
    suppresses: ["high contrast", "excessive color play"],
    silhouetteBiases: ["straight", "structured"],
    paletteBiases: ["tonal_darks", "cool_mineral"],
    chipBiases: ["monochrome discipline", "quiet contrast", "tonal depth", "matte restraint"],
    pieceBiases: ["Monochrome Longline Coat", "Tonal Shell Layer", "Precise Column Skirt"],
    toneDescriptors: ["more distilled", "more tonal", "more controlled"],
  },
];

export const SUGGESTED_INTERPRETATION_CHIPS = DIRECTION_MODIFIERS.map((modifier) => modifier.label);

export function getDirectionModifierByLabel(label: string): DirectionModifierDefinition | undefined {
  const normalized = label.trim().toLowerCase();
  return DIRECTION_MODIFIERS.find((modifier) => modifier.label === normalized);
}
