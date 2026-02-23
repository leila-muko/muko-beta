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

export default function Step3CustomerProfile({ value, onChange }: StepProps) {
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
          Who&apos;s your customer?
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
          Describe your target customer in your own words.
        </div>

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Describe your target customer..."
          rows={5}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '16px 18px',
            fontSize: 14,
            fontWeight: 400,
            color: OLIVE,
            backgroundColor: 'rgba(255,255,255,0.75)',
            border: focused ? `1.5px solid ${STEEL}` : '1.5px solid rgba(67,67,43,0.10)',
            borderRadius: 10,
            outline: 'none',
            fontFamily: inter,
            lineHeight: 1.65,
            resize: 'vertical',
            transition: 'all 200ms ease',
            boxShadow: focused
              ? '0 4px 20px rgba(125,150,172,0.10)'
              : '0 2px 8px rgba(0,0,0,0.04)',
          }}
        />
      </div>

      {/* Character count */}
      {value && (
        <div
          style={{
            fontSize: 12,
            color: 'rgba(67,67,43,0.42)',
            fontFamily: inter,
          }}
        >
          {value.length} characters
        </div>
      )}
    </div>
  );
}
