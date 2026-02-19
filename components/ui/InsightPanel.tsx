'use client';

import type { InsightData } from '@/lib/types/insight';
import { SuggestionCard } from './SuggestionCard';

// ─── Hardcoded placeholder — Synthesizer agent replaces InsightData in Week 5 ───
const FALLBACK: InsightData = {
  mode: 'differentiate',
  editLabel: 'THE EDIT',
  statements: [
    'Strong brand fit, but this space is getting crowded.',
    'The market window is narrowing — differentiation is now required.',
    'Proceed with conviction or risk blending into the category.',
  ],
  edit: [
    'Avoid the obvious heritage references — the market is already there',
    'Push silhouette further than the category expects',
    'Find the unexpected material within the aesthetic',
  ],
};

const DIVIDER = (
  <div
    style={{
      height: 1,
      background: 'rgba(67,67,43,0.08)',
      margin: '14px 0',
    }}
  />
);

interface InsightPanelProps {
  data?: InsightData;
  /** Called when a sharpen chip's Apply button is clicked. Receives the chip label. */
  onChipApply?: (chip: string) => void;
}

export function InsightPanel({ data = FALLBACK, onChipApply }: InsightPanelProps) {
  const isOpportunity = data.editLabel === 'THE OPPORTUNITY';

  return (
    <div>
      {/* ─── Three prose statements ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {data.statements.map((s, i) => (
          <p
            key={i}
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.58,
              color: 'rgba(67,67,43,0.88)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}
          >
            {s}
          </p>
        ))}
      </div>

      {DIVIDER}

      {/* ─── Edit label — muted for THE EDIT, chartreuse for THE OPPORTUNITY ─── */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: isOpportunity ? '#A8B475' : 'rgba(67,67,43,0.42)',
          fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
          marginBottom: 10,
        }}
      >
        {data.editLabel}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {data.edit.map((bullet, i) => (
          <div
            key={i}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
          >
            <span
              style={{
                fontSize: 12,
                color: 'rgba(67,67,43,0.35)',
                flexShrink: 0,
                lineHeight: 1.58,
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
              }}
            >
              ·
            </span>
            <span
              style={{
                fontSize: 12.5,
                lineHeight: 1.5,
                color: 'rgba(67,67,43,0.72)',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
              }}
            >
              {bullet}
            </span>
          </div>
        ))}
      </div>

      {/* ─── Sharpen row (optional) ─── */}
      {data.sharpenChips && data.sharpenChips.length > 0 && (
        <>
          {DIVIDER}
          <div
            style={{
              fontSize: 12,
              color: 'rgba(67,67,43,0.58)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              marginBottom: 8,
            }}
          >
            Sharpen your direction — try adding:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.sharpenChips.map((chip) => (
              <SuggestionCard
                key={chip}
                title={`+ ${chip}`}
                description=""
                onApply={() => {
                  if (onChipApply) onChipApply(chip);
                  else console.log('chip apply:', chip);
                }}
                applyLabel="Add"
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
