'use client';

import type { MukoInsight } from '@/lib/spec-studio/calculator';

interface MukoInsightPanelProps {
  insight: MukoInsight | null;
}

export default function MukoInsightPanel({ insight }: MukoInsightPanelProps) {
  if (!insight) {
    return (
      <div className="p-5 rounded-xl bg-[#F5F2EB] border border-[#E8E3D6] min-h-[100px]">
        <div className="flex items-center gap-1.5 mb-2">
          <MukoStar color="#43432B" opacity={0.3} />
          <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#43432B]/40">
            Muko Insight
          </span>
        </div>
        <p className="text-[13px] text-[#43432B]/35 leading-relaxed m-0">
          Start making selections to see live intelligence...
        </p>
      </div>
    );
  }

  const borderColor =
    insight.type === 'warning' ? '#B8876B' :
    insight.type === 'strong' ? '#A8B475' : '#7D96AC';

  const cogsBarWidth = Math.min((insight.cogs / insight.ceiling) * 100, 120);

  return (
    <div
      className="p-5 rounded-xl bg-[#F5F2EB] transition-all duration-400"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <MukoStar color={borderColor} />
          <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#43432B]">
            Muko Insight
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-semibold" style={{ color: borderColor }}>
            ${insight.cogs}
          </span>
          <span className="text-[10px] text-[#43432B]/50">
            / ${insight.ceiling} ceiling
          </span>
        </div>
      </div>

      {/* COGS Bar Visualization */}
      <div className="mb-3.5 relative">
        <div className="h-1 rounded-full bg-[#E8E3D6] relative overflow-visible">
          <div
            className="h-1 rounded-full transition-all duration-600 ease-out"
            style={{
              backgroundColor: borderColor,
              width: `${Math.min(cogsBarWidth, 100)}%`,
            }}
          />
          {/* Over-budget overflow indicator */}
          {cogsBarWidth > 100 && (
            <div
              className="absolute top-0 h-1 rounded-r-full opacity-40"
              style={{
                left: '100%',
                width: `${cogsBarWidth - 100}%`,
                backgroundColor: borderColor,
              }}
            />
          )}
          {/* Ceiling marker */}
          <div className="absolute right-0 -top-[3px] w-px h-2.5 bg-[#43432B]/25" />
        </div>
      </div>

      {/* Insight Text */}
      <p className="text-[13px] font-medium text-[#43432B] mb-1.5 leading-snug">
        {insight.headline}
      </p>
      <p className="text-[13px] text-[#43432B]/65 leading-relaxed m-0">
        {insight.body}
      </p>

      {/* Alternative Material Suggestion */}
      {insight.alternative && (
        <div className="mt-3.5 p-3 rounded-lg bg-[#A8B475]/8 border border-[#A8B475]/20 
                        flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px]">💡</span>
              <span className="text-[12px] font-semibold text-[#43432B]">
                Try {insight.alternative.name}
              </span>
            </div>
            <span className="text-[11px] text-[#43432B]/55">
              ${insight.alternative.cost}/yd · saves ~${insight.alternative.saving}
              {insight.alternative.sharedProperties.length > 0 && (
                <> · {insight.alternative.sharedProperties.join(', ')}</>
              )}
            </span>
          </div>
          <button className="text-[11px] font-semibold text-[#A8B475] border border-[#A8B475] 
                             rounded-md px-3 py-1 hover:bg-[#A8B475]/10 transition-colors cursor-pointer">
            Swap
          </button>
        </div>
      )}
    </div>
  );
}

// Muko star icon
function MukoStar({ color = '#43432B', opacity = 1 }: { color?: string; opacity?: number }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity }}>
      <path
        d="M7 1L8.5 5.5L13 7L8.5 8.5L7 13L5.5 8.5L1 7L5.5 5.5L7 1Z"
        fill={color}
      />
    </svg>
  );
}
