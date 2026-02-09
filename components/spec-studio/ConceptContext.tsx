'use client';

import { useState } from 'react';
import type { ConceptContext as ConceptContextType } from '@/lib/types/spec-studio';

interface ConceptContextProps {
  concept: ConceptContextType;
}

export default function ConceptContext({ concept }: ConceptContextProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className="mb-6 px-4 py-3 rounded-[10px] bg-[#F5F2EB] border border-[#E8E3D6] 
                 cursor-pointer transition-all duration-300 hover:border-[#43432B]/15"
    >
      {/* Collapsed Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#43432B]/40">
            Locked Concept
          </span>
          <span className="text-[13px] font-semibold text-[#43432B]">
            {concept.aestheticName}
          </span>
          <span className="text-[11px] text-[#A8B475] font-medium">
            ✓ Identity {concept.identityScore}
          </span>
          <span className="text-[11px] text-[#A8B475] font-medium">
            ✓ Resonance {concept.resonanceScore}
          </span>
        </div>
        <span
          className={`text-[12px] text-[#43432B]/40 transition-transform duration-300 
                      ${expanded ? 'rotate-180' : 'rotate-0'}`}
        >
          ▼
        </span>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-3.5 flex gap-2 items-start">
          {/* Moodboard Thumbnails */}
          <div className="flex gap-2">
            {concept.moodboardImages.slice(0, 4).map((img, i) => (
              <div
                key={i}
                className="w-20 h-14 rounded-md bg-cover bg-center opacity-70"
                style={{
                  backgroundImage: `url(${img})`,
                  backgroundColor: ['#B8876B', '#7D96AC', '#A97B8F', '#8B7355'][i],
                }}
              />
            ))}
          </div>

          {/* Recommended Palette */}
          {concept.recommendedPalette.length > 0 && (
            <div className="ml-2 flex flex-col justify-center">
              <div className="flex gap-1">
                {concept.recommendedPalette.slice(0, 6).map((color, i) => (
                  <div
                    key={i}
                    className="w-[18px] h-[18px] rounded-full border border-black/5"
                    style={{ backgroundColor: color.hex }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-[#43432B]/35 mt-1">
                Recommended palette
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
