import type { CollectionScoreDetail } from '@/lib/collection-report/types';
import { fonts, reportPalette } from '@/components/report/reportStyles';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

export function CollectionScoreCard({
  label,
  detail,
  infoCopy,
  compact = false,
}: {
  label: string;
  detail: CollectionScoreDetail;
  infoCopy?: string;
  compact?: boolean;
}) {
  void compact;

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch' }}>
      <div style={{ flex: 1, paddingRight: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          {label === 'Identity' && (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path
                d="M6.5 1l1.4 3h3.1l-2.5 1.9 1 3L6.5 7 4 8.9l1-3L2.5 4H5.6z"
                stroke="rgba(77,48,47,0.4)"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {label === 'Resonance' && (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="5" cy="4.5" r="1.8" stroke="rgba(77,48,47,0.4)" strokeWidth="1.1" />
              <circle cx="9" cy="4.5" r="1.4" stroke="rgba(77,48,47,0.4)" strokeWidth="1.1" />
              <path
                d="M1 11c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5"
                stroke="rgba(77,48,47,0.4)"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
              <path
                d="M9 7.5c1.5.3 2.5 1.5 2.5 3"
                stroke="rgba(77,48,47,0.4)"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            </svg>
          )}
          {label === 'Execution' && (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path
                d="M6.5 1.083a5.417 5.417 0 1 0 5.417 5.417"
                stroke="rgba(77,48,47,0.4)"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
              <path
                d="M6.5 3.25v3.25l2.167 1.083"
                stroke="rgba(77,48,47,0.4)"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}

          <p
            style={{
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(77,48,47,0.35)',
              margin: 0,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {label}
          </p>
          {infoCopy ? <InfoTooltip copy={infoCopy} /> : null}
        </div>

        <p
          style={{
            fontSize: 13,
            color: '#000000',
            lineHeight: 1.6,
            margin: 0,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {detail.explanation}
        </p>
      </div>

      <p
        style={{
          fontFamily: fonts.heading,
          fontSize: 40,
          fontWeight: 700,
          color: label === 'Execution' && detail.score < 60 ? '#CDAAB3' : reportPalette.olive,
          margin: 0,
          lineHeight: 1,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {detail.score}
      </p>
    </div>
  );
}
