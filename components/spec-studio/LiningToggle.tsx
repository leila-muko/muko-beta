'use client';

interface LiningToggleProps {
  lined: boolean;
  onToggle: (lined: boolean) => void;
}

export default function LiningToggle({ lined, onToggle }: LiningToggleProps) {
  const options = [
    { value: false, label: 'Unlined', desc: 'Saves ~$18' },
    { value: true, label: 'Lined', desc: '+$15–20 COGS' },
  ];

  return (
    <div className="mb-9">
      <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#43432B] block mb-3">
        Lining
      </label>

      <div className="flex gap-2">
        {options.map((opt) => {
          const isSelected = lined === opt.value;
          return (
            <button
              key={String(opt.value)}
              onClick={() => onToggle(opt.value)}
              className={`flex-1 py-3.5 px-3 rounded-[10px] text-center transition-all duration-200
                ${isSelected
                  ? 'border-2 border-[#43432B] bg-[#F5F2EB]'
                  : 'border border-[#E8E3D6] bg-[#FAF8F4] hover:border-[#43432B]/20'
                }`}
            >
              <div className="text-[13px] font-semibold text-[#43432B]">
                {opt.label}
              </div>
              <div className="text-[10px] text-[#43432B]/40 mt-0.5">
                {opt.desc}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
