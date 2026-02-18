'use client';

import type { Material } from '@/lib/types/spec-studio';

// Visual indicators for material character
const MATERIAL_ICONS: Record<string, string> = {
  'organic-cotton': '○',
  'tencel': '◎',
  'linen': '▽',
  'recycled-poly': '◇',
  'cotton-twill': '□',
  'modal': '◈',
  'wool': '●',
  'merino-wool': '◉',
  'silk': '✦',
  'silk-blend': '✧',
  'denim': '▪',
  'leather': '◆',
  'vegan-leather': '◇',
  'cashmere': '✧',
  'nylon': '△',
};

interface MaterialSelectorProps {
  materials: Material[];
  selectedMaterialId: string;
  onSelect: (materialId: string) => void;
  alternativeMaterial: Material | null;
  selectedMaterial: Material | null;
  onSwapToAlternative: () => void;
}

export default function MaterialSelector({
  materials,
  selectedMaterialId,
  onSelect,
  alternativeMaterial,
  selectedMaterial,
  onSwapToAlternative,
}: MaterialSelectorProps) {
  const sharedProps = selectedMaterial && alternativeMaterial
    ? selectedMaterial.properties.filter(p => alternativeMaterial.properties.includes(p))
    : [];

  return (
    <div className="mb-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#43432B]">
          Material
        </label>
        <span className="text-[10px] text-[#43432B]/35">
          Industry benchmark pricing
        </span>
      </div>

      {/* Material Grid */}
      <div className="grid grid-cols-4 gap-2">
        {materials.map((mat) => {
          const isSelected = selectedMaterialId === mat.id;
          return (
            <button
              key={mat.id}
              onClick={() => onSelect(mat.id)}
              className={`p-3.5 rounded-[10px] text-left transition-all duration-200 
                ${isSelected
                  ? 'border-2 border-[#43432B] bg-[#F5F2EB]'
                  : 'border border-[#E8E3D6] bg-[#FAF8F4] hover:border-[#43432B]/20'
                }`}
            >
              <div className="text-[15px] mb-1">
                {MATERIAL_ICONS[mat.id] || '○'}
              </div>
              <div className="text-[13px] font-semibold text-[#43432B] mb-0.5">
                {mat.name}
              </div>
              <div className="text-[11px] text-[#43432B]/50">
                ${mat.cost_per_yard}/yd · {mat.lead_time_weeks}wk
              </div>
            </button>
          );
        })}
      </div>

      {/* Muko Suggests — Alternative Material Nudge */}
      {selectedMaterial && alternativeMaterial && (
        <div className="mt-2.5 px-3.5 py-2.5 rounded-lg bg-[#A8B475]/5 border border-dashed border-[#A8B475]/25 
                        flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[12px]">💡</span>
            <span className="text-[12px] text-[#43432B]/65">
              Similar feel, lower cost:{' '}
              <strong className="text-[#43432B]">{alternativeMaterial.name}</strong>
              {' '}(${alternativeMaterial.cost_per_yard}/yd)
              {sharedProps.length > 0 && (
                <> — shares {sharedProps.join(', ')}</>
              )}
            </span>
          </div>
          <button
            onClick={onSwapToAlternative}
            className="text-[11px] font-semibold text-[#A8B475] border border-[#A8B475] 
                       rounded-md px-3 py-1 hover:bg-[#A8B475]/10 transition-colors"
          >
            Swap
          </button>
        </div>
      )}
    </div>
  );
}
