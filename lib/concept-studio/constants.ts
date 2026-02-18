// Brand colors
export const BRAND = {
    ink: '#191919',
    oliveInk: '#43432B',
    rose: '#A97B8F',
    steelBlue: '#7D96AC',
    chartreuse: '#ABAB63',
    camel: '#B8876B',
  };

  // Supported aesthetics
  export const AESTHETICS = [
    'Terrain Luxe',
    'Quiet Structure',
    'Romantic Analog',
    'Heritage Hand',
    'Undone Glam',
    'Haptic Play',
    'High Voltage',
    'Sweet Subversion',
  ] as const;

  export const TOP_SUGGESTED = AESTHETICS.slice(0, 2);

  // Aesthetic descriptions and scores
  export const AESTHETIC_CONTENT: Record<string, { description: string; identityScore: number; resonanceScore: number }> = {
    'Terrain Luxe': {
      identityScore: 84,
      resonanceScore: 78,
      description:
        'Elevated outdoorsman aesthetic: durability meets high-end design, "guardian" utility details (secure pockets, resilient hardware), grounded earthy tones signaling stability and transseasonal protection.',
    },
    'Quiet Structure': {
      identityScore: 88,
      resonanceScore: 92,
      description:
        'Strongest alignment with minimalist brand DNA: clear, intentional, restrained. Column silhouettes, tonal layering, matte fabrics, architectural draping.',
    },
    'Romantic Analog': {
      identityScore: 81,
      resonanceScore: 75,
      description:
        'Evolved academia-romantic direction: vintage blazers, oversized knits, cinematic romance. Built around "analog intention," tactile heritage textures, and future-vintage knitwear.',
    },
    'Heritage Hand': {
      identityScore: 86,
      resonanceScore: 80,
      description:
        'Story-and-soul design fusing heritage with contemporary silhouettes: natural fibers, hand-woven texture, craft provenance, closely linked to sustainability, circularity, and modern heirloom quality.',
    },
    'Undone Glam': {
      identityScore: 77,
      resonanceScore: 73,
      description:
        'A reclamation of intentionally messy, personality-forward styling: layered textures, nostalgic items, playful prints, carefree anti-polish energy replacing "clean girl" sameness.',
    },
    'Haptic Play': {
      identityScore: 79,
      resonanceScore: 89,
      description:
        'Haptic minimalism with squishy, bouncy, jelly-like finishes: rubberized details, inflated accessories, playful sensory cues tapping into nostalgia and "ASMR-adjacent" comfort.',
    },
    'High Voltage': {
      identityScore: 76,
      resonanceScore: 82,
      description:
        'Maximum impact dressing: sequin saturation, bold shoulders, metallic knits, statement jewelry, power colors, high-shine fabrication. Confidence as a design language.',
    },
    'Sweet Subversion': {
      identityScore: 74,
      resonanceScore: 85,
      description:
        'Emotional support design built on kawaii + toy logic: chunky forms, bold color blocking, miniature indulgences, "cute tech" that softens interactions and prioritizes warmth and imaginative play.',
    },
  };
