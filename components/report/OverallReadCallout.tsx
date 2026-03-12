import { fonts, sectionCard, sectionEyebrow } from '@/components/report/reportStyles';

export function OverallReadCallout({ value, detail }: { value: string; detail?: string }) {
  return (
    <section
      style={{
        ...sectionCard,
        padding: '28px 30px',
        background:
          'linear-gradient(145deg, rgba(67,67,43,0.92) 0%, rgba(77,48,47,0.86) 58%, rgba(125,150,172,0.74) 100%)',
        color: '#F8F4EC',
      }}
    >
      <p
        style={{
          ...sectionEyebrow,
          color: 'rgba(248,244,236,0.62)',
        }}
      >
        Overall Muko Read
      </p>
      <p
        style={{
          margin: '14px 0 0',
          fontFamily: fonts.heading,
          fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
          lineHeight: 1.02,
          letterSpacing: '-0.04em',
          maxWidth: 780,
        }}
      >
        {value}
      </p>

      {detail ? (
        <p
          style={{
            margin: '12px 0 0',
            maxWidth: 760,
            fontFamily: fonts.body,
            fontSize: 14,
            lineHeight: 1.7,
            color: 'rgba(248,244,236,0.78)',
          }}
        >
          {detail}
        </p>
      ) : null}
    </section>
  );
}
