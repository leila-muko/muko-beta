'use client';

import { useState } from 'react';
import { BRAND } from '@/lib/concept-studio/constants';

const OLIVE = BRAND.oliveInk;
const STEEL = BRAND.steelBlue;
const CHARTREUSE = '#A8B475';
const inter = 'var(--font-inter), system-ui, sans-serif';
const sohne = 'var(--font-sohne-breit), system-ui, sans-serif';

const PRICE_TIERS = [
  { id: 'Contemporary', label: 'Contemporary', range: '$100–300' },
  { id: 'Bridge',       label: 'Bridge',       range: '$300–600' },
  { id: 'Luxury',       label: 'Luxury',       range: '$600+' },
];

interface StepProps {
  value: string;
  onChange: (value: string) => void;
  priceTier: string;
  onPriceTierChange: (value: string) => void;
}

export default function Step1BrandName({
  value,
  onChange,
  priceTier,
  onPriceTierChange,
}: StepProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      {/* ── Q1a: Brand name ─────────────────────────────────────────────── */}
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
          What&apos;s your brand name?
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
          What should we call your brand?
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Enter your brand name"
          autoFocus
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '18px 22px',
            fontSize: 'clamp(20px, 2.5vw, 26px)',
            fontWeight: 500,
            color: OLIVE,
            backgroundColor: 'rgba(255,255,255,0.75)',
            border: focused ? `1.5px solid ${STEEL}` : '1.5px solid rgba(67,67,43,0.10)',
            borderRadius: 10,
            outline: 'none',
            fontFamily: sohne,
            letterSpacing: '-0.01em',
            transition: 'all 200ms ease',
            boxShadow: focused
              ? '0 4px 20px rgba(125,150,172,0.10)'
              : '0 2px 8px rgba(0,0,0,0.04)',
          }}
        />

        {value && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12.5,
              color: 'rgba(67,67,43,0.52)',
              fontFamily: inter,
              lineHeight: 1.6,
            }}
          >
            Perfect. We&apos;ll use this to personalize your experience.
          </div>
        )}
      </div>

      {/* ── Q1b: Price tier ─────────────────────────────────────────────── */}
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
          Where do you sit in the market?
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
          This helps Muko calibrate cost and aesthetic expectations.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PRICE_TIERS.map((tier) => {
            const active = priceTier === tier.id;
            return (
              <TierCard
                key={tier.id}
                label={tier.label}
                range={tier.range}
                active={active}
                onClick={() => onPriceTierChange(tier.id)}
              />
            );
          })}
        </div>
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
        <span style={{ fontFamily: inter, fontSize: 12, color: 'rgba(67,67,43,0.44)' }}>
          {range}
        </span>
      </div>
    </button>
  );
}
