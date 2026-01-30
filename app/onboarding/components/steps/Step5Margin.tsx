'use client';

interface StepProps {
  value: number;
  onChange: (value: number) => void;
}

export default function Step5Margin({ value, onChange }: StepProps) {
  const BRAND = {
    oliveInk: '#43432B',
    steelBlue: '#7D96AC',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
      {/* Label */}
      <label
        style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 500,
          color: 'rgba(67, 67, 43, 0.50)',
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        Target margin percentage
      </label>

      {/* Large display */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: 'clamp(56px, 8vw, 72px)',
            fontWeight: 400,
            color: BRAND.oliveInk,
            fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {value}%
        </div>
      </div>

      {/* Slider */}
      <div style={{ paddingLeft: '24px', paddingRight: '24px' }}>
        <input
          type="range"
          min="40"
          max="75"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '999px',
            outline: 'none',
            background: `linear-gradient(to right, 
              rgba(125, 150, 172, 0.45) 0%, 
              rgba(125, 150, 172, 0.45) ${((value - 40) / 35) * 100}%, 
              rgba(67, 67, 43, 0.12) ${((value - 40) / 35) * 100}%, 
              rgba(67, 67, 43, 0.12) 100%)`,
            WebkitAppearance: 'none',
            appearance: 'none',
          }}
        />
        <style>{`
          input[type='range']::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: rgba(125, 150, 172, 0.85);
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(125, 150, 172, 0.30);
            transition: all 220ms ease;
          }
          input[type='range']::-webkit-slider-thumb:hover {
            background: rgba(125, 150, 172, 1);
            box-shadow: 0 6px 20px rgba(125, 150, 172, 0.45);
            transform: scale(1.1);
          }
          input[type='range']::-moz-range-thumb {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: rgba(125, 150, 172, 0.85);
            cursor: pointer;
            border: none;
            box-shadow: 0 4px 12px rgba(125, 150, 172, 0.30);
            transition: all 220ms ease;
          }
          input[type='range']::-moz-range-thumb:hover {
            background: rgba(125, 150, 172, 1);
            box-shadow: 0 6px 20px rgba(125, 150, 172, 0.45);
            transform: scale(1.1);
          }
        `}</style>

        {/* Range labels */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '12px',
            fontSize: '12px',
            color: 'rgba(67, 67, 43, 0.40)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}
        >
          <span>40%</span>
          <span>75%</span>
        </div>
      </div>

      {/* Helper text */}
      <div
        style={{
          fontSize: '14px',
          color: 'rgba(67, 67, 43, 0.50)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        At {value}% margin, a ${100} MSRP means ${(100 * (1 - value / 100)).toFixed(2)} COGS
      </div>
    </div>
  );
}