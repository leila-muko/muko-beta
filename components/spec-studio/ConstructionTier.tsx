'use client';

import type { ConstructionTier as ConstructionTierType } from '@/lib/types/spec-studio';
import { CONSTRUCTION_INFO } from '@/lib/spec-studio/smart-defaults';

interface ConstructionTierProps {
  selectedTier: ConstructionTierType;
  onSelect: (tier: ConstructionTierType) => void;
  overrideWarning: string | null;
}

export default function ConstructionTier({
  selectedTier,
  onSelect,
  overrideWarning,
}: ConstructionTierProps) {
  const tiers: ConstructionTierType[] = ['low', 'moderate', 'high'];

  return (
    <div className="mb-7">
      <div className="mb-3">
        <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#43432B]">
          Construction
        </label>
      </div>

      <div className="flex gap-2">
        {tiers.map((tier) => {
          const info = CONSTRUCTION_INFO[tier];
          const isSelected = selectedTier === tier;
          return (
            <button
              key={tier}
              onClick={() => onSelect(tier)}
              className={`flex-1 py-4 px-3 rounded-[10px] text-center transition-all duration-200
                ${isSelected
                  ? 'border-2 border-[#43432B] bg-[#FAF9F6]'
                  : 'border border-[#E8E3D6] bg-[#FAF9F6] hover:border-[#43432B]/20'
                }`}
            >
              <div className="text-[13px] font-semibold text-[#43432B]">
                {info.label}
              </div>
              <div className="text-[10px] text-[#43432B]/40 mt-1">
                {info.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Override Warning */}
      {overrideWarning && (
        <div className="mt-2.5 px-3.5 py-2.5 rounded-[12px] bg-[#B8876B]/8 border border-[#B8876B]/20 
                        flex items-center gap-2">
          <span className="text-[12px] text-[#B8876B]">⚠</span>
          <span className="text-[12px] text-[#43432B]/70">
            {overrideWarning}
          </span>
        </div>
      )}
    </div>
  );
}
