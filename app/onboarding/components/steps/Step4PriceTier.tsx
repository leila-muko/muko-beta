'use client';

import { useState } from 'react';
import { BRAND } from '@/lib/concept-studio/constants';

const OLIVE = BRAND.oliveInk;
const STEEL = BRAND.steelBlue;
const CHARTREUSE = '#A8B475';
const inter = 'var(--font-inter), system-ui, sans-serif';
const sohne = 'var(--font-sohne-breit), system-ui, sans-serif';

interface StepProps {
  value: string;
  onChange: (value: string) => void;
}

export default function Step4PriceTier({ value, onChange }: StepProps) {
  const tiers = [
    { id: 'Accessible', label: 'Accessible', range: '$50-100' },
    { id: 'Contemporary', label: 'Contemporary', range: '$100-300' },
    { id: 'Bridge', label: 'Bridge', range: '$300-600' },
    { id: 'Luxury', label: 'Luxury', range: '$600+' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Section header */}
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
          Select your price tier
        </div>
        <div
          style={{
            fontFamily: inter,
            fontSize: 12,
            fontStyle: 'italic',
            color: 'rgba(67,67,43,0.44)',
            marginBottom: 14,
          }}
        >
          This helps Muko understand your market positioning.
        </div>
      </div>

      {/* Tier cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tiers.map((tier) => {
          const active = value === tier.id;
          return (
            <TierCard
              key={tier.id}
              label={tier.label}
              range={tier.range}
              active={active}
              onClick={() => onChange(tier.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ─── TierCard — matches IntentCard pattern ──────────────────────────────── */
function TierCard({
  label,
  range,
  active,
  onClick,
}: {
  label: string;
  range: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        textAlign: 'left',
        borderRadius: 8,
        padding: '14px 16px',
        background: active ? 'rgba(168,180,117,0.08)' : 'rgba(255,255,255,0.75)',
        border: '1px solid rgba(67,67,43,0.09)',
        borderLeft: active
          ? `3px solid ${CHARTREUSE}`
          : hovered
          ? `3px solid ${STEEL}`
          : '3px solid transparent',
        cursor: 'pointer',
        outline: 'none',
        transition: 'all 180ms ease',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {/* Radio dot */}
      <span
        style={{
          width: 13,
          height: 13,
          borderRadius: 999,
          border: active ? `1.5px solid ${CHARTREUSE}` : '1.5px solid rgba(67,67,43,0.22)',
          background: active ? CHARTREUSE : 'transparent',
          flexShrink: 0,
          transition: 'all 150ms ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-hidden
      >
        {active && (
          <svg width="7" height="6" viewBox="0 0 7 6" fill="none">
            <path
              d="M1 3L2.8 4.8L6 1.5"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          style={{
            fontFamily: inter,
            fontSize: 13,
            fontWeight: 500,
            color: active ? OLIVE : 'rgba(67,67,43,0.78)',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: inter,
            fontSize: 12,
            color: 'rgba(67,67,43,0.44)',
          }}
        >
          {range}
        </span>
      </div>
    </button>
  );
}
