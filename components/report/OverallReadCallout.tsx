import { fonts, heroSurface, reportPalette, sectionEyebrow, softPanel } from '@/components/report/reportStyles';

export function OverallReadCallout({ value, detail }: { value: string; detail?: string }) {
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
          gap: 22,
          alignItems: 'start',
        }}
      >
        <div>
          <p style={sectionEyebrow}>Overall Muko Read</p>
          <p
            style={{
              margin: '16px 0 0',
              fontFamily: fonts.heading,
              fontSize: 'clamp(2rem, 3.2vw, 3rem)',
              lineHeight: 0.98,
              letterSpacing: '-0.05em',
              color: reportPalette.olive,
              maxWidth: 720,
            }}
          >
            {value}
          </p>
        </div>

        {detail ? (
          <aside
            style={{
              ...softPanel,
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
            <p
              style={{
                margin: '10px 0 0',
                fontFamily: fonts.body,
                fontSize: 14,
                lineHeight: 1.72,
                color: reportPalette.olive,
              }}
            >
              {detail}
            </p>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
