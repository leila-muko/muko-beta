import type { ReactNode } from 'react';
import type { CollectionReportPayload } from '@/lib/collection-report/types';
import { fonts, reportPalette, sectionCard, sectionEyebrow } from '@/components/report/reportStyles';

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
        justifyContent: 'center',
        padding: '8px 12px',
        borderRadius: 999,
        background,
        color,
        fontFamily: fonts.body,
        fontSize: 12,
        fontWeight: 600,
        textAlign: 'center',
      }}
    >
      {children}
    </span>
  );
}

function formatToken(value: string) {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusTone(status?: string) {
  if (status === 'strong') return ['rgba(168,180,117,0.16)', reportPalette.chartreuse] as const;
  if (status === 'watch') return ['rgba(184,135,107,0.14)', reportPalette.camel] as const;
  return ['rgba(169,123,143,0.14)', reportPalette.rose] as const;
}

function getExecutionSignal(piece: CollectionReportPayload['piece_summary'][number]) {
  const notes = Array.isArray(piece.execution_notes)
    ? piece.execution_notes.filter(Boolean)
    : typeof piece.execution_notes === 'string' && piece.execution_notes.trim()
      ? [piece.execution_notes]
      : [];
  const conflictCount = piece.flagged_conflicts?.length ?? 0;
  const notesText = notes.join(' ').toLowerCase();

  if (piece.margin_passed === false || conflictCount >= 2) {
    return {
      label: 'Spec risk',
      background: 'rgba(169,123,143,0.14)',
      color: reportPalette.rose,
    };
  }

  if (/mill|factory|vendor|lead time|calendar|sampling|delivery/.test(notesText)) {
    return {
      label: 'Factory-dependent',
      background: 'rgba(125,150,172,0.10)',
      color: reportPalette.steel,
    };
  }

  if (/fabric|drape|gauge|wash|finish|shrink|hand-feel|knit/.test(notesText)) {
    return {
      label: 'Material sensitivity',
      background: 'rgba(125,150,172,0.10)',
      color: reportPalette.steel,
    };
  }

  if (piece.complexity === 'high' || notes.length > 0 || piece.construction === 'high') {
    return {
      label: 'High build pressure',
      background: 'rgba(184,135,107,0.14)',
      color: reportPalette.camel,
    };
  }

  return {
    label: 'Clean execution',
    background: 'rgba(168,180,117,0.16)',
    color: reportPalette.chartreuse,
  };
}

export function PiecesSection({
  pieces,
}: {
  pieces: CollectionReportPayload['piece_summary'];
}) {
  return (
    <section style={{ ...sectionCard, padding: '28px 30px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <p style={sectionEyebrow}>Pieces</p>
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
          {pieces.length} pieces
        </div>
      </div>

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
          <div style={{ width: '100%' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(220px, 2.2fr) minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 1.2fr) minmax(180px, 1.35fr) minmax(0, 1fr)',
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
                <span
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  background: 'rgba(255,255,255,0.56)',
                }}
                >
                  Piece
                </span>
                <span>Role</span>
                <span>Complexity</span>
                <span>Material</span>
                <span>Execution Signal</span>
                <span>Status</span>
              </div>

            {pieces.map((piece) => {
              const [statusBg, statusColor] = getStatusTone(piece.status);
              const executionSignal = getExecutionSignal(piece);

              return (
                <div
                  key={piece.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(220px, 2.2fr) minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 1.2fr) minmax(180px, 1.35fr) minmax(0, 1fr)',
                    gap: 12,
                    padding: '16px 18px',
                    alignItems: 'center',
                    borderBottom: `1px solid rgba(67,67,43,0.06)`,
                  }}
                >
                  <div
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      background: 'rgba(255,255,255,0.56)',
                    }}
                  >
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
                  <span style={{ fontFamily: fonts.body, fontSize: 13, color: reportPalette.olive }}>{formatToken(piece.role)}</span>
                  <span style={{ fontFamily: fonts.body, fontSize: 13, color: reportPalette.olive }}>{piece.complexity}</span>
                  <span style={{ fontFamily: fonts.body, fontSize: 13, color: reportPalette.olive }}>{piece.material}</span>
                  <Pill background={executionSignal.background} color={executionSignal.color}>
                    {executionSignal.label}
                  </Pill>
                  {typeof piece.score === 'number' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <div
                        style={{
                          flex: 1,
                          minWidth: 48,
                          height: 4,
                          background: 'var(--color-background-secondary)',
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            borderRadius: 2,
                            background: '#b8876b',
                            width: `${Math.max(0, Math.min(piece.score, 100))}%`,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          minWidth: 20,
                          textAlign: 'right',
                          fontFamily: fonts.body,
                          fontSize: 11,
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {piece.score}
                      </span>
                    </div>
                  ) : (
                    <Pill background={executionSignal.background} color={executionSignal.color}>
                      {executionSignal.label}
                    </Pill>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
