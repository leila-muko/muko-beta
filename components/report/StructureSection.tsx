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
      <p style={sectionEyebrow}>{title}</p>
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

function getExpressionRange(
  overview: CollectionReportPayload['overview'],
  pieces: CollectionReportPayload['piece_summary']
) {
  const uniqueDirections = new Set(
    pieces.map((piece) => piece.direction_tag?.trim().toLowerCase()).filter(Boolean)
  ).size;

  if (uniqueDirections >= 4) return 'Expanded';
  if (uniqueDirections >= 2) return 'Moderate';
  if (overview.silhouette_note.toLowerCase().includes('varied')) return 'Moderate';
  return 'Focused';
}

function getLineRead(
  overview: CollectionReportPayload['overview'],
  pieces: CollectionReportPayload['piece_summary']
) {
  const topCategory = overview.category_distribution[0]?.label?.toLowerCase() ?? 'core categories';
  const heroCount = pieces.filter((piece) => piece.role === 'hero').length;
  const directionalCount = pieces.filter((piece) => piece.role === 'directional').length;

  if (heroCount > 0 && directionalCount > 0) {
    return `The line reads as a shaped assortment with visible statement pieces anchored by a clearer ${topCategory} foundation.`;
  }

  if (heroCount > 0) {
    return `The assortment reads as hero-led, with the strongest emphasis landing in ${topCategory}.`;
  }

  return `The line reads as controlled and assortment-first, with ${topCategory} doing most of the structural work.`;
}

function getLineReadsWord(lineRead: string | null | undefined): string | null {
  if (!lineRead || !lineRead.trim()) return null;

  const normalized = lineRead.toLowerCase();

  if (normalized.includes('hero-led') || normalized.includes('hero led')) return 'Hero-led';
  if (
    normalized.includes('volume-driven') ||
    normalized.includes('volume driven') ||
    normalized.includes('volume driver')
  ) {
    return 'Volume-driven';
  }
  if (
    normalized.includes('core-heavy') ||
    normalized.includes('core heavy') ||
    normalized.includes('core evolution')
  ) {
    return 'Core-heavy';
  }
  if (normalized.includes('balanced')) return 'Balanced';
  if (normalized.includes('evenly') || normalized.includes('equally')) return 'Balanced';

  return null;
}

export function StructureSection({
  overview,
  pieces,
}: {
  overview: CollectionReportPayload['overview'];
  pieces: CollectionReportPayload['piece_summary'];
}) {
  const expressionRange = getExpressionRange(overview, pieces);
  const lineRead = getLineRead(overview, pieces);
  const lineReadsWord = getLineReadsWord(lineRead);

  return (
    <section style={{ ...sectionCard, padding: '28px 30px' }}>
      <p style={sectionEyebrow}>Structure</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginTop: 18,
        }}
      >
        <DistributionList title="Role Distribution" items={overview.role_distribution} />
        <DistributionList title="Category Distribution" items={overview.category_distribution} />
        <div
          style={{
            padding: '16px 18px',
            borderRadius: 18,
            border: `1px solid rgba(67,67,43,0.08)`,
            background: 'rgba(255,255,255,0.52)',
          }}
        >
          <p style={sectionEyebrow}>Top Materials</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
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
          <p style={sectionEyebrow}>How The Line Reads</p>
          {lineReadsWord && (
            <p
              style={{
                margin: '10px 0 0',
                fontFamily: fonts.heading,
                fontSize: 24,
                letterSpacing: '-0.03em',
                color: reportPalette.olive,
                lineHeight: 1,
              }}
            >
              {lineReadsWord}
            </p>
          )}
          <p
            style={{
              margin: '10px 0 0',
              fontFamily: fonts.body,
              fontSize: 13,
              lineHeight: 1.7,
              color: reportPalette.muted,
            }}
          >
            {lineRead}
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
          <p style={sectionEyebrow}>Expression Range</p>
          <p
            style={{
              margin: '10px 0 0',
              fontFamily: fonts.heading,
              fontSize: 24,
              letterSpacing: '-0.03em',
              color: reportPalette.olive,
            }}
          >
            {expressionRange}
          </p>
          <p
            style={{
              margin: '10px 0 0',
              fontFamily: fonts.body,
              fontSize: 13,
              lineHeight: 1.7,
              color: reportPalette.muted,
            }}
          >
            {overview.silhouette_note}
          </p>
        </div>
      </div>
    </section>
  );
}
