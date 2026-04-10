import type { CollectionReportPayload } from '@/lib/collection-report/types';
import { fonts, reportPalette, sectionCard, sectionEyebrow } from '@/components/report/reportStyles';

function normalizeNotes(value: string | string[] | null | undefined) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }

  return value
    .split(/\n|;|•/)
    .map((item) => item.trim())
    .filter(Boolean);
}

type ExecutionBucket = 'Construction-critical' | 'Material-sensitive' | 'Sampling dependencies';

function summarizeNote(note: string) {
  return note
    .replace(/\s+/g, ' ')
    .replace(/\.$/, '')
    .trim();
}

function truncateToSentences(text: string): string {
  if (!text) return text;
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
  if (sentences.length <= 2) return text.trim();
  return sentences.slice(0, 2).join(' ').trim();
}

function classifyNote(piece: CollectionReportPayload['piece_summary'][number], note: string): ExecutionBucket {
  const normalized = note.toLowerCase();

  if (
    piece.construction === 'high' ||
    /bias cut|bonding|interlining|hem finish|silhouette lock|construction detail|construction|seam|tailor|engineer|panel|corset|structured|finish|shape hold/.test(
      normalized
    )
  ) {
    return 'Construction-critical';
  }

  if (/knit gauge|mill|fabric behavior|finish consistency|hand-feel|drape|fabric|material|leather|knit|wash|shrink|sheer|surface/.test(normalized)) {
    return 'Material-sensitive';
  }

  return 'Sampling dependencies';
}

function groupExecutionNotes(pieces: CollectionReportPayload['piece_summary']) {
  const grouped: Record<ExecutionBucket, Map<string, string[]>> = {
    'Construction-critical': new Map(),
    'Material-sensitive': new Map(),
    'Sampling dependencies': new Map(),
  };

  pieces.forEach((piece) => {
    normalizeNotes(piece.execution_notes).forEach((note) => {
      const bucket = classifyNote(piece, note);
      const summary = summarizeNote(note);
      const normalizedKey = summary.toLowerCase();
      const existing = grouped[bucket].get(normalizedKey);

      if (existing) {
        if (existing.length < 3 && !existing.includes(piece.piece_name)) {
          existing.push(piece.piece_name);
        }
        return;
      }

      grouped[bucket].set(normalizedKey, [piece.piece_name]);
    });
  });

  return (Object.entries(grouped) as Array<[ExecutionBucket, Map<string, string[]>]>)
    .map(([bucket, items]) => ({
      bucket,
      items: Array.from(items.entries())
        .map(([summary, pieceNames]) => {
          const prefix =
            pieceNames.length === 1
              ? `${pieceNames[0]}: `
              : pieceNames.length > 1
                ? `${pieceNames.join(', ')}: `
                : '';

          return truncateToSentences(`${prefix}${summary}`);
        })
        .slice(0, 4),
    }))
    .filter((group) => group.items.length > 0);
}

function getExecutionHeadline(
  execution: CollectionReportPayload['scores']['execution'],
  complexityLoad: CollectionReportPayload['collection_health']['complexity_load'],
  pieces: CollectionReportPayload['piece_summary']
) {
  const highComplexityCount = pieces.filter((piece) => piece.complexity === 'high').length;
  const marginFailures = pieces.filter((piece) => piece.margin_passed === false).length;

  if (execution.score >= 80 && highComplexityCount <= 1 && marginFailures === 0) {
    return 'Execution is holding together cleanly, with pressure staying contained rather than spreading across the line.';
  }

  if (complexityLoad.score <= 50 || marginFailures >= 2) {
    return 'Execution risk is no longer isolated, and the line is starting to lose buffer across build, margin, and timing.';
  }

  if (execution.score >= 65) {
    return 'Execution is still workable, but the collection is asking for more coordination than its current buffer comfortably supports.';
  }

  return 'Execution is fragile at the system level, with too many open dependencies for the line to move cleanly into the next round.';
}

function dedupeBullets(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, 4);
}

function getBreakingDownBullets(
  health: CollectionReportPayload['collection_health'],
  pieces: CollectionReportPayload['piece_summary']
) {
  const bullets: string[] = [];
  const noteCount = pieces.reduce((sum, piece) => sum + normalizeNotes(piece.execution_notes).length, 0);
  const marginFailures = pieces.filter((piece) => piece.margin_passed === false).length;
  const highComplexityCount = pieces.filter((piece) => piece.complexity === 'high').length;
  const samplingCount = pieces.filter((piece) =>
    normalizeNotes(piece.execution_notes).some((note) =>
      /sample|fit|vendor|trim|lead time|dependency|approval|calendar|delay|delivery/.test(note.toLowerCase())
    )
  ).length;

  if (health.complexity_load.score <= 60 || highComplexityCount >= 2) {
    bullets.push('Execution range is compressing because build complexity is concentrated across too much of the line.');
  }
  if (marginFailures > 0) {
    bullets.push('Margin pressure is reducing execution buffer, so feasibility and cost discipline are tightening at the same time.');
  }
  if (samplingCount >= 2) {
    bullets.push('Sampling dependencies are spreading across multiple pieces instead of staying contained to one exception path.');
  }
  if (noteCount >= Math.max(3, pieces.length)) {
    bullets.push('Too many open execution notes are still carrying forward, which suggests decisions are landing later than they should.');
  }

  return dedupeBullets(bullets);
}

function getRiskDrivers(pieces: CollectionReportPayload['piece_summary']) {
  const bullets: string[] = [];
  const highComplexityCount = pieces.filter((piece) => piece.complexity === 'high').length;
  const materialSensitiveCount = pieces.filter((piece) =>
    normalizeNotes(piece.execution_notes).some((note) =>
      /knit gauge|mill|fabric behavior|finish consistency|hand-feel|drape|fabric|material|leather|knit|wash|shrink|sheer|surface/.test(
        note.toLowerCase()
      )
    )
  ).length;
  const constructionCount = pieces.filter((piece) =>
    piece.construction === 'high' ||
    normalizeNotes(piece.execution_notes).some((note) =>
      /bias cut|bonding|interlining|hem finish|silhouette lock|construction detail|construction|seam|tailor|engineer|panel|corset|structured|finish|shape hold/.test(
        note.toLowerCase()
      )
    )
  ).length;
  const factoryDependentCount = pieces.filter((piece) =>
    normalizeNotes(piece.execution_notes).some((note) =>
      /sample|fit|vendor|trim|lead time|dependency|approval|calendar|delay|delivery/.test(note.toLowerCase())
    )
  ).length;

  if (highComplexityCount >= 2) {
    bullets.push('Complexity is not isolated to one showcase piece, so the line has fewer easy wins to absorb pressure.');
  }
  if (materialSensitiveCount >= 2) {
    bullets.push('Multiple material-sensitive decisions are running in parallel, which raises coordination risk across development.');
  }
  if (constructionCount >= 2) {
    bullets.push('Construction intent depends on details that appear to be underspecified or still moving.');
  }
  if (factoryDependentCount >= 2) {
    bullets.push('Factory and sampling timing are acting as shared constraints rather than one-off exceptions.');
  }

  return dedupeBullets(bullets);
}

function getInterventionBullets(pieces: CollectionReportPayload['piece_summary']) {
  const bullets: string[] = [];

  if (pieces.some((piece) => piece.margin_passed === false)) {
    bullets.push('Resolve cost and specification tradeoffs before the next sampling round.');
  }
  if (
    pieces.some((piece) =>
      normalizeNotes(piece.execution_notes).some((note) =>
        /bias cut|bonding|interlining|hem finish|silhouette lock|construction detail|construction|seam|tailor|engineer|panel|corset|structured|finish|shape hold/.test(
          note.toLowerCase()
        )
      )
    )
  ) {
    bullets.push('Lock construction decisions earlier on the highest-pressure pieces.');
  }
  if (
    pieces.some((piece) =>
      normalizeNotes(piece.execution_notes).some((note) =>
        /sample|fit|vendor|trim|lead time|dependency|approval|calendar|delay|delivery/.test(note.toLowerCase())
      )
    )
  ) {
    bullets.push('Collapse open sampling dependencies into a single timing plan rather than piece-by-piece follow-up.');
  }

  return dedupeBullets(bullets).slice(0, 3);
}

function buildDiagnosticParts(breakdownBullets: string[], driverBullets: string[]) {
  const breakdown = breakdownBullets.slice(0, 2);
  const drivers = driverBullets.slice(0, 2);

  return [...breakdown.map((text) => ({ text, emphasized: breakdown.length > 0 && text === breakdown[0] })), ...drivers.map((text) => ({ text, emphasized: drivers.length > 0 && text === drivers[0] }))];
}

function formatInterventionItems(value: string | string[]) {
  const rawItems = Array.isArray(value)
    ? value
    : value
        .split('. ')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 2);

  return rawItems
    .map((item) => item.trim().replace(/\.$/, ''))
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => {
      const splitPatterns = [' before ', ' on ', ' into ', ' rather than ', ' after ', ' across ', ' with '];
      const matchedPattern = splitPatterns.find((pattern) => item.toLowerCase().includes(pattern));
      const clauseTitle = item.split(',')[0]?.trim() ?? item;

      if (matchedPattern) {
        const splitIndex = item.toLowerCase().indexOf(matchedPattern);
        const title = item.slice(0, splitIndex).trim();
        const detail = item.slice(splitIndex).trim();

        return {
          title: title || clauseTitle,
          detail: detail ? detail[0].toLowerCase() + detail.slice(1) : '',
        };
      }

      return {
        title: clauseTitle,
        detail: item.slice(clauseTitle.length).replace(/^,\s*/, '').trim(),
      };
    });
}

export function ExecutionSection({
  scores,
  health,
  pieces,
}: {
  scores: CollectionReportPayload['scores'];
  health: CollectionReportPayload['collection_health'];
  pieces: CollectionReportPayload['piece_summary'];
}) {
  const groupedNotes = groupExecutionNotes(pieces);
  const summary = getExecutionHeadline(scores.execution, health.complexity_load, pieces);
  const breakdownBullets = getBreakingDownBullets(health, pieces);
  const driverBullets = getRiskDrivers(pieces);
  const interventionBullets = getInterventionBullets(pieces);

  return (
    <section style={{ ...sectionCard, padding: '28px 30px' }}>
      <p style={sectionEyebrow}>Execution</p>
      <p
        style={{
          margin: '16px 0 0',
          fontFamily: fonts.heading,
          fontSize: 30,
          lineHeight: 1.02,
          letterSpacing: '-0.04em',
          color: reportPalette.olive,
          maxWidth: 820,
        }}
      >
        {summary}
      </p>

      {buildDiagnosticParts(breakdownBullets, driverBullets).length > 0 ? (
        <div style={{ marginTop: 36 }}>
          <p
            style={{
              margin: 0,
              fontFamily: fonts.body,
              fontSize: 13,
              lineHeight: 1.7,
              color: 'var(--color-text-primary)',
            }}
          >
            {buildDiagnosticParts(breakdownBullets, driverBullets).map((part, index) => (
              <span key={`${part.text}-${index}`}>
                {index > 0 ? ' ' : ''}
                <span style={undefined}>{part.text}</span>
              </span>
            ))}
          </p>
        </div>
      ) : null}

      {formatInterventionItems(interventionBullets).length > 0 ? (
        <div style={{ marginTop: 40 }}>
          <p
            style={{
              margin: '0 0 10px',
              fontSize: 10,
              letterSpacing: '0.08em',
              fontFamily: fonts.body,
              fontWeight: 400,
              textTransform: 'uppercase',
              color: reportPalette.camel,
            }}
          >
            Where to intervene
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            {formatInterventionItems(interventionBullets).map((item, index) => (
              <div key={`${item.title}-${index}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span
                  style={{
                    minWidth: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'rgba(67,67,43,0.05)',
                    fontFamily: fonts.body,
                    fontSize: 11,
                    fontWeight: 700,
                    color: reportPalette.camel,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </span>
                <p
                  style={{
                    margin: 0,
                    fontFamily: fonts.body,
                    fontSize: 14,
                    lineHeight: 1.65,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{item.title}</span>
                  {item.detail ? ` — ${item.detail}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div
        style={{
          padding: '20px',
          borderRadius: 20,
          border: `1px solid rgba(67,67,43,0.08)`,
          background: 'rgba(255,255,255,0.56)',
          marginTop: 40,
        }}
      >
        <p style={sectionEyebrow}>Execution Notes</p>
        <div style={{ marginTop: 14 }}>
          {(() => {
            const bucketOrder: ExecutionBucket[] = ['Sampling dependencies', 'Construction-critical', 'Material-sensitive'];
            const flatNotes = bucketOrder.flatMap((bucket) => {
              const group = groupedNotes.find((item) => item.bucket === bucket);
	              return (group?.items ?? []).map((item) => {
	                const separatorIndex = item.indexOf(': ');
	                const pieceNames = separatorIndex >= 0 ? item.slice(0, separatorIndex) : '';
	                const noteText = separatorIndex >= 0 ? item.slice(separatorIndex + 2) : item;
	                const displayText = truncateToSentences(noteText);
	
	                return {
	                  bucket,
	                  pieceNames,
	                  noteText: displayText,
	                };
	              });
            });

            return flatNotes.length > 0 ? (
              <div>
                {flatNotes.map((item, index) => {
                  const tagStyles =
                    item.bucket === 'Sampling dependencies'
                      ? { label: 'Sampling', background: '#ede8ec', color: '#6a4a65' }
                      : item.bucket === 'Construction-critical'
                        ? { label: 'Construction', background: '#f0ece5', color: '#7a6a55' }
                        : { label: 'Material', background: '#e8ecf0', color: '#4a6070' };

                  return (
                    <div
                      key={`${item.bucket}-${item.pieceNames}-${item.noteText}`}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '12px 0',
                        borderBottom: index === flatNotes.length - 1 ? 'none' : '0.5px solid var(--color-border-tertiary)',
                      }}
                    >
                      <div style={{ width: 110, flexShrink: 0 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontFamily: fonts.body,
                            fontSize: 10,
                            lineHeight: 1.3,
                            background: tagStyles.background,
                            color: tagStyles.color,
                          }}
                        >
                          {tagStyles.label}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        {item.pieceNames ? (
                          <span
                            style={{
                              display: 'block',
                              marginBottom: 3,
                              fontFamily: fonts.body,
                              fontSize: 11,
                              fontWeight: 600,
                              color: 'var(--color-text-secondary)',
                            }}
                          >
                            {item.pieceNames}
                          </span>
                        ) : null}
                        <p
                          style={{
                            margin: 0,
                            fontFamily: fonts.body,
                            fontSize: 12,
                            lineHeight: 1.55,
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {item.noteText}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ margin: 0, fontFamily: fonts.body, fontSize: 14, lineHeight: 1.7, color: reportPalette.muted }}>
                No piece-level execution notes were included in the current report payload.
              </p>
            );
          })()}
        </div>
      </div>
    </section>
  );
}
