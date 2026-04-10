import type { CollectionReportPayload } from '@/lib/collection-report/types';
import { CollectionTensionSection } from '@/components/report/CollectionTensionSection';
import { CollectionReportHeader } from '@/components/report/CollectionReportHeader';
import { CollectionScoreCard } from '@/components/report/CollectionScoreCard';
import { CollectionThesis } from '@/components/report/CollectionThesis';
import { ExecutionSection } from '@/components/report/ExecutionSection';
import { KeyRisksSection } from '@/components/report/KeyRisksSection';
import { NextStepsSection } from '@/components/report/NextStepsSection';
import { OverallReadCallout } from '@/components/report/OverallReadCallout';
import { PiecesSection } from '@/components/report/PiecesSection';
import { StructureSection } from '@/components/report/StructureSection';
import { reportPalette, sectionCard, sectionEyebrow, fonts } from '@/components/report/reportStyles';

const navItems = [
  ['overview', 'Overview'],
  ['tension', 'Tension'],
  ['structure', 'Structure'],
  ['pieces', 'Pieces'],
  ['execution', 'Execution'],
  ['risks', 'Risks'],
  ['next-steps', 'Next Steps'],
] as const;

export function CollectionReportView({
  report,
}: {
  report: CollectionReportPayload;
}) {
  const conflictLines = report.piece_summary.flatMap((piece) =>
    (piece.flagged_conflicts ?? []).map((conflict) => `${piece.piece_name}: ${conflict}`)
  );
  const risks =
    conflictLines.length > 0
      ? [
          ...report.key_risks,
          {
            title: 'Flagged Conflicts',
            detail: conflictLines.slice(0, 2).join(' '),
            why_this_matters: 'Piece-level conflicts can turn into late-stage revisions if they are left unresolved.',
          },
        ]
      : report.key_risks;

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '40px 20px 80px',
        display: 'flex',
        gap: 24,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}
    >
      <aside
        style={{
          flex: '0 0 180px',
          position: 'sticky',
          top: 110,
        }}
      >
        <div
          style={{
            ...sectionCard,
            padding: '20px 18px',
            background: 'rgba(255,255,255,0.52)',
          }}
        >
          <p style={sectionEyebrow}>Report Map</p>
          <nav style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            {navItems.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: reportPalette.muted,
                  textDecoration: 'none',
                }}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </aside>

      <div
        style={{
          flex: '1 1 760px',
          minWidth: 'min(100%, 760px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <section id="overview" style={{ display: 'grid', gap: 18, scrollMarginTop: 120 }}>
          <CollectionReportHeader header={report.header} />
          <OverallReadCallout value={report.overall_read} detail={report.overall_read_detail} />
          <CollectionThesis thesis={report.collection_thesis} tightened />

          <section style={{ ...sectionCard, padding: '24px 26px' }}>
            <p style={sectionEyebrow}>Collection Scores</p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
                marginTop: 16,
              }}
            >
              <CollectionScoreCard label="Identity" detail={report.scores.identity} compact />
              <CollectionScoreCard label="Resonance" detail={report.scores.resonance} compact />
              <CollectionScoreCard label="Execution" detail={report.scores.execution} compact />
            </div>
          </section>
        </section>

        <section id="tension" style={{ scrollMarginTop: 120 }}>
          <CollectionTensionSection intent={report.intent} brand={report.brand} />
        </section>

        <section id="structure" style={{ scrollMarginTop: 120 }}>
          <StructureSection overview={report.overview} pieces={report.piece_summary} />
        </section>

        <section id="pieces" style={{ scrollMarginTop: 120 }}>
          <PiecesSection pieces={report.piece_summary} />
        </section>

        <section id="execution" style={{ scrollMarginTop: 120 }}>
          <ExecutionSection scores={report.scores} health={report.collection_health} pieces={report.piece_summary} />
        </section>

        <section id="risks" style={{ scrollMarginTop: 120 }}>
          <KeyRisksSection risks={risks} />
        </section>

        <section id="next-steps" style={{ scrollMarginTop: 120 }}>
          <NextStepsSection nextSteps={report.next_steps} />
        </section>
      </div>
    </div>
  );
}
