'use client';

import { useState } from 'react';

export interface SuggestionCardProps {
  title: string;
  description: string;
  onApply: () => void;
  applyLabel?: string;
}

export function SuggestionCard({
  title,
  description,
  onApply,
  applyLabel = 'Apply',
}: SuggestionCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '9px 12px',
        borderRadius: 12,
        background: hovered ? 'rgba(171,171,99,0.08)' : 'rgba(255,255,255,0.46)',
        border: '1px solid rgba(67,67,43,0.10)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        transition: 'background 150ms ease',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 550,
            color: 'rgba(67,67,43,0.82)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </div>
        {description && (
          <div
            style={{
              marginTop: 3,
              fontSize: 11.5,
              lineHeight: 1.45,
              color: 'rgba(67,67,43,0.52)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}
          >
            {description}
          </div>
        )}
      </div>

      <button
        onClick={onApply}
        style={{
          fontSize: 11,
          fontWeight: 650,
          color: '#ABAB63',
          border: '1.5px solid rgba(171,171,99,0.55)',
          borderRadius: 999,
          padding: '5px 12px',
          background: 'rgba(171,171,99,0.08)',
          cursor: 'pointer',
          fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
          flex: '0 0 auto',
          transition: 'all 150ms ease',
          whiteSpace: 'nowrap',
        }}
      >
        {applyLabel}
      </button>
    </div>
  );
}
