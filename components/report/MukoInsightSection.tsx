import type { CollectionReportPayload } from '@/lib/collection-report/types';
import { MukoStreamingParagraph } from '@/components/ui/MukoStreamingParagraph';
import { fonts, reportPalette, sectionCard, sectionEyebrow } from '@/components/report/reportStyles';

function flattenInsight(insight: CollectionReportPayload['muko_insight']) {
  return [...insight.working, ...insight.watch, ...insight.recommendations].filter(Boolean).join(' ');
}

function InsightBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: string;
}) {
  return (
    <div
      style={{
        padding: '20px',
        borderRadius: 20,
        border: `1px solid rgba(67,67,43,0.08)`,
        background: 'rgba(255,255,255,0.56)',
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: fonts.heading,
          fontSize: 18,
          color: tone,
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {items.map((item) => (
          <div
            key={item}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                marginTop: 7,
                borderRadius: '50%',
                background: tone,
                flexShrink: 0,
              }}
            />
            <p
              style={{
                margin: 0,
                fontFamily: fonts.body,
                fontSize: 14,
                lineHeight: 1.7,
                color: reportPalette.olive,
              }}
            >
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MukoInsightSection({
  insight,
  streamingParagraph,
  isParagraphStreaming = false,
}: {
  insight: CollectionReportPayload['muko_insight'];
  streamingParagraph?: string;
  isParagraphStreaming?: boolean;
}) {
  return (
    <section style={{ ...sectionCard, padding: '28px 30px' }}>
      <p style={sectionEyebrow}>Muko Insight</p>

      <MukoStreamingParagraph
        text={flattenInsight(insight)}
        streamingText={streamingParagraph}
        isStreaming={isParagraphStreaming}
        containerStyle={{ marginTop: 18 }}
        paragraphStyle={{
          fontFamily: fonts.body,
          fontSize: 14,
          lineHeight: 1.7,
          color: reportPalette.olive,
        }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginTop: 18,
        }}
      >
        <InsightBlock title="What’s Working" items={insight.working} tone={reportPalette.chartreuse} />
        <InsightBlock title="What to Watch" items={insight.watch} tone={reportPalette.camel} />
        <InsightBlock title="Recommendations" items={insight.recommendations} tone={reportPalette.steel} />
      </div>
    </section>
  );
}
