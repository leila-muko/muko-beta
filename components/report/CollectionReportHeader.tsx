import type { CollectionReportPayload } from '@/lib/collection-report/types';
import {
  fonts,
  formatMonthYear,
  heroSurface,
  reportPalette,
} from '@/components/report/reportStyles';

export function CollectionReportHeader({
  header,
  categoryCount = 0,
  assortmentSignal,
  executionSignal,
  topMaterials = [],
}: {
  header: CollectionReportPayload['header'];
  categoryCount?: number;
  assortmentSignal?: string;
  executionSignal?: string;
  topMaterials?: string[];
}) {
  const reportHeader = header as CollectionReportPayload['header'] & {
    collection_aesthetic?: string | null;
    aesthetic_inflection?: string | null;
  };

  return (
    <section
      style={{
        ...heroSurface,
        padding: '44px 48px 40px',
        position: 'relative',
        background: reportPalette.paperStrong,
      }}
    >
      <p
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: reportPalette.faint,
          margin: '0 0 28px',
        }}
      >
        Collection intelligence memo · {header.collection_name} · {formatMonthYear(header.generated_at)}
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 32,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: fonts.heading,
              fontSize: 'clamp(2rem, 4.2vw, 2.9rem)',
              fontWeight: 700,
              lineHeight: 1,
              color: reportPalette.olive,
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            {header.title}
          </h1>

          {(reportHeader.collection_aesthetic || reportHeader.aesthetic_inflection) && (
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                color: 'rgba(67,67,43,0.45)',
                margin: '16px 0 0',
                letterSpacing: '0.03em',
              }}
            >
              {[reportHeader.collection_aesthetic, reportHeader.aesthetic_inflection].filter(Boolean).join(' → ')}
            </p>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 28,
            paddingBottom: 6,
          }}
        >
          <div
            style={{
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: reportPalette.quiet,
                margin: '0 0 5px',
              }}
            >
              Pieces
            </p>
            <p
              style={{
                fontFamily: fonts.heading,
                fontSize: 28,
                fontWeight: 700,
                color: reportPalette.olive,
                margin: 0,
                lineHeight: 1,
              }}
            >
              {header.piece_count}
            </p>
          </div>
          <div
            style={{
              width: '0.5px',
              background: reportPalette.line,
              alignSelf: 'stretch',
            }}
          />
          {categoryCount > 0 && (
            <>
              <div
                style={{
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: reportPalette.quiet,
                    margin: '0 0 5px',
                  }}
                >
                  Categories
                </p>
                <p
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 28,
                    fontWeight: 700,
                    color: reportPalette.olive,
                    margin: 0,
                    lineHeight: 1,
                  }}
                >
                  {categoryCount}
                </p>
              </div>
              <div
                style={{
                  width: '0.5px',
                  background: reportPalette.line,
                  alignSelf: 'stretch',
                }}
              />
            </>
          )}
          <div
            style={{
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: reportPalette.quiet,
                margin: '0 0 5px',
              }}
            >
              Snapshot
            </p>
            <p
              style={{
                fontFamily: fonts.heading,
                fontSize: 14,
                fontWeight: 700,
                color: reportPalette.olive,
                margin: 0,
                paddingTop: 7,
              }}
            >
              Latest
            </p>
          </div>
        </div>
      </div>

      {(assortmentSignal || executionSignal) && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 32,
            flexWrap: 'wrap',
          }}
        >
          {assortmentSignal && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: reportPalette.muted,
                background: 'rgba(77,48,47,0.05)',
                borderRadius: 20,
                padding: '5px 12px',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.1" />
                <rect x="7" y="1" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.1" />
                <rect x="1" y="7" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.1" />
                <rect x="7" y="7" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.1" />
              </svg>
              {assortmentSignal}-led
            </span>
          )}

          {executionSignal && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: '#CDAAB3',
                background: 'rgba(205,170,179,0.1)',
                borderRadius: 20,
                padding: '5px 12px',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="2" width="10" height="8.5" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
                <path d="M1 5.5h10M4 2V1M8 2V1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
              {executionSignal}
            </span>
          )}

          {topMaterials && topMaterials.length > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: reportPalette.muted,
                background: 'rgba(77,48,47,0.05)',
                borderRadius: 20,
                padding: '5px 12px',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 10 C2 6 4 3 6 2 C8 3 10 6 10 10"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M4 10 C4 7.5 5 5.5 6 5 C7 5.5 8 7.5 8 10"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              {topMaterials.slice(0, 2).join(' · ')}
            </span>
          )}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 7,
          marginTop: 28,
          paddingTop: 18,
          borderTop: '0.5px solid rgba(0,0,0,0.1)',
        }}
      >
        <span
          style={{
            fontSize: 20,
            color: '#888888',
            lineHeight: '1',
            marginTop: '-2px',
          }}
        >
          ✳
        </span>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: '#888888',
            lineHeight: '1.4',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Muko uses AI — always apply your own judgment.
        </p>
      </div>
    </section>
  );
}
