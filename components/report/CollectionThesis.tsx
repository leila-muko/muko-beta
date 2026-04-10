import { fonts, reportPalette, sectionCard, sectionEyebrow } from '@/components/report/reportStyles';

export function CollectionThesis({
  thesis,
  tightened = false,
}: {
  thesis: string;
  tightened?: boolean;
}) {
  return (
    <section style={{ ...sectionCard, padding: '28px 30px' }}>
      <p style={sectionEyebrow}>Collection Thesis</p>
      <p
        style={{
          margin: tightened ? '14px 0 0' : '16px 0 0',
          fontFamily: fonts.body,
          fontSize: tightened ? 15 : 16,
          lineHeight: tightened ? 1.75 : 1.8,
          color: reportPalette.olive,
          maxWidth: tightened ? 860 : 920,
        }}
      >
        {thesis}
      </p>
    </section>
  );
}
