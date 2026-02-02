// lib/data/colorPalettes.ts

export interface ColorPalette {
    id: string;
    name: string;
    colors: string[];
    description: string;
  }
  
  export const COLOR_PALETTES: ColorPalette[] = [
    {
      id: 'earth-tones',
      name: 'Earth Tones',
      colors: ['#C19A6B', '#F5E6D3', '#8B4513', '#D2691E', '#F4A460'],
      description: 'Warm, natural browns and creams'
    },
    {
      id: 'neutrals',
      name: 'Neutrals',
      colors: ['#F5F5F5', '#E5E5E5', '#CCCCCC', '#A8A8A8', '#808080'],
      description: 'Versatile grays and whites'
    },
    {
      id: 'bold-brights',
      name: 'Bold Brights',
      colors: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'],
      description: 'Vibrant, energetic colors'
    },
    {
      id: 'jewel-tones',
      name: 'Jewel Tones',
      colors: ['#2A9D8F', '#E76F51', '#F4A261', '#E9C46A', '#264653'],
      description: 'Rich, sophisticated palette'
    },
    {
      id: 'pastels',
      name: 'Pastels',
      colors: ['#FADADD', '#E0BBE4', '#FFDFD3', '#D4F1F4', '#FFF5E1'],
      description: 'Soft, dreamy tones'
    },
    {
      id: 'monochrome',
      name: 'Monochrome',
      colors: ['#000000', '#404040', '#808080', '#C0C0C0', '#FFFFFF'],
      description: 'Classic black to white'
    }
  ];
  
  export function getPaletteById(id: string): ColorPalette | undefined {
    return COLOR_PALETTES.find(palette => palette.id === id);
  }
  
  export function getDefaultPalette(): ColorPalette {
    return COLOR_PALETTES[0]; // Earth Tones
  }