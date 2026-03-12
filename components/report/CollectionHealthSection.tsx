import type { CollectionHealthDetail, CollectionReportPayload } from '@/lib/collection-report/types';
import { fonts, getSoftTone, getTone, reportPalette, sectionCard, sectionEyebrow } from '@/components/report/reportStyles';

function HealthCard({
  title,
  detail,
}: {
  title: string;
  detail: CollectionHealthDetail;
}) {
  const tone = getTone(detail.score);

  return (
    <div
      style={{
        padding: '20px',
        borderRadius: 20,
        background: 'rgba(255,255,255,0.58)',
        border: `1px solid rgba(67,67,43,0.08)`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
        <div>
          <p style={sectionEyebrow}>{title}</p>
          <p
            style={{
              margin: '8px 0 0',
              fontFamily: fonts.heading,
              fontSize: 22,
              color: reportPalette.olive,
              letterSpacing: '-0.03em',
            }}
          >
            {detail.label}
          </p>
        </div>

        <div
          style={{
            minWidth: 58,
            padding: '10px 12px',
            borderRadius: 14,
            textAlign: 'center',
            background: getSoftTone(detail.score),
            color: tone,
            fontFamily: fonts.heading,
            fontSize: 24,
            lineHeight: 1,
          }}
        >
          {detail.score}
        </div>
      </div>

      <p
        style={{
          margin: '14px 0 0',
          fontFamily: fonts.body,
          fontSize: 14,
          lineHeight: 1.7,
          color: reportPalette.muted,
        }}
      >
        {detail.interpretation}
      </p>

      {detail.basis ? (
        <p
          style={{
            margin: '10px 0 0',
            fontFamily: fonts.body,
            fontSize: 12,
            lineHeight: 1.6,
            color: reportPalette.faint,
          }}
        >
          {detail.basis}
        </p>
      ) : null}
    </div>
  );
}

export function CollectionHealthSection({
  health,
}: {
  health: CollectionReportPayload['collection_health'];
}) {
  const items = [
    ['Role Balance', health.role_balance],
    ['Complexity Load', health.complexity_load],
    ['Silhouette Diversity', health.silhouette_diversity],
    ['Redundancy Risk', health.redundancy_risk],
  ] as const;

  return (
    <section style={{ ...sectionCard, padding: '28px 30px' }}>
      <p style={sectionEyebrow}>Collection Health</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginTop: 18,
        }}
      >
        {items
          .filter((item) => Boolean(item[1]))
          .map(([title, detail]) => (
            <HealthCard key={title} title={title} detail={detail!} />
          ))}
      </div>
    </section>
  );
}
