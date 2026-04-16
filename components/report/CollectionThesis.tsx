import { reportPalette, narrativeSurface, sectionBody, sectionEyebrow, sectionHeading } from '@/components/report/reportStyles';

export function CollectionThesis({
  thesis,
  tightened = false,
}: {
  thesis: string;
  tightened?: boolean;
}) {
  return (
    <section style={{ ...narrativeSurface, padding: tightened ? '30px 34px' : '34px 36px' }}>
      <p style={sectionEyebrow}>Collection Thesis</p>
      <p
        style={{
          ...sectionHeading('md'),
          marginTop: 14,
          fontSize: tightened ? 28 : 30,
        }}
      >
        The collection argument
      </p>
      <p
        style={{
          ...sectionBody(tightened ? 860 : 900),
          marginTop: 14,
          fontSize: tightened ? 15 : 16,
          color: reportPalette.olive,
        }}
      >
        {thesis}
      </p>
    </section>
  );
}
