'use client';

import { BRAND } from '@/lib/concept-studio/constants';

const OLIVE = BRAND.oliveInk;
const STEEL = BRAND.steelBlue;
const inter = 'var(--font-inter), system-ui, sans-serif';
const sohne = 'var(--font-sohne-breit), system-ui, sans-serif';

interface StepProps {
  targetMargin: number;
  onTargetMarginChange: (value: number) => void;
}

export default function Step5AestheticExclusions({
  targetMargin,
  onTargetMarginChange,
}: StepProps) {
  const fillPercent = ((targetMargin - 40) / 35) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <div
          style={{
            fontFamily: sohne,
            fontSize: 15,
            fontWeight: 500,
            color: OLIVE,
            marginBottom: 6,
          }}
        >
          Target margin percentage
        </div>
        <div
          style={{
            fontFamily: inter,
            fontSize: 12,
            fontStyle: 'italic',
            color: 'rgba(67,67,43,0.44)',
          }}
        >
          Set the margin Muko should target when evaluating cost structures.
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: 'clamp(48px, 7vw, 64px)',
            fontWeight: 500,
            color: OLIVE,
            fontFamily: sohne,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {targetMargin}%
        </div>
      </div>

      <div style={{ padding: '0 8px' }}>
        <input
          type="range"
          min="40"
          max="75"
          value={targetMargin}
          onChange={(e) => onTargetMarginChange(Number(e.target.value))}
          style={{
            width: '100%',
            height: 3,
            borderRadius: 999,
            outline: 'none',
            background: `linear-gradient(to right,
              ${STEEL} 0%,
              ${STEEL} ${fillPercent}%,
              rgba(67,67,43,0.10) ${fillPercent}%,
              rgba(67,67,43,0.10) 100%)`,
            WebkitAppearance: 'none',
            appearance: 'none',
            cursor: 'pointer',
          }}
        />
        <style>{`
          input[type='range']::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #fff;
            border: 1.5px solid rgba(125,150,172,0.85);
            cursor: grab;
            box-shadow: 0 1px 5px rgba(0,0,0,0.14), 0 0 0 2px rgba(125,150,172,0.15);
            transition: all 200ms ease;
          }
          input[type='range']::-webkit-slider-thumb:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.18), 0 0 0 3px rgba(125,150,172,0.20);
          }
          input[type='range']::-webkit-slider-thumb:active { cursor: grabbing; }
          input[type='range']::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #fff;
            border: 1.5px solid rgba(125,150,172,0.85);
            cursor: grab;
            box-shadow: 0 1px 5px rgba(0,0,0,0.14), 0 0 0 2px rgba(125,150,172,0.15);
            transition: all 200ms ease;
          }
          input[type='range']::-moz-range-thumb:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.18), 0 0 0 3px rgba(125,150,172,0.20);
          }
        `}</style>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 10,
            fontSize: 11,
            color: 'rgba(67,67,43,0.38)',
            fontFamily: inter,
            fontWeight: 600,
          }}
        >
          <span>40%</span>
          <span>75%</span>
        </div>
      </div>

      <div
        style={{
          fontSize: 12.5,
          color: 'rgba(67,67,43,0.52)',
          fontFamily: inter,
          lineHeight: 1.6,
        }}
      >
        At {targetMargin}% margin, a $100 MSRP means ${(100 * (1 - targetMargin / 100)).toFixed(2)} COGS
      </div>
    </div>
  );
}
