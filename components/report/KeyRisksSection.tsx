import type { CollectionRisk } from '@/lib/collection-report/types';
import { fonts, reportPalette, sectionEyebrow, sectionHeading } from '@/components/report/reportStyles';

const WHY_THIS_MATTERS_FALLBACK =
  'This could affect clarity, feasibility, or confidence in the line as it moves forward.';

export function KeyRisksSection({ risks }: { risks: CollectionRisk[] }) {
  return (
    <section style={{ width: '100%' }}>
      <p style={sectionEyebrow}>Key Risks</p>
      <p
        style={{
          ...sectionHeading('md'),
          marginTop: 12,
          fontSize: 30,
        }}
      >
        Friction points that could weaken the line
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginTop: 18,
        }}
      >
        {risks.map((risk) => (
          <div
            key={risk.title}
            style={{
              padding: '22px',
              borderRadius: 20,
              background: 'linear-gradient(180deg, rgba(169,123,143,0.06) 0%, rgba(255,255,255,0.48) 100%)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: fonts.heading,
                fontSize: 18,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: reportPalette.olive,
              }}
            >
              {risk.title}
            </p>
            <p
              style={{
                margin: '12px 0 0',
                fontFamily: fonts.body,
                fontSize: 14,
                lineHeight: 1.7,
                color: reportPalette.muted,
              }}
            >
              {risk.detail}
            </p>
            {risk.why_this_matters && risk.why_this_matters !== WHY_THIS_MATTERS_FALLBACK ? (
              <p
                style={{
                  margin: '12px 0 0',
                  fontFamily: fonts.body,
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: reportPalette.faint,
                }}
              >
                Why this matters: {risk.why_this_matters}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
