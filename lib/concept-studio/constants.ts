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
        'Elevated earthwork materials, refined construction. Utility with a luxury point of view.',
    },
    'Quiet Structure': {
      identityScore: 88,
      resonanceScore: 92,
      description:
        'Architectural restraint, precise tailoring. Clean lines that speak before color does.',
    },
    'Romantic Analog': {
      identityScore: 81,
      resonanceScore: 75,
      description:
        'Soft fabrication, historical reference. Emotional dressing without sentimentality.',
    },
    'Heritage Hand': {
      identityScore: 86,
      resonanceScore: 80,
      description:
        'Craft-forward silhouettes rooted in heritage. Hand-finished texture, modern shape.',
    },
    'Undone Glam': {
      identityScore: 77,
      resonanceScore: 73,
      description:
        'Intentional imperfection as design language. Liberated, personality-forward layering.',
    },
    'Haptic Play': {
      identityScore: 79,
      resonanceScore: 89,
      description:
        'Material innovation as emotional design. Tactile surfaces, inflated forms.',
    },
    'High Voltage': {
      identityScore: 76,
      resonanceScore: 82,
      description:
        'Maximum impact as everyday language. Shine and boldness as wardrobe staples.',
    },
    'Sweet Subversion': {
      identityScore: 74,
      resonanceScore: 85,
      description:
        'Childhood references, adult sophistication. Warmth and imagination in wearable form.',
    },
  };
