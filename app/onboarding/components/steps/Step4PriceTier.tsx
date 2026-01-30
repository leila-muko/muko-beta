'use client';

interface StepProps {
  value: string;
  onChange: (value: string) => void;
}

export default function Step4PriceTier({ value, onChange }: StepProps) {
  const BRAND = {
    oliveInk: '#43432B',
    chartreuse: '#ABAB63',
  };

  const tiers = [
    { id: 'Accessible', label: 'Accessible', range: '$50-100' },
    { id: 'Contemporary', label: 'Contemporary', range: '$100-300' },
    { id: 'Bridge', label: 'Bridge', range: '$300-600' },
    { id: 'Luxury', label: 'Luxury', range: '$600+' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Label */}
      <label
        style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 500,
          color: 'rgba(67, 67, 43, 0.50)',
          marginBottom: '8px',
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        Select your price tier
      </label>

      {/* Tier buttons */}
      <div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',  // Change from 3 to 4
    gap: '16px',
  }}
>
        {tiers.map((tier) => {
          const active = value === tier.id;

          return (
            <button
              key={tier.id}
              onClick={() => onChange(tier.id)}
              style={{
                padding: 'clamp(20px, 2.5vw, 28px) clamp(16px, 2vw, 20px)',
                fontSize: 'clamp(16px, 2vw, 18px)',
                fontWeight: 520,
                color: active ? BRAND.oliveInk : 'rgba(67, 67, 43, 0.65)',
                backgroundColor: active
                  ? 'rgba(196, 207, 142, 0.35)'
                  : 'rgba(235, 232, 228, 0.55)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: active
                  ? '1px solid rgba(168, 180, 117, 0.32)'
                  : '1px solid rgba(67, 67, 43, 0.12)',
                borderRadius: '999px',
                cursor: 'pointer',
                fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                transition: 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: active
                  ? '0 8px 24px rgba(168, 180, 117, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.50)'
                  : '0 4px 16px rgba(67, 67, 43, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.60)',
                transform: active ? 'translateY(-1px)' : 'translateY(0)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'rgba(196, 207, 142, 0.25)';
                  e.currentTarget.style.borderColor = 'rgba(168, 180, 117, 0.22)';
                  e.currentTarget.style.color = BRAND.oliveInk;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow =
                    '0 8px 24px rgba(168, 180, 117, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.60)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'rgba(235, 232, 228, 0.55)';
                  e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.12)';
                  e.currentTarget.style.color = 'rgba(67, 67, 43, 0.65)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow =
                    '0 4px 16px rgba(67, 67, 43, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.60)';
                }
              }}
            >
              <span>{tier.label}</span>
              <span
                style={{
                  fontSize: 'clamp(12px, 1.4vw, 14px)',
                  fontWeight: 400,
                  opacity: 0.65,
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                }}
              >
                {tier.range}
              </span>
            </button>
          );
        })}
      </div>

      {/* Helper text */}
      {value && (
        <div
          style={{
            fontSize: '13px',
            color: 'rgba(67, 67, 43, 0.45)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          This helps Muko understand your market positioning.
        </div>
      )}
    </div>
  );
}