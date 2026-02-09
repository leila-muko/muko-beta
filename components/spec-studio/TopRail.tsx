'use client';

import type { Category } from '@/lib/types/spec-studio';
import type { MukoInsight } from '@/lib/spec-studio/calculator';

interface TopRailProps {
  categories: Category[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  targetMSRP: number;
  onMSRPChange: (msrp: number) => void;
  targetMargin: number;
  insight: MukoInsight | null;
}

export default function TopRail({
  categories,
  selectedCategoryId,
  onCategoryChange,
  targetMSRP,
  onMSRPChange,
  targetMargin,
  insight,
}: TopRailProps) {
  const marginCeiling = Math.round(targetMSRP * (1 - targetMargin));

  return (
    <div className="px-8 py-4 border-b border-[#E8E3D6] flex items-center gap-6 bg-[#F5F2EB]/60">
      {/* Category */}
      <div className="flex items-center gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-[#43432B]/50">
          Category
        </label>
        <select
          value={selectedCategoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="px-4 py-2 rounded-lg border border-[#E8E3D6] bg-[#FAF8F4] 
                     font-sans text-[13px] font-medium text-[#43432B] cursor-pointer 
                     outline-none focus:border-[#A8B475] transition-colors"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Target MSRP */}
      <div className="flex items-center gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-[#43432B]/50">
          Target MSRP
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#43432B]/50">
            $
          </span>
          <input
            type="number"
            value={targetMSRP}
            onChange={(e) => onMSRPChange(Number(e.target.value))}
            className="pl-6 pr-4 py-2 rounded-lg border border-[#E8E3D6] bg-[#FAF8F4]
                       font-sans text-[13px] font-medium text-[#43432B] w-[110px]
                       outline-none focus:border-[#A8B475] transition-colors"
          />
        </div>
        <span className="text-[11px] text-[#43432B]/35">
          Margin ceiling: ${marginCeiling}
        </span>
      </div>

      {/* Live COGS Ticker */}
      {insight && (
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-[#43432B]/50 uppercase tracking-wide">
            Est. COGS
          </span>
          <span
            className={`text-base font-bold tabular-nums transition-colors duration-300 ${
              insight.type === 'warning'
                ? 'text-[#B8876B]'
                : insight.type === 'strong'
                  ? 'text-[#A8B475]'
                  : 'text-[#7D96AC]'
            }`}
          >
            ${insight.cogs}
          </span>
        </div>
      )}
    </div>
  );
}
