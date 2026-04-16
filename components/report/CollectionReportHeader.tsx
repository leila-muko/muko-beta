import type { CollectionReportPayload } from '@/lib/collection-report/types';
import {
  fonts,
  formatMonthYear,
  heroSurface,
  metaChip,
  quietMeta,
  reportPalette,
} from '@/components/report/reportStyles';

export function CollectionReportHeader({
  header,
}: {
  header: CollectionReportPayload['header'];
}) {
  return (
    <section
      style={{
        ...heroSurface,
        padding: '48px 42px 36px',
        background:
          'radial-gradient(circle at top right, rgba(168,180,117,0.10), transparent 28%), linear-gradient(180deg, rgba(248,245,239,0.98) 0%, rgba(255,255,255,0.92) 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 22,
          borderRadius: 24,
          border: '1px solid rgba(67,67,43,0.06)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -10,
          right: 70,
          width: 220,
          height: 220,
          borderRadius: '50%',
          border: '1px solid rgba(67,67,43,0.06)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 'auto 44px 28px auto',
          width: 160,
          height: 48,
          borderTop: '1px solid rgba(67,67,43,0.08)',
          borderRight: '1px solid rgba(67,67,43,0.08)',
          borderTopRightRadius: 32,
          pointerEvents: 'none',
        }}
      />

      <p
        style={{
          margin: 0,
          fontFamily: fonts.body,
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: reportPalette.faint,
          fontWeight: 700,
        }}
      >
        Collection Intelligence Memo
      </p>

      <h1
        style={{
          margin: '18px 0 0',
          fontFamily: fonts.heading,
          fontSize: 'clamp(2.8rem, 6vw, 5rem)',
          fontWeight: 400,
          lineHeight: 0.92,
          letterSpacing: '-0.04em',
          color: reportPalette.olive,
          maxWidth: 760,
        }}
      >
        {header.title}
      </h1>

      <p
        style={{
          ...quietMeta,
          margin: '18px 0 0',
          maxWidth: 580,
          fontSize: 14,
          lineHeight: 1.7,
        }}
      >
        A report formatted for creative and merchandising leadership review, focused on line clarity, tension,
        and development pressure.
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          marginTop: 28,
        }}
      >
        {[
          header.collection_name,
          `Generated ${formatMonthYear(header.generated_at)}`,
          `${header.piece_count} ${header.piece_count === 1 ? 'piece' : 'pieces'} reviewed`,
          header.version_label || null,
          'Muko collection memo',
        ]
          .filter(Boolean)
          .map((item) => (
            <div
              key={item}
              style={{
                ...metaChip,
                textTransform: 'none',
                letterSpacing: '0.01em',
                fontWeight: 500,
                color: reportPalette.muted,
              }}
            >
              {item}
            </div>
          ))}
      </div>
    </section>
  );
}
