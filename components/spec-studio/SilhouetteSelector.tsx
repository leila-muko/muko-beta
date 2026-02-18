'use client';

import type { Silhouette } from '@/lib/types/spec-studio';

interface SilhouetteSelectorProps {
  silhouettes: Silhouette[];
  selectedSilhouetteId: string;
  onSelect: (silhouetteId: string) => void;
  categoryName: string;
}

export default function SilhouetteSelector({
  silhouettes,
  selectedSilhouetteId,
  onSelect,
  categoryName,
}: SilhouetteSelectorProps) {
  return (
    <div className="mb-7">
      <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#43432B] block mb-3">
        Silhouette
        <span className="text-[10px] font-normal opacity-40 ml-2 normal-case tracking-normal">
          for {categoryName}
        </span>
      </label>

      <div className="flex gap-2">
        {silhouettes.map((sil) => {
          const isSelected = selectedSilhouetteId === sil.id;
          return (
            <button
              key={sil.id}
              onClick={() => onSelect(sil.id)}
              className={`flex-1 py-4 px-3 rounded-[10px] text-center transition-all duration-200
                ${isSelected
                  ? 'border-2 border-[#43432B] bg-[#F5F2EB]'
                  : 'border border-[#E8E3D6] bg-[#FAF8F4] hover:border-[#43432B]/20'
                }`}
            >
              <div className="text-[13px] font-semibold text-[#43432B]">
                {sil.name}
              </div>
              <div className="text-[10px] text-[#43432B]/40 mt-1">
                ~{sil.yardage} yards
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
