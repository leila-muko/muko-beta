import type { CollectionReportPayload } from '@/lib/collection-report/types';
import { fonts, reportPalette, sectionEyebrow, sectionHeading, subCard } from '@/components/report/reportStyles';

type StepListItem = string | { label?: string; body?: string };

function StepList({
  title,
  items,
  tone,
}: {
  title: string;
  items: StepListItem[];
  tone: string;
}) {
  return (
    <div
      style={{
        ...subCard,
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
          <div key={typeof item === 'string' ? item : `${item.label ?? ''}-${item.body ?? ''}-${index}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
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
            {typeof item === 'string' || (!item.label && !item.body) ? (
              <p
                style={{
                  margin: 0,
                  fontFamily: fonts.body,
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: reportPalette.olive,
                }}
              >
                {typeof item === 'string' ? item : item.body ?? item.label ?? ''}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {item.label ? (
                  <span
                    style={{
                      display: 'block',
                      marginBottom: 2,
                      fontFamily: fonts.body,
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {item.label}
                  </span>
                ) : null}
                {item.body ? (
                  <span
                    style={{
                      display: 'block',
                      fontFamily: fonts.body,
                      fontSize: 13,
                      fontWeight: 400,
                      lineHeight: 1.6,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {item.body}
                  </span>
                ) : null}
              </div>
            )}
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
    <section style={{ width: '100%' }}>
      <p style={sectionEyebrow}>Next Steps</p>
      <p
        style={{
          ...sectionHeading('md'),
          marginTop: 12,
          fontSize: 30,
        }}
      >
        Recommended next moves
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
          marginTop: 18,
        }}
      >
        <StepList title="Immediate Actions" items={nextSteps.immediate_actions as StepListItem[]} tone={reportPalette.chartreuse} />
        <StepList
          title="Decision Points"
          items={nextSteps.decision_points as StepListItem[]}
          tone={reportPalette.steel}
        />
      </div>
    </section>
  );
}
