import type { CollectionScoreDetail } from '@/lib/collection-report/types';
import { fonts, getTone, getToneSurface, reportPalette, sectionEyebrow } from '@/components/report/reportStyles';

export function CollectionScoreCard({
  label,
  detail,
  compact = false,
}: {
  label: string;
  detail: CollectionScoreDetail;
  compact?: boolean;
}) {
  const tone = getTone(detail.score);
  const surface = getToneSurface(detail.score);

  return (
    <div
      style={{
        padding: compact ? '18px 18px 20px' : '24px 22px',
        borderRadius: 20,
        border: `1px solid ${surface.border}`,
        background: surface.background,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
        <p
          style={{
            ...sectionEyebrow,
            fontSize: 9,
          }}
        >
          {label}
        </p>
        <div style={{ textAlign: 'right' }}>
          <span
            style={{
              display: 'block',
              fontFamily: fonts.heading,
              fontSize: compact ? 34 : 40,
              lineHeight: 0.92,
              letterSpacing: '-0.05em',
              color: reportPalette.olive,
            }}
          >
            {detail.score}
          </span>
          <span
            style={{
              display: 'block',
              marginTop: 4,
              fontFamily: fonts.body,
              fontSize: 11,
              fontWeight: 600,
              color: tone,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Score
          </span>
        </div>
      </div>

      <p
        style={{
          margin: compact ? '14px 0 0' : '16px 0 0',
          fontFamily: fonts.body,
          fontSize: compact ? 13 : 14,
          lineHeight: 1.72,
          color: reportPalette.olive,
        }}
      >
        {detail.explanation}
      </p>
    </div>
  );
}
