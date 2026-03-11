import type { ReactNode } from 'react';
import type { CollectionReportPayload } from '@/lib/collection-report/types';
import { fonts, getSoftTone, getTone, reportPalette, sectionCard, sectionEyebrow } from '@/components/report/reportStyles';

function Pill({
  children,
  background,
  color,
}: {
  children: ReactNode;
  background: string;
  color: string;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 10px',
        borderRadius: 999,
        background,
        color,
        fontFamily: fonts.body,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.02em',
      }}
    >
      {children}
    </span>
  );
}

function getStatusTone(status?: string) {
  if (status === 'strong') return ['rgba(168,180,117,0.16)', reportPalette.chartreuse] as const;
  if (status === 'watch') return ['rgba(184,135,107,0.14)', reportPalette.camel] as const;
  return ['rgba(169,123,143,0.14)', reportPalette.rose] as const;
}

export function PieceSummaryTable({
  pieces,
}: {
  pieces: CollectionReportPayload['piece_summary'];
}) {
  return (
    <section style={{ ...sectionCard, padding: '28px 30px' }}>
      <p style={sectionEyebrow}>Piece Summary</p>

      <div
        style={{
          marginTop: 18,
          borderRadius: 20,
          border: `1px solid rgba(67,67,43,0.08)`,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.56)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <div
            style={{
              minWidth: 980,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(6, minmax(120px, 0.7fr))',
                gap: 12,
                padding: '14px 18px',
                borderBottom: `1px solid rgba(67,67,43,0.08)`,
                fontFamily: fonts.body,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: reportPalette.faint,
              }}
            >
              <span>Piece</span>
              <span>Role</span>
              <span>Complexity</span>
              <span>Direction</span>
              <span>Material</span>
              <span>Score</span>
              <span>Status</span>
            </div>

            {pieces.map((piece) => {
              const scoreTone = getTone(piece.score);
              const [statusBg, statusColor] = getStatusTone(piece.status);

              return (
                <div
                  key={piece.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(6, minmax(120px, 0.7fr))',
                    gap: 12,
                    padding: '16px 18px',
                    alignItems: 'center',
                    borderBottom: `1px solid rgba(67,67,43,0.06)`,
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: fonts.heading,
                        fontSize: 18,
                        lineHeight: 1.1,
                        color: reportPalette.olive,
                      }}
                    >
                      {piece.piece_name}
                    </p>
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontFamily: fonts.body,
                        fontSize: 12,
                        color: reportPalette.muted,
                      }}
                    >
                      {piece.category}
                    </p>
                  </div>
                  <span style={{ fontFamily: fonts.body, fontSize: 13, color: reportPalette.olive }}>{piece.role}</span>
                  <span style={{ fontFamily: fonts.body, fontSize: 13, color: reportPalette.olive }}>{piece.complexity}</span>
                  <span style={{ fontFamily: fonts.body, fontSize: 13, color: reportPalette.olive }}>{piece.direction_tag}</span>
                  <span style={{ fontFamily: fonts.body, fontSize: 13, color: reportPalette.olive }}>{piece.material}</span>
                  <Pill background={getSoftTone(piece.score)} color={scoreTone}>
                    {piece.score}
                  </Pill>
                  <Pill background={statusBg} color={statusColor}>
                    {piece.status ?? 'watch'}
                  </Pill>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
