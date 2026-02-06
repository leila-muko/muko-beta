// Brand colors
export const BRAND = {
    ink: '#191919',
    oliveInk: '#43432B',
    rose: '#A97B8F',
    steelBlue: '#7D96AC',
    chartreuse: '#ABAB63',
  };
  
  // Supported aesthetics
  export const AESTHETICS = [
    'Rugged Luxury',
    'Refined Clarity',
    'Poetcore',
    'Modern Craft',
    'Indie Chic Grunge',
    'Gummy',
    'Glamoratti',
    'Cult of Cute',
  ] as const;
  
  export const TOP_SUGGESTED = AESTHETICS.slice(0, 2);
  
  // Aesthetic descriptions and scores
  export const AESTHETIC_CONTENT: Record<string, { description: string; identityScore: number; resonanceScore: number }> = {
    Poetcore: {
      identityScore: 81,
      resonanceScore: 75,
      description:
        'An evolved academia-romantic direction blending vintage blazers, oversized knits, and cinematic romance—built around "analog intention," tactile heritage textures, and future-vintage knitwear.',
    },
    'Rugged Luxury': {
      identityScore: 84,
      resonanceScore: 78,
      description:
        'An elevated outdoorsman aesthetic: durability meets high-end design, with "guardian" utility details (secure pockets, deterrents, resilient hardware) and grounded earthy tones that signal stability and transseasonal protection.',
    },
    Glamoratti: {
      identityScore: 76,
      resonanceScore: 82,
      description:
        'A loud self-expression shift after quiet luxury—defined by power silhouettes (sculpted shoulders, nipped waists, oversized tailoring) and bold gold/lamé accents that treat maximalism as confidence and social currency.',
    },
    Gummy: {
      identityScore: 79,
      resonanceScore: 89,
      description:
        'Haptic minimalism with squishy, bouncy, jelly-like finishes—rubberized details, inflated accessories, and playful sensory cues that tap into nostalgia and "ASMR-adjacent" comfort in a digital world.',
    },
    'Refined Clarity': {
      identityScore: 88,
      resonanceScore: 92,
      description:
        'Minimalism 2.0: structural precision, contrast, and visual authority—monochrome palettes that spotlight tailoring and material quality, with fluid-but-intentional silhouettes and "form follows function" refinement.',
    },
    'Modern Craft': {
      identityScore: 86,
      resonanceScore: 80,
      description:
        'Story-and-soul design that fuses heritage with contemporary silhouettes—natural fibers, hand-woven texture, and craft provenance, closely linked to sustainability, circularity, and modern heirloom quality.',
    },
    'Indie Chic Grunge': {
      identityScore: 77,
      resonanceScore: 73,
      description:
        'A "new 2016" reclamation: intentionally messy, personality-forward styling—layered textures, nostalgic items, playful prints, and a carefree anti-polish energy replacing "clean girl" sameness.',
    },
    'Cult of Cute': {
      identityScore: 74,
      resonanceScore: 85,
      description:
        'Emotional support design built on kawaii + toy logic—chunky forms, bold color blocking, miniature indulgences, and "cute tech" that softens interactions and prioritizes warmth, comfort, and imaginative play.',
    },
  };