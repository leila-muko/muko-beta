'use client';

import React, { useState } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { COLOR_PALETTES, ColorPalette } from '@/lib/data/colorPalettes';

export const ColorPaletteSelector: React.FC = () => {
  const { colorPaletteName, setColorPalette } = useSessionStore();
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(
    colorPaletteName ? COLOR_PALETTES.find(p => p.name === colorPaletteName) || null : null
  );

  const handleSelectPalette = (palette: ColorPalette) => {
    setSelectedPalette(palette);
    setColorPalette(palette.colors, palette.name);
  };

  return (
    <div className="mb-6">
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        Palette Selector (Optional)
      </label>
      
      {/* Info tooltip */}
      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2 text-xs text-blue-800">
          <span className="text-sm flex-shrink-0">ℹ️</span>
          <p>
            Choose colors to personalize your report. Color palette appears in your final analysis.
          </p>
        </div>
      </div>

      {/* Palette grid */}
      <div className="grid grid-cols-2 gap-3">
        {COLOR_PALETTES.map((palette) => (
          <button
            key={palette.id}
            onClick={() => handleSelectPalette(palette)}
            className={`
              p-3 rounded-lg border-2 transition-all text-left
              ${
                selectedPalette?.id === palette.id
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-900">
                {palette.name}
              </span>
              {selectedPalette?.id === palette.id && (
                <span className="text-blue-600 text-sm">✓</span>
              )}
            </div>
            
            {/* Color dots */}
            <div className="flex gap-1 mb-1">
              {palette.colors.slice(0, 5).map((color, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-md border border-gray-300"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            
            <p className="text-xs text-gray-600">
              {palette.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};