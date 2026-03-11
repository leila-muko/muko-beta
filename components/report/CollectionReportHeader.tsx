import type { CollectionReportPayload } from '@/lib/collection-report/types';
import { fonts, formatMonthYear, reportPalette, sectionCard } from '@/components/report/reportStyles';

export function CollectionReportHeader({
  header,
}: {
  header: CollectionReportPayload['header'];
}) {
  return (
    <section
      style={{
        ...sectionCard,
        padding: '36px 34px 28px',
        background:
          'linear-gradient(145deg, rgba(255,255,255,0.88) 0%, rgba(248,244,236,0.76) 52%, rgba(232,227,214,0.42) 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 'auto -50px -60px auto',
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,180,117,0.18) 0%, rgba(168,180,117,0) 70%)',
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
          margin: '12px 0 8px',
          fontFamily: fonts.heading,
          fontSize: 'clamp(2.25rem, 5vw, 4rem)',
          lineHeight: 0.94,
          letterSpacing: '-0.04em',
          color: reportPalette.olive,
          maxWidth: 700,
        }}
      >
        {header.title}
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 14,
          marginTop: 24,
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
                padding: '12px 14px',
                borderRadius: 14,
                border: `1px solid rgba(67,67,43,0.08)`,
                background: 'rgba(255,255,255,0.58)',
                fontFamily: fonts.body,
                fontSize: 12,
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
