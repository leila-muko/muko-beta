'use client';

import { useState } from 'react';
import { BRAND } from '@/lib/concept-studio/constants';

const OLIVE = BRAND.oliveInk;
const STEEL = BRAND.steelBlue;
const inter = 'var(--font-inter), system-ui, sans-serif';
const sohne = 'var(--font-sohne-breit), system-ui, sans-serif';

interface StepProps {
  value: string;
  onChange: (value: string) => void;
}

export default function Step1BrandName({ value, onChange }: StepProps) {
  const [focused, setFocused] = useState(false);

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
          Brand name
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
      </div>

      {/* Helper text */}
      {value && (
        <div
          style={{
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
  );
}
