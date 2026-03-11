import type { CollectionReportPayload } from '@/lib/collection-report/types';
import { fonts, reportPalette, sectionCard, sectionEyebrow } from '@/components/report/reportStyles';

function DistributionList({
  title,
  items,
}: {
  title: string;
  items: CollectionReportPayload['overview']['role_distribution'];
}) {
  return (
    <div
      style={{
        padding: '16px 18px',
        borderRadius: 18,
        border: `1px solid rgba(67,67,43,0.08)`,
        background: 'rgba(255,255,255,0.52)',
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: fonts.body,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: reportPalette.faint,
        }}
      >
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
        {items.map((item) => (
          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontFamily: fonts.body, fontSize: 13, color: reportPalette.olive }}>{item.label}</span>
            <span style={{ fontFamily: fonts.body, fontSize: 13, color: reportPalette.muted }}>
              {item.count} · {item.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CollectionOverview({ overview }: { overview: CollectionReportPayload['overview'] }) {
  return (
    <section style={{ ...sectionCard, padding: '28px 30px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          alignItems: 'end',
          flexWrap: 'wrap',
        }}
      >
        <p style={sectionEyebrow}>Collection Overview</p>
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 999,
            background: 'rgba(67,67,43,0.04)',
            fontFamily: fonts.body,
            fontSize: 12,
            color: reportPalette.muted,
          }}
        >
          {overview.total_pieces} pieces
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginTop: 18,
        }}
      >
        <DistributionList title="Role Distribution" items={overview.role_distribution} />
        <DistributionList title="Complexity Distribution" items={overview.complexity_distribution} />
        <DistributionList title="Category Mix" items={overview.category_distribution} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 0.75fr)',
          gap: 16,
          marginTop: 16,
        }}
      >
        <div
          style={{
            padding: '18px 20px',
            borderRadius: 18,
            background: 'rgba(255,255,255,0.52)',
            border: `1px solid rgba(67,67,43,0.08)`,
          }}
        >
          <p style={sectionEyebrow}>Silhouette Read</p>
          <p
            style={{
              margin: '12px 0 0',
              fontFamily: fonts.body,
              fontSize: 14,
              lineHeight: 1.7,
              color: reportPalette.olive,
            }}
          >
            {overview.silhouette_note}
          </p>
        </div>

        <div
          style={{
            padding: '18px 20px',
            borderRadius: 18,
            background: 'rgba(255,255,255,0.52)',
            border: `1px solid rgba(67,67,43,0.08)`,
          }}
        >
          <p style={sectionEyebrow}>Top Materials</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {overview.top_materials.length > 0 ? (
              overview.top_materials.map((material) => (
                <span
                  key={material}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 999,
                    background: 'rgba(125,150,172,0.10)',
                    color: reportPalette.steel,
                    fontFamily: fonts.body,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {material}
                </span>
              ))
            ) : (
              <span style={{ fontFamily: fonts.body, fontSize: 13, color: reportPalette.muted }}>
                Material mix still emerging.
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
