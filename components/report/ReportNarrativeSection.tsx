import { fonts, reportPalette, sectionCard, sectionEyebrow } from '@/components/report/reportStyles';

const PENDING_COPY = 'Analysis pending. Narrative will appear here when the full report synthesis is available.';

export function ReportNarrativeSection({ narrative }: { narrative?: string | null }) {
  const paragraphs = (narrative ?? '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const isPending = paragraphs.length === 0;

  return (
    <section style={{ ...sectionCard, padding: '28px 30px' }}>
      <p style={sectionEyebrow}>Strategic Narrative</p>
      <div
        style={{
          marginTop: 16,
          display: 'grid',
          gap: 14,
          maxWidth: 920,
        }}
      >
        {(isPending ? [PENDING_COPY] : paragraphs).map((paragraph, index) => (
          <p
            key={`${index}-${paragraph.slice(0, 24)}`}
            style={{
              margin: 0,
              fontFamily: fonts.body,
              fontSize: 16,
              lineHeight: 1.8,
              color: isPending ? reportPalette.muted : reportPalette.olive,
            }}
          >
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
