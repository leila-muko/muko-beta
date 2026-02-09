'use client';

type PulseStatus = 'green' | 'yellow' | 'red' | null;

interface PulseIndicatorProps {
  label: string;
  status: PulseStatus;
  locked: boolean;
  detail?: string | null;
}

const STATUS_CONFIG = {
  green: { color: '#A8B475', bg: '#E8EDD8', text: 'Strong' },
  yellow: { color: '#B8876B', bg: '#F0E6D8', text: 'Moderate' },
  red: { color: '#A97B8F', bg: '#F0DDE3', text: 'At Risk' },
  locked: { color: '#B8B8A8', bg: '#EDEDEA', text: 'Locked' },
  inactive: { color: '#C8C8C0', bg: '#F0F0EC', text: 'Pending' },
};

function PulseIndicator({ label, status, locked, detail }: PulseIndicatorProps) {
  const config = locked
    ? STATUS_CONFIG.locked
    : status
      ? STATUS_CONFIG[status]
      : STATUS_CONFIG.inactive;

  return (
    <div
      className="px-4 py-3.5 rounded-[10px] transition-all duration-400"
      style={{
        backgroundColor: config.bg,
        opacity: locked ? 0.6 : 1,
      }}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: config.color,
              boxShadow: !locked && status ? `0 0 8px ${config.color}40` : 'none',
            }}
          />
          <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#43432B]">
            {label}
          </span>
        </div>
        <span
          className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
          style={{
            color: config.color,
            backgroundColor: `${config.color}18`,
          }}
        >
          {locked ? '✓ Locked' : config.text}
        </span>
      </div>

      {detail && !locked && (
        <p className="text-[12px] text-[#43432B]/60 mt-2 ml-4 leading-snug">
          {detail}
        </p>
      )}
    </div>
  );
}

interface PulseRailProps {
  executionStatus: PulseStatus;
  executionDetail: string | null;
}

export default function PulseRail({ executionStatus, executionDetail }: PulseRailProps) {
  return (
    <div className="mb-6">
      <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#43432B]/40 block mb-3">
        Pulse Rail
      </label>
      <div className="flex flex-col gap-2">
        <PulseIndicator label="Identity" status="green" locked={true} />
        <PulseIndicator label="Resonance" status="green" locked={true} />
        <PulseIndicator
          label="Execution"
          status={executionStatus}
          locked={false}
          detail={executionDetail}
        />
      </div>
    </div>
  );
}
