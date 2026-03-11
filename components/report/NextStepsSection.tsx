import type { CollectionReportPayload } from '@/lib/collection-report/types';
import { fonts, reportPalette, sectionCard, sectionEyebrow } from '@/components/report/reportStyles';

function StepList({
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
        background: 'rgba(255,255,255,0.58)',
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
        {items.map((item, index) => (
          <div key={item} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span
              style={{
                minWidth: 24,
                height: 24,
                borderRadius: '50%',
                background: 'rgba(67,67,43,0.05)',
                color: tone,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: fonts.body,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {index + 1}
            </span>
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

export function NextStepsSection({
  nextSteps,
}: {
  nextSteps: CollectionReportPayload['next_steps'];
}) {
  return (
    <section style={{ ...sectionCard, padding: '28px 30px' }}>
      <p style={sectionEyebrow}>Next Steps</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
          marginTop: 18,
        }}
      >
        <StepList title="Immediate Actions" items={nextSteps.immediate_actions} tone={reportPalette.chartreuse} />
        <StepList title="Decision Points" items={nextSteps.decision_points} tone={reportPalette.steel} />
      </div>
    </section>
  );
}
