'use client';

import { fonts, heroSurface, reportPalette, sectionEyebrow } from '@/components/report/reportStyles';
import { MukoTypedRead } from '@/components/ui/MukoTypedRead';

export function OverallReadCallout({
  topMeta,
  topRightMeta,
  value,
  thesis,
  detail,
}: {
  topMeta?: string;
  topRightMeta?: string;
  value: string;
  thesis?: string;
  detail?: string;
}) {
  return (
    <section
      style={{
        ...heroSurface,
        padding: '34px 34px',
        background:
          'radial-gradient(circle at top right, rgba(168,180,117,0.12), transparent 26%), linear-gradient(180deg, rgba(249,247,242,0.96) 0%, rgba(255,255,255,0.90) 100%)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div>
              {topMeta ? (
                <p
                  style={{
                    margin: 0,
                    fontFamily: fonts.body,
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: reportPalette.muted,
                  }}
                >
                  {topMeta}
                </p>
              ) : null}

              <p style={sectionEyebrow}>Overall Muko Read</p>
            </div>

            {topRightMeta ? (
              <div
                style={{
                  display: 'grid',
                  justifyItems: 'end',
                  flexShrink: 0,
                }}
              >
                {topRightMeta ? (
                  <p
                    style={{
                      margin: 0,
                      fontFamily: fonts.body,
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: 'rgba(67,67,43,0.36)',
                      textAlign: 'right',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {topRightMeta}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 12, maxWidth: 760 }}>
            <MukoTypedRead
              key={`${value}-${thesis ?? ''}`}
              headline={value}
              body={thesis}
              cursorColor="#A8B475"
              headlineStyle={{
                fontFamily: fonts.heading,
                fontSize: 'clamp(1.5rem, 2.35vw, 2.2rem)',
                lineHeight: 0.98,
                letterSpacing: '-0.05em',
                color: reportPalette.olive,
                margin: 0,
              }}
              bodyContainerStyle={{ marginTop: 20 }}
              bodyStyle={{
                fontFamily: fonts.body,
                fontSize: 14,
                lineHeight: 1.75,
                color: reportPalette.olive,
              }}
            />
          </div>
        </div>

        {thesis && detail ? (
          <div
            aria-hidden="true"
            style={{
              borderTop: '0.5px solid rgba(77,48,47,0.10)',
              marginBottom: 14,
            }}
          />
        ) : null}

        {detail ? (
          <div
            style={{
              maxWidth: 760,
            }}
          >
            <p
              style={{
                ...sectionEyebrow,
                color: reportPalette.faint,
              }}
            >
              Where to focus
            </p>
            <MukoTypedRead
              key={`${value}-${detail}`}
              headline={detail}
              cursorColor="#A8B475"
              headlineStyle={{
                margin: '8px 0 0',
                fontFamily: fonts.body,
                fontSize: 14,
                lineHeight: 1.72,
                color: reportPalette.olive,
              }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
