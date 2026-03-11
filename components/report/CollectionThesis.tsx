import { fonts, reportPalette, sectionCard, sectionEyebrow } from '@/components/report/reportStyles';

export function CollectionThesis({ thesis }: { thesis: string }) {
  return (
    <section style={{ ...sectionCard, padding: '28px 30px' }}>
      <p style={sectionEyebrow}>Collection Thesis</p>
      <p
        style={{
          margin: '16px 0 0',
          fontFamily: fonts.body,
          fontSize: 16,
          lineHeight: 1.8,
          color: reportPalette.olive,
          maxWidth: 920,
        }}
      >
        {thesis}
      </p>
    </section>
  );
}
