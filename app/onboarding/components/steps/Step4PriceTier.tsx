'use client';

import { useState } from 'react';
import { BRAND } from '@/lib/concept-studio/constants';

const OLIVE = BRAND.oliveInk;
const STEEL = BRAND.steelBlue;
const inter = 'var(--font-inter), system-ui, sans-serif';
const sohne = 'var(--font-sohne-breit), system-ui, sans-serif';

interface StepProps {
  referenceBrands: string[];
  onReferenceBrandsChange: (value: string[]) => void;
  excludedBrands: string[];
  onExcludedBrandsChange: (value: string[]) => void;
}

export default function Step4BrandReferences({
  referenceBrands,
  onReferenceBrandsChange,
  excludedBrands,
  onExcludedBrandsChange,
}: StepProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 44 }}>
      {/* ── Q6: Reference brands ─────────────────────────────────────────── */}
      <BrandInputGroup
        label="Name up to 3 brands you admire aesthetically."
        sublabel='Not "who you want to be" — just that you respect the direction.'
        placeholders={['e.g. The Row', 'e.g. Toteme', 'e.g. Sezane']}
        values={referenceBrands}
        onChange={onReferenceBrandsChange}
        autoFocus
      />

      {/* ── Q7: Excluded brands ──────────────────────────────────────────── */}
      <BrandInputGroup
        label="Name up to 3 brands whose aesthetic you'd never be mistaken for."
        sublabel="This helps Muko understand your hard boundaries."
        placeholders={['e.g. Shein', 'e.g. Fashion Nova', 'e.g. Zara']}
        values={excludedBrands}
        onChange={onExcludedBrandsChange}
      />
    </div>
  );
}

/* ─── BrandInputGroup ────────────────────────────────────────────────────── */
function BrandInputGroup({
  label,
  sublabel,
  placeholders,
  values,
  onChange,
  autoFocus,
}: {
  label: string;
  sublabel: string;
  placeholders: string[];
  values: string[];
  onChange: (value: string[]) => void;
  autoFocus?: boolean;
}) {
  const update = (index: number, val: string) => {
    const next = [...values];
    next[index] = val;
    onChange(next);
  };

  return (
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
        {label}
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
        {sublabel}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {placeholders.map((placeholder, i) => (
          <BrandInput
            key={i}
            value={values[i] ?? ''}
            placeholder={placeholder}
            onChange={(val) => update(i, val)}
            autoFocus={autoFocus && i === 0}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── BrandInput ─────────────────────────────────────────────────────────── */
function BrandInput({
  value,
  placeholder,
  onChange,
  autoFocus,
}: {
  value: string;
  placeholder: string;
  onChange: (val: string) => void;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '13px 16px',
        fontSize: 13,
        fontWeight: 400,
        color: OLIVE,
        backgroundColor: 'rgba(255,255,255,0.75)',
        border: focused ? `1.5px solid ${STEEL}` : '1.5px solid rgba(67,67,43,0.10)',
        borderRadius: 8,
        outline: 'none',
        fontFamily: inter,
        transition: 'all 200ms ease',
        boxShadow: focused
          ? '0 4px 20px rgba(125,150,172,0.10)'
          : '0 2px 8px rgba(0,0,0,0.04)',
      }}
    />
  );
}
