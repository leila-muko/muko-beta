'use client';

interface StepProps {
  value: string;
  onChange: (value: string) => void;
}

export default function Step1BrandName({ value, onChange }: StepProps) {
  const BRAND = {
    oliveInk: '#43432B',
    steelBlue: '#7D96AC',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Label */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: 500,
            color: 'rgba(67, 67, 43, 0.50)',
            marginBottom: '16px',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}
        >
          Brand name
        </label>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your brand name"
          autoFocus
          style={{
            width: '100%',
            padding: 'clamp(20px, 2.5vw, 24px) clamp(24px, 3.5vw, 32px)',
            fontSize: 'clamp(24px, 3vw, 34px)',
            fontWeight: 400,
            color: BRAND.oliveInk,
            backgroundColor: 'rgba(255, 255, 255, 0.62)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(67, 67, 43, 0.10)',
            borderRadius: '999px',
            outline: 'none',
            fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
            letterSpacing: '-0.01em',
            transition: 'all 220ms ease',
            boxShadow: '0 12px 44px rgba(67, 67, 43, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.90)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.78)';
            e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.22)';
            e.currentTarget.style.boxShadow =
              '0 18px 60px rgba(125, 150, 172, 0.14), 0 0 0 3px rgba(125, 150, 172, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.95)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.62)';
            e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.10)';
            e.currentTarget.style.boxShadow =
              '0 12px 44px rgba(67, 67, 43, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.90)';
          }}
        />
      </div>

      {/* Helper text */}
      {value && (
        <div
          style={{
            fontSize: '14px',
            color: 'rgba(67, 67, 43, 0.50)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          Perfect. We'll use this to personalize your experience.
        </div>
      )}
    </div>
  );
}