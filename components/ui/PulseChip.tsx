'use client';

export type PulseChipVariant = 'green' | 'amber' | 'red';

export interface PulseChipProps {
  variant: PulseChipVariant;
  status: string;
  consequence: string;
}

const CHIP_COLORS: Record<PulseChipVariant, { text: string; bg: string }> = {
  green: { text: '#A8B475', bg: 'rgba(168, 180, 117, 0.15)' },
  amber: { text: '#B8876B', bg: 'rgba(184, 135, 107, 0.15)' },
  red:   { text: '#A97B8F', bg: 'rgba(169, 123, 143, 0.15)' },
};

export function PulseChip({ variant, status, consequence }: PulseChipProps) {
  const { text, bg } = CHIP_COLORS[variant];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0,
        padding: '3px 9px',
        borderRadius: 999,
        background: bg,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: text,
        fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      {status}
      <span
        style={{
          margin: '0 5px',
          opacity: 0.5,
          fontWeight: 400,
          letterSpacing: 0,
        }}
      >
        ·
      </span>
      <span
        style={{
          fontWeight: 500,
          textTransform: 'none',
          letterSpacing: '0.02em',
        }}
      >
        {consequence}
      </span>
    </span>
  );
}
