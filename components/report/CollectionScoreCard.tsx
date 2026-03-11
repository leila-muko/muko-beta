import type { CollectionScoreDetail } from '@/lib/collection-report/types';
import { fonts, getSoftTone, getTone, reportPalette } from '@/components/report/reportStyles';

export function CollectionScoreCard({
  label,
  detail,
}: {
  label: string;
  detail: CollectionScoreDetail;
}) {
  const tone = getTone(detail.score);

  return (
    <div
      style={{
        padding: '22px 20px',
        borderRadius: 20,
        border: `1px solid rgba(67,67,43,0.08)`,
        background: `linear-gradient(160deg, ${getSoftTone(detail.score)} 0%, rgba(255,255,255,0.72) 100%)`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <p
          style={{
            margin: 0,
            fontFamily: fonts.body,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: reportPalette.faint,
          }}
        >
          {label}
        </p>
        <span
          style={{
            fontFamily: fonts.heading,
            fontSize: 36,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            color: tone,
          }}
        >
          {detail.score}
        </span>
      </div>

      <p
        style={{
          margin: '14px 0 0',
          fontFamily: fonts.body,
          fontSize: 14,
          lineHeight: 1.7,
          color: reportPalette.olive,
        }}
      >
        {detail.explanation}
      </p>
    </div>
  );
}
