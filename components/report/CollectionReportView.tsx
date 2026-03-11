import type { CollectionReportPayload } from '@/lib/collection-report/types';
import { CollectionHealthSection } from '@/components/report/CollectionHealthSection';
import { CollectionOverview } from '@/components/report/CollectionOverview';
import { CollectionReportHeader } from '@/components/report/CollectionReportHeader';
import { CollectionScoreCard } from '@/components/report/CollectionScoreCard';
import { CollectionThesis } from '@/components/report/CollectionThesis';
import { KeyRisksSection } from '@/components/report/KeyRisksSection';
import { MukoInsightSection } from '@/components/report/MukoInsightSection';
import { NextStepsSection } from '@/components/report/NextStepsSection';
import { OverallReadCallout } from '@/components/report/OverallReadCallout';
import { PieceSummaryTable } from '@/components/report/PieceSummaryTable';
import { reportPalette, sectionCard, sectionEyebrow, fonts } from '@/components/report/reportStyles';

export function CollectionReportView({ report }: { report: CollectionReportPayload }) {
  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '40px 20px 80px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <CollectionReportHeader header={report.header} />
      <CollectionThesis thesis={report.collection_thesis} />
      <CollectionOverview overview={report.overview} />

      <section style={{ ...sectionCard, padding: '28px 30px' }}>
        <p style={sectionEyebrow}>Collection Scores</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            marginTop: 18,
          }}
        >
          <CollectionScoreCard label="Identity" detail={report.scores.identity} />
          <CollectionScoreCard label="Resonance" detail={report.scores.resonance} />
          <CollectionScoreCard label="Execution" detail={report.scores.execution} />
        </div>
      </section>

      <MukoInsightSection insight={report.muko_insight} />
      <CollectionHealthSection health={report.collection_health} />
      <PieceSummaryTable pieces={report.piece_summary} />
      <KeyRisksSection risks={report.key_risks} />
      <NextStepsSection nextSteps={report.next_steps} />
      <OverallReadCallout value={report.overall_read} />

      <div
        style={{
          padding: '16px 18px',
          borderRadius: 18,
          background: 'rgba(255,255,255,0.46)',
          border: `1px solid rgba(67,67,43,0.08)`,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p style={sectionEyebrow}>Methodology</p>
          <p
            style={{
              margin: '8px 0 0',
              fontFamily: fonts.body,
              fontSize: 13,
              color: reportPalette.muted,
            }}
          >
            Synthesizer-directed report grounded in collection metrics, scoring signals, and piece-level context.
          </p>
        </div>

        {report.meta.snapshot_id ? (
          <div style={{ textAlign: 'right' }}>
            <p style={sectionEyebrow}>Snapshot</p>
            <p
              style={{
                margin: '8px 0 0',
                fontFamily: fonts.body,
                fontSize: 13,
                color: reportPalette.muted,
              }}
            >
              {report.meta.snapshot_id}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
