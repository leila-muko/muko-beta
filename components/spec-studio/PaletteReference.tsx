'use client';

import type { PaletteColor } from '@/lib/types/spec-studio';

interface PaletteReferenceProps {
  aestheticName: string;
  palette: PaletteColor[];
}

export default function PaletteReference({ aestheticName, palette }: PaletteReferenceProps) {
  if (palette.length === 0) return null;

  return (
    <div className="p-4 rounded-[10px] bg-[#FAF8F4] border border-[#E8E3D6]">
      <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#43432B]/35 block mb-2.5">
        Aesthetic Palette · {aestheticName}
      </label>

      <div className="flex gap-1.5 mb-2">
        {palette.map((color, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full h-8 rounded-md border border-black/[0.03]"
              style={{ backgroundColor: color.hex }}
            />
            <span className="text-[9px] text-[#43432B]/35">
              {color.name}
            </span>
          </div>
        ))}
      </div>

      <span className="text-[10px] text-[#43432B]/30">
        Recommended colors for your aesthetic direction
      </span>
    </div>
  );
}
