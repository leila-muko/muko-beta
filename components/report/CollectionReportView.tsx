'use client';

import { useEffect, useState } from 'react';
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
import {
  fonts,
  memoSection,
  pageShell,
  railCard,
  reportPalette,
  sectionEyebrow,
  structuredSurface,
} from '@/components/report/reportStyles';

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
  const [activeSection, setActiveSection] = useState<(typeof navItems)[number][0]>('overview');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;
        const id = visible.target.id as (typeof navItems)[number][0];
        setActiveSection(id);
      },
      {
        rootMargin: '-18% 0px -58% 0px',
        threshold: [0.1, 0.25, 0.5],
      }
    );

    navItems.forEach(([id]) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

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
    <div style={pageShell}>
      <aside
        style={{
          flex: '0 0 180px',
          position: 'sticky',
          top: 116,
          alignSelf: 'flex-start',
        }}
      >
        <div style={railCard}>
          <p style={{ ...sectionEyebrow, paddingLeft: 18 }}>Report Map</p>
          <nav style={{ display: 'grid', gap: 6, marginTop: 14 }}>
            {navItems.map(([id, label]) => {
              const active = activeSection === id;

              return (
                <a
                  key={id}
                  href={`#${id}`}
                  aria-current={active ? 'true' : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 0 8px 18px',
                    textDecoration: 'none',
                    fontFamily: fonts.body,
                    fontSize: 13,
                    color: active ? reportPalette.olive : reportPalette.muted,
                    transition: 'color 160ms ease',
                  }}
                >
                  <span
                    style={{
                      width: 4,
                      height: 20,
                      borderRadius: 999,
                      background: active ? reportPalette.olive : 'rgba(67,67,43,0.08)',
                      opacity: active ? 1 : 0.6,
                    }}
                  />
                  {label}
                </a>
              );
            })}
          </nav>
        </div>
      </aside>

      <div
        style={{
          flex: '1 1 780px',
          minWidth: 'min(100%, 780px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        <section id="overview" style={{ display: 'grid', gap: 24, scrollMarginTop: 128 }}>
          <CollectionReportHeader
            header={report.header}
            categoryCount={report.overview?.category_distribution?.length ?? 0}
            assortmentSignal={report.overview?.category_distribution?.[0]?.label ?? undefined}
            executionSignal={report.assortment_intelligence?.diagnostics?.viabilitySignal ?? undefined}
            topMaterials={report.overview?.top_materials ?? []}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.45fr) minmax(280px, 0.8fr)',
              gap: 20,
              alignItems: 'stretch',
            }}
          >
            <OverallReadCallout
              value={report.overall_read}
              thesis={report.collection_thesis}
              detail={report.overall_read_detail}
            />

            <section style={{ ...structuredSurface, padding: '26px 26px' }}>
              <p style={sectionEyebrow}>Collection Scores</p>
              <div style={{ marginTop: 16 }}>
                <CollectionScoreCard
                  label="Identity"
                  detail={report.scores.identity}
                  infoCopy="Measures how cohesively this collection expresses your brand's point of view. Looks at aesthetic alignment across pieces, role balance, and silhouette consistency — not just whether individual pieces feel on-brand, but whether the collection reads as a system. Strong Identity means a customer can feel who it's for."
                />

                <div style={{ borderTop: '0.5px solid rgba(77,48,47,0.08)', margin: '20px 0' }} />

                <CollectionScoreCard
                  label="Resonance"
                  detail={report.scores.resonance}
                  infoCopy="Measures commercial legibility and market timing across the collection. Looks at trend saturation, category clarity, and whether the assortment is differentiated enough to stand out without being so niche it loses reach. High Resonance means the market has space for this collection right now."
                />

                <div style={{ borderTop: '0.5px solid rgba(77,48,47,0.08)', margin: '20px 0' }} />

                <CollectionScoreCard
                  label="Execution"
                  detail={report.scores.execution}
                  infoCopy="Measures whether this collection can be produced as planned. Looks at complexity concentration, material lead times, and how the production load distributes across pieces relative to your delivery window. A strong score means the collection is buildable. Pressure points flag where the plan needs adjustment before you commit."
                />
              </div>
            </section>
          </div>
        </section>

        <section id="tension" style={{ scrollMarginTop: 128 }}>
          <CollectionTensionSection
            intent={report.intent}
            brand={report.brand}
            ppw_descriptions={report.ppw_descriptions}
          />
        </section>

        <section id="structure" style={{ scrollMarginTop: 128 }}>
          <StructureSection overview={report.overview} pieces={report.piece_summary} />
        </section>

        <section id="pieces" style={{ scrollMarginTop: 128 }}>
          <PiecesSection pieces={report.piece_summary} />
        </section>

        <section id="execution" style={{ scrollMarginTop: 128 }}>
          <ExecutionSection scores={report.scores} health={report.collection_health} pieces={report.piece_summary} />
        </section>

        <section id="risks" style={{ scrollMarginTop: 128 }}>
          <div style={{ ...structuredSurface, padding: '30px 32px' }}>
            <KeyRisksSection risks={risks} />
          </div>
        </section>

        <section id="next-steps" style={{ scrollMarginTop: 128 }}>
          <div style={{ ...structuredSurface, padding: '30px 32px' }}>
            <NextStepsSection nextSteps={report.next_steps} />
          </div>
        </section>
      </div>
    </div>
  );
}
